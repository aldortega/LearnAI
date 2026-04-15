import asyncio
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ...config import settings
from ...db import db
from .generation_service import generate_presentation_payload
from .normalization import coerce_text
from .repository import compute_sources_fingerprint

logger = logging.getLogger(__name__)


async def mark_presentation_job_processing(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.presentation_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "started_at": now, "error": None}},
    )


async def mark_presentation_job_failed(
    job_id: str,
    error: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.presentation_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "failed", "error": error, "finished_at": now}},
    )


async def mark_presentation_job_done(
    job_id: str,
    presentation_id: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.presentation_generation_jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {
                "status": "done",
                "presentation_id": presentation_id,
                "finished_at": now,
            }
        },
    )


def resolve_presentation_error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException) and isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc, ValueError):
        return str(exc)
    return "No se pudo generar la presentacion"


def process_presentation_generation(notebook_id: str, owner_id: str) -> None:
    asyncio.run(_process_presentation_generation(notebook_id, owner_id))


async def _process_presentation_generation(notebook_id: str, owner_id: str) -> None:
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else None
    if not job_id:
        logger.error("Job de presentaciones sin id")
        return

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        await mark_presentation_job_processing(job_id, db_client=worker_db)

        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            await mark_presentation_job_failed(
                job_id, "Identificador invalido", db_client=worker_db
            )
            logger.exception(
                "Identificador invalido en presentaciones", extra={"error": str(exc)}
            )
            return

        notebook = await worker_db.notebooks.find_one({"_id": notebook_object_id})
        if not notebook:
            await mark_presentation_job_failed(
                job_id, "Notebook no encontrada", db_client=worker_db
            )
            return

        job_doc = await worker_db.presentation_generation_jobs.find_one(
            {
                "job_id": job_id,
                "owner_id": owner_object_id,
                "notebook_id": notebook_object_id,
            }
        )
        if not job_doc:
            await mark_presentation_job_failed(
                job_id, "Job no encontrado", db_client=worker_db
            )
            return

        topic = coerce_text(job_doc.get("topic")).strip()
        detail_level = coerce_text(job_doc.get("detail_level"))

        if not topic:
            await mark_presentation_job_failed(
                job_id, "El tema es obligatorio", db_client=worker_db
            )
            return

        if detail_level not in {"concise", "detailed"}:
            await mark_presentation_job_failed(
                job_id, "Nivel de detalle invalido", db_client=worker_db
            )
            return

        sources_fingerprint, ready_count = await compute_sources_fingerprint(
            notebook["title"],
            notebook_object_id,
            notebook["owner_id"],
            db_client=worker_db,
        )
        if ready_count == 0:
            await mark_presentation_job_failed(
                job_id,
                "Necesitas al menos una fuente lista para generar presentaciones",
                db_client=worker_db,
            )
            return

        try:
            title, summary, slides, sources = await generate_presentation_payload(
                notebook_title=coerce_text(notebook.get("title")),
                topic=topic,
                detail_level=detail_level,
                notebook_object_id=notebook_object_id,
                user={
                    "_id": owner_object_id,
                    "_source_owner_id": notebook["owner_id"],
                },
            )
            now = datetime.now(timezone.utc)
            presentation_doc = {
                "owner_id": owner_object_id,
                "notebook_id": notebook_object_id,
                "topic": topic,
                "detail_level": detail_level,
                "title": title,
                "summary": summary,
                "slides": [slide.model_dump() for slide in slides],
                "sources_fingerprint": sources_fingerprint,
                "sources": [source.model_dump() for source in sources],
                "created_at": now,
            }
            presentation_result = await worker_db.presentations.insert_one(
                presentation_doc
            )
        except Exception as exc:
            await mark_presentation_job_failed(
                job_id,
                resolve_presentation_error_message(exc),
                db_client=worker_db,
            )
            return

        await mark_presentation_job_done(
            job_id,
            str(presentation_result.inserted_id),
            db_client=worker_db,
        )
    finally:
        worker_client.close()
