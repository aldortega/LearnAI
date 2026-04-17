from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from ...config import settings
from ...db import db
from ...rq_queue import presentations_queue
from ...schemas.presentations import (
    PresentationConfigOut,
    PresentationGenerateRequest,
    PresentationGenerationJobOut,
)
from ..auth import get_current_user
from .jobs import process_presentation_generation
from .normalization import coerce_text
from .repository import compute_sources_fingerprint, get_notebook_or_404

router = APIRouter(tags=["presentations"])


def map_presentation_generation_job(job_doc: dict) -> PresentationGenerationJobOut:
    return PresentationGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        presentation_id=str(job_doc["presentation_id"])
        if job_doc.get("presentation_id")
        else None,
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get("/{notebook_id}/presentations/config", response_model=PresentationConfigOut)
async def get_presentations_config(
    notebook_id: str,
    request: Request,
) -> PresentationConfigOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    _, ready_count = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        notebook["owner_id"],
    )

    return PresentationConfigOut(
        has_ready_sources=ready_count > 0,
    )


@router.post(
    "/{notebook_id}/presentations/generate",
    response_model=PresentationGenerationJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_presentation(
    notebook_id: str,
    payload: PresentationGenerateRequest,
    request: Request,
) -> PresentationGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    topic = coerce_text(payload.topic).strip()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El tema es obligatorio",
        )

    _, ready_count = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        notebook["owner_id"],
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para generar presentaciones",
        )

    active_job_doc = await db.presentation_generation_jobs.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": {"$in": ["queued", "processing"]},
        },
        sort=[("created_at", -1)],
    )
    if active_job_doc:
        return map_presentation_generation_job(active_job_doc)

    job = presentations_queue.enqueue(
        process_presentation_generation,
        str(notebook["_id"]),
        str(user["_id"]),
        job_timeout=settings.presentation_job_timeout_seconds,
    )
    now = datetime.now(timezone.utc)
    await db.presentation_generation_jobs.insert_one(
        {
            "job_id": job.id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "error": None,
            "presentation_id": None,
            "topic": topic,
            "detail_level": payload.detail_level,
            "generation_mode": payload.generation_mode,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    return PresentationGenerationJobOut(job_id=job.id, status="queued")


@router.get(
    "/{notebook_id}/presentations/generate",
    response_model=PresentationGenerationJobOut,
)
async def get_latest_presentation_generation(
    notebook_id: str,
    request: Request,
) -> PresentationGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.presentation_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )

    return map_presentation_generation_job(job_doc)


@router.get(
    "/{notebook_id}/presentations/generate/{job_id}",
    response_model=PresentationGenerationJobOut,
)
async def get_presentation_generation_status(
    notebook_id: str,
    job_id: str,
    request: Request,
) -> PresentationGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.presentation_generation_jobs.find_one(
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

    return map_presentation_generation_job(job_doc)
