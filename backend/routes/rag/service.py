import asyncio
from datetime import datetime, timezone
import logging
import time

import httpx
from bson import ObjectId
from fastapi import HTTPException, status
from langchain_core.messages import HumanMessage, SystemMessage
from pymongo.errors import DuplicateKeyError

from ...config import settings
from ...db import db
from ...gemini import (
    GeminiChatWithFallback,
    create_chat_model_with_fallback,
    embed_query_with_fallback,
    has_gemini_api_keys,
)
from ...schemas.rag import ChatMessageOut, ChatMessageSource, ConversationOut, RagSource

logger = logging.getLogger(__name__)

GENERAL_KNOWLEDGE_NOTICE = (
    "Aviso: no encontre suficiente informacion en tus fuentes; "
    "respondo con conocimiento general."
)


def conversation_to_out(conversation: dict) -> ConversationOut:
    return ConversationOut(
        id=str(conversation["_id"]),
        owner_id=str(conversation["owner_id"]),
        notebook_id=str(conversation["notebook_id"]),
        created_at=conversation["created_at"],
    )


def message_to_out(message: dict) -> ChatMessageOut:
    sources = [ChatMessageSource(**source) for source in message.get("sources", [])]
    return ChatMessageOut(
        id=str(message["_id"]),
        conversation_id=str(message["conversation_id"]),
        notebook_id=str(message["notebook_id"]),
        owner_id=str(message["owner_id"]),
        role=message["role"],
        content=message["content"],
        sources=sources,
        created_at=message["created_at"],
    )


def build_source_summaries(sources: list[RagSource]) -> list[dict]:
    seen: set[str] = set()
    summaries: list[dict] = []
    for source in sources:
        file_name = source.file_name
        if not file_name or file_name in seen:
            continue
        seen.add(file_name)
        summaries.append({"file_name": file_name})
    return summaries


def build_prompt_messages(
    context_lines: list[str], question: str, include_notice: bool = True
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Usa el contexto como fuente principal. "
        "Si el contexto es insuficiente para responder, complementa con conocimiento general. "
    )
    if include_notice:
        system_prompt += (
            f'Cuando uses conocimiento general, inicia la respuesta con: "{GENERAL_KNOWLEDGE_NOTICE}". '
            "Si el contexto esta vacio, responde solo con conocimiento general y usa el aviso."
        )
    else:
        system_prompt += (
            "Si el contexto esta vacio, responde solo con conocimiento general."
        )
    context_text = "\n\n".join(context_lines).strip()
    if context_text:
        user_prompt = "Contexto:\n" + context_text + "\n\nPregunta:\n" + question
    else:
        user_prompt = "Contexto: (sin informacion relevante)\n\nPregunta:\n" + question
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def coerce_text(value: object | None) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def ensure_general_notice(answer_text: str) -> str:
    trimmed = answer_text.strip()
    if not trimmed:
        return GENERAL_KNOWLEDGE_NOTICE
    notice_lower = GENERAL_KNOWLEDGE_NOTICE.lower()
    if trimmed.lower().startswith(notice_lower):
        return trimmed
    return f"{GENERAL_KNOWLEDGE_NOTICE}\n\n{trimmed}"


def create_llm() -> GeminiChatWithFallback:
    return create_chat_model_with_fallback(
        model_name=settings.gemini_chat_model,
        temperature=0.2,
    )


async def get_notebook_object_id(notebook_id: str, user: dict) -> ObjectId:
    try:
        notebook_object_id = ObjectId(notebook_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook invalido"
        ) from exc

    notebook = await db.notebooks.find_one(
        {"_id": notebook_object_id, "owner_id": user["_id"]}
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notebook no encontrado"
        )
    return notebook_object_id


async def ensure_conversation(notebook_object_id: ObjectId, user_id: ObjectId) -> dict:
    conversation = await db.rag_conversations.find_one(
        {"notebook_id": notebook_object_id, "owner_id": user_id}
    )
    if conversation:
        return conversation

    now = datetime.now(timezone.utc)
    conversation_doc = {
        "owner_id": user_id,
        "notebook_id": notebook_object_id,
        "created_at": now,
    }
    try:
        result = await db.rag_conversations.insert_one(conversation_doc)
        conversation_doc["_id"] = result.inserted_id
        return conversation_doc
    except DuplicateKeyError:
        conversation = await db.rag_conversations.find_one(
            {"notebook_id": notebook_object_id, "owner_id": user_id}
        )
        if not conversation:
            raise
        return conversation


