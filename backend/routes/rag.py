import asyncio
from datetime import datetime, timezone
import logging
import time

import httpx
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import SecretStr

from ..config import settings
from ..db import db
from ..schemas import RagQueryRequest, RagResponse, RagSource
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notebooks", tags=["rag"])


@router.post("/{notebook_id}/query", response_model=RagResponse)
async def query_notebook(
    notebook_id: str, payload: RagQueryRequest, request: Request
) -> RagResponse:
    user = await get_current_user(request)
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

    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Gemini no configurado"
        )

    top_k = payload.top_k or settings.rag_top_k
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        api_key=SecretStr(settings.gemini_api_key),
        output_dimensionality=settings.qdrant_vector_size,
    )
    query_vector = await asyncio.to_thread(embeddings.embed_query, payload.question)

    start = time.perf_counter()
    async with httpx.AsyncClient(base_url=settings.qdrant_url, timeout=20) as client:
        response = await client.post(
            f"/collections/{settings.qdrant_collection_name}/points/search",
            json={
                "vector": query_vector,
                "limit": top_k,
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
    context_lines = []
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
        return RagResponse(
            answer="No tengo suficiente información en este notebook.", sources=[]
        )

    system_prompt = (
        "Eres un asistente de estudio. Responde solo usando el contexto. "
        "Si el contexto no contiene la respuesta, di que no tienes suficiente información."
    )
    user_prompt = (
        "Contexto:\n"
        + "\n\n".join(context_lines)
        + "\n\nPregunta:\n"
        + payload.question
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
            "query_text": payload.question,
            "top_k": top_k,
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
            "top_k": top_k,
            "sources": len(sources),
            "latency_ms": latency_ms,
        },
    )

    return RagResponse(answer=answer_text, sources=sources)
