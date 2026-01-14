from datetime import datetime, timezone

import httpx
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status
from supabase import create_client

from ..config import settings
from ..db import db
from ..ingestion import process_document
from ..rq_queue import queue
from ..schemas import DocumentCreate, DocumentCreateResponse, DocumentOut
from .auth import get_current_user

router = APIRouter(prefix="/notebooks", tags=["documents"])


def document_to_out(document: dict) -> DocumentOut:
    return DocumentOut(
        id=str(document["_id"]),
        owner_id=str(document["owner_id"]),
        notebook_id=str(document["notebook_id"]),
        file_path=document["file_path"],
        file_name=document["file_name"],
        content_type=document["content_type"],
        status=document["status"],
        created_at=document["created_at"],
        updated_at=document["updated_at"],
        error=document.get("error"),
    )


def parse_storage_path(file_path: str) -> tuple[str, str]:
    if "/" in file_path:
        bucket, storage_path = file_path.split("/", 1)
        return bucket, storage_path
    if settings.supabase_storage_bucket:
        return settings.supabase_storage_bucket, file_path
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="file_path debe incluir bucket/path o configurar supabase_storage_bucket",
    )


@router.post(
    "/{notebook_id}/documents",
    response_model=DocumentCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document(
    notebook_id: str, payload: DocumentCreate, request: Request
) -> DocumentCreateResponse:
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

    now = datetime.now(timezone.utc)
    document_doc = {
        "owner_id": user["_id"],
        "notebook_id": notebook_object_id,
        "file_path": payload.file_path.strip(),
        "file_name": payload.file_name.strip(),
        "content_type": payload.content_type,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "error": None,
    }
    result = await db.documents.insert_one(document_doc)
    document_doc["_id"] = result.inserted_id

    job = queue.enqueue(process_document, str(result.inserted_id))
    job_doc = {
        "job_id": job.id,
        "document_id": result.inserted_id,
        "notebook_id": notebook_object_id,
        "owner_id": user["_id"],
        "status": "queued",
        "started_at": None,
        "finished_at": None,
        "error": None,
        "created_at": now,
    }
    await db.ingestion_jobs.insert_one(job_doc)

    return DocumentCreateResponse(document=document_to_out(document_doc), job_id=job.id)


@router.get("/{notebook_id}/documents", response_model=list[DocumentOut])
async def list_documents(notebook_id: str, request: Request) -> list[DocumentOut]:
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

    cursor = db.documents.find(
        {"notebook_id": notebook_object_id, "owner_id": user["_id"]}
    ).sort("created_at", -1)
    return [document_to_out(document) async for document in cursor]


@router.delete(
    "/{notebook_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document(notebook_id: str, document_id: str, request: Request) -> None:
    user = await get_current_user(request)
    try:
        notebook_object_id = ObjectId(notebook_id)
        document_object_id = ObjectId(document_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Identificador inválido"
        ) from exc

    document = await db.documents.find_one(
        {
            "_id": document_object_id,
            "notebook_id": notebook_object_id,
            "owner_id": user["_id"],
        }
    )
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado"
        )

    async with httpx.AsyncClient(base_url=settings.qdrant_url, timeout=20) as client:
        response = await client.post(
            f"/collections/{settings.qdrant_collection_name}/points/delete",
            json={
                "filter": {
                    "must": [
                        {
                            "key": "document_id",
                            "match": {"value": str(document_object_id)},
                        }
                    ]
                }
            },
            params={"wait": "true"},
        )
        if response.status_code not in (200, 202):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo eliminar embeddings en Qdrant",
            )

    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supabase no está configurado",
        )

    bucket, storage_path = parse_storage_path(document["file_path"])
    supabase_client = create_client(
        settings.supabase_url, settings.supabase_service_role_key
    )
    storage_response = supabase_client.storage.from_(bucket).remove([storage_path])
    if isinstance(storage_response, dict) and storage_response.get("error"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo eliminar archivo en Supabase",
        )

    await db.documents.delete_one({"_id": document_object_id})
    return None
