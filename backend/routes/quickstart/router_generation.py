from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from ...db import db
from ...rq_queue import quickstart_queue
from ...schemas.quickstart import (
    QuickstartGenerationJobOut,
    QuickstartOut,
    QuickstartSuggestionsOut,
    QuickstartTopicOut,
)
from ..auth import get_current_user
from .jobs import process_quickstart_generation
from .service import (
    TOPIC_LIMIT,
    coerce_text,
    compute_sources_fingerprint,
    generate_quickstart_suggestions,
    get_notebook_or_404,
    normalize_notebook_summary,
    normalize_topic_title,
    topic_to_out,
)

router = APIRouter(tags=["quickstart"])


@router.get("/{notebook_id}/quickstart", response_model=QuickstartOut)
async def get_quickstart(notebook_id: str, request: Request) -> QuickstartOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    summary = await db.quickstart_summaries.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    fingerprint, ready_count = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], notebook["owner_id"]
    )
    has_ready_sources = ready_count > 0

    status_value: str = "missing"
    notebook_summary = ""
    topics_out: list[QuickstartTopicOut] = []
    generated_at: datetime | None = None

    if summary:
        raw_topics = summary.get("topics", [])
        topics_list = raw_topics if isinstance(raw_topics, list) else []
        status_value = (
            "ready"
            if summary.get("sources_fingerprint") == fingerprint
            else "stale"
        )
        topics_out = [topic_to_out(topic) for topic in topics_list]
        notebook_summary = normalize_notebook_summary(
            summary.get("notebook_summary"),
            notebook["title"],
            topics_list,
        )
        generated_at = summary.get("updated_at") or summary.get("created_at")

    return QuickstartOut(
        notebook_id=str(notebook["_id"]),
        has_ready_sources=has_ready_sources,
        status=(
            status_value
            if status_value in ("missing", "ready", "stale")
            else "missing"
        ),
        generated_at=generated_at,
        notebook_summary=notebook_summary,
        topics=topics_out,
    )


@router.get(
    "/{notebook_id}/quickstart/suggestions",
    response_model=QuickstartSuggestionsOut,
)
async def get_quickstart_suggestions(
    notebook_id: str, request: Request
) -> QuickstartSuggestionsOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    summary = await db.quickstart_summaries.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inicio rapido no encontrado",
        )

    topics = summary.get("topics", [])
    topics_list = topics if isinstance(topics, list) else []
    topic_count = len(topics_list)
    fingerprint, ready_count = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], notebook["owner_id"]
    )
    has_ready_sources = ready_count > 0
    is_stale = summary.get("sources_fingerprint") != fingerprint

    can_add_topics = has_ready_sources and not is_stale and topic_count < TOPIC_LIMIT
    if not can_add_topics:
        return QuickstartSuggestionsOut(
            suggestions=[],
            topic_count=topic_count,
            topic_limit=TOPIC_LIMIT,
            can_add_topics=False,
        )

    existing_titles = [
        normalize_topic_title(coerce_text(topic.get("title")))
        for topic in topics_list
        if normalize_topic_title(coerce_text(topic.get("title")))
    ]
    existing_title_keys = {title.lower() for title in existing_titles}

    cached_suggestions = await db.quickstart_suggestions.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )

    if cached_suggestions:
        raw_suggestions = cached_suggestions.get("suggestions", [])
        normalized_suggestions: list[str] = []
        seen_keys: set[str] = set()
        if isinstance(raw_suggestions, list):
            for suggestion in raw_suggestions:
                title = normalize_topic_title(coerce_text(suggestion))
                if not title:
                    continue
                key = title.lower()
                if key in existing_title_keys or key in seen_keys:
                    continue
                normalized_suggestions.append(title)
                seen_keys.add(key)
        return QuickstartSuggestionsOut(
            suggestions=normalized_suggestions,
            topic_count=topic_count,
            topic_limit=TOPIC_LIMIT,
            can_add_topics=True,
        )

    suggestions = await generate_quickstart_suggestions(
        notebook["title"], existing_titles, notebook["_id"], user
    )
    now = datetime.now(timezone.utc)
    await db.quickstart_suggestions.update_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        {
            "$set": {
                "suggestions": suggestions,
                "updated_at": now,
            },
            "$setOnInsert": {
                "owner_id": user["_id"],
                "notebook_id": notebook["_id"],
                "created_at": now,
            },
        },
        upsert=True,
    )
    return QuickstartSuggestionsOut(
        suggestions=suggestions,
        topic_count=topic_count,
        topic_limit=TOPIC_LIMIT,
        can_add_topics=True,
    )


@router.post(
    "/{notebook_id}/quickstart/generate",
    response_model=QuickstartGenerationJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_quickstart(
    notebook_id: str, request: Request
) -> QuickstartGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    _, ready_count = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], notebook["owner_id"]
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para generar el inicio rapido",
        )

    job = quickstart_queue.enqueue(
        process_quickstart_generation,
        str(notebook["_id"]),
        str(user["_id"]),
    )
    now = datetime.now(timezone.utc)
    await db.quickstart_generation_jobs.insert_one(
        {
            "job_id": job.id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "error": None,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    return QuickstartGenerationJobOut(job_id=job.id, status="queued")


@router.get(
    "/{notebook_id}/quickstart/generate", response_model=QuickstartGenerationJobOut
)
async def get_latest_quickstart_generation(
    notebook_id: str, request: Request
) -> QuickstartGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.quickstart_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado"
        )

    return QuickstartGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get(
    "/{notebook_id}/quickstart/generate/{job_id}",
    response_model=QuickstartGenerationJobOut,
)
async def get_quickstart_generation_status(
    notebook_id: str, job_id: str, request: Request
) -> QuickstartGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.quickstart_generation_jobs.find_one(
        {
            "job_id": job_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado"
        )

    return QuickstartGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )
