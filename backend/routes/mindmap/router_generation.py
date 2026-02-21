from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, status

from ...db import db
from ...rq_queue import mindmap_queue
from ...schemas.mindmap import (
    MindmapGenerateRequest,
    MindmapGenerationJobOut,
    MindmapOut,
)
from ..auth import get_current_user
from .jobs import process_mindmap_generation
from .normalization import coerce_text
from .repository import build_mindmap_out, compute_sources_fingerprint, get_notebook_or_404

router = APIRouter(tags=["mindmap"])


@router.get("/{notebook_id}/mindmap", response_model=MindmapOut)
async def get_mindmap(notebook_id: str, request: Request) -> MindmapOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    mindmap_doc = await db.mindmap_maps.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    fingerprint, ready_count = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], notebook["owner_id"]
    )
    has_ready_sources = ready_count > 0
    status_value = "missing"
    if mindmap_doc:
        status_value = (
            "ready"
            if mindmap_doc.get("sources_fingerprint") == fingerprint
            else "stale"
        )
    return build_mindmap_out(
        notebook_id=str(notebook["_id"]),
        has_ready_sources=has_ready_sources,
        status_value=status_value,
        mindmap_doc=mindmap_doc,
    )


@router.post(
    "/{notebook_id}/mindmap/generate",
    response_model=MindmapGenerationJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_mindmap(
    notebook_id: str,
    request: Request,
    payload: MindmapGenerateRequest | None = None,
) -> MindmapGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    _, ready_count = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], notebook["owner_id"]
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para generar el mapa mental",
        )

    prompt = coerce_text(payload.prompt if payload else "").strip() or None
    job_id = str(uuid4())

    now = datetime.now(timezone.utc)
    await db.mindmap_generation_jobs.insert_one(
        {
            "job_id": job_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "error": None,
            "prompt": prompt,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    job = mindmap_queue.enqueue(
        process_mindmap_generation,
        str(notebook["_id"]),
        str(user["_id"]),
        job_id=job_id,
    )
    return MindmapGenerationJobOut(job_id=job.id, status="queued")


@router.get(
    "/{notebook_id}/mindmap/generate",
    response_model=MindmapGenerationJobOut,
)
async def get_latest_mindmap_generation(
    notebook_id: str,
    request: Request,
) -> MindmapGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    job_doc = await db.mindmap_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )
    return MindmapGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get(
    "/{notebook_id}/mindmap/generate/{job_id}",
    response_model=MindmapGenerationJobOut,
)
async def get_mindmap_generation_status(
    notebook_id: str,
    job_id: str,
    request: Request,
) -> MindmapGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    job_doc = await db.mindmap_generation_jobs.find_one(
        {"job_id": job_id, "owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )
    return MindmapGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )
