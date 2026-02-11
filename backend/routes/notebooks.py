import asyncio
from datetime import datetime, timezone

import httpx
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status
from pymongo import ReturnDocument
from supabase import create_client

from ..config import settings
from ..db import db
from ..schemas.notebooks import NotebookCreate, NotebookOut, NotebookUpdate
from .auth import get_current_user

router = APIRouter(prefix="/notebooks", tags=["notebooks"])

DEFAULT_NOTEBOOK_EMOJI = "📓"


def notebook_to_out(notebook: dict, source_count: int = 0) -> NotebookOut:
    return NotebookOut(
        id=str(notebook["_id"]),
        owner_id=str(notebook["owner_id"]),
        title=notebook["title"],
        description=notebook.get("description"),
        emoji=notebook.get("emoji"),
        source_count=source_count,
        created_at=notebook["created_at"],
        updated_at=notebook["updated_at"],
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


@router.post("", response_model=NotebookOut, status_code=status.HTTP_201_CREATED)
async def create_notebook(payload: NotebookCreate, request: Request) -> NotebookOut:
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    emoji = payload.emoji.strip() if payload.emoji else None
    notebook_doc = {
        "owner_id": user["_id"],
        "title": payload.title.strip(),
        "description": payload.description.strip() if payload.description else None,
        "emoji": emoji or DEFAULT_NOTEBOOK_EMOJI,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.notebooks.insert_one(notebook_doc)
    notebook_doc["_id"] = result.inserted_id
    return notebook_to_out(notebook_doc, source_count=0)


@router.get("", response_model=list[NotebookOut])
async def list_notebooks(request: Request) -> list[NotebookOut]:
    user = await get_current_user(request)
    cursor = db.notebooks.find({"owner_id": user["_id"]}).sort("created_at", -1)
    notebooks = [notebook async for notebook in cursor]

    counts = await asyncio.gather(
        *[
            db.documents.count_documents(
                {"notebook_id": notebook["_id"], "owner_id": user["_id"]}
            )
            for notebook in notebooks
        ]
    )

    return [
        notebook_to_out(notebook, source_count=count)
        for notebook, count in zip(notebooks, counts, strict=False)
    ]


@router.get("/{notebook_id}", response_model=NotebookOut)
async def get_notebook(notebook_id: str, request: Request) -> NotebookOut:
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

    source_count = await db.documents.count_documents(
        {"notebook_id": notebook_object_id, "owner_id": user["_id"]}
    )

    return notebook_to_out(notebook, source_count=source_count)


@router.patch("/{notebook_id}", response_model=NotebookOut)
async def update_notebook(
    notebook_id: str, payload: NotebookUpdate, request: Request
) -> NotebookOut:
    user = await get_current_user(request)
    try:
        notebook_object_id = ObjectId(notebook_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook inválido"
        ) from exc

    updates: dict[str, object] = {}
    if payload.title is not None:
        updates["title"] = payload.title.strip()
    if payload.description is not None:
        updates["description"] = payload.description.strip() or None
    if payload.emoji is not None:
        updates["emoji"] = payload.emoji.strip() or DEFAULT_NOTEBOOK_EMOJI

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay cambios para aplicar",
        )

    updates["updated_at"] = datetime.now(timezone.utc)

    notebook = await db.notebooks.find_one_and_update(
        {"_id": notebook_object_id, "owner_id": user["_id"]},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notebook no encontrado"
        )

    source_count = await db.documents.count_documents(
        {"notebook_id": notebook_object_id, "owner_id": user["_id"]}
    )

    return notebook_to_out(notebook, source_count=source_count)


@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(notebook_id: str, request: Request) -> None:
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

    documents = [
        document
        async for document in db.documents.find(
            {"notebook_id": notebook_object_id, "owner_id": user["_id"]}
        )
    ]

    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supabase no está configurado",
        )

    supabase_client = create_client(
        settings.supabase_url, settings.supabase_service_role_key
    )

    for document in documents:
        async with httpx.AsyncClient(
            base_url=settings.qdrant_url, timeout=20
        ) as client:
            response = await client.post(
                f"/collections/{settings.qdrant_collection_name}/points/delete",
                json={
                    "filter": {
                        "must": [
                            {
                                "key": "document_id",
                                "match": {"value": str(document["_id"])},
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

        bucket, storage_path = parse_storage_path(document["file_path"])
        storage_response = supabase_client.storage.from_(bucket).remove([storage_path])
        if isinstance(storage_response, dict) and storage_response.get("error"):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo eliminar archivo en Supabase",
            )

    await db.documents.delete_many(
        {"notebook_id": notebook_object_id, "owner_id": user["_id"]}
    )
    await db.notebooks.delete_one({"_id": notebook_object_id, "owner_id": user["_id"]})

    return None
