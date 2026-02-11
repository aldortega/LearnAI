from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request, status

from ...db import db
from ...rq_queue import reports_queue
from ...schemas.reports import (
    ReportConfigOut,
    ReportGenerateRequest,
    ReportGenerationJobOut,
    ReportSuggestionOut,
)
from ..auth import get_current_user
from .jobs import process_report_generation
from .service import (
    REPORT_TEMPLATE_CONFIGS,
    build_fallback_report_suggestions,
    build_templates,
    coerce_text,
    compute_sources_fingerprint,
    generate_report_suggestions,
    get_cached_report_suggestions,
    get_notebook_or_404,
    logger,
    save_cached_report_suggestions,
)

router = APIRouter(tags=["reports"])


@router.get("/{notebook_id}/reports/config", response_model=ReportConfigOut)
async def get_reports_config(
    notebook_id: str,
    request: Request,
    refresh_suggestions: bool = Query(default=False),
) -> ReportConfigOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    notebook_title = coerce_text(notebook.get("title"))
    sources_fingerprint, ready_count = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        user["_id"],
    )
    has_ready_sources = ready_count > 0

    if not refresh_suggestions:
        cached_suggestions = await get_cached_report_suggestions(
            notebook["_id"],
            user["_id"],
            notebook_title,
            sources_fingerprint,
        )
        if cached_suggestions is not None:
            return ReportConfigOut(
                has_ready_sources=has_ready_sources,
                templates=build_templates(),
                suggestions=cached_suggestions,
            )

    suggestions: list[ReportSuggestionOut] = build_fallback_report_suggestions(
        notebook_title
    )
    try:
        suggestions = await generate_report_suggestions(
            notebook_title,
            notebook["_id"],
            user,
        )
    except Exception as exc:
        logger.exception(
            "No se pudieron generar sugerencias de reportes",
            extra={"error": str(exc)},
        )
        suggestions = build_fallback_report_suggestions(notebook_title)

    await save_cached_report_suggestions(
        notebook["_id"],
        user["_id"],
        sources_fingerprint,
        suggestions,
    )

    return ReportConfigOut(
        has_ready_sources=has_ready_sources,
        templates=build_templates(),
        suggestions=suggestions,
    )


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

    return ReportGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        report_id=str(job_doc["report_id"]) if job_doc.get("report_id") else None,
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


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

    return ReportGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        report_id=str(job_doc["report_id"]) if job_doc.get("report_id") else None,
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )
