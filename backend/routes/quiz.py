from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from ..config import settings
from ..db import db
from ..schemas import (
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

UNITS_PER_ROADMAP = 5
LESSONS_PER_UNIT = 3
QUESTIONS_PER_LESSON = 6
QUESTIONS_PER_EXAM = 12
PASSING_LESSON_SCORE = 70
PASSING_EXAM_SCORE = 75
ROADMAP_SCHEMA = (
    "{\n"
    '  "units": [\n'
    "    {\n"
    '      "title": "string",\n'
    '      "description": "string",\n'
    '      "lessons": ["string", "string", "string"],\n'
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
    lessons: list[str] = Field(min_length=LESSONS_PER_UNIT, max_length=LESSONS_PER_UNIT)
    exam_title: str


class RoadmapPayloadLLM(BaseModel):
    units: list[RoadmapUnitLLM] = Field(
        min_length=UNITS_PER_ROADMAP, max_length=UNITS_PER_ROADMAP
    )


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
    title: str, context_text: str
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un diseñador de planes de estudio. Responde solo con JSON válido. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{ROADMAP_SCHEMA}"
    )
    user_prompt = (
        f"Tema general (usa exactamente este tema): {title}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Genera un roadmap de aprendizaje con exactamente 5 unidades sobre el tema general. "
        "Cada unidad debe incluir una lista de 3 lecciones (titulo solamente) "
        "y un examen final (titulo)."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_questions_prompt(
    title: str,
    unit_title: str,
    level_title: str,
    level_type: str,
    context_text: str,
    question_count: int,
    strict: bool = False,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un docente experto. Responde solo con JSON válido en español. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{QUESTIONS_SCHEMA}"
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
        f"Nivel: {level_title} ({level_type})\n\n"
        f"Contexto:\n{context_text}\n\n"
        f"Genera {question_count} preguntas de opción múltiple con 4 opciones (A, B, C, D) sobre el tema general. "
        "Incluye una pista corta y explicaciones por opción."
        f"\n{strict_instructions}"
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def normalize_units(payload: dict) -> list[dict]:
    units = payload.get("units")
    if not isinstance(units, list) or not units:
        raise ValueError("Units inválidas")
    normalized: list[dict] = []
    for index, unit in enumerate(units[:UNITS_PER_ROADMAP], start=1):
        title = str(unit.get("title", "")).strip() or f"Unidad {index}"
        description = str(unit.get("description", "")).strip() or ""
        lessons = unit.get("lessons") if isinstance(unit, dict) else None
        if not isinstance(lessons, list):
            lessons = []
        lesson_titles = [str(item).strip() for item in lessons if str(item).strip()]
        if len(lesson_titles) < LESSONS_PER_UNIT:
            for i in range(len(lesson_titles), LESSONS_PER_UNIT):
                lesson_titles.append(f"Lección {i + 1}")
        lesson_titles = lesson_titles[:LESSONS_PER_UNIT]
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
    if len(normalized) < UNITS_PER_ROADMAP:
        for index in range(len(normalized) + 1, UNITS_PER_ROADMAP + 1):
            normalized.append(
                {
                    "id": f"unit-{index}",
                    "title": f"Unidad {index}",
                    "description": "",
                    "order": index,
                    "lessons": [
                        f"Lección {lesson_index + 1}"
                        for lesson_index in range(LESSONS_PER_UNIT)
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


async def generate_roadmap_data(title: str, context_lines: list[str]) -> list[dict]:
    context_text = compact_context(context_lines)
    system_message, user_message = build_roadmap_prompt(title, context_text)
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
        return normalize_units(payload_data)
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
    context_lines: list[str],
    question_count: int,
) -> list[dict]:
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuizPayloadLLM.model_json_schema(), method="json_schema"
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_questions_prompt(
        title,
        unit_title,
        level_title,
        level_type,
        context_text,
        question_count,
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


@router.post("/{notebook_id}/roadmap/generate", response_model=RoadmapOut)
async def generate_roadmap(notebook_id: str, request: Request) -> RoadmapOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    notebook_object_id = notebook["_id"]

    await db.quiz_roadmaps.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook_object_id}
    )
    await db.quiz_questions.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook_object_id}
    )
    await db.quiz_attempts.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook_object_id}
    )
    await db.quiz_level_progress.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook_object_id}
    )
    await db.quiz_llm_payloads.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook_object_id}
    )

    context_lines = await fetch_context_lines(
        notebook["title"], notebook_object_id, user
    )
    units_data = await generate_roadmap_data(notebook["title"], context_lines)
    now = datetime.now(timezone.utc)
    await db.quiz_llm_payloads.insert_one(
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
            order=LESSONS_PER_UNIT + 1,
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

    unit_titles = {unit["id"]: unit["title"] for unit in units_payload}
    all_question_docs = []

    for level in levels:
        question_count = (
            QUESTIONS_PER_EXAM if level["type"] == "exam" else QUESTIONS_PER_LESSON
        )
        unit_title = unit_titles.get(level["unit_id"], "Unidad")
        questions = await generate_questions(
            notebook["title"],
            unit_title,
            level["title"],
            level["type"],
            context_lines,
            question_count,
        )
        now = datetime.now(timezone.utc)
        await db.quiz_llm_payloads.insert_one(
            {
                "owner_id": user["_id"],
                "notebook_id": notebook_object_id,
                "type": "questions",
                "unit_id": level["unit_id"],
                "level_id": level["id"],
                "payload": {"questions": questions},
                "created_at": now,
            }
        )
        for order, question in enumerate(questions, start=1):
            all_question_docs.append(
                {
                    "owner_id": user["_id"],
                    "notebook_id": notebook_object_id,
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

    if all_question_docs:
        await db.quiz_questions.insert_many(all_question_docs)

    now = datetime.now(timezone.utc)
    roadmap_doc = {
        "owner_id": user["_id"],
        "notebook_id": notebook_object_id,
        "title": notebook["title"],
        "units": units_payload,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.quiz_roadmaps.insert_one(roadmap_doc)
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
                "passed_at": None,
                "created_at": now,
                "updated_at": now,
            }
        )
    if progress_docs:
        await db.quiz_level_progress.insert_many(progress_docs)

    return await build_roadmap_response(roadmap_doc, user)


async def build_roadmap_response(roadmap: dict, user: dict) -> RoadmapOut:
    progress_cursor = db.quiz_level_progress.find(
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

    return RoadmapLevelOut(
        id=level["id"],
        unit_id=level["unit_id"],
        title=level["title"],
        type=level["type"],
        order=level["order"],
        passing_score=level["passing_score"],
        status=status_value,
        best_score=best_score,
    )


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

    cursor = db.quiz_questions.find(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "level_id": level_id,
        }
    ).sort("order", 1)
    questions = [doc async for doc in cursor]

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
