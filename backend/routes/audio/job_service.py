import asyncio
import logging
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ...config import settings
from ...db import db
from ...schemas.audio import AudioDuration, AudioFormatType
from .constants import AUDIO_DURATION_CONFIGS, AUDIO_FORMAT_CONFIGS
from .generation_service import generate_audio_script
from .normalization import coerce_text
from .repository import compute_sources_fingerprint
from .suggestions_service import (
    generate_audio_suggestions,
    save_cached_audio_suggestions,
)
from .tts_service import (
    build_audio_storage_path,
    synthesize_script,
    upload_public_audio,
)

logger = logging.getLogger(__name__)


async def mark_audio_job_processing(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.audio_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "started_at": now, "error": None}},
    )


async def mark_audio_job_failed(
    job_id: str,
    error: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.audio_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "failed", "error": error, "finished_at": now}},
    )


async def mark_audio_job_done(
    job_id: str,
    podcast_id: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.audio_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "done", "podcast_id": podcast_id, "finished_at": now}},
    )


async def mark_audio_suggestions_job_processing(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.audio_suggestion_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "started_at": now, "error": None}},
    )


async def mark_audio_suggestions_job_failed(
    job_id: str,
    error: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.audio_suggestion_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "failed", "error": error, "finished_at": now}},
    )


async def mark_audio_suggestions_job_done(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.audio_suggestion_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "done", "finished_at": now, "error": None}},
    )


def _resolve_error_message(exc: Exception, default: str) -> str:
    if isinstance(exc, HTTPException) and isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc, ValueError):
        return str(exc)
    return default


def process_audio_generation(notebook_id: str, owner_id: str) -> None:
    asyncio.run(_process_audio_generation(notebook_id, owner_id))


def process_audio_suggestions_generation(
    notebook_id: str, owner_id: str, fingerprint_at_enqueue: str
) -> None:
    asyncio.run(
        _process_audio_suggestions_generation(
            notebook_id, owner_id, fingerprint_at_enqueue
        )
    )


async def _process_audio_generation(notebook_id: str, owner_id: str) -> None:
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else None
    if not job_id:
        logger.error("Job de audio sin id")
        return

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        await mark_audio_job_processing(job_id, db_client=worker_db)

        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            await mark_audio_job_failed(
                job_id, "Identificador invalido", db_client=worker_db
            )
            logger.exception("Identificador invalido en audio", extra={"error": str(exc)})
            return

        notebook = await worker_db.notebooks.find_one({"_id": notebook_object_id})
        if not notebook:
            await mark_audio_job_failed(
                job_id, "Notebook no encontrado", db_client=worker_db
            )
            return

        job_doc = await worker_db.audio_generation_jobs.find_one(
            {
                "job_id": job_id,
                "owner_id": owner_object_id,
                "notebook_id": notebook_object_id,
            }
        )
        if not job_doc:
            await mark_audio_job_failed(
                job_id, "Job no encontrado", db_client=worker_db
            )
            return

        format_type: AudioFormatType = coerce_text(job_doc.get("format_type"))  # type: ignore[assignment]
        duration: AudioDuration = coerce_text(job_doc.get("duration")) or "default"  # type: ignore[assignment]
        topic = coerce_text(job_doc.get("topic")).strip()

        if format_type not in AUDIO_FORMAT_CONFIGS:
            await mark_audio_job_failed(
                job_id, "Formato de audio invalido", db_client=worker_db
            )
            return
        if duration not in AUDIO_DURATION_CONFIGS:
            await mark_audio_job_failed(
                job_id, "Duracion de audio invalida", db_client=worker_db
            )
            return

        fingerprint, ready_count = await compute_sources_fingerprint(
            notebook["title"],
            notebook_object_id,
            notebook["owner_id"],
            db_client=worker_db,
        )
        if ready_count == 0:
            await mark_audio_job_failed(
                job_id,
                "Necesitas al menos una fuente lista para generar audios",
                db_client=worker_db,
            )
            return

        try:
            script_result = await generate_audio_script(
                notebook_title=coerce_text(notebook.get("title")),
                format_type=format_type,
                duration=duration,
                topic=topic,
                notebook_object_id=notebook_object_id,
                user={
                    "_id": owner_object_id,
                    "_source_owner_id": notebook["owner_id"],
                },
            )

            audio_bytes, duration_seconds = await synthesize_script(
                format_type=format_type,
                segments=script_result.segments,
            )

            podcast_uid = uuid.uuid4().hex
            bucket, audio_path, audio_url = build_audio_storage_path(
                owner_id=str(owner_object_id),
                notebook_id=str(notebook_object_id),
                podcast_uid=podcast_uid,
            )
            await asyncio.to_thread(upload_public_audio, bucket, audio_path, audio_bytes)

            now = datetime.now(timezone.utc)
            podcast_doc = {
                "owner_id": owner_object_id,
                "notebook_id": notebook_object_id,
                "format_type": format_type,
                "duration": duration,
                "title": script_result.title,
                "description": script_result.description,
                "topic": topic,
                "audio_url": audio_url,
                "audio_path": audio_path,
                "duration_seconds": duration_seconds,
                "sources_fingerprint": fingerprint,
                "sources": [source.model_dump() for source in script_result.sources],
                "script": [segment.model_dump() for segment in script_result.segments],
                "created_at": now,
            }
            insert_result = await worker_db.podcasts.insert_one(podcast_doc)
        except Exception as exc:
            error_message = _resolve_error_message(exc, "No se pudo generar el podcast")
            await mark_audio_job_failed(job_id, error_message, db_client=worker_db)
            logger.exception("Fallo en generacion de audio")
            return

        await mark_audio_job_done(
            job_id, str(insert_result.inserted_id), db_client=worker_db
        )
    finally:
        worker_client.close()


