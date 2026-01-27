from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status
from langchain_core.messages import HumanMessage, SystemMessage
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from ..config import settings
from ..db import db
from ..rq_queue import quiz_queue
from ..schemas import (
    QuizAttemptOut,
    QuizGenerateRequest,
    QuizGenerationJobOut,
    QuizQuestionsGenerationOut,
    QuizQuestionOut,
    QuizSubmitRequest,
    QuizSubmitResponse,
    RoadmapLevelOut,
    RoadmapOut,
    RoadmapUnitOut,
)
from .auth import get_current_user
from .rag import create_llm, retrieve_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notebooks", tags=["quiz"])

DEFAULT_UNITS_PER_ROADMAP = 5
DEFAULT_LESSONS_PER_UNIT = 3
DEFAULT_QUESTIONS_PER_LESSON = 6
DEFAULT_QUESTIONS_PER_EXAM = 12
PASSING_LESSON_SCORE = 70
PASSING_EXAM_SCORE = 75
QUESTION_GENERATION_WAIT_SECONDS = 20
QUESTION_GENERATION_POLL_SECONDS = 0.5


@dataclass(frozen=True)
class QuizGenerationConfig:
    units_per_roadmap: int
    lessons_per_unit: int
    questions_per_lesson: int
    questions_per_exam: int


LENGTH_CONFIGS: dict[str, QuizGenerationConfig] = {
    "short": QuizGenerationConfig(
        units_per_roadmap=3,
        lessons_per_unit=2,
        questions_per_lesson=4,
        questions_per_exam=8,
    ),
    "medium": QuizGenerationConfig(
        units_per_roadmap=4,
        lessons_per_unit=3,
        questions_per_lesson=5,
        questions_per_exam=10,
    ),
    "long": QuizGenerationConfig(
        units_per_roadmap=DEFAULT_UNITS_PER_ROADMAP,
        lessons_per_unit=DEFAULT_LESSONS_PER_UNIT,
        questions_per_lesson=DEFAULT_QUESTIONS_PER_LESSON,
        questions_per_exam=DEFAULT_QUESTIONS_PER_EXAM,
    ),
}

DIFFICULTY_LABELS = {
    "basic": "básica",
    "intermediate": "intermedia",
    "advanced": "avanzada",
}
ROADMAP_SCHEMA = (
    "{\n"
    '  "units": [\n'
    "    {\n"
    '      "title": "string",\n'
    '      "description": "string",\n'
    '      "lessons": ["string"],\n'
    '      "exam_title": "string"\n'
    "    }\n"
    "  ]\n"
    "}\n"
)

QUESTIONS_SCHEMA = (
    "{\n"
    '  "questions": [\n'
    "    {\n"
    '      "question": "string",\n'
    '      "options": [\n'
    '        {"id": "A", "text": "string"},\n'
    '        {"id": "B", "text": "string"},\n'
    '        {"id": "C", "text": "string"},\n'
    '        {"id": "D", "text": "string"}\n'
    "      ],\n"
    '      "correct_option_id": "A|B|C|D",\n'
    '      "hint": "string",\n'
    '      "explanations": {\n'
    '        "correct": "string",\n'
    '        "by_option": {"A": "string", "B": "string", "C": "string", "D": "string"}\n'
    "      }\n"
    "    }\n"
    "  ]\n"
    "}\n"
)


class RoadmapUnitLLM(BaseModel):
    title: str
    description: str
    lessons: list[str] = Field(min_length=1, max_length=10)
    exam_title: str


class RoadmapPayloadLLM(BaseModel):
    units: list[RoadmapUnitLLM] = Field(min_length=1, max_length=10)


class QuizOptionLLM(BaseModel):
    id: Literal["A", "B", "C", "D"]
    text: str


class QuizExplanationsLLM(BaseModel):
    correct: str
    by_option: dict[Literal["A", "B", "C", "D"], str]


class QuizQuestionLLM(BaseModel):
    question: str
    options: list[QuizOptionLLM] = Field(min_length=4, max_length=4)
    correct_option_id: Literal["A", "B", "C", "D"]
    hint: str
    explanations: QuizExplanationsLLM


