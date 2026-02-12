from __future__ import annotations

import asyncio
import json
import logging
from typing import Literal

from bson import ObjectId
from fastapi import HTTPException, status
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from ...gemini import has_gemini_api_keys
from ..rag import create_llm, retrieve_context
from .constants import (
    DIFFICULTY_LABELS,
    LENGTH_CONFIGS,
    QUESTIONS_SCHEMA,
    ROADMAP_SCHEMA,
    QuizGenerationConfig,
)

logger = logging.getLogger(__name__)

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


async def fetch_context_lines(
    title: str, notebook_object_id: ObjectId, user: dict
) -> list[str]:
    if not has_gemini_api_keys():
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