async def _process_audio_suggestions_generation(
    notebook_id: str,
    owner_id: str,
    fingerprint_at_enqueue: str,
) -> None:
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else None
    if not job_id:
        logger.error("Job de sugerencias de audio sin id")
        return

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        await mark_audio_suggestions_job_processing(job_id, db_client=worker_db)

        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            await mark_audio_suggestions_job_failed(
                job_id, "Identificador invalido", db_client=worker_db
            )
            logger.exception(
                "Identificador invalido en sugerencias de audio",
                extra={"error": str(exc)},
            )
            return

        notebook = await worker_db.notebooks.find_one({"_id": notebook_object_id})
        if not notebook:
            await mark_audio_suggestions_job_failed(
                job_id, "Notebook no encontrado", db_client=worker_db
            )
            return

        job_doc = await worker_db.audio_suggestion_generation_jobs.find_one(
            {
                "job_id": job_id,
                "owner_id": owner_object_id,
                "notebook_id": notebook_object_id,
            }
        )
        if not job_doc:
            await mark_audio_suggestions_job_failed(
                job_id, "Job no encontrado", db_client=worker_db
            )
            return

        sources_fingerprint, ready_count = await compute_sources_fingerprint(
            notebook["title"],
            notebook_object_id,
            notebook["owner_id"],
            db_client=worker_db,
        )
        if ready_count == 0:
            await mark_audio_suggestions_job_failed(
                job_id,
                "Necesitas al menos una fuente lista para generar sugerencias",
                db_client=worker_db,
            )
            return

        target_fingerprint = (
            coerce_text(job_doc.get("sources_fingerprint")) or fingerprint_at_enqueue
        ) or sources_fingerprint

        try:
            suggestions = await generate_audio_suggestions(
                notebook_title=coerce_text(notebook.get("title")),
                notebook_object_id=notebook_object_id,
                user={
                    "_id": owner_object_id,
                    "_source_owner_id": notebook["owner_id"],
                },
            )
            if not suggestions:
                raise ValueError("No se pudieron generar sugerencias de audio")
            await save_cached_audio_suggestions(
                notebook_object_id=notebook_object_id,
                owner_id=owner_object_id,
                sources_fingerprint=target_fingerprint,
                suggestions=suggestions,
                db_client=worker_db,
            )
        except Exception as exc:
            error_message = _resolve_error_message(
                exc, "No se pudieron generar sugerencias de audio"
            )
            await mark_audio_suggestions_job_failed(
                job_id, error_message, db_client=worker_db
            )
            return

        await mark_audio_suggestions_job_done(job_id, db_client=worker_db)
    finally:
        worker_client.close()
