import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from ...db import db
from ...schemas.reports import (
    ReportPromptTemplateOut,
    ReportSuggestionOut,
)
from ..rag import create_llm, retrieve_context
from .constants import REPORT_TEMPLATE_CONFIGS, ReportSuggestionsPayloadLLM, SUGGESTION_COUNT
from .normalization import coerce_text, compact_context, normalize_prompt, normalize_title
from .prompts import build_suggestions_prompt

logger = logging.getLogger(__name__)


def build_templates() -> list[ReportPromptTemplateOut]:
    return [
        ReportPromptTemplateOut(
            type=report_type,
            label=template["label"],
            description=template["description"],
            default_prompt=template["default_prompt"],
            is_editable=True,
        )
        for report_type, template in REPORT_TEMPLATE_CONFIGS.items()
        if report_type != "ai_suggested"
    ]


def build_fallback_report_suggestions(notebook_title: str) -> list[ReportSuggestionOut]:
    fallback_items = [
        {
            "title": "Mapa de conceptos clave",
            "description": (
                "Organiza los conceptos principales, sus relaciones y aplicaciones."
            ),
            "default_prompt": (
                f"Crea un informe tipo mapa conceptual sobre {notebook_title}. "
                "Incluye conceptos clave, relaciones entre ellos y ejemplos practicos."
            ),
        },
        {
            "title": "Analisis comparativo",
            "description": (
                "Contrasta enfoques, ventajas, limites y casos recomendados."
            ),
            "default_prompt": (
                f"Genera un analisis comparativo de los enfoques sobre {notebook_title}. "
                "Incluye diferencias, fortalezas, riesgos y contexto de uso."
            ),
        },
        {
            "title": "Checklist de aplicacion",
            "description": (
                "Resume pasos accionables para aplicar lo aprendido."
            ),
            "default_prompt": (
                f"Redacta un checklist practico para aplicar {notebook_title}. "
                "Incluye pasos, validaciones, errores comunes y recomendaciones."
            ),
        },
        {
            "title": "FAQ de estudio",
            "description": (
                "Responde preguntas frecuentes para reforzar la comprension."
            ),
            "default_prompt": (
                f"Crea un FAQ de estudio sobre {notebook_title} con preguntas y respuestas "
                "claras, enfocadas en dudas frecuentes y conceptos confusos."
            ),
        },
    ]

    return [
        ReportSuggestionOut(
            id=f"s{index}",
            title=item["title"],
            description=item["description"],
            default_prompt=item["default_prompt"],
        )
        for index, item in enumerate(fallback_items, start=1)
    ]


def ensure_suggestion_count(
    notebook_title: str, suggestions: list[ReportSuggestionOut]
) -> list[ReportSuggestionOut]:
    normalized: list[ReportSuggestionOut] = []
    seen_titles: set[str] = set()

    for suggestion in suggestions:
        title = normalize_title(suggestion.title)
        description = normalize_prompt(suggestion.description)
        default_prompt = coerce_text(suggestion.default_prompt).strip()
        title_key = title.lower()
        if not title or not description or not default_prompt or title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        normalized.append(
            ReportSuggestionOut(
                id="",
                title=title[:80],
                description=description[:180],
                default_prompt=default_prompt[:2000],
            )
        )
        if len(normalized) >= SUGGESTION_COUNT:
            break

    if len(normalized) < SUGGESTION_COUNT:
        fallback = build_fallback_report_suggestions(notebook_title)
        for suggestion in fallback:
            title_key = normalize_title(suggestion.title).lower()
            if not title_key or title_key in seen_titles:
                continue
            seen_titles.add(title_key)
            normalized.append(
                ReportSuggestionOut(
                    id="",
                    title=suggestion.title,
                    description=suggestion.description,
                    default_prompt=suggestion.default_prompt,
                )
            )
            if len(normalized) >= SUGGESTION_COUNT:
                break

    return [
        ReportSuggestionOut(
            id=f"s{index}",
            title=suggestion.title,
            description=suggestion.description,
            default_prompt=suggestion.default_prompt,
        )
        for index, suggestion in enumerate(normalized[:SUGGESTION_COUNT], start=1)
    ]