class QuizPayloadLLM(BaseModel):
    questions: list[QuizQuestionLLM] = Field(min_length=1)


def compact_context(context_lines: list[str], max_chars: int = 4000) -> str:
    context_text = "\n\n".join(context_lines).strip()
    if not context_text:
        return "(sin información relevante)"
    if len(context_text) <= max_chars:
        return context_text
    return context_text[:max_chars].rstrip() + "…"


def coerce_payload(payload: object, model: type[BaseModel]) -> dict:
    if isinstance(payload, BaseModel):
        return payload.model_dump()
    if isinstance(payload, dict):
        return payload
    return model.model_validate(payload).model_dump()


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


def resolve_generation_config(length: str) -> QuizGenerationConfig:
    config = LENGTH_CONFIGS.get(length)
    if not config:
        raise ValueError("Tamaño de quiz inválido")
    return config


def resolve_difficulty_label(difficulty: str) -> str:
    label = DIFFICULTY_LABELS.get(difficulty)
    if not label:
        raise ValueError("Dificultad inválida")
    return label


def resolve_roadmap_length(roadmap: dict) -> str:
    length_value = str(roadmap.get("length") or "long")
    if length_value not in LENGTH_CONFIGS:
        return "long"
    return length_value


def resolve_roadmap_difficulty(roadmap: dict) -> str:
    difficulty_value = str(roadmap.get("difficulty") or "basic")
    if difficulty_value not in DIFFICULTY_LABELS:
        return "basic"
    return difficulty_value


def resolve_question_count(length: str, level_type: str) -> int:
    config = resolve_generation_config(length)
    return (
        config.questions_per_exam
        if level_type == "exam"
        else config.questions_per_lesson
    )


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
    try:
        notebook_object_id = ObjectId(notebook_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook inválido"
        ) from exc

    notebook = await db.notebooks.find_one(
        {"_id": notebook_object_id, "owner_id": user["_id"]}
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notebook no encontrado"
        )
    return notebook


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


async def fetch_context_lines(
    title: str, notebook_object_id: ObjectId, user: dict
) -> list[str]:
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Gemini no configurado"
        )

    context_lines, _, _, _ = await retrieve_context(
        f"Conceptos clave sobre {title}", notebook_object_id, user
    )
    return context_lines


