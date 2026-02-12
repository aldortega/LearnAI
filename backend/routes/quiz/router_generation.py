from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from ...db import db
from ...rq_queue import quiz_queue
from ...schemas.quiz import QuizGenerateRequest, QuizGenerationJobOut, RoadmapOut
from ..auth import get_current_user
from .job_service import process_quiz_generation
from .progress_service import build_roadmap_response
from .repository import (
    delete_quiz_notebook_data,
    find_latest_quiz_generation_job,
    find_quiz_generation_job,
    find_quiz_roadmap,
)
from .generation_service import get_notebook_or_404
from .llm import resolve_difficulty_label, resolve_generation_config

router = APIRouter(tags=["quiz"])


@router.post(
    "/{notebook_id}/roadmap/generate",
    response_model=QuizGenerationJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_roadmap(
    notebook_id: str, payload: QuizGenerateRequest, request: Request
) -> QuizGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    try:
        resolve_generation_config(payload.length)
        resolve_difficulty_label(payload.difficulty)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    job = quiz_queue.enqueue(
        process_quiz_generation,
        str(notebook["_id"]),
        str(user["_id"]),
        payload.length,
        payload.difficulty,
    )
    now = datetime.now(timezone.utc)
    await db.quiz_generation_jobs.insert_one(
        {
            "job_id": job.id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "length": payload.length,
            "difficulty": payload.difficulty,
            "error": None,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    return QuizGenerationJobOut(job_id=job.id, status="queued")


@router.get("/{notebook_id}/roadmap/generate", response_model=QuizGenerationJobOut | None)
async def get_latest_generate_status(
    notebook_id: str, request: Request
) -> QuizGenerationJobOut | None:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await find_latest_quiz_generation_job(user["_id"], notebook["_id"])
    if not job_doc:
        return None

    return QuizGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get(
    "/{notebook_id}/roadmap/generate/{job_id}",
    response_model=QuizGenerationJobOut,
)
async def get_generate_status(
    notebook_id: str, job_id: str, request: Request
) -> QuizGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await find_quiz_generation_job(job_id, user["_id"], notebook["_id"])
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado"
        )

    return QuizGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get("/{notebook_id}/roadmap", response_model=RoadmapOut | None)
async def get_roadmap(notebook_id: str, request: Request) -> RoadmapOut | None:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    roadmap = await find_quiz_roadmap(user["_id"], notebook["_id"])
    if not roadmap:
        return None
    return await build_roadmap_response(roadmap, user)


@router.delete("/{notebook_id}/roadmap", status_code=status.HTTP_204_NO_CONTENT)
async def delete_roadmap(notebook_id: str, request: Request) -> None:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    roadmap = await find_quiz_roadmap(user["_id"], notebook["_id"])
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap no encontrado"
        )

    active_job = await db.quiz_generation_jobs.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": {"$in": ["queued", "processing"]},
        }
    )
    if active_job:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar el quiz mientras se esta generando",
        )

    await delete_quiz_notebook_data(user["_id"], notebook["_id"])
