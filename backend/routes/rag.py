import asyncio
from datetime import datetime, timezone
import json
import logging
import time

import httpx
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import SecretStr
from pymongo.errors import DuplicateKeyError

from ..config import settings
from ..db import db
from ..schemas import (
    ChatMessageCreate,
    ChatMessageOut,
    ChatMessageSource,
    ConversationOut,
    RagQueryRequest,
    RagResponse,
    RagSource,
)
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notebooks", tags=["rag"])


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


def chunk_text(text: str, size: int = 140) -> list[str]:
    if not text:
        return []
    return [text[index : index + size] for index in range(0, len(text), size)]


async def get_notebook_object_id(notebook_id: str, user: dict) -> ObjectId:
    try:
        notebook_object_id = ObjectId(notebook_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook inválido"
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


async def run_rag_query(
    question: str,
    notebook_object_id: ObjectId,
    user: dict,
    top_k: int | None = None,
) -> tuple[str, list[RagSource], list[str], int, int]:
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Gemini no configurado"
        )

    selected_top_k = top_k or settings.rag_top_k
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        api_key=SecretStr(settings.gemini_api_key),
        output_dimensionality=settings.qdrant_vector_size,
    )
    query_vector = await asyncio.to_thread(embeddings.embed_query, question)

    start = time.perf_counter()
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
        if not text:
            continue
        document_id = payload_data.get("document_id")
        if document_id:
            document_ids.append(document_id)
        sources.append(
            RagSource(
                document_id=document_id or "",
                chunk_id=payload_data.get("chunk_id", 0),
                score=hit.get("score", 0.0),
                text=text,
                file_name=payload_data.get("file_name"),
                page=payload_data.get("page"),
            )
        )
        context_lines.append(text)

    if not context_lines:
        answer_text = "No tengo suficiente información en este notebook."
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
        return answer_text, sources, document_ids, latency_ms, selected_top_k

    system_prompt = (
        "Eres un asistente de estudio. Responde solo usando el contexto. "
        "Si el contexto no contiene la respuesta, di que no tienes suficiente información."
    )
    user_prompt = (
        "Contexto:\n" + "\n\n".join(context_lines) + "\n\nPregunta:\n" + question
    )

    llm = ChatGoogleGenerativeAI(
        model=settings.gemini_chat_model,
        api_key=SecretStr(settings.gemini_api_key),
        temperature=0.2,
    )
    answer = await asyncio.to_thread(
        llm.invoke,
        [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)],
    )
    if hasattr(answer, "content"):
        answer_text = answer.content
    else:
        answer_text = str(answer)
    if not isinstance(answer_text, str):
        answer_text = str(answer_text)

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

    return answer_text, sources, document_ids, latency_ms, selected_top_k


@router.post("/{notebook_id}/query", response_model=RagResponse)
async def query_notebook(
    notebook_id: str, payload: RagQueryRequest, request: Request
) -> RagResponse:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)

    question = payload.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Pregunta inválida"
        )

    answer_text, sources, _, _, _ = await run_rag_query(
        question, notebook_object_id, user, payload.top_k
    )
    return RagResponse(answer=answer_text, sources=sources)


@router.get("/{notebook_id}/conversation", response_model=ConversationOut)
async def get_conversation(notebook_id: str, request: Request) -> ConversationOut:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)
    conversation = await ensure_conversation(notebook_object_id, user["_id"])
    return conversation_to_out(conversation)


@router.get("/{notebook_id}/conversation/messages", response_model=list[ChatMessageOut])
async def list_conversation_messages(
    notebook_id: str, request: Request
) -> list[ChatMessageOut]:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)
    conversation = await ensure_conversation(notebook_object_id, user["_id"])

    cursor = db.rag_messages.find(
        {
            "conversation_id": conversation["_id"],
            "notebook_id": notebook_object_id,
            "owner_id": user["_id"],
        }
    ).sort("created_at", 1)
    return [message_to_out(message) async for message in cursor]


@router.post("/{notebook_id}/conversation/messages", response_model=ChatMessageOut)
async def create_conversation_message(
    notebook_id: str, payload: ChatMessageCreate, request: Request
) -> ChatMessageOut:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)
    conversation = await ensure_conversation(notebook_object_id, user["_id"])

    question = payload.content.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Pregunta inválida"
        )

    now = datetime.now(timezone.utc)
    user_message_doc = {
        "owner_id": user["_id"],
        "notebook_id": notebook_object_id,
        "conversation_id": conversation["_id"],
        "role": "user",
        "content": question,
        "sources": [],
        "created_at": now,
    }
    await db.rag_messages.insert_one(user_message_doc)

    answer_text, sources, _, _, _ = await run_rag_query(
        question, notebook_object_id, user
    )
    source_summaries = build_source_summaries(sources)
    assistant_message_doc = {
        "owner_id": user["_id"],
        "notebook_id": notebook_object_id,
        "conversation_id": conversation["_id"],
        "role": "assistant",
        "content": answer_text,
        "sources": source_summaries,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.rag_messages.insert_one(assistant_message_doc)
    assistant_message_doc["_id"] = result.inserted_id

    return message_to_out(assistant_message_doc)


@router.post("/{notebook_id}/conversation/messages/stream")
async def stream_conversation_message(
    notebook_id: str, payload: ChatMessageCreate, request: Request
) -> StreamingResponse:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)
    conversation = await ensure_conversation(notebook_object_id, user["_id"])

    question = payload.content.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Pregunta inválida"
        )

    now = datetime.now(timezone.utc)
    user_message_doc = {
        "owner_id": user["_id"],
        "notebook_id": notebook_object_id,
        "conversation_id": conversation["_id"],
        "role": "user",
        "content": question,
        "sources": [],
        "created_at": now,
    }
    await db.rag_messages.insert_one(user_message_doc)

    async def event_generator():
        try:
            answer_text, sources, _, _, _ = await run_rag_query(
                question, notebook_object_id, user
            )
        except HTTPException as exc:
            detail = (
                exc.detail
                if isinstance(exc.detail, str)
                else "No se pudo generar respuesta"
            )
            error_payload = json.dumps({"message": detail})
            yield f"event: error\ndata: {error_payload}\n\n"
            return
        except Exception:
            error_payload = json.dumps({"message": "No se pudo generar respuesta"})
            yield f"event: error\ndata: {error_payload}\n\n"
            return

        source_summaries = build_source_summaries(sources)
        assistant_message_doc = {
            "owner_id": user["_id"],
            "notebook_id": notebook_object_id,
            "conversation_id": conversation["_id"],
            "role": "assistant",
            "content": answer_text,
            "sources": source_summaries,
            "created_at": datetime.now(timezone.utc),
        }
        result = await db.rag_messages.insert_one(assistant_message_doc)
        assistant_message_doc["_id"] = result.inserted_id

        for chunk in chunk_text(answer_text):
            payload_chunk = json.dumps({"content": chunk})
            yield f"event: chunk\ndata: {payload_chunk}\n\n"

        done_payload = json.dumps(
            {"message": jsonable_encoder(message_to_out(assistant_message_doc))}
        )
        yield f"event: done\ndata: {done_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