def build_roadmap_prompt(
    title: str,
    context_text: str,
    units_per_roadmap: int,
    lessons_per_unit: int,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un diseñador de planes de estudio. Responde solo con JSON válido. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{ROADMAP_SCHEMA}"
    )
    user_prompt = (
        f"Tema general (usa exactamente este tema): {title}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Genera un roadmap de aprendizaje con exactamente "
        f"{units_per_roadmap} unidades sobre el tema general. "
        f"Cada unidad debe incluir una lista de {lessons_per_unit} lecciones "
        "(titulo solamente) y un examen final (titulo)."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_questions_prompt(
    title: str,
    unit_title: str,
    level_title: str,
    level_type: str,
    context_text: str,
    question_count: int,
    difficulty_label: str,
    strict: bool = False,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un docente experto. Responde solo con JSON válido en español. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{QUESTIONS_SCHEMA}\n"
        "Las preguntas deben estar directamente relacionadas con la unidad y el nivel indicados. "
        "Prioriza conocimiento general y variado dentro de ese foco. Usa el contexto solo como apoyo "
        "cuando sea útil; si es limitado o repetitivo, completa con conocimiento "
        "general sin salir del tema de la unidad y el nivel. No repitas preguntas ni enfoques."
    )
    strict_instructions = ""
    if strict:
        strict_instructions = (
            "Responde solo con JSON válido, sin markdown ni texto extra. "
            "No uses comillas simples. No agregues saltos de línea dentro de textos. "
            "Pistas y explicaciones deben tener máximo una oración."
        )

    user_prompt = (
        f"Tema general (usa exactamente este tema): {title}\n"
        f"Unidad: {unit_title}\n"
        f"Nivel: {level_title} ({level_type})\n"
        "Las preguntas deben centrarse especificamente en la unidad y el nivel.\n\n"
        f"Contexto (apoyo opcional):\n{context_text}\n\n"
        f"Dificultad: {difficulty_label}. "
        f"Genera {question_count} preguntas de opción múltiple con 4 opciones (A, B, C, D) sobre el tema general, "
        "pero enfocadas estrictamente en la unidad y el nivel. "
        "Incluye una pista corta y explicaciones por opción."
        f"\n{strict_instructions}"
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def normalize_units(
    payload: dict, units_per_roadmap: int, lessons_per_unit: int
) -> list[dict]:
    units = payload.get("units")
    if not isinstance(units, list) or not units:
        raise ValueError("Units inválidas")
    normalized: list[dict] = []
    for index, unit in enumerate(units[:units_per_roadmap], start=1):
        title = str(unit.get("title", "")).strip() or f"Unidad {index}"
        description = str(unit.get("description", "")).strip() or ""
        lessons = unit.get("lessons") if isinstance(unit, dict) else None
        if not isinstance(lessons, list):
            lessons = []
        lesson_titles = [str(item).strip() for item in lessons if str(item).strip()]
        if len(lesson_titles) < lessons_per_unit:
            for i in range(len(lesson_titles), lessons_per_unit):
                lesson_titles.append(f"Lección {i + 1}")
        lesson_titles = lesson_titles[:lessons_per_unit]
        exam_title = str(unit.get("exam_title", "")).strip() or "Examen final"
        normalized.append(
            {
                "id": f"unit-{index}",
                "title": title,
                "description": description,
                "order": index,
                "lessons": lesson_titles,
                "exam_title": exam_title,
            }
        )
    if len(normalized) < units_per_roadmap:
        for index in range(len(normalized) + 1, units_per_roadmap + 1):
            normalized.append(
                {
                    "id": f"unit-{index}",
                    "title": f"Unidad {index}",
                    "description": "",
                    "order": index,
                    "lessons": [
                        f"Lección {lesson_index + 1}"
                        for lesson_index in range(lessons_per_unit)
                    ],
                    "exam_title": "Examen final",
                }
            )
    return normalized


def normalize_questions(
    payload: dict, question_count: int, allow_partial: bool = False
) -> list[dict]:
    questions = payload.get("questions") if isinstance(payload, dict) else None
    if not isinstance(questions, list):
        raise ValueError("Preguntas inválidas")

    normalized: list[dict] = []
    invalid_reasons: list[str] = []

    for index, item in enumerate(questions[:question_count], start=1):
        question_text = str(item.get("question", "")).strip()
        options = item.get("options") if isinstance(item, dict) else None
        if not question_text:
            invalid_reasons.append(f"#{index} sin pregunta")
            continue
        if not isinstance(options, list) or len(options) != 4:
            invalid_reasons.append(f"#{index} opciones inválidas")
            continue
        option_docs = []
        option_ids = set()
        for option in options:
            option_id = str(option.get("id", "")).strip().upper()
            option_text = str(option.get("text", "")).strip()
            if option_id not in {"A", "B", "C", "D"} or not option_text:
                continue
            if option_id in option_ids:
                continue
            option_ids.add(option_id)
            option_docs.append({"id": option_id, "text": option_text})
        if len(option_docs) != 4:
            invalid_reasons.append(f"#{index} opciones incompletas")
            continue
        correct_option_id = str(item.get("correct_option_id", "")).strip().upper()
        if correct_option_id not in option_ids:
            invalid_reasons.append(f"#{index} correct_option_id inválido")
            continue
        hint = str(item.get("hint", "")).strip() or "Piensa en el concepto principal."
        explanations = item.get("explanations") if isinstance(item, dict) else {}
        if not isinstance(explanations, dict):
            explanations = {}
        normalized.append(
            {
                "question": question_text,
                "options": option_docs,
                "correct_option_id": correct_option_id,
                "hint": hint,
                "explanations": explanations,
            }
        )

    if invalid_reasons and (not allow_partial or len(normalized) < question_count):
        logger.warning(
            "Preguntas descartadas",
            extra={
                "total": len(questions),
                "valid": len(normalized),
                "reasons": invalid_reasons[:6],
            },
        )

    if not allow_partial and len(normalized) < question_count:
        raise ValueError("Cantidad insuficiente de preguntas")
    return normalized[:question_count]


def find_level(roadmap: dict, level_id: str) -> tuple[dict | None, dict | None]:
    for unit in roadmap.get("units", []):
        for level in unit.get("levels", []):
            if level.get("id") == level_id:
                return unit, level
    return None, None


async def generate_roadmap_data(
    title: str, context_lines: list[str], config: QuizGenerationConfig
) -> list[dict]:
    context_text = compact_context(context_lines)
    system_message, user_message = build_roadmap_prompt(
        title, context_text, config.units_per_roadmap, config.lessons_per_unit
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=RoadmapPayloadLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, RoadmapPayloadLLM)
        logger.info(
            "Roadmap estructurado:\n%s", json.dumps(payload_data, ensure_ascii=False)
        )
        return normalize_units(
            payload_data, config.units_per_roadmap, config.lessons_per_unit
        )
    except Exception as exc:
        logger.exception("Roadmap JSON inválido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar roadmap",
        ) from exc


async def generate_questions(
    title: str,
    unit_title: str,
    level_title: str,
    level_type: str,
    context_text: str,
    question_count: int,
    difficulty_label: str,
) -> list[dict]:
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuizPayloadLLM.model_json_schema(), method="json_schema"
    )
    normalized_context = context_text.strip() if isinstance(context_text, str) else ""
    if not normalized_context:
        normalized_context = "(sin información relevante)"
    system_message, user_message = build_questions_prompt(
        title,
        unit_title,
        level_title,
        level_type,
        normalized_context,
        question_count,
        difficulty_label,
        False,
    )

    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuizPayloadLLM)
        logger.info(
            "Preguntas estructuradas:\n%s",
            json.dumps(payload_data, ensure_ascii=False),
        )
        questions = normalize_questions(
            payload_data, question_count, allow_partial=False
        )
    except Exception as exc:
        logger.exception("Preguntas JSON inválidas", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudieron generar preguntas",
        ) from exc

    return questions


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

        notebook = await worker_db.notebooks.find_one(
            {"_id": notebook_object_id, "owner_id": owner_object_id}
        )
        if not notebook:
            logger.error("Notebook no encontrado en preguntas")
            return

        roadmap = await worker_db.quiz_roadmaps.find_one(
            {"owner_id": owner_object_id, "notebook_id": notebook_object_id}
        )
        if not roadmap:
            logger.error("Roadmap no encontrado en preguntas")
            return

        user = {"_id": owner_object_id}
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

        notebook = await worker_db.notebooks.find_one(
            {"_id": notebook_object_id, "owner_id": owner_object_id}
        )
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
            user = {"_id": owner_object_id}
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

        notebook = await worker_db.notebooks.find_one(
            {"_id": notebook_object_id, "owner_id": owner_object_id}
        )
        if not notebook:
            await mark_quiz_job_failed(
                job_id, "Notebook no encontrado", db_client=worker_db
            )
            return

        try:
            config = resolve_generation_config(length)
            resolve_difficulty_label(difficulty)
            user = {"_id": owner_object_id}
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


