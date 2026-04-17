import hashlib
from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db import db
from ...schemas.presentations import (
    PresentationOut,
    PresentationSlideOut,
    PresentationSourceRef,
)
from ..notebook_access import resolve_notebook_access
from .constants import (
    MAX_PRESENTATION_SUMMARY_CHARS,
    MAX_PRESENTATION_TITLE_CHARS,
)
from .normalization import (
    bullets_to_markdown,
    coerce_text,
    normalize_markdown_content,
    normalize_text,
)


def build_public_image_url(image_path: str) -> str | None:
    from ...config import settings

    image_path_value = coerce_text(image_path).strip()
    if not image_path_value:
        return None
    if image_path_value.startswith("http://") or image_path_value.startswith(
        "https://"
    ):
        return image_path_value
    bucket = coerce_text(settings.supabase_storage_bucket).strip()
    base_url = coerce_text(settings.supabase_url).strip()
    if not bucket or not base_url:
        return None
    return (
        f"{base_url.rstrip('/')}/storage/v1/object/public/{bucket}/{image_path_value}"
    )


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


def presentation_doc_to_out(
    presentation_doc: dict, current_fingerprint: str
) -> PresentationOut:
    raw_sources = presentation_doc.get("sources", [])
    sources = [
        PresentationSourceRef(**source_doc)
        for source_doc in raw_sources
        if isinstance(source_doc, dict)
    ]

    raw_slides = presentation_doc.get("slides", [])
    slides: list[PresentationSlideOut] = []
    for index, slide_doc in enumerate(raw_slides, start=1):
        if not isinstance(slide_doc, dict):
            continue
        slide_format = coerce_text(slide_doc.get("format")).strip() or "markdown"
        slide_index_raw = slide_doc.get("index")
        slide_index = slide_index_raw if isinstance(slide_index_raw, int) else index
        content_markdown = None
        image_path = None
        image_url = None
        image_prompt = None

        if slide_format == "image":
            image_path = coerce_text(slide_doc.get("image_path")).strip() or None
            image_url = build_public_image_url(
                coerce_text(slide_doc.get("image_url")).strip()
                or coerce_text(image_path)
            )
            image_prompt = coerce_text(slide_doc.get("image_prompt")).strip() or None
            if not image_url:
                continue
        else:
            content_markdown = normalize_markdown_content(
                coerce_text(slide_doc.get("content_markdown"))
            )
            if not content_markdown:
                legacy_bullets = slide_doc.get("bullets")
                if isinstance(legacy_bullets, list):
                    content_markdown = bullets_to_markdown(legacy_bullets)
            if not content_markdown:
                continue
        slides.append(
            PresentationSlideOut(
                index=max(1, slide_index),
                format="image" if slide_format == "image" else "markdown",
                title=normalize_text(coerce_text(slide_doc.get("title"))),
                subtitle=normalize_text(coerce_text(slide_doc.get("subtitle"))) or None,
                content_markdown=content_markdown,
                image_path=image_path,
                image_url=image_url,
                image_prompt=image_prompt,
            )
        )

    title = normalize_text(coerce_text(presentation_doc.get("title")))
    summary = normalize_text(coerce_text(presentation_doc.get("summary")))
    sources_fingerprint = coerce_text(presentation_doc.get("sources_fingerprint"))

    return PresentationOut(
        id=str(presentation_doc["_id"]),
        notebook_id=str(presentation_doc["notebook_id"]),
        owner_id=str(presentation_doc["owner_id"]),
        topic=normalize_text(coerce_text(presentation_doc.get("topic"))),
        detail_level=presentation_doc["detail_level"],
        generation_mode=coerce_text(presentation_doc.get("generation_mode")) or "text",
        title=title[:MAX_PRESENTATION_TITLE_CHARS],
        summary=summary[:MAX_PRESENTATION_SUMMARY_CHARS],
        slides=slides,
        sources_fingerprint=sources_fingerprint,
        is_stale=sources_fingerprint != current_fingerprint,
        sources=sources,
        created_at=presentation_doc["created_at"],
    )
