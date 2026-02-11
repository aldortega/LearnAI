import asyncio
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ...config import settings
from ...db import db
from .constants import REPORT_TEMPLATE_CONFIGS
from .generation_service import generate_report_payload
from .normalization import coerce_text
from .repository import compute_sources_fingerprint

logger = logging.getLogger(__name__)


async def mark_report_job_processing(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.report_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "started_at": now, "error": None}},
    )


async def mark_report_job_failed(
    job_id: str,
    error: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.report_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "failed", "error": error, "finished_at": now}},
    )


async def mark_report_job_done(
    job_id: str,
    report_id: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.report_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "done", "report_id": report_id, "finished_at": now}},
    )


def resolve_report_error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException) and isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc, ValueError):
        return str(exc)
    return "No se pudo generar el informe"


def process_report_generation(notebook_id: str, owner_id: str) -> None:
    asyncio.run(_process_report_generation(notebook_id, owner_id))


async def _process_report_generation(notebook_id: str, owner_id: str) -> None:
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else None
    if not job_id:
        logger.error("Job de reportes sin id")
        return

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        await mark_report_job_processing(job_id, db_client=worker_db)

        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            await mark_report_job_failed(job_id, "Identificador invalido", db_client=worker_db)
            logger.exception("Identificador invalido en reportes", extra={"error": str(exc)})
            return

        notebook = await worker_db.notebooks.find_one(
            {"_id": notebook_object_id, "owner_id": owner_object_id}
        )
        if not notebook:
            await mark_report_job_failed(job_id, "Notebook no encontrado", db_client=worker_db)
            return

        job_doc = await worker_db.report_generation_jobs.find_one(
            {"job_id": job_id, "owner_id": owner_object_id, "notebook_id": notebook_object_id}
        )
        if not job_doc:
            await mark_report_job_failed(job_id, "Job no encontrado", db_client=worker_db)
            return

        prompt = coerce_text(job_doc.get("prompt")).strip()
        if not prompt:
            await mark_report_job_failed(job_id, "El prompt es obligatorio", db_client=worker_db)
            return

        format_type = coerce_text(job_doc.get("format_type")) or "freeform"
        if format_type not in REPORT_TEMPLATE_CONFIGS:
            await mark_report_job_failed(
                job_id,
                "Tipo de informe invalido",
                db_client=worker_db,
            )
            return

        fingerprint, ready_count = await compute_sources_fingerprint(
            notebook["title"],
            notebook_object_id,
            owner_object_id,
            db_client=worker_db,
        )
        if ready_count == 0:
            await mark_report_job_failed(
                job_id,
                "Necesitas al menos una fuente lista para generar informes",
                db_client=worker_db,
            )
            return

        try:
            report_title, report_description, content, sources = await generate_report_payload(
                notebook_title=coerce_text(notebook.get("title")),
                format_type=format_type,
                prompt=prompt,
                notebook_object_id=notebook_object_id,
                user={"_id": owner_object_id},
            )
            if not report_title or not report_description:
                raise ValueError("No se pudo generar la metadata del informe")
            now = datetime.now(timezone.utc)
            report_doc = {
                "owner_id": owner_object_id,
                "notebook_id": notebook_object_id,
                "format_type": format_type,
                "title": report_title,
                "description": report_description,
                "prompt_used": prompt,
                "content": content,
                "sources_fingerprint": fingerprint,
                "sources": [source.model_dump() for source in sources],
                "created_at": now,
            }
            report_result = await worker_db.reports.insert_one(report_doc)
        except Exception as exc:
            error_message = resolve_report_error_message(exc)
            await mark_report_job_failed(job_id, error_message, db_client=worker_db)
            return

        await mark_report_job_done(job_id, str(report_result.inserted_id), db_client=worker_db)
    finally:
        worker_client.close()
