from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from ...db import db
from ...rq_queue import reports_queue
from ...schemas.reports import (
    ReportConfigOut,
    ReportGenerateRequest,
    ReportGenerationJobOut,
    ReportSuggestionsJobOut,
)
from ..auth import get_current_user
from .jobs import process_report_generation, process_report_suggestions_generation
from .service import (
    REPORT_TEMPLATE_CONFIGS,
    build_templates,
    coerce_text,
    compute_sources_fingerprint,
    get_notebook_or_404,
    get_report_suggestions_snapshot,
)

router = APIRouter(tags=["reports"])


def map_report_generation_job(job_doc: dict) -> ReportGenerationJobOut:
    return ReportGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        report_id=str(job_doc["report_id"]) if job_doc.get("report_id") else None,
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


def map_report_suggestions_job(job_doc: dict) -> ReportSuggestionsJobOut:
    return ReportSuggestionsJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get("/{notebook_id}/reports/config", response_model=ReportConfigOut)
async def get_reports_config(
    notebook_id: str,
    request: Request,
) -> ReportConfigOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    notebook_title = coerce_text(notebook.get("title"))
    sources_fingerprint, ready_count = await compute_sources_fingerprint(
        notebook_title,
        notebook["_id"],
        user["_id"],
    )
    has_ready_sources = ready_count > 0

    suggestions, suggestions_is_stale = await get_report_suggestions_snapshot(
        notebook["_id"],
        user["_id"],
        notebook_title,
        sources_fingerprint,
    )

    latest_job_doc = await db.report_suggestion_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )

    suggestions_status: str = "missing"
    suggestions_error: str | None = None
    suggestions_job_id: str | None = None

    if latest_job_doc:
        suggestions_job_id = latest_job_doc["job_id"]
        latest_status = coerce_text(latest_job_doc.get("status"))
        latest_error = coerce_text(latest_job_doc.get("error")) or None
        if latest_status in {"queued", "processing"}:
            suggestions_status = "generating"
        elif latest_status == "failed":
            if not suggestions or suggestions_is_stale:
                suggestions_status = "failed"
                suggestions_error = latest_error

    if suggestions_status == "missing" and suggestions:
        suggestions_status = "ready"

    return ReportConfigOut(
        has_ready_sources=has_ready_sources,
        templates=build_templates(),
        suggestions=suggestions,
        suggestions_status=suggestions_status,
        suggestions_is_stale=suggestions_is_stale,
        suggestions_error=suggestions_error,
        suggestions_job_id=suggestions_job_id,
    )


@router.post(
    "/{notebook_id}/reports/suggestions/generate",
    response_model=ReportSuggestionsJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_report_suggestions(
    notebook_id: str,
    request: Request,
) -> ReportSuggestionsJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    sources_fingerprint, ready_count = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        user["_id"],
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para generar sugerencias",
        )

    active_job_doc = await db.report_suggestion_generation_jobs.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": {"$in": ["queued", "processing"]},
        },
        sort=[("created_at", -1)],
    )
    if active_job_doc:
        return map_report_suggestions_job(active_job_doc)

    job = reports_queue.enqueue(
        process_report_suggestions_generation,
        str(notebook["_id"]),
        str(user["_id"]),
        sources_fingerprint,
    )
    now = datetime.now(timezone.utc)
    await db.report_suggestion_generation_jobs.insert_one(
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

    return ReportSuggestionsJobOut(job_id=job.id, status="queued")


@router.get(
    "/{notebook_id}/reports/suggestions/generate",
    response_model=ReportSuggestionsJobOut,
)
async def get_latest_report_suggestions_generation(
    notebook_id: str,
    request: Request,
) -> ReportSuggestionsJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.report_suggestion_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )

    return map_report_suggestions_job(job_doc)


@router.get(
    "/{notebook_id}/reports/suggestions/generate/{job_id}",
    response_model=ReportSuggestionsJobOut,
)
async def get_report_suggestions_generation_status(
    notebook_id: str,
    job_id: str,
    request: Request,
) -> ReportSuggestionsJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.report_suggestion_generation_jobs.find_one(
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

    return map_report_suggestions_job(job_doc)


@router.post(
    "/{notebook_id}/reports/generate",
    response_model=ReportGenerationJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_report(
    notebook_id: str,
    payload: ReportGenerateRequest,
    request: Request,
) -> ReportGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    prompt = coerce_text(payload.prompt).strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El prompt es obligatorio",
        )

    _, ready_count = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        user["_id"],
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para generar informes",
        )

    format_type = payload.format_type
    if format_type not in REPORT_TEMPLATE_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de informe invalido",
        )

    job = reports_queue.enqueue(
        process_report_generation,
        str(notebook["_id"]),
        str(user["_id"]),
    )
    now = datetime.now(timezone.utc)
    await db.report_generation_jobs.insert_one(
        {
            "job_id": job.id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "error": None,
            "report_id": None,
            "format_type": format_type,
            "prompt": prompt,
            "suggestion_id": payload.suggestion_id,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    return ReportGenerationJobOut(job_id=job.id, status="queued")


@router.get("/{notebook_id}/reports/generate", response_model=ReportGenerationJobOut)
async def get_latest_report_generation(
    notebook_id: str,
    request: Request,
) -> ReportGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.report_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )

    return map_report_generation_job(job_doc)


@router.get(
    "/{notebook_id}/reports/generate/{job_id}",
    response_model=ReportGenerationJobOut,
)
async def get_report_generation_status(
    notebook_id: str,
    job_id: str,
    request: Request,
) -> ReportGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.report_generation_jobs.find_one(
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

    return map_report_generation_job(job_doc)