def parse_cached_report_suggestions(
    raw_suggestions: Any,
    notebook_title: str,
) -> list[ReportSuggestionOut]:
    if not isinstance(raw_suggestions, list):
        return []

    parsed_suggestions: list[ReportSuggestionOut] = []
    for index, suggestion in enumerate(raw_suggestions, start=1):
        if not isinstance(suggestion, dict):
            continue
        title = normalize_title(coerce_text(suggestion.get("title")))
        description = normalize_prompt(coerce_text(suggestion.get("description")))
        default_prompt = coerce_text(suggestion.get("default_prompt")).strip()
        if not title or not description or not default_prompt:
            continue
        parsed_suggestions.append(
            ReportSuggestionOut(
                id=f"s{index}",
                title=title[:80],
                description=description[:180],
                default_prompt=default_prompt[:2000],
            )
        )

    if not parsed_suggestions:
        return []

    return ensure_suggestion_count(notebook_title, parsed_suggestions)


async def get_cached_report_suggestions(
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    notebook_title: str,
    sources_fingerprint: str,
) -> list[ReportSuggestionOut] | None:
    cache_doc = await db.report_suggestions.find_one(
        {"owner_id": owner_id, "notebook_id": notebook_object_id}
    )
    if not cache_doc:
        return None
    if coerce_text(cache_doc.get("sources_fingerprint")) != sources_fingerprint:
        return None

    suggestions = parse_cached_report_suggestions(
        cache_doc.get("suggestions"),
        notebook_title,
    )
    if not suggestions:
        return None

    return suggestions


async def get_report_suggestions_snapshot(
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    notebook_title: str,
    sources_fingerprint: str,
) -> tuple[list[ReportSuggestionOut], bool]:
    cache_doc = await db.report_suggestions.find_one(
        {"owner_id": owner_id, "notebook_id": notebook_object_id}
    )
    if not cache_doc:
        return [], False

    suggestions = parse_cached_report_suggestions(
        cache_doc.get("suggestions"),
        notebook_title,
    )
    if not suggestions:
        return [], False

    cached_fingerprint = coerce_text(cache_doc.get("sources_fingerprint"))
    return suggestions, cached_fingerprint != sources_fingerprint


async def save_cached_report_suggestions(
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    sources_fingerprint: str,
    suggestions: list[ReportSuggestionOut],
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.report_suggestions.update_one(
        {"owner_id": owner_id, "notebook_id": notebook_object_id},
        {
            "$set": {
                "owner_id": owner_id,
                "notebook_id": notebook_object_id,
                "sources_fingerprint": sources_fingerprint,
                "suggestions": [suggestion.model_dump() for suggestion in suggestions],
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


async def generate_report_suggestions(
    notebook_title: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> list[ReportSuggestionOut]:
    context_lines, _, _, _ = await retrieve_context(
        f"Tipos de informe utiles para estudiar {notebook_title}",
        notebook_object_id,
        user,
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_suggestions_prompt(notebook_title, context_text)

    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=ReportSuggestionsPayloadLLM.model_json_schema(),
        method="json_schema",
    )

    payload = await asyncio.to_thread(structured_llm.invoke, [system_message, user_message])
    payload_data = (
        payload.model_dump()
        if isinstance(payload, BaseModel)
        else payload
        if isinstance(payload, dict)
        else ReportSuggestionsPayloadLLM.model_validate(payload).model_dump()
    )
    logger.info("Report suggestions payload:\n%s", json.dumps(payload_data, ensure_ascii=False))

    raw_suggestions = payload_data.get("suggestions")
    if not isinstance(raw_suggestions, list):
        return []

    normalized: list[ReportSuggestionOut] = []
    seen_titles: set[str] = set()
    for index, suggestion in enumerate(raw_suggestions, start=1):
        if not isinstance(suggestion, dict):
            continue
        title = normalize_title(coerce_text(suggestion.get("title")))
        description = normalize_prompt(coerce_text(suggestion.get("description")))
        default_prompt = coerce_text(suggestion.get("default_prompt")).strip()

        if not title or not description or not default_prompt:
            continue
        title_key = title.lower()
        if title_key in seen_titles:
            continue

        seen_titles.add(title_key)
        normalized.append(
            ReportSuggestionOut(
                id=f"s{index}",
                title=title[:80],
                description=description[:180],
                default_prompt=default_prompt[:2000],
            )
        )
        if len(normalized) >= SUGGESTION_COUNT:
            break

    return ensure_suggestion_count(notebook_title, normalized)
