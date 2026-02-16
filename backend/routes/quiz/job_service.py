from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ...config import settings
from ...db import db
from .generation_service import (
    find_level,
    generate_questions_for_level,
    generate_questions_for_roadmap,
    generate_quiz_for_notebook,
)
from .llm import resolve_difficulty_label, resolve_generation_config

logger = logging.getLogger(__name__)


async def mark_quiz_job_processing(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.quiz_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "started_at": now, "error": None}},
    )


async def mark_quiz_job_failed(
    job_id: str, error: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.quiz_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "failed", "error": error, "finished_at": now}},
    )


async def mark_quiz_job_done(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.quiz_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "done", "finished_at": now}},
    )


def resolve_job_error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException) and isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc, ValueError):
        return str(exc)
    return "No se pudo generar el quiz"


def resolve_questions_error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException) and isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc, ValueError):
        return str(exc)
    return "No se pudieron generar preguntas"


def process_quiz_generation(
    notebook_id: str,
    owner_id: str,
    length: str,
    difficulty: str,
) -> None:
    asyncio.run(_process_quiz_generation(notebook_id, owner_id, length, difficulty))


def process_quiz_questions_generation(notebook_id: str, owner_id: str) -> None:
    asyncio.run(_process_quiz_questions_generation(notebook_id, owner_id))


def process_quiz_level_questions_generation(
    notebook_id: str, owner_id: str, level_id: str
) -> None:
    asyncio.run(
        _process_quiz_level_questions_generation(notebook_id, owner_id, level_id)
    )


async def _process_quiz_questions_generation(notebook_id: str, owner_id: str) -> None:
    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            logger.exception(
                "Identificador inválido en preguntas",
                extra={"error": str(exc)},
            )
            return

        notebook = await worker_db.notebooks.find_one({"_id": notebook_object_id})
        if not notebook:
            logger.error("Notebook no encontrado en preguntas")
            return

        roadmap = await worker_db.quiz_roadmaps.find_one(
            {"owner_id": owner_object_id, "notebook_id": notebook_object_id}
        )
        if not roadmap:
            logger.error("Roadmap no encontrado en preguntas")
            return

        user = {
            "_id": owner_object_id,
            "_source_owner_id": notebook["owner_id"],
        }
        await generate_questions_for_roadmap(
            notebook, user, roadmap, db_client=worker_db
        )
    finally:
        worker_client.close()


async def _process_quiz_level_questions_generation(
    notebook_id: str, owner_id: str, level_id: str
) -> None:
    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            logger.exception(
                "Identificador inválido en preguntas de nivel",
                extra={"error": str(exc)},
            )
            return

        notebook = await worker_db.notebooks.find_one({"_id": notebook_object_id})
        if not notebook:
            logger.error("Notebook no encontrado en preguntas de nivel")
            return

        roadmap = await worker_db.quiz_roadmaps.find_one(
            {"owner_id": owner_object_id, "notebook_id": notebook_object_id}
        )
        if not roadmap:
            logger.error("Roadmap no encontrado en preguntas de nivel")
            return

        unit, level = find_level(roadmap, level_id)
        if not unit or not level:
            logger.error("Nivel no encontrado en preguntas de nivel")
            return

        existing_question = await worker_db.quiz_questions.find_one(
            {
                "owner_id": owner_object_id,
                "notebook_id": notebook_object_id,
                "level_id": level_id,
            }
        )
        now = datetime.now(timezone.utc)
        if existing_question:
            await worker_db.quiz_level_progress.update_one(
                {
                    "owner_id": owner_object_id,
                    "notebook_id": notebook_object_id,
                    "level_id": level_id,
                },
                {
                    "$set": {
                        "questions_status": "ready",
                        "questions_error": None,
                        "updated_at": now,
                    }
                },
            )
            return

        try:
            user = {
                "_id": owner_object_id,
                "_source_owner_id": notebook["owner_id"],
            }
            await generate_questions_for_level(
                notebook, user, roadmap, unit, level, db_client=worker_db
            )
            await worker_db.quiz_level_progress.update_one(
                {
                    "owner_id": owner_object_id,
                    "notebook_id": notebook_object_id,
                    "level_id": level_id,
                },
                {
                    "$set": {
                        "questions_status": "ready",
                        "questions_error": None,
                        "updated_at": now,
                    }
                },
            )
        except Exception as exc:
            error_message = resolve_questions_error_message(exc)
            logger.exception(
                "Fallo generando preguntas de nivel",
                extra={"error": str(exc), "level_id": level_id},
            )
            await worker_db.quiz_level_progress.update_one(
                {
                    "owner_id": owner_object_id,
                    "notebook_id": notebook_object_id,
                    "level_id": level_id,
                },
                {
                    "$set": {
                        "questions_status": "failed",
                        "questions_error": error_message,
                        "updated_at": now,
                    }
                },
            )
    finally:
        worker_client.close()


async def _process_quiz_generation(
    notebook_id: str,
    owner_id: str,
    length: str,
    difficulty: str,
) -> None:
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else None
    if not job_id:
        logger.error("Job de quiz sin id")
        return

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        await mark_quiz_job_processing(job_id, db_client=worker_db)

        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            await mark_quiz_job_failed(
                job_id, "Identificador inválido", db_client=worker_db
            )
            logger.exception(
                "Identificador inválido en quiz", extra={"error": str(exc)}
            )
            return

        notebook = await worker_db.notebooks.find_one({"_id": notebook_object_id})
        if not notebook:
            await mark_quiz_job_failed(
                job_id, "Notebook no encontrado", db_client=worker_db
            )
            return

        try:
            config = resolve_generation_config(length)
            resolve_difficulty_label(difficulty)
            user = {
                "_id": owner_object_id,
                "_source_owner_id": notebook["owner_id"],
            }
            await generate_quiz_for_notebook(
                notebook,
                user,
                config,
                length,
                difficulty,
                db_client=worker_db,
            )
        except Exception as exc:
            logger.exception("Fallo generando quiz", extra={"error": str(exc)})
            await mark_quiz_job_failed(
                job_id, resolve_job_error_message(exc), db_client=worker_db
            )
            return

        await mark_quiz_job_done(job_id, db_client=worker_db)

    finally:
        worker_client.close()
