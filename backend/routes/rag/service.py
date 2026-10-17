import asyncio
from datetime import datetime, timezone
import inspect
import logging
import re
import time

import httpx
from bson import ObjectId
from fastapi import HTTPException, status
from langchain_core.messages import HumanMessage, SystemMessage
from pymongo.errors import DuplicateKeyError

from ...config import LLMProvider, settings
from ...db import db
from ...gemini import embed_query_with_fallback, has_gemini_api_keys
from ...llm import (
    RAG_TEMPERATURE,
    ChatModel,
    create_chat_model,
    ensure_provider_configured,
)
from ...schemas.rag import ChatMessageOut, ChatMessageSource, ConversationOut, RagSource
from ..notebook_access import resolve_notebook_access
from .grading import grade_candidates

logger = logging.getLogger(__name__)

GENERAL_KNOWLEDGE_NOTICE = (
    "Aviso: no encontre suficiente informacion en tus fuentes; "
    "respondo con conocimiento general."
)

GENERAL_KNOWLEDGE_MARKER = "[[conocimiento-general]]"

CITATION_INSTRUCTION = (
    " Los fragmentos del contexto estan numerados como [1], [2], etc. "
    "Cuando una afirmacion provenga de un fragmento, cita su numero entre "
    "corchetes al final de la frase, por ejemplo [1] o [1][3]. "
    "No inventes numeros que no existan y no cites cuando uses conocimiento general."
)


def number_context_lines(context_lines: list[str]) -> list[str]:
    return [f"[{position}] {line}" for position, line in enumerate(context_lines, start=1)]


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
        used_general_knowledge=bool(message.get("used_general_knowledge", False)),
        created_at=message["created_at"],
    )


def build_source_summaries(sources: list[RagSource]) -> list[dict]:
    summaries: list[dict] = []
    for position, source in enumerate(sources, start=1):
        summaries.append(
            {
                "file_name": source.file_name or "Documento",
                "index": position,
                "page": source.page,
                "snippet": source.text.strip(),
            }
        )
    return summaries


def build_prompt_messages(
    context_lines: list[str],
    question: str,
    include_notice: bool = True,
    cite: bool = False,
    general_marker: bool = False,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Usa el contexto como fuente principal. "
        "Si el contexto es insuficiente para responder, complementa con conocimiento general. "
    )
    if include_notice and general_marker:
        system_prompt += (
            "Cuando uses conocimiento general, inicia la respuesta exactamente con "
            f'"{GENERAL_KNOWLEDGE_MARKER}" seguido de un salto de linea y continua normalmente. '
            "Si el contexto esta vacio, responde solo con conocimiento general e inicia con esa marca."
        )
    elif include_notice:
        system_prompt += (
            f'Cuando uses conocimiento general, inicia la respuesta con: "{GENERAL_KNOWLEDGE_NOTICE}". '
            "Si el contexto esta vacio, responde solo con conocimiento general y usa el aviso."
        )
    else:
        system_prompt += (
            "Si el contexto esta vacio, responde solo con conocimiento general."
        )
    if cite and context_lines:
        system_prompt += CITATION_INSTRUCTION
        context_lines = number_context_lines(context_lines)
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
    if isinstance(value, list):
        parts = []
        for item in value:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(str(item.get("text", "")))
            elif isinstance(item, str):
                parts.append(item)
        return "".join(parts)
    return str(value)


