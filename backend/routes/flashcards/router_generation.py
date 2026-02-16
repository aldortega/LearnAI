from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from ...db import db
from ...rq_queue import flashcards_queue
from ...schemas.flashcards import (
    FlashcardsGenerateRequest,
    FlashcardsGenerationJobOut,
    FlashcardsOut,
)
from ..auth import get_current_user
from .jobs import process_flashcards_generation
from .normalization import normalize_topic_prompt
from .repository import (
    build_flashcards_out,
    compute_sources_fingerprint,
    get_notebook_or_404,
)

router = APIRouter(tags=["flashcards"])


def map_flashcards_generation_job(job_doc: dict) -> FlashcardsGenerationJobOut:
    return FlashcardsGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get("/{notebook_id}/flashcards", response_model=FlashcardsOut)
async def get_flashcards(notebook_id: str, request: Request) -> FlashcardsOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    flashcards_doc = await db.flashcard_sets.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    fingerprint, ready_count = await compute_sources_fingerprint(
        notebook["title"],
        notebook["_id"],
        notebook["owner_id"],
    )
    has_ready_sources = ready_count > 0

    status_value = "missing"
    if flashcards_doc:
        status_value = (
            "ready"
            if flashcards_doc.get("sources_fingerprint") == fingerprint
            else "stale"
        )

    return build_flashcards_out(
        notebook_id=str(notebook["_id"]),
        has_ready_sources=has_ready_sources,
        status_value=status_value,
        flashcards_doc=flashcards_doc,
    )


@router.delete("/{notebook_id}/flashcards", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcards(notebook_id: str, request: Request) -> None:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    flashcards_doc = await db.flashcard_sets.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not flashcards_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcards no encontradas",
        )

    active_job = await db.flashcard_generation_jobs.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": {"$in": ["queued", "processing"]},
        }
    )
    if active_job:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pueden regenerar flashcards mientras se estan generando",
        )

    await db.flashcard_sets.delete_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )


@router.post(
    "/{notebook_id}/flashcards/generate",
    response_model=FlashcardsGenerationJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_flashcards(
    notebook_id: str,
    request: Request,
    payload: FlashcardsGenerateRequest | None = None,
) -> FlashcardsGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    _, ready_count = await compute_sources_fingerprint(
        notebook["title"],
        notebook["_id"],
        notebook["owner_id"],
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para generar flashcards",
        )

    generate_payload = payload or FlashcardsGenerateRequest()
    job = flashcards_queue.enqueue(
        process_flashcards_generation,
        str(notebook["_id"]),
        str(user["_id"]),
    )
    now = datetime.now(timezone.utc)
    await db.flashcard_generation_jobs.insert_one(
        {
            "job_id": job.id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "error": None,
            "card_count": generate_payload.card_count,
            "difficulty": generate_payload.difficulty,
            "topic_prompt": normalize_topic_prompt(generate_payload.topic_prompt),
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    return FlashcardsGenerationJobOut(job_id=job.id, status="queued")


@router.get(
    "/{notebook_id}/flashcards/generate",
    response_model=FlashcardsGenerationJobOut,
)
async def get_latest_flashcards_generation(
    notebook_id: str,
    request: Request,
) -> FlashcardsGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.flashcard_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )

    return map_flashcards_generation_job(job_doc)


@router.get(
    "/{notebook_id}/flashcards/generate/{job_id}",
    response_model=FlashcardsGenerationJobOut,
)
async def get_flashcards_generation_status(
    notebook_id: str,
    job_id: str,
    request: Request,
) -> FlashcardsGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.flashcard_generation_jobs.find_one(
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

    return map_flashcards_generation_job(job_doc)
