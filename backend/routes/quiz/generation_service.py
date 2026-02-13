from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging
import time

from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db import db
from ...schemas.quiz import RoadmapOut
from ..notebook_access import resolve_notebook_access
from .constants import (
    PASSING_EXAM_SCORE,
    PASSING_LESSON_SCORE,
    QUESTION_GENERATION_POLL_SECONDS,
    QUESTION_GENERATION_WAIT_SECONDS,
    QuizGenerationConfig,
)
from .llm import (
    compact_context,
    fetch_context_lines,
    generate_questions,
    generate_roadmap_data,
    resolve_difficulty_label,
    resolve_question_count,
    resolve_roadmap_difficulty,
    resolve_roadmap_length,
)
from .progress_service import build_roadmap_response

logger = logging.getLogger(__name__)

def resolve_option_explanation(explanations: dict, option_id: str) -> str:
    by_option = (
        explanations.get("by_option") if isinstance(explanations, dict) else None
    )
    if isinstance(by_option, dict):
        explanation = by_option.get(option_id)
        if explanation:
            return str(explanation)
    correct_explanation = (
        explanations.get("correct") if isinstance(explanations, dict) else None
    )
    if correct_explanation:
        return str(correct_explanation)
    return "Respuesta registrada."


async def wait_for_questions(
    notebook_id: ObjectId,
    owner_id: ObjectId,
    level_id: str,
    timeout_seconds: int = QUESTION_GENERATION_WAIT_SECONDS,
    db_client: AsyncIOMotorDatabase | None = None,
) -> list[dict]:
    db_ref = db if db_client is None else db_client
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        cursor = db_ref.quiz_questions.find(
            {
                "owner_id": owner_id,
                "notebook_id": notebook_id,
                "level_id": level_id,
            }
        ).sort("order", 1)
        questions = [doc async for doc in cursor]
        if questions:
            return questions
        await asyncio.sleep(QUESTION_GENERATION_POLL_SECONDS)
    return []


async def generate_questions_for_level(
    notebook: dict,
    user: dict,
    roadmap: dict,
    unit: dict,
    level: dict,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    context_text = roadmap.get("context_text")
    if not isinstance(context_text, str) or not context_text.strip():
        context_lines = await fetch_context_lines(
            notebook["title"], notebook["_id"], user
        )
        context_text = compact_context(context_lines)

    length = resolve_roadmap_length(roadmap)
    difficulty = resolve_roadmap_difficulty(roadmap)
    difficulty_label = resolve_difficulty_label(difficulty)
    question_count = resolve_question_count(length, level["type"])

    questions = await generate_questions(
        notebook["title"],
        unit["title"],
        level["title"],
        level["type"],
        context_text,
        question_count,
        difficulty_label,
    )
    now = datetime.now(timezone.utc)
    await db_ref.quiz_llm_payloads.insert_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "type": "questions",
            "unit_id": level["unit_id"],
            "level_id": level["id"],
            "payload": {"questions": questions},
            "created_at": now,
        }
    )
    question_docs = []
    for order, question in enumerate(questions, start=1):
        question_docs.append(
            {
                "owner_id": user["_id"],
                "notebook_id": notebook["_id"],
                "unit_id": level["unit_id"],
                "level_id": level["id"],
                "order": order,
                "question": question["question"],
                "options": question["options"],
                "correct_option_id": question["correct_option_id"],
                "hint": question["hint"],
                "explanations": question["explanations"],
                "created_at": now,
            }
        )
    if question_docs:
        await db_ref.quiz_questions.insert_many(question_docs)


