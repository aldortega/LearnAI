from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from ...config import settings
from ...db import db
from ...rq_queue import audio_queue
from ...schemas.audio import (
    AudioConfigOut,
    AudioGenerateRequest,
    AudioGenerationJobOut,
    AudioSuggestionsJobOut,
)
from ..auth import get_current_user
from .constants import AUDIO_DURATION_CONFIGS, AUDIO_FORMAT_CONFIGS
from .jobs import process_audio_generation, process_audio_suggestions_generation
from .normalization import coerce_text
from .repository import compute_sources_fingerprint, get_notebook_or_404
from .suggestions_service import build_format_templates, get_audio_suggestions_snapshot


router = APIRouter(tags=["audio"])


def map_audio_generation_job(job_doc: dict) -> AudioGenerationJobOut:
    return AudioGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        podcast_id=str(job_doc["podcast_id"]) if job_doc.get("podcast_id") else None,
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


def map_audio_suggestions_job(job_doc: dict) -> AudioSuggestionsJobOut:
    return AudioSuggestionsJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get("/{notebook_id}/audio/config", response_model=AudioConfigOut)
async def get_audio_config(notebook_id: str, request: Request) -> AudioConfigOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    notebook_title = coerce_text(notebook.get("title"))
    sources_fingerprint, ready_count = await compute_sources_fingerprint(
        notebook_title,
        notebook["_id"],
        notebook["owner_id"],
    )
    has_ready_sources = ready_count > 0

    suggestions, suggestions_is_stale = await get_audio_suggestions_snapshot(
        notebook["_id"],
        user["_id"],
        notebook_title,
        sources_fingerprint,
    )

    latest_job_doc = await db.audio_suggestion_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )

    suggestions_status: str = "missing"
    suggestions_error: str | None = None
    suggestions_job_id: str | None = None

    if suggestions:
        suggestions_status = "ready"

    if latest_job_doc:
        suggestions_job_id = latest_job_doc["job_id"]
        latest_status = coerce_text(latest_job_doc.get("status"))
        latest_error = coerce_text(latest_job_doc.get("error")) or None
        if latest_status in {"queued", "processing"}:
            if not suggestions or suggestions_is_stale:
                suggestions_status = "generating"
        elif latest_status == "failed":
            if not suggestions or suggestions_is_stale:
                suggestions_status = "failed"
                suggestions_error = latest_error

    return AudioConfigOut(
        has_ready_sources=has_ready_sources,
        templates=build_format_templates(),
        suggestions=suggestions,
        suggestions_status=suggestions_status,
        suggestions_is_stale=suggestions_is_stale,
        suggestions_error=suggestions_error,
        suggestions_job_id=suggestions_job_id,
    )


@router.post(
    "/{notebook_id}/audio/suggestions/generate",
    response_model=AudioSuggestionsJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_audio_suggestions_endpoint(
    notebook_id: str, request: Request
) -> AudioSuggestionsJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    sources_fingerprint, ready_count = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        notebook["owner_id"],
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para generar sugerencias",
        )

    active_job_doc = await db.audio_suggestion_generation_jobs.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": {"$in": ["queued", "processing"]},
        },
        sort=[("created_at", -1)],
    )
    if active_job_doc:
        return map_audio_suggestions_job(active_job_doc)

    job = audio_queue.enqueue(
        process_audio_suggestions_generation,
        str(notebook["_id"]),
        str(user["_id"]),
        sources_fingerprint,
    )
    now = datetime.now(timezone.utc)
    await db.audio_suggestion_generation_jobs.insert_one(
        {
            "job_id": job.id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "error": None,
            "sources_fingerprint": sources_fingerprint,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    return AudioSuggestionsJobOut(job_id=job.id, status="queued")


@router.get(
    "/{notebook_id}/audio/suggestions/generate",
    response_model=AudioSuggestionsJobOut,
)
async def get_latest_audio_suggestions_generation(
    notebook_id: str, request: Request
) -> AudioSuggestionsJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.audio_suggestion_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )
    return map_audio_suggestions_job(job_doc)


@router.get(
    "/{notebook_id}/audio/suggestions/generate/{job_id}",
    response_model=AudioSuggestionsJobOut,
)
async def get_audio_suggestions_generation_status(
    notebook_id: str,
    job_id: str,
    request: Request,
) -> AudioSuggestionsJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.audio_suggestion_generation_jobs.find_one(
        {
            "job_id": job_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )
    return map_audio_suggestions_job(job_doc)


@router.post(
    "/{notebook_id}/audio/generate",
    response_model=AudioGenerationJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_audio_endpoint(
    notebook_id: str,
    payload: AudioGenerateRequest,
    request: Request,
) -> AudioGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    if payload.format_type not in AUDIO_FORMAT_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de audio invalido",
        )
    if payload.duration not in AUDIO_DURATION_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duracion de audio invalida",
        )

    _, ready_count = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        notebook["owner_id"],
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para generar audios",
        )

    active_job_doc = await db.audio_generation_jobs.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": {"$in": ["queued", "processing"]},
        },
        sort=[("created_at", -1)],
    )
    if active_job_doc:
        return map_audio_generation_job(active_job_doc)

    topic = (payload.topic or "").strip()[:500]
    job = audio_queue.enqueue(
        process_audio_generation,
        str(notebook["_id"]),
        str(user["_id"]),
        job_timeout=settings.audio_job_timeout_seconds,
    )
    now = datetime.now(timezone.utc)
    await db.audio_generation_jobs.insert_one(
        {
            "job_id": job.id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "error": None,
            "podcast_id": None,
            "format_type": payload.format_type,
            "duration": payload.duration,
            "topic": topic,
            "suggestion_id": payload.suggestion_id,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    return AudioGenerationJobOut(job_id=job.id, status="queued")


@router.get("/{notebook_id}/audio/generate", response_model=AudioGenerationJobOut)
async def get_latest_audio_generation(
    notebook_id: str, request: Request
) -> AudioGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.audio_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )
    return map_audio_generation_job(job_doc)


@router.get(
    "/{notebook_id}/audio/generate/{job_id}",
    response_model=AudioGenerationJobOut,
)
async def get_audio_generation_status(
    notebook_id: str,
    job_id: str,
    request: Request,
) -> AudioGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.audio_generation_jobs.find_one(
        {
            "job_id": job_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )
    return map_audio_generation_job(job_doc)
