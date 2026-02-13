import hashlib
from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db import db
from ..notebook_access import resolve_notebook_access
from .normalization import coerce_text


async def get_notebook_or_404(notebook_id: str, user: dict) -> dict:
    access = await resolve_notebook_access(notebook_id, user)
    return access.notebook


async def fetch_ready_documents(
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    db_client: AsyncIOMotorDatabase | None = None,
) -> list[dict]:
    db_ref = db if db_client is None else db_client
    cursor = db_ref.documents.find(
        {"notebook_id": notebook_object_id, "owner_id": owner_id, "status": "done"},
        {"_id": 1, "updated_at": 1},
    ).sort("_id", 1)
    return [document async for document in cursor]


def build_sources_fingerprint(title: str, documents: list[dict]) -> str:
    hasher = hashlib.sha256()
    hasher.update(title.strip().encode("utf-8"))
    for document in documents:
        hasher.update(str(document.get("_id", "")).encode("utf-8"))
        updated_at = document.get("updated_at")
        if isinstance(updated_at, datetime):
            hasher.update(updated_at.isoformat().encode("utf-8"))
        else:
            hasher.update(coerce_text(updated_at).encode("utf-8"))
    return hasher.hexdigest()


async def compute_sources_fingerprint(
    title: str,
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    db_client: AsyncIOMotorDatabase | None = None,
) -> tuple[str, int]:
    documents = await fetch_ready_documents(
        notebook_object_id, owner_id, db_client=db_client
    )
    fingerprint = build_sources_fingerprint(title, documents)
    return fingerprint, len(documents)


async def resolve_quickstart_topic_context(
    notebook_id: str,
    topic_id: str,
    user: dict,
) -> tuple[dict, dict, str]:
    notebook = await get_notebook_or_404(notebook_id, user)
    summary = await db.quickstart_summaries.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inicio rapido no encontrado",
        )

    fingerprint, _ = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], notebook["owner_id"]
    )
    if summary.get("sources_fingerprint") != fingerprint:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El inicio rapido esta desactualizado. Regeneralo para continuar.",
        )

    topics = summary.get("topics", [])
    topics_list = topics if isinstance(topics, list) else []
    topic = next(
        (
            item
            for item in topics_list
            if isinstance(item, dict) and coerce_text(item.get("id")) == topic_id
        ),
        None,
    )
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tema no encontrado"
        )

    return notebook, topic, fingerprint
