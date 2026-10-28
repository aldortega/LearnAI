from __future__ import annotations

import asyncio
import logging
import math

from bson import ObjectId
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from ...config import LLMProvider, settings
from ...gemini import embed_documents_with_fallback
from ..agents import gather_limited, invoke_structured
from ..rag import retrieve_context
from .constants import (
    DUPLICATE_SIMILARITY_THRESHOLD,
    MAX_PARALLEL_AGENTS,
    TARGET_CONTEXT_CHARS,
    TARGET_CONTEXT_TOP_K,
    UNIT_CONTEXT_CHARS,
)
from .llm import compact_context

logger = logging.getLogger(__name__)


class QuestionTargetLLM(BaseModel):
    concept: str
    focus: str
    research_query: str


class LevelPlanLLM(BaseModel):
    level_id: str
    targets: list[QuestionTargetLLM] = Field(min_length=1)


class UnitPlanLLM(BaseModel):
    levels: list[LevelPlanLLM] = Field(min_length=1)


def build_unit_plan_prompt(
    notebook_title: str,
    unit: dict,
    other_units: list[dict],
    levels: list[dict],
    question_counts: dict[str, int],
    difficulty_label: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un diseñador de evaluaciones. Repartes los conceptos de una unidad entre "
        "sus niveles para que cada nivel evalúe ideas distintas y ninguna pregunta se "
        "repita entre niveles. Responde solo con JSON válido en español, sin markdown."
    )
    levels_text = "\n".join(
        f"- level_id={level['id']} | {level['title']} | tipo={level['type']} | "
        f"preguntas={question_counts[level['id']]}"
        for level in levels
    )
    others_text = "\n".join(
        f"- {item['title']}: {item.get('description', '')}" for item in other_units
    )
    user_prompt = (
        f"Tema general: {notebook_title}\n"
        f"Unidad: {unit['title']}\n"
        f"Descripción de la unidad: {unit.get('description', '')}\n"
        f"Dificultad: {difficulty_label}\n\n"
        f"Niveles de la unidad:\n{levels_text}\n\n"
        f"Otras unidades (no invadas su contenido):\n{others_text or '(ninguna)'}\n\n"
        f"Contexto de las fuentes sobre la unidad:\n{context_text}\n\n"
        "Para cada nivel devuelve exactamente la cantidad de objetivos indicada en "
        "'preguntas'. Cada objetivo tiene:\n"
        "- concept: la idea concreta que se evalúa.\n"
        "- focus: qué se le pregunta al estudiante sobre esa idea "
        "(definición, aplicación, comparación, causa, ejemplo...).\n"
        "- research_query: consulta corta para buscar esa idea en las fuentes.\n"
        "Reglas:\n"
        "- Las lecciones deben cubrir conceptos distintos entre sí y alineados con su título.\n"
        "- El examen repasa conceptos de las lecciones, pero con un enfoque distinto al "
        "de las lecciones, nunca la misma pregunta.\n"
        "- Todos los conceptos deben pertenecer a esta unidad."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def normalize_level_targets(
    plan: UnitPlanLLM, levels: list[dict], question_counts: dict[str, int]
) -> dict[str, list[dict]]:
    plan_by_level = {item.level_id: item for item in plan.levels}
    normalized: dict[str, list[dict]] = {}
    for level in levels:
        level_plan = plan_by_level.get(level["id"])
        if level_plan is None:
            continue
        targets = [
            {
                "concept": item.concept.strip(),
                "focus": item.focus.strip(),
                "research_query": item.research_query.strip() or item.concept.strip(),
            }
            for item in level_plan.targets
            if item.concept.strip()
        ]
        if len(targets) < question_counts[level["id"]]:
            logger.warning(
                "Plan de cobertura incompleto",
                extra={"level_id": level["id"], "targets": len(targets)},
            )
            continue
        normalized[level["id"]] = targets[: question_counts[level["id"]]]
    return normalized


async def plan_unit_coverage(
    notebook_title: str,
    notebook_object_id: ObjectId,
    user: dict,
    unit: dict,
    other_units: list[dict],
    levels: list[dict],
    question_counts: dict[str, int],
    difficulty_label: str,
    provider: LLMProvider,
) -> dict[str, list[dict]]:
    context_lines, _, _, _ = await retrieve_context(
        f"{unit['title']}: {unit.get('description', '')}", notebook_object_id, user
    )
    system_message, user_message = build_unit_plan_prompt(
        notebook_title,
        unit,
        other_units,
        levels,
        question_counts,
        difficulty_label,
        compact_context(context_lines, max_chars=UNIT_CONTEXT_CHARS),
    )
    plan = await invoke_structured(
        UnitPlanLLM, [system_message, user_message], provider
    )
    return normalize_level_targets(plan, levels, question_counts)


async def fetch_target_context(
    target: dict, notebook_object_id: ObjectId, user: dict
) -> dict:
    try:
        context_lines, _, _, _ = await retrieve_context(
            target["research_query"],
            notebook_object_id,
            user,
            top_k=TARGET_CONTEXT_TOP_K,
        )
    except Exception as exc:
        logger.warning(
            "Fallo la busqueda de un concepto",
            extra={"concept": target["concept"], "error": str(exc)},
        )
        context_lines = []
    return {**target, "context": compact_context(context_lines, TARGET_CONTEXT_CHARS)}


async def fetch_targets_context(
    targets: list[dict], notebook_object_id: ObjectId, user: dict
) -> list[dict]:
    results = await gather_limited(
        [fetch_target_context(target, notebook_object_id, user) for target in targets],
        MAX_PARALLEL_AGENTS,
    )
    return [
        target if isinstance(result, BaseException) else result
        for target, result in zip(targets, results)
    ]


def _dot(left: list[float], right: list[float]) -> float:
    return math.fsum(a * b for a, b in zip(left, right))


async def find_duplicate_indices(
    new_texts: list[str], existing_texts: list[str]
) -> list[int]:
    if not new_texts:
        return []
    try:
        vectors = await asyncio.to_thread(
            embed_documents_with_fallback,
            existing_texts + new_texts,
            "models/gemini-embedding-001",
            settings.qdrant_vector_size,
            "SEMANTIC_SIMILARITY",
        )
    except Exception as exc:
        logger.warning("Fallo la deteccion de duplicadas", extra={"error": str(exc)})
        return []

    existing_vectors = vectors[: len(existing_texts)]
    new_vectors = vectors[len(existing_texts) :]
    duplicates: list[int] = []
    for index, vector in enumerate(new_vectors):
        references = existing_vectors + new_vectors[:index]
        if any(
            _dot(vector, reference) >= DUPLICATE_SIMILARITY_THRESHOLD
            for reference in references
        ):
            duplicates.append(index)
    return duplicates