def coerce_int(value: object | None, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def tokenize_for_overlap(text: str) -> set[str]:
    tokens = re.findall(r"[0-9a-zA-Záéíóúñü]+", text.lower())
    return {token for token in tokens if len(token) >= 3}


def lexical_overlap_score(query_tokens: set[str], chunk_text: str) -> float:
    if not query_tokens:
        return 0.0
    chunk_tokens = tokenize_for_overlap(chunk_text)
    if not chunk_tokens:
        return 0.0
    return len(query_tokens & chunk_tokens) / len(query_tokens)


def rank_candidates(question: str, hits: list[dict]) -> list[dict]:
    query_tokens = tokenize_for_overlap(question)
    lexical_weight = settings.rag_lexical_weight
    if lexical_weight < 0.0:
        lexical_weight = 0.0
    if lexical_weight > 1.0:
        lexical_weight = 1.0
    semantic_weight = 1.0 - lexical_weight

    candidates: list[dict] = []
    for hit in hits:
        payload_data = hit.get("payload") or {}
        text = coerce_text(payload_data.get("text")).strip()
        if not text:
            continue
        semantic_score = float(hit.get("score", 0.0))
        lexical_score = lexical_overlap_score(query_tokens, text)
        combined_score = (semantic_score * semantic_weight) + (
            lexical_score * lexical_weight
        )
        candidates.append(
            {
                "id": coerce_text(hit.get("id")),
                "payload": payload_data,
                "text": text,
                "semantic_score": semantic_score,
                "lexical_score": lexical_score,
                "combined_score": combined_score,
            }
        )

    candidates.sort(
        key=lambda item: (
            item["combined_score"],
            item["semantic_score"],
            item["lexical_score"],
        ),
        reverse=True,
    )
    return candidates


def select_candidates(candidates: list[dict], selected_top_k: int) -> list[dict]:
    min_semantic_score = max(0.0, settings.rag_min_score)
    relaxed_semantic_floor = max(0.0, min_semantic_score - 0.2)
    max_chunks_per_document = max(1, settings.rag_max_chunks_per_document)

    selected: list[dict] = []
    selected_ids: set[str] = set()
    chunks_by_document: dict[str, int] = {}

    def add_candidate(candidate: dict, ignore_document_cap: bool = False) -> bool:
        candidate_id = coerce_text(candidate.get("id"))
        if candidate_id and candidate_id in selected_ids:
            return False

        payload_data = candidate.get("payload", {})
        document_id = coerce_text(payload_data.get("document_id")) or "__unknown__"
        if not ignore_document_cap and (
            chunks_by_document.get(document_id, 0) >= max_chunks_per_document
        ):
            return False

        selected.append(candidate)
        if candidate_id:
            selected_ids.add(candidate_id)
        chunks_by_document[document_id] = chunks_by_document.get(document_id, 0) + 1
        return True

    for candidate in candidates:
        semantic_score = float(candidate.get("semantic_score", 0.0))
        lexical_score = float(candidate.get("lexical_score", 0.0))
        if semantic_score < relaxed_semantic_floor:
            continue
        if semantic_score < min_semantic_score and lexical_score < 0.25:
            continue
        added = add_candidate(candidate)
        if added and len(selected) >= selected_top_k:
            return selected

    if len(selected) < selected_top_k:
        for candidate in candidates:
            semantic_score = float(candidate.get("semantic_score", 0.0))
            if semantic_score < min_semantic_score:
                continue
            added = add_candidate(candidate)
            if added and len(selected) >= selected_top_k:
                break

    if len(selected) < selected_top_k:
        for candidate in candidates:
            semantic_score = float(candidate.get("semantic_score", 0.0))
            if semantic_score < min_semantic_score:
                continue
            added = add_candidate(candidate, ignore_document_cap=True)
            if added and len(selected) >= selected_top_k:
                break

    return selected


def select_grading_pool(candidates: list[dict]) -> list[dict]:
    relaxed_semantic_floor = max(0.0, settings.rag_min_score - 0.2)
    pool_size = max(1, settings.rag_grading_candidates)
    return [
        candidate
        for candidate in candidates
        if float(candidate.get("semantic_score", 0.0)) >= relaxed_semantic_floor
    ][:pool_size]


async def select_relevant_candidates(
    question: str,
    candidates: list[dict],
    selected_top_k: int,
    provider: LLMProvider,
) -> list[dict]:
    try:
        relevant = await grade_candidates(
            question, select_grading_pool(candidates), provider
        )
    except Exception:
        logger.warning("No se pudo evaluar la relevancia de fragmentos", exc_info=True)
        return select_candidates(candidates, selected_top_k)
    return relevant[:selected_top_k]


def build_context_line(candidate: dict) -> str:
    child_text = coerce_text(candidate.get("text")).strip()
    if not child_text:
        return ""
    return child_text


def ensure_general_notice(answer_text: str) -> str:
    trimmed = answer_text.strip()
    if not trimmed:
        return GENERAL_KNOWLEDGE_NOTICE
    notice_lower = GENERAL_KNOWLEDGE_NOTICE.lower()
    if trimmed.lower().startswith(notice_lower):
        return trimmed
    return f"{GENERAL_KNOWLEDGE_NOTICE}\n\n{trimmed}"


def split_general_marker(answer_text: str) -> tuple[str, bool]:
    trimmed = answer_text.lstrip()
    if not trimmed.startswith(GENERAL_KNOWLEDGE_MARKER):
        return answer_text, False
    return trimmed[len(GENERAL_KNOWLEDGE_MARKER) :].lstrip(), True


class GeneralMarkerFilter:
    def __init__(self) -> None:
        self.used_general_knowledge = False
        self._buffer = ""
        self._decided = False

    def feed(self, chunk: str) -> str:
        if self._decided:
            return chunk
        self._buffer += chunk
        candidate = self._buffer.lstrip()
        if candidate.startswith(GENERAL_KNOWLEDGE_MARKER):
            self._decided = True
            self.used_general_knowledge = True
            self._buffer = ""
            return candidate[len(GENERAL_KNOWLEDGE_MARKER) :].lstrip()
        if GENERAL_KNOWLEDGE_MARKER.startswith(candidate):
            return ""
        self._decided = True
        remaining, self._buffer = self._buffer, ""
        return remaining

    def flush(self) -> str:
        remaining, self._buffer = self._buffer, ""
        return remaining


def create_llm(provider: LLMProvider) -> ChatModel:
    return create_chat_model(provider, RAG_TEMPERATURE)


async def get_notebook_object_id(notebook_id: str, user: dict) -> ObjectId:
    access = await resolve_notebook_access(notebook_id, user)
    return access.notebook["_id"]


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
    grade: bool = False,
    provider: LLMProvider | None = None,
) -> tuple[list[str], list[RagSource], list[str], int]:
    if not has_gemini_api_keys():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Gemini no configurado"
        )
    if provider is not None:
        ensure_provider_configured(provider)
    if grade and provider is None:
        raise ValueError("provider es obligatorio para evaluar relevancia")

    selected_top_k = top_k or settings.rag_top_k
    fetch_multiplier = max(1, settings.rag_fetch_k_multiplier)
    fetch_limit = max(selected_top_k, selected_top_k * fetch_multiplier)
    fetch_limit = min(fetch_limit, max(selected_top_k, settings.rag_fetch_k_max))
    should_grade = grade and settings.rag_grading_enabled
    if should_grade:
        fetch_limit = max(fetch_limit, settings.rag_grading_candidates)
    source_owner_id = user.get("_source_owner_id")
    if not isinstance(source_owner_id, ObjectId):
        notebook_doc = await db.notebooks.find_one(
            {"_id": notebook_object_id},
            {"owner_id": 1},
        )
        if not notebook_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notebook no encontrado",
            )
        source_owner_id = notebook_doc["owner_id"]

    query_vector = await asyncio.to_thread(
        embed_query_with_fallback,
        question,
        "models/gemini-embedding-001",
        settings.qdrant_vector_size,
        "RETRIEVAL_QUERY",
    )

    async with httpx.AsyncClient(base_url=settings.qdrant_url, timeout=20) as client:
        response = await client.post(
            f"/collections/{settings.qdrant_collection_name}/points/search",
            json={
                "vector": query_vector,
                "limit": fetch_limit,
                "with_payload": True,
                "with_vectors": False,
                "filter": {
                    "must": [
                        {
                            "key": "notebook_id",
                            "match": {"value": str(notebook_object_id)},
                        },
                        {"key": "owner_id", "match": {"value": str(source_owner_id)}},
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
        if inspect.isawaitable(result):
            result = await result

    hits = result.get("result", []) or []
    ranked_candidates = rank_candidates(question, hits)
    if should_grade:
        selected_candidates = await select_relevant_candidates(
            question, ranked_candidates, selected_top_k, provider
        )
    else:
        selected_candidates = select_candidates(ranked_candidates, selected_top_k)

    sources: list[RagSource] = []
    context_lines: list[str] = []
    document_ids: list[str] = []

    for candidate in selected_candidates:
        payload_data = candidate.get("payload") or {}
        text = coerce_text(candidate.get("text"))
        context_text = build_context_line(candidate) or text
        document_id = coerce_text(payload_data.get("document_id"))
        if document_id:
            document_ids.append(document_id)
        sources.append(
            RagSource(
                document_id=document_id,
                chunk_id=coerce_int(payload_data.get("chunk_id"), default=0),
                score=float(candidate.get("semantic_score", 0.0)),
                text=text,
                file_name=payload_data.get("file_name"),
                page=payload_data.get("page"),
            )
        )
        context_lines.append(context_text)

    return context_lines, sources, document_ids, selected_top_k


async def generate_answer(
    question: str,
    context_lines: list[str],
    cite: bool = False,
    flag_general: bool = False,
    *,
    provider: LLMProvider,
) -> str:
    include_notice = bool(context_lines)
    system_message, user_message = build_prompt_messages(
        context_lines,
        question,
        include_notice=include_notice,
        cite=cite,
        general_marker=flag_general,
    )
    llm = create_llm(provider)
    answer = await asyncio.to_thread(llm.invoke, [system_message, user_message])
    answer_text = coerce_text(getattr(answer, "content", answer))
    if not context_lines:
        if flag_general:
            return f"{GENERAL_KNOWLEDGE_MARKER}\n\n{answer_text.strip()}"
        return ensure_general_notice(answer_text)
    return answer_text


async def stream_answer(
    question: str, context_lines: list[str], provider: LLMProvider
):
    system_message, user_message = build_prompt_messages(
        context_lines, question, cite=True, general_marker=True
    )
    llm = create_llm(provider)

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
    flag_general: bool = False,
    *,
    provider: LLMProvider,
) -> tuple[str, list[RagSource], list[str], int, int]:
    start = time.perf_counter()
    context_lines, sources, document_ids, selected_top_k = await retrieve_context(
        question, notebook_object_id, user, top_k, grade=True, provider=provider
    )
    answer_text = await generate_answer(
        question,
        context_lines,
        cite=True,
        flag_general=flag_general,
        provider=provider,
    )
    latency_ms = await record_rag_query(
        start, question, notebook_object_id, user, document_ids, selected_top_k, sources
    )

    return answer_text, sources, document_ids, latency_ms, selected_top_k
