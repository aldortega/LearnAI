import asyncio
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ...config import settings
from ...db import db
from .generation_service import generate_flashcards_payload
from .normalization import coerce_text, normalize_topic_prompt
from .repository import compute_sources_fingerprint

logger = logging.getLogger(__name__)


async def mark_flashcards_job_processing(
    job_id: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.flashcard_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "started_at": now, "error": None}},
    )


async def mark_flashcards_job_failed(
    job_id: str,
    error: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.flashcard_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "failed", "error": error, "finished_at": now}},
    )


async def mark_flashcards_job_done(
    job_id: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.flashcard_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "done", "finished_at": now, "error": None}},
    )


def resolve_flashcards_error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException) and isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc, ValueError):
        return str(exc)
    return "No se pudieron generar las flashcards"


def process_flashcards_generation(notebook_id: str, owner_id: str) -> None:
    asyncio.run(_process_flashcards_generation(notebook_id, owner_id))


async def _process_flashcards_generation(notebook_id: str, owner_id: str) -> None:
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else None
    if not job_id:
        logger.error("Job de flashcards sin id")
        return

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        await mark_flashcards_job_processing(job_id, db_client=worker_db)

        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            await mark_flashcards_job_failed(
                job_id,
                "Identificador invalido",
                db_client=worker_db,
            )
            logger.exception(
                "Identificador invalido en flashcards",
                extra={"error": str(exc)},
            )
            return

        notebook = await worker_db.notebooks.find_one({"_id": notebook_object_id})
        if not notebook:
            await mark_flashcards_job_failed(
                job_id,
                "Notebook no encontrado",
                db_client=worker_db,
            )
            return

        job_doc = await worker_db.flashcard_generation_jobs.find_one(
            {
                "job_id": job_id,
                "owner_id": owner_object_id,
                "notebook_id": notebook_object_id,
            }
        )
        if not job_doc:
            await mark_flashcards_job_failed(
                job_id,
                "Job no encontrado",
                db_client=worker_db,
            )
            return

        card_count = coerce_text(job_doc.get("card_count")) or "default"
        difficulty = coerce_text(job_doc.get("difficulty")) or "medium"
        topic_prompt = normalize_topic_prompt(job_doc.get("topic_prompt"))

        fingerprint, ready_count = await compute_sources_fingerprint(
            notebook["title"],
            notebook_object_id,
            notebook["owner_id"],
            db_client=worker_db,
        )
        if ready_count == 0:
            await mark_flashcards_job_failed(
                job_id,
                "Necesitas al menos una fuente lista para generar flashcards",
                db_client=worker_db,
            )
            return

        try:
            cards, sources, normalized_topic_prompt = await generate_flashcards_payload(
                notebook_title=coerce_text(notebook.get("title")),
                card_count=card_count,
                difficulty=difficulty,
                topic_prompt=topic_prompt,
                notebook_object_id=notebook_object_id,
                user={
                    "_id": owner_object_id,
                    "_source_owner_id": notebook["owner_id"],
                },
            )
            now = datetime.now(timezone.utc)
            await worker_db.flashcard_sets.update_one(
                {"owner_id": owner_object_id, "notebook_id": notebook_object_id},
                {
                    "$set": {
                        "owner_id": owner_object_id,
                        "notebook_id": notebook_object_id,
                        "sources_fingerprint": fingerprint,
                        "card_count": card_count,
                        "difficulty": difficulty,
                        "topic_prompt": normalized_topic_prompt,
                        "cards": cards,
                        "sources": [source.model_dump() for source in sources],
                        "updated_at": now,
                    },
                    "$setOnInsert": {"created_at": now},
                },
                upsert=True,
            )
        except Exception as exc:
            error_message = resolve_flashcards_error_message(exc)
            await mark_flashcards_job_failed(job_id, error_message, db_client=worker_db)
            return

        await mark_flashcards_job_done(job_id, db_client=worker_db)
    finally:
        worker_client.close()
