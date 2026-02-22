from datetime import datetime, timezone

from ...db import db
from ...schemas.quickstart import (
    QuickstartExpansionOut,
    QuickstartSourceRef,
    QuickstartTopicOut,
)
from ...schemas.rag import RagSource
from .generation_service import generate_topic_expansion
from .normalization import coerce_text


def topic_to_out(topic: dict) -> QuickstartTopicOut:
    return QuickstartTopicOut(
        id=str(topic.get("id", "")),
        title=coerce_text(topic.get("title")),
        summary=coerce_text(topic.get("summary")),
        emoji=coerce_text(topic.get("emoji")) or None,
        key_points=[coerce_text(point) for point in topic.get("key_points", [])],
    )


def source_to_ref(source: RagSource) -> QuickstartSourceRef:
    return QuickstartSourceRef(
        document_id=source.document_id,
        chunk_id=source.chunk_id,
        score=source.score,
        file_name=source.file_name,
        page=source.page,
    )


def expansion_to_out(topic_id: str, expansion_doc: dict) -> QuickstartExpansionOut:
    sources_out = [
        QuickstartSourceRef(**source)
        for source in expansion_doc.get("sources", [])
        if isinstance(source, dict)
    ]
    return QuickstartExpansionOut(
        topic_id=topic_id,
        content=coerce_text(expansion_doc.get("content")),
        key_points=[coerce_text(point) for point in expansion_doc.get("key_points", [])],
        example_questions=[
            coerce_text(question)
            for question in expansion_doc.get("example_questions", [])
        ],
        sources=sources_out,
    )


async def get_or_create_topic_expansion(
    notebook: dict,
    user: dict,
    topic_id: str,
    topic: dict,
    fingerprint: str,
) -> QuickstartExpansionOut:
    expansion_filter = {
        "owner_id": user["_id"],
        "notebook_id": notebook["_id"],
        "topic_id": topic_id,
        "sources_fingerprint": fingerprint,
    }
    cached = await db.quickstart_expansions.find_one(expansion_filter)
    if cached:
        return expansion_to_out(topic_id, cached)

    expansion, sources = await generate_topic_expansion(
        notebook["title"], topic, notebook["_id"], user
    )
    sources_out = [source_to_ref(source) for source in sources]
    now = datetime.now(timezone.utc)
    await db.quickstart_expansions.update_one(
        expansion_filter,
        {
            "$set": {
                "owner_id": user["_id"],
                "notebook_id": notebook["_id"],
                "topic_id": topic_id,
                "sources_fingerprint": fingerprint,
                "content": expansion["content"],
                "key_points": expansion["key_points"],
                "example_questions": expansion["example_questions"],
                "sources": [source.model_dump() for source in sources_out],
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    return QuickstartExpansionOut(
        topic_id=topic_id,
        content=expansion["content"],
        key_points=expansion["key_points"],
        example_questions=expansion["example_questions"],
        sources=sources_out,
    )
