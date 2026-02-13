from dataclasses import dataclass

from bson import ObjectId
from fastapi import HTTPException, status

from ..db import db


@dataclass(frozen=True)
class NotebookAccess:
    notebook: dict
    role: str
    can_manage_documents: bool


async def resolve_notebook_access(notebook_id: str, user: dict) -> NotebookAccess:
    try:
        notebook_object_id = ObjectId(notebook_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook invalido",
        ) from exc

    notebook = await db.notebooks.find_one({"_id": notebook_object_id})
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook no encontrado",
        )

    if notebook["owner_id"] == user["_id"]:
        return NotebookAccess(
            notebook=notebook,
            role="owner",
            can_manage_documents=True,
        )

    membership = await db.notebook_memberships.find_one(
        {
            "notebook_id": notebook_object_id,
            "member_id": user["_id"],
            "revoked_at": None,
        }
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook no encontrado",
        )

    permission = str(membership.get("permission") or "read_only")
    can_manage_documents = permission == "can_manage_documents"
    return NotebookAccess(
        notebook=notebook,
        role="collaborator",
        can_manage_documents=can_manage_documents,
    )


async def require_notebook_owner(notebook_id: str, user: dict) -> NotebookAccess:
    access = await resolve_notebook_access(notebook_id, user)
    if access.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el owner puede realizar esta accion",
        )
    return access


async def require_document_manage_permission(
    notebook_id: str,
    user: dict,
) -> NotebookAccess:
    access = await resolve_notebook_access(notebook_id, user)
    if not access.can_manage_documents:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para gestionar documentos",
        )
    return access
