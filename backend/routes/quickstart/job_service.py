import asyncio
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ...config import settings
from ...db import db
from .generation_service import generate_quickstart_topics
from .repository import compute_sources_fingerprint

logger = logging.getLogger(__name__)


async def mark_quickstart_job_processing(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.quickstart_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "started_at": now, "error": None}},
    )


async def mark_quickstart_job_failed(
    job_id: str, error: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.quickstart_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "failed", "error": error, "finished_at": now}},
    )


async def mark_quickstart_job_done(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.quickstart_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "done", "finished_at": now}},
    )


def resolve_quickstart_error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException) and isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc, ValueError):
        return str(exc)
    return "No se pudo generar el inicio rapido"


def process_quickstart_generation(notebook_id: str, owner_id: str) -> None:
    asyncio.run(_process_quickstart_generation(notebook_id, owner_id))


async def _process_quickstart_generation(
    notebook_id: str,
    owner_id: str,
) -> None:
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else None
    if not job_id:
        logger.error("Job de quickstart sin id")
        return

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        await mark_quickstart_job_processing(job_id, db_client=worker_db)

        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            await mark_quickstart_job_failed(
                job_id, "Identificador invalido", db_client=worker_db
            )
            logger.exception(
                "Identificador invalido en quickstart", extra={"error": str(exc)}
            )
            return

        notebook = await worker_db.notebooks.find_one(
            {"_id": notebook_object_id, "owner_id": owner_object_id}
        )
        if not notebook:
            await mark_quickstart_job_failed(
                job_id, "Notebook no encontrado", db_client=worker_db
            )
            return

        fingerprint, ready_count = await compute_sources_fingerprint(
            notebook["title"], notebook_object_id, owner_object_id, db_client=worker_db
        )
        if ready_count == 0:
            await mark_quickstart_job_failed(
                job_id,
                "No hay fuentes listas para generar el inicio rapido",
                db_client=worker_db,
            )
            return

        try:
            quickstart_payload = await generate_quickstart_topics(
                notebook["title"],
                notebook_object_id,
                {"_id": owner_object_id},
            )
            now = datetime.now(timezone.utc)
            await worker_db.quickstart_summaries.update_one(
                {"owner_id": owner_object_id, "notebook_id": notebook_object_id},
                {
                    "$set": {
                        "owner_id": owner_object_id,
                        "notebook_id": notebook_object_id,
                        "sources_fingerprint": fingerprint,
                        "notebook_summary": quickstart_payload["notebook_summary"],
                        "topics": quickstart_payload["topics"],
                        "updated_at": now,
                    },
                    "$setOnInsert": {"created_at": now},
                },
                upsert=True,
            )
            await worker_db.quickstart_expansions.delete_many(
                {"owner_id": owner_object_id, "notebook_id": notebook_object_id}
            )
        except Exception as exc:
            error_message = resolve_quickstart_error_message(exc)
            await mark_quickstart_job_failed(job_id, error_message, db_client=worker_db)
            return

        await mark_quickstart_job_done(job_id, db_client=worker_db)
    finally:
        worker_client.close()
