from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status
from pymongo import ReturnDocument

from ..db import db
from ..schemas import NotebookCreate, NotebookOut, NotebookUpdate
from .auth import get_current_user

router = APIRouter(prefix="/notebooks", tags=["notebooks"])


def notebook_to_out(notebook: dict) -> NotebookOut:
    return NotebookOut(
        id=str(notebook["_id"]),
        owner_id=str(notebook["owner_id"]),
        title=notebook["title"],
        description=notebook.get("description"),
        created_at=notebook["created_at"],
        updated_at=notebook["updated_at"],
    )


@router.post("", response_model=NotebookOut, status_code=status.HTTP_201_CREATED)
async def create_notebook(payload: NotebookCreate, request: Request) -> NotebookOut:
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    notebook_doc = {
        "owner_id": user["_id"],
        "title": payload.title.strip(),
        "description": payload.description.strip() if payload.description else None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.notebooks.insert_one(notebook_doc)
    notebook_doc["_id"] = result.inserted_id
    return notebook_to_out(notebook_doc)


@router.get("", response_model=list[NotebookOut])
async def list_notebooks(request: Request) -> list[NotebookOut]:
    user = await get_current_user(request)
    cursor = db.notebooks.find({"owner_id": user["_id"]}).sort("created_at", -1)
    notebooks = [notebook_to_out(notebook) async for notebook in cursor]
    return notebooks


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

    return notebook_to_out(notebook)


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

    return notebook_to_out(notebook)


@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(notebook_id: str, request: Request) -> None:
    user = await get_current_user(request)
    try:
        notebook_object_id = ObjectId(notebook_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook inválido"
        ) from exc

    result = await db.notebooks.delete_one(
        {"_id": notebook_object_id, "owner_id": user["_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notebook no encontrado"
        )

    return None