@router.post(
    "/{notebook_id}/roadmap/generate",
    response_model=QuizGenerationJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_roadmap(
    notebook_id: str, payload: QuizGenerateRequest, request: Request
) -> QuizGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    try:
        resolve_generation_config(payload.length)
        resolve_difficulty_label(payload.difficulty)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    job = quiz_queue.enqueue(
        process_quiz_generation,
        str(notebook["_id"]),
        str(user["_id"]),
        payload.length,
        payload.difficulty,
    )
    now = datetime.now(timezone.utc)
    await db.quiz_generation_jobs.insert_one(
        {
            "job_id": job.id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "length": payload.length,
            "difficulty": payload.difficulty,
            "error": None,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    return QuizGenerationJobOut(job_id=job.id, status="queued")


@router.get("/{notebook_id}/roadmap/generate", response_model=QuizGenerationJobOut)
async def get_latest_generate_status(
    notebook_id: str, request: Request
) -> QuizGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.quiz_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado"
        )

    return QuizGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get(
    "/{notebook_id}/roadmap/generate/{job_id}", response_model=QuizGenerationJobOut
)
async def get_generate_status(
    notebook_id: str, job_id: str, request: Request
) -> QuizGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.quiz_generation_jobs.find_one(
        {
            "job_id": job_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado"
        )

    return QuizGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


async def build_roadmap_response(
    roadmap: dict,
    user: dict,
    db_client: AsyncIOMotorDatabase | None = None,
) -> RoadmapOut:
    db_ref = db if db_client is None else db_client
    progress_cursor = db_ref.quiz_level_progress.find(
        {"owner_id": user["_id"], "notebook_id": roadmap["notebook_id"]}
    )
    progress_docs = [doc async for doc in progress_cursor]
    progress_by_level = {doc["level_id"]: doc for doc in progress_docs}

    units_out: list[RoadmapUnitOut] = []
    for unit in roadmap.get("units", []):
        levels_out: list[RoadmapLevelOut] = []
        for level in unit.get("levels", []):
            progress = progress_by_level.get(level["id"])
            status_value = progress["status"] if progress else "locked"
            best_score = progress.get("best_score") if progress else None
            questions_status = progress.get("questions_status") if progress else None
            if questions_status is None:
                questions_status = "idle"
            levels_out.append(
                RoadmapLevelOut(
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
            )
        units_out.append(
            RoadmapUnitOut(
                id=unit["id"],
                title=unit["title"],
                description=unit["description"],
                order=unit["order"],
                levels=levels_out,
            )
        )

    return RoadmapOut(
        id=str(roadmap["_id"]),
        notebook_id=str(roadmap["notebook_id"]),
        owner_id=str(roadmap["owner_id"]),
        title=roadmap["title"],
        units=units_out,
        created_at=roadmap["created_at"],
        updated_at=roadmap["updated_at"],
    )


@router.get("/{notebook_id}/roadmap", response_model=RoadmapOut)
async def get_roadmap(notebook_id: str, request: Request) -> RoadmapOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    roadmap = await db.quiz_roadmaps.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap no encontrado"
        )
    return await build_roadmap_response(roadmap, user)


@router.get("/{notebook_id}/roadmap/levels/{level_id}", response_model=RoadmapLevelOut)
async def get_level(
    notebook_id: str, level_id: str, request: Request
) -> RoadmapLevelOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    roadmap = await db.quiz_roadmaps.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
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

    roadmap = await db.quiz_roadmaps.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
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

    roadmap = await db.quiz_roadmaps.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
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

    roadmap = await db.quiz_roadmaps.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
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

    roadmap = await db.quiz_roadmaps.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
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

    roadmap = await db.quiz_roadmaps.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
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


async def unlock_next_levels(
    roadmap: dict, level: dict, user: dict, notebook_id: ObjectId
) -> list[str]:
    unlocked: list[str] = []
    unit_id = level["unit_id"]
    units = roadmap.get("units", [])
    unit_index = next(
        (index for index, item in enumerate(units) if item.get("id") == unit_id),
        None,
    )
    if unit_index is None:
        return unlocked

    target_levels: list[str] = []
    unit_levels = sorted(
        units[unit_index].get("levels", []), key=lambda item: item.get("order", 0)
    )

    if level["type"] == "lesson":
        current_index = next(
            (
                index
                for index, item in enumerate(unit_levels)
                if item.get("id") == level["id"]
            ),
            None,
        )
        if current_index is not None and current_index + 1 < len(unit_levels):
            target_levels.append(unit_levels[current_index + 1]["id"])
    else:
        if unit_index + 1 < len(units):
            next_unit_levels = sorted(
                units[unit_index + 1].get("levels", []),
                key=lambda item: item.get("order", 0),
            )
            if next_unit_levels:
                target_levels.append(next_unit_levels[0]["id"])

    now = datetime.now(timezone.utc)
    for level_id in target_levels:
        result = await db.quiz_level_progress.update_one(
            {
                "owner_id": user["_id"],
                "notebook_id": notebook_id,
                "level_id": level_id,
                "status": "locked",
            },
            {"$set": {"status": "unlocked", "updated_at": now}},
        )
        if result.modified_count:
            unlocked.append(level_id)

    return unlocked