async def generate_questions_for_roadmap(
    notebook: dict,
    user: dict,
    roadmap: dict,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    units = sorted(roadmap.get("units", []), key=lambda item: item.get("order", 0))
    for unit in units:
        levels = sorted(unit.get("levels", []), key=lambda item: item.get("order", 0))
        for level in levels:
            progress = await db_ref.quiz_level_progress.find_one(
                {
                    "owner_id": user["_id"],
                    "notebook_id": notebook["_id"],
                    "level_id": level["id"],
                }
            )
            questions_status = progress.get("questions_status") if progress else None
            if questions_status == "ready":
                continue

            existing_question = await db_ref.quiz_questions.find_one(
                {
                    "owner_id": user["_id"],
                    "notebook_id": notebook["_id"],
                    "level_id": level["id"],
                }
            )
            if existing_question:
                await db_ref.quiz_level_progress.update_one(
                    {
                        "owner_id": user["_id"],
                        "notebook_id": notebook["_id"],
                        "level_id": level["id"],
                    },
                    {
                        "$set": {
                            "questions_status": "ready",
                            "updated_at": datetime.now(timezone.utc),
                        }
                    },
                )
                continue

            if questions_status == "generating":
                questions = await wait_for_questions(
                    notebook["_id"],
                    user["_id"],
                    level["id"],
                    db_client=db_ref,
                )
                if questions:
                    await db_ref.quiz_level_progress.update_one(
                        {
                            "owner_id": user["_id"],
                            "notebook_id": notebook["_id"],
                            "level_id": level["id"],
                        },
                        {
                            "$set": {
                                "questions_status": "ready",
                                "updated_at": datetime.now(timezone.utc),
                            }
                        },
                    )
                continue

            now = datetime.now(timezone.utc)
            await db_ref.quiz_level_progress.update_one(
                {
                    "owner_id": user["_id"],
                    "notebook_id": notebook["_id"],
                    "level_id": level["id"],
                },
                {"$set": {"questions_status": "generating", "updated_at": now}},
            )

            try:
                await generate_questions_for_level(
                    notebook, user, roadmap, unit, level, db_client=db_ref
                )
                await db_ref.quiz_level_progress.update_one(
                    {
                        "owner_id": user["_id"],
                        "notebook_id": notebook["_id"],
                        "level_id": level["id"],
                    },
                    {
                        "$set": {
                            "questions_status": "ready",
                            "updated_at": datetime.now(timezone.utc),
                        }
                    },
                )
            except Exception:
                logger.exception(
                    "Fallo generando preguntas",
                    extra={
                        "level_id": level.get("id"),
                        "notebook_id": notebook.get("_id"),
                    },
                )
                await db_ref.quiz_level_progress.update_one(
                    {
                        "owner_id": user["_id"],
                        "notebook_id": notebook["_id"],
                        "level_id": level["id"],
                    },
                    {
                        "$set": {
                            "questions_status": "failed",
                            "updated_at": datetime.now(timezone.utc),
                        }
                    },
                )


async def get_notebook_or_404(notebook_id: str, user: dict) -> dict:
    access = await resolve_notebook_access(notebook_id, user)
    return access.notebook

def build_level_doc(
    unit_id: str,
    title: str,
    level_type: str,
    order: int,
    passing_score: int,
) -> dict:
    return {
        "id": f"{unit_id}-{level_type}-{order}"
        if level_type == "lesson"
        else f"{unit_id}-exam",
        "unit_id": unit_id,
        "title": title,
        "type": level_type,
        "order": order,
        "passing_score": passing_score,
    }


def find_level(roadmap: dict, level_id: str) -> tuple[dict | None, dict | None]:
    for unit in roadmap.get("units", []):
        for level in unit.get("levels", []):
            if level.get("id") == level_id:
                return unit, level
    return None, None


async def generate_quiz_for_notebook(
    notebook: dict,
    user: dict,
    config: QuizGenerationConfig,
    length: str,
    difficulty: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> RoadmapOut:
    db_ref = db if db_client is None else db_client
    notebook_object_id = notebook["_id"]

    await db_ref.quiz_roadmaps.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook_object_id}
    )
    await db_ref.quiz_questions.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook_object_id}
    )
    await db_ref.quiz_attempts.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook_object_id}
    )
    await db_ref.quiz_level_progress.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook_object_id}
    )
    await db_ref.quiz_llm_payloads.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook_object_id}
    )

    context_lines = await fetch_context_lines(
        notebook["title"], notebook_object_id, user
    )
    context_text = compact_context(context_lines)
    units_data = await generate_roadmap_data(notebook["title"], context_lines, config)
    now = datetime.now(timezone.utc)
    await db_ref.quiz_llm_payloads.insert_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook_object_id,
            "type": "roadmap",
            "payload": {"units": units_data},
            "created_at": now,
        }
    )

    levels: list[dict] = []
    units_payload: list[dict] = []

    for unit in units_data:
        unit_id = unit["id"]
        lesson_levels = []
        for index, lesson_title in enumerate(unit["lessons"], start=1):
            level_doc = build_level_doc(
                unit_id=unit_id,
                title=lesson_title,
                level_type="lesson",
                order=index,
                passing_score=PASSING_LESSON_SCORE,
            )
            lesson_levels.append(level_doc)
            levels.append(level_doc)
        exam_level = build_level_doc(
            unit_id=unit_id,
            title=unit["exam_title"],
            level_type="exam",
            order=config.lessons_per_unit + 1,
            passing_score=PASSING_EXAM_SCORE,
        )
        lesson_levels.append(exam_level)
        levels.append(exam_level)

        units_payload.append(
            {
                "id": unit_id,
                "title": unit["title"],
                "description": unit["description"],
                "order": unit["order"],
                "levels": lesson_levels,
            }
        )

    now = datetime.now(timezone.utc)
    roadmap_doc = {
        "owner_id": user["_id"],
        "notebook_id": notebook_object_id,
        "title": notebook["title"],
        "length": length,
        "difficulty": difficulty,
        "context_text": context_text,
        "units": units_payload,
        "created_at": now,
        "updated_at": now,
    }
    result = await db_ref.quiz_roadmaps.insert_one(roadmap_doc)
    roadmap_doc["_id"] = result.inserted_id

    progress_docs = []
    first_level_id = levels[0]["id"] if levels else None
    for level in levels:
        status_value = "unlocked" if level["id"] == first_level_id else "locked"
        progress_docs.append(
            {
                "owner_id": user["_id"],
                "notebook_id": notebook_object_id,
                "level_id": level["id"],
                "status": status_value,
                "best_score": None,
                "attempts_count": 0,
                "questions_status": "idle",
                "passed_at": None,
                "created_at": now,
                "updated_at": now,
            }
        )
    if progress_docs:
        await db_ref.quiz_level_progress.insert_many(progress_docs)

    return await build_roadmap_response(roadmap_doc, user, db_client=db_ref)

