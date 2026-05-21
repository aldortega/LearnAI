import hashlib
from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db import db
from ...schemas.audio import (
    AudioScriptSegment,
    AudioSourceRef,
    PodcastDetailOut,
    PodcastOut,
)
from ..notebook_access import resolve_notebook_access
from .constants import (
    MAX_PODCAST_DESCRIPTION_CHARS,
    MAX_PODCAST_TITLE_CHARS,
)
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


def _parse_sources(raw_sources: object) -> list[AudioSourceRef]:
    if not isinstance(raw_sources, list):
        return []
    return [
        AudioSourceRef(**source)
        for source in raw_sources
        if isinstance(source, dict)
    ]


def _parse_script(raw_script: object) -> list[AudioScriptSegment]:
    if not isinstance(raw_script, list):
        return []
    segments: list[AudioScriptSegment] = []
    for entry in raw_script:
        if not isinstance(entry, dict):
            continue
        speaker = coerce_text(entry.get("speaker")).strip()
        text = coerce_text(entry.get("text")).strip()
        if not speaker or not text:
            continue
        segments.append(AudioScriptSegment(speaker=speaker, text=text))
    return segments


def podcast_doc_to_out(podcast_doc: dict, current_fingerprint: str) -> PodcastOut:
    podcast_fingerprint = coerce_text(podcast_doc.get("sources_fingerprint"))
    title = normalize_title(coerce_text(podcast_doc.get("title")))[:MAX_PODCAST_TITLE_CHARS]
    description = normalize_prompt(
        coerce_text(podcast_doc.get("description"))
    )[:MAX_PODCAST_DESCRIPTION_CHARS]
    return PodcastOut(
        id=str(podcast_doc["_id"]),
        notebook_id=str(podcast_doc["notebook_id"]),
        owner_id=str(podcast_doc["owner_id"]),
        format_type=podcast_doc["format_type"],
        duration=podcast_doc.get("duration", "default"),
        title=title,
        description=description,
        topic=coerce_text(podcast_doc.get("topic")),
        audio_url=coerce_text(podcast_doc.get("audio_url")),
        audio_path=coerce_text(podcast_doc.get("audio_path")),
        duration_seconds=float(podcast_doc.get("duration_seconds") or 0.0),
        sources_fingerprint=podcast_fingerprint,
        is_stale=podcast_fingerprint != current_fingerprint,
        sources=_parse_sources(podcast_doc.get("sources")),
        created_at=podcast_doc["created_at"],
    )


def podcast_doc_to_detail(podcast_doc: dict, current_fingerprint: str) -> PodcastDetailOut:
    base = podcast_doc_to_out(podcast_doc, current_fingerprint)
    return PodcastDetailOut(
        **base.model_dump(),
        script=_parse_script(podcast_doc.get("script")),
    )
