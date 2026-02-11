from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status

from ...db import db
from ...rq_queue import quiz_queue
from ...schemas.quiz import (
    QuizAttemptOut,
    QuizQuestionOut,
    QuizQuestionsGenerationOut,
    QuizSubmitRequest,
    QuizSubmitResponse,
    RoadmapLevelOut,
)
from ..auth import get_current_user
from .job_service import process_quiz_level_questions_generation
from .progress_service import unlock_next_levels
from .generation_service import (
    find_level,
    get_notebook_or_404,
    resolve_option_explanation,
)
from .repository import find_quiz_roadmap

router = APIRouter(tags=["quiz"])


@router.get("/{notebook_id}/roadmap/levels/{level_id}", response_model=RoadmapLevelOut)
async def get_level(
    notebook_id: str, level_id: str, request: Request
) -> RoadmapLevelOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    roadmap = await find_quiz_roadmap(user["_id"], notebook["_id"])
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap no encontrado"
        )

    unit, level = find_level(roadmap, level_id)
    if not level or not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Nivel no encontrado"
        )

    progress = await db.quiz_level_progress.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    status_value = progress["status"] if progress else "locked"
    best_score = progress.get("best_score") if progress else None
    questions_status = progress.get("questions_status") if progress else None
    if questions_status is None:
        questions_status = "idle"

    return RoadmapLevelOut(
        id=level["id"],
        unit_id=level["unit_id"],
        title=level["title"],
        type=level["type"],
        order=level["order"],
        passing_score=level["passing_score"],
        status=status_value,
        best_score=best_score,
        questions_status=questions_status,
    )


@router.post(
    "/{notebook_id}/roadmap/levels/{level_id}/questions/generate",
    response_model=QuizQuestionsGenerationOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_level_questions(
    notebook_id: str, level_id: str, request: Request
) -> QuizQuestionsGenerationOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    roadmap = await find_quiz_roadmap(user["_id"], notebook["_id"])
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap no encontrado"
        )

    unit, level = find_level(roadmap, level_id)
    if not level or not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Nivel no encontrado"
        )

    progress = await db.quiz_level_progress.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    if not progress or progress.get("status") == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Nivel bloqueado"
        )

    existing_question = await db.quiz_questions.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    now = datetime.now(timezone.utc)
    if existing_question:
        await db.quiz_level_progress.update_one(
            {
                "owner_id": user["_id"],
                "notebook_id": notebook["_id"],
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
        return QuizQuestionsGenerationOut(status="ready")

    questions_status = progress.get("questions_status") if progress else None
    if questions_status is None:
        questions_status = "idle"

    if questions_status == "generating":
        return QuizQuestionsGenerationOut(status="generating")
    if questions_status == "ready":
        return QuizQuestionsGenerationOut(status="ready")

    await db.quiz_level_progress.update_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        },
        {
            "$set": {
                "questions_status": "generating",
                "questions_error": None,
                "updated_at": now,
            }
        },
    )
    quiz_queue.enqueue(
        process_quiz_level_questions_generation,
        str(notebook["_id"]),
        str(user["_id"]),
        level_id,
    )
    return QuizQuestionsGenerationOut(status="generating")


@router.get(
    "/{notebook_id}/roadmap/levels/{level_id}/questions",
    response_model=list[QuizQuestionOut],
)
async def list_questions(
    notebook_id: str, level_id: str, request: Request
) -> list[QuizQuestionOut]:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    roadmap = await find_quiz_roadmap(user["_id"], notebook["_id"])
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap no encontrado"
        )

    unit, level = find_level(roadmap, level_id)
    if not level or not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Nivel no encontrado"
        )

    progress = await db.quiz_level_progress.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    if not progress or progress.get("status") == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Nivel bloqueado"
        )

    questions_query = {
        "owner_id": user["_id"],
        "notebook_id": notebook["_id"],
        "level_id": level_id,
    }
    cursor = db.quiz_questions.find(questions_query).sort("order", 1)
    questions = [doc async for doc in cursor]

    if not questions:
        questions_status = progress.get("questions_status") if progress else None
        if questions_status is None:
            questions_status = "idle"
        if questions_status == "failed":
            error_detail = progress.get("questions_error") if progress else None
            if not error_detail:
                error_detail = "No se pudieron generar preguntas"
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=error_detail,
            )
        raise HTTPException(
            status_code=status.HTTP_202_ACCEPTED,
            detail="Las preguntas se están generando. Reintenta en unos segundos.",
        )

    if questions and progress.get("questions_status") != "ready":
        await db.quiz_level_progress.update_one(
            {
                "owner_id": user["_id"],
                "notebook_id": notebook["_id"],
                "level_id": level_id,
            },
            {
                "$set": {
                    "questions_status": "ready",
                    "questions_error": None,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    return [
        QuizQuestionOut(
            id=str(question["_id"]),
            level_id=question["level_id"],
            unit_id=question["unit_id"],
            question=question["question"],
            options=question["options"],
            hint=question.get("hint", ""),
        )
        for question in questions
    ]


@router.get(
    "/{notebook_id}/roadmap/levels/{level_id}/attempts",
    response_model=list[QuizAttemptOut],
)
async def list_attempts(
    notebook_id: str, level_id: str, request: Request
) -> list[QuizAttemptOut]:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    roadmap = await find_quiz_roadmap(user["_id"], notebook["_id"])
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap no encontrado"
        )

    unit, level = find_level(roadmap, level_id)
    if not level or not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Nivel no encontrado"
        )

    progress = await db.quiz_level_progress.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    if not progress or progress.get("status") == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Nivel bloqueado"
        )

    attempts_cursor = db.quiz_attempts.find(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    ).sort("created_at", -1)

    attempts: list[dict] = []
    seen_questions: set[ObjectId] = set()
    async for attempt in attempts_cursor:
        question_id = attempt.get("question_id")
        if not isinstance(question_id, ObjectId) or question_id in seen_questions:
            continue
        seen_questions.add(question_id)
        attempts.append(attempt)

    if not attempts:
        return []

    question_ids = [attempt["question_id"] for attempt in attempts]
    questions_cursor = db.quiz_questions.find({"_id": {"$in": question_ids}})
    questions_by_id = {doc["_id"]: doc async for doc in questions_cursor}

    response: list[QuizAttemptOut] = []
    for attempt in attempts:
        question = questions_by_id.get(attempt["question_id"])
        selected_option_id = str(attempt.get("selected_option_id", "")).strip()
        created_at = attempt.get("created_at")
        if not isinstance(created_at, datetime):
            created_at = datetime.now(timezone.utc)
        correct_option_id = ""
        explanation = "Respuesta registrada."
        if question:
            correct_option_id = str(question.get("correct_option_id", "")).strip()
            explanation = resolve_option_explanation(
                question.get("explanations") or {}, selected_option_id
            )

        response.append(
            QuizAttemptOut(
                question_id=str(attempt["question_id"]),
                selected_option_id=selected_option_id,
                is_correct=bool(attempt.get("is_correct")),
                correct_option_id=correct_option_id,
                explanation=explanation,
                created_at=created_at,
            )
        )

    return response