async def retrieve_context(
    question: str,
    notebook_object_id: ObjectId,
    user: dict,
    top_k: int | None = None,
) -> tuple[list[str], list[RagSource], list[str], int]:
    if not has_gemini_api_keys():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Gemini no configurado"
        )

    selected_top_k = top_k or settings.rag_top_k
    query_vector = await asyncio.to_thread(
        embed_query_with_fallback,
        question,
        "models/gemini-embedding-001",
        settings.qdrant_vector_size,
    )

    async with httpx.AsyncClient(base_url=settings.qdrant_url, timeout=20) as client:
        response = await client.post(
            f"/collections/{settings.qdrant_collection_name}/points/search",
            json={
                "vector": query_vector,
                "limit": selected_top_k,
                "with_payload": True,
                "with_vectors": False,
                "filter": {
                    "must": [
                        {
                            "key": "notebook_id",
                            "match": {"value": str(notebook_object_id)},
                        },
                        {"key": "owner_id", "match": {"value": str(user["_id"])}},
                    ]
                },
            },
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo consultar Qdrant",
            )
        result = response.json()

    hits = result.get("result", []) or []
    sources: list[RagSource] = []
    context_lines: list[str] = []
    document_ids: list[str] = []

    for hit in hits:
        payload_data = hit.get("payload") or {}
        text = payload_data.get("text") or ""
        score = float(hit.get("score", 0.0))
        if score < settings.rag_min_score:
            continue
        if not text:
            continue
        document_id = payload_data.get("document_id")
        if document_id:
            document_ids.append(document_id)
        sources.append(
            RagSource(
                document_id=document_id or "",
                chunk_id=payload_data.get("chunk_id", 0),
                score=score,
                text=text,
                file_name=payload_data.get("file_name"),
                page=payload_data.get("page"),
            )
        )
        context_lines.append(text)

    return context_lines, sources, document_ids, selected_top_k


async def generate_answer(question: str, context_lines: list[str]) -> str:
    include_notice = bool(context_lines)
    system_message, user_message = build_prompt_messages(
        context_lines, question, include_notice=include_notice
    )
    llm = create_llm()
    answer = await asyncio.to_thread(llm.invoke, [system_message, user_message])
    answer_text = coerce_text(getattr(answer, "content", answer))
    if not context_lines:
        return ensure_general_notice(answer_text)
    return answer_text


async def stream_answer(question: str, context_lines: list[str]):
    system_message, user_message = build_prompt_messages(context_lines, question)
    llm = create_llm()

    if hasattr(llm, "astream"):
        async for chunk in llm.astream([system_message, user_message]):
            content = coerce_text(getattr(chunk, "content", None))
            if content:
                yield content
        return

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    def run_sync_stream() -> None:
        try:
            for chunk in llm.stream([system_message, user_message]):
                content = coerce_text(getattr(chunk, "content", None))
                if content:
                    loop.call_soon_threadsafe(queue.put_nowait, content)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    task = asyncio.create_task(asyncio.to_thread(run_sync_stream))

    while True:
        item = await queue.get()
        if item is None:
            break
        yield item

    await task


async def record_rag_query(
    start: float,
    question: str,
    notebook_object_id: ObjectId,
    user: dict,
    document_ids: list[str],
    selected_top_k: int,
    sources: list[RagSource],
) -> int:
    latency_ms = int((time.perf_counter() - start) * 1000)
    await db.rag_queries.insert_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook_object_id,
            "query_text": question,
            "top_k": selected_top_k,
            "latency_ms": latency_ms,
            "document_ids": document_ids,
            "created_at": datetime.now(timezone.utc),
        }
    )

    logger.info(
        "Consulta RAG",
        extra={
            "notebook_id": str(notebook_object_id),
            "owner_id": str(user["_id"]),
            "top_k": selected_top_k,
            "sources": len(sources),
            "latency_ms": latency_ms,
        },
    )

    return latency_ms


async def run_rag_query(
    question: str,
    notebook_object_id: ObjectId,
    user: dict,
    top_k: int | None = None,
) -> tuple[str, list[RagSource], list[str], int, int]:
    start = time.perf_counter()
    context_lines, sources, document_ids, selected_top_k = await retrieve_context(
        question, notebook_object_id, user, top_k
    )
    answer_text = await generate_answer(question, context_lines)
    latency_ms = await record_rag_query(
        start, question, notebook_object_id, user, document_ids, selected_top_k, sources
    )

    return answer_text, sources, document_ids, latency_ms, selected_top_k
