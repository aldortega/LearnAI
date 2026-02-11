from __future__ import annotations

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db import db


async def find_quiz_roadmap(
    owner_id: ObjectId,
    notebook_id: ObjectId,
    db_client: AsyncIOMotorDatabase | None = None,
) -> dict | None:
    db_ref = db if db_client is None else db_client
    return await db_ref.quiz_roadmaps.find_one(
        {"owner_id": owner_id, "notebook_id": notebook_id}
    )


async def find_latest_quiz_generation_job(
    owner_id: ObjectId,
    notebook_id: ObjectId,
    db_client: AsyncIOMotorDatabase | None = None,
) -> dict | None:
    db_ref = db if db_client is None else db_client
    return await db_ref.quiz_generation_jobs.find_one(
        {"owner_id": owner_id, "notebook_id": notebook_id},
        sort=[("created_at", -1)],
    )


async def find_quiz_generation_job(
    job_id: str,
    owner_id: ObjectId,
    notebook_id: ObjectId,
    db_client: AsyncIOMotorDatabase | None = None,
) -> dict | None:
    db_ref = db if db_client is None else db_client
    return await db_ref.quiz_generation_jobs.find_one(
        {
            "job_id": job_id,
            "owner_id": owner_id,
            "notebook_id": notebook_id,
        }
    )


async def delete_quiz_notebook_data(
    owner_id: ObjectId,
    notebook_id: ObjectId,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    base_query = {"owner_id": owner_id, "notebook_id": notebook_id}
    await db_ref.quiz_roadmaps.delete_many(base_query)
    await db_ref.quiz_questions.delete_many(base_query)
    await db_ref.quiz_attempts.delete_many(base_query)
    await db_ref.quiz_level_progress.delete_many(base_query)
    await db_ref.quiz_llm_payloads.delete_many(base_query)
    await db_ref.quiz_generation_jobs.delete_many(base_query)
