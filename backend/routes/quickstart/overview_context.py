import uuid

import httpx
from bson import ObjectId
from fastapi import HTTPException, status

from ...config import settings
from ...db import db
from ...schemas.rag import RagSource
from .normalization import coerce_text
from .repository import fetch_ready_documents

OVERVIEW_TOTAL_CHUNKS = 18
OVERVIEW_MIN_CHUNKS_PER_DOCUMENT = 2
OVERVIEW_CHUNK_MAX_CHARS = 700
OVERVIEW_CONTEXT_MAX_CHARS = 14000


def build_chunk_point_id(document_id: str, chunk_index: int) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{document_id}:{chunk_index}"))


def pick_spread_indices(total: int, count: int) -> list[int]:
    if total <= 0 or count <= 0:
        return []
    if count >= total:
        return list(range(total))
    if count == 1:
        return [0]
    step = (total - 1) / (count - 1)
    return sorted({round(position * step) for position in range(count)})


def chunks_per_document(document_count: int) -> int:
    if document_count <= 0:
        return 0
    return max(OVERVIEW_MIN_CHUNKS_PER_DOCUMENT, OVERVIEW_TOTAL_CHUNKS // document_count)


def truncate_chunk(text: str) -> str:
    trimmed = text.strip()
    if len(trimmed) <= OVERVIEW_CHUNK_MAX_CHARS:
        return trimmed
    return trimmed[:OVERVIEW_CHUNK_MAX_CHARS].rstrip() + "..."


async def resolve_source_owner_id(notebook_object_id: ObjectId, user: dict) -> ObjectId:
    source_owner_id = user.get("_source_owner_id")
    if isinstance(source_owner_id, ObjectId):
        return source_owner_id
    notebook_doc = await db.notebooks.find_one(
        {"_id": notebook_object_id}, {"owner_id": 1}
    )
    if not notebook_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notebook no encontrado"
        )
    return notebook_doc["owner_id"]


async def count_document_chunks(client: httpx.AsyncClient, document_id: str) -> int:
    response = await client.post(
        f"/collections/{settings.qdrant_collection_name}/points/count",
        json={
            "exact": True,
            "filter": {
                "must": [{"key": "document_id", "match": {"value": document_id}}]
            },
        },
    )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo consultar Qdrant",
        )
    return int(response.json().get("result", {}).get("count", 0))


async def fetch_document_chunks(
    client: httpx.AsyncClient, document_id: str, chunk_indices: list[int]
) -> list[dict]:
    response = await client.post(
        f"/collections/{settings.qdrant_collection_name}/points",
        json={
            "ids": [build_chunk_point_id(document_id, index) for index in chunk_indices],
            "with_payload": True,
            "with_vector": False,
        },
    )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo consultar Qdrant",
        )
    points = response.json().get("result", []) or []
    payloads = [point.get("payload") or {} for point in points]
    return sorted(payloads, key=lambda payload: payload.get("chunk_id") or 0)


async def sample_overview_context(
    notebook_object_id: ObjectId, user: dict
) -> tuple[list[str], list[RagSource]]:
    source_owner_id = await resolve_source_owner_id(notebook_object_id, user)
    documents = await fetch_ready_documents(notebook_object_id, source_owner_id)
    per_document = chunks_per_document(len(documents))

    context_lines: list[str] = []
    sources: list[RagSource] = []
    async with httpx.AsyncClient(base_url=settings.qdrant_url, timeout=20) as client:
        for document in documents:
            document_id = str(document["_id"])
            total_chunks = await count_document_chunks(client, document_id)
            chunk_indices = pick_spread_indices(total_chunks, per_document)
            if not chunk_indices:
                continue
            payloads = await fetch_document_chunks(client, document_id, chunk_indices)
            for payload in payloads:
                text = coerce_text(payload.get("text")).strip()
                if not text:
                    continue
                file_name = coerce_text(payload.get("file_name")) or "Fuente"
                context_lines.append(f"(Fuente: {file_name}) {truncate_chunk(text)}")
                sources.append(
                    RagSource(
                        document_id=document_id,
                        chunk_id=int(payload.get("chunk_id") or 0),
                        score=0.0,
                        text=text,
                        file_name=payload.get("file_name"),
                        page=payload.get("page"),
                    )
                )
    return context_lines, sources
