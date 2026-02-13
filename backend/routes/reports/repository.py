import hashlib
from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db import db
from ...schemas.reports import ReportOut, ReportSourceRef
from ..notebook_access import resolve_notebook_access
from .constants import MAX_REPORT_DESCRIPTION_CHARS, MAX_REPORT_TITLE_CHARS
from .normalization import coerce_text, normalize_prompt, normalize_title


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
    return build_sources_fingerprint(title, documents), len(documents)


def report_doc_to_out(report_doc: dict, current_fingerprint: str) -> ReportOut:
    source_docs = report_doc.get("sources", [])
    sources = [
        ReportSourceRef(**source_doc)
        for source_doc in source_docs
        if isinstance(source_doc, dict)
    ]
    report_fingerprint = coerce_text(report_doc.get("sources_fingerprint"))
    report_content = coerce_text(report_doc.get("content"))
    report_description = normalize_prompt(coerce_text(report_doc.get("description")))
    format_type = report_doc["format_type"]
    prompt_used = coerce_text(report_doc.get("prompt_used"))
    report_title = normalize_title(coerce_text(report_doc.get("title")))
    return ReportOut(
        id=str(report_doc["_id"]),
        notebook_id=str(report_doc["notebook_id"]),
        owner_id=str(report_doc["owner_id"]),
        format_type=format_type,
        title=report_title[:MAX_REPORT_TITLE_CHARS],
        prompt_used=prompt_used,
        description=report_description[:MAX_REPORT_DESCRIPTION_CHARS],
        content=report_content,
        sources_fingerprint=report_fingerprint,
        is_stale=report_fingerprint != current_fingerprint,
        sources=sources,
        created_at=report_doc["created_at"],
    )