@router.post(
    "/{notebook_id}/roadmap/levels/{level_id}/attempts/reset",
    response_model=RoadmapLevelOut,
)
async def reset_attempts(
    notebook_id: str, level_id: str, request: Request
) -> RoadmapLevelOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    roadmap = await find_quiz_roadmap(user["_id"], notebook["_id"])
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap no encontrado"
        )

    unit, level = find_level(roadmap, level_id)
    if not level or not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Nivel no encontrado"
        )

    progress = await db.quiz_level_progress.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    if not progress or progress.get("status") == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Nivel bloqueado"
        )

    if progress.get("status") == "passed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Nivel ya aprobado"
        )

    now = datetime.now(timezone.utc)
    await db.quiz_attempts.delete_many(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    await db.quiz_level_progress.update_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        },
        {
            "$set": {
                "best_score": None,
                "attempts_count": 0,
                "passed_at": None,
                "updated_at": now,
            }
        },
    )

    questions_status = progress.get("questions_status") if progress else None
    if questions_status is None:
        questions_status = "idle"

    return RoadmapLevelOut(
        id=level["id"],
        unit_id=level["unit_id"],
        title=level["title"],
        type=level["type"],
        order=level["order"],
        passing_score=level["passing_score"],
        status=progress.get("status") if progress else "locked",
        best_score=None,
        questions_status=questions_status,
    )


@router.post(
    "/{notebook_id}/roadmap/levels/{level_id}/submit",
    response_model=QuizSubmitResponse,
)
async def submit_answer(
    notebook_id: str,
    level_id: str,
    payload: QuizSubmitRequest,
    request: Request,
) -> QuizSubmitResponse:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    roadmap = await find_quiz_roadmap(user["_id"], notebook["_id"])
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap no encontrado"
        )

    unit, level = find_level(roadmap, level_id)
    if not level or not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Nivel no encontrado"
        )

    progress = await db.quiz_level_progress.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    if not progress or progress.get("status") == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Nivel bloqueado"
        )

    try:
        question_object_id = ObjectId(payload.question_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Pregunta inválida"
        ) from exc

    question = await db.quiz_questions.find_one(
        {
            "_id": question_object_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pregunta no encontrada"
        )

    selected_option_id = payload.selected_option_id.strip().upper()
    option_ids = {option.get("id") for option in question.get("options", [])}
    if selected_option_id not in option_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Opción inválida"
        )
    is_correct = selected_option_id == question["correct_option_id"]
    explanations = question.get("explanations") or {}
    explanation = resolve_option_explanation(explanations, selected_option_id)

    now = datetime.now(timezone.utc)
    await db.quiz_attempts.insert_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
            "question_id": question_object_id,
            "selected_option_id": selected_option_id,
            "is_correct": is_correct,
            "created_at": now,
        }
    )

    total_questions = await db.quiz_questions.count_documents(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    attempts_cursor = db.quiz_attempts.find(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    )
    attempts = [doc async for doc in attempts_cursor]
    correct_ids = {
        doc["question_id"] for doc in attempts if doc.get("is_correct") is True
    }
    correct_count = len(correct_ids)
    level_score = int((correct_count / total_questions) * 100) if total_questions else 0
    passed = level_score >= level["passing_score"]

    best_score = progress.get("best_score") or 0
    updated_best_score = max(best_score, level_score)
    attempts_count = progress.get("attempts_count", 0) + 1

    update_payload: dict[str, object] = {
        "best_score": updated_best_score,
        "attempts_count": attempts_count,
        "updated_at": now,
    }
    unlocked_levels: list[str] = []

    if passed and progress.get("status") != "passed":
        update_payload["status"] = "passed"
        update_payload["passed_at"] = now
        unlocked_levels = await unlock_next_levels(
            roadmap, level, user, notebook["_id"]
        )

    await db.quiz_level_progress.update_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        },
        {"$set": update_payload},
    )

    return QuizSubmitResponse(
        is_correct=is_correct,
        explanation=explanation,
        correct_option_id=question["correct_option_id"],
        level_score=level_score,
        passed=passed,
        unlocked_levels=unlocked_levels,
    )
