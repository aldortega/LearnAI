import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from ...db import db
from ...schemas.audio import AudioFormatTemplateOut, AudioSuggestionOut
from ..rag import create_llm, retrieve_context
from .constants import (
    AUDIO_FORMAT_CONFIGS,
    AudioSuggestionsPayloadLLM,
    SUGGESTION_COUNT,
)
from .normalization import coerce_text, compact_context, normalize_prompt, normalize_title
from .prompts import build_suggestions_prompt

logger = logging.getLogger(__name__)


def build_format_templates() -> list[AudioFormatTemplateOut]:
    return [
        AudioFormatTemplateOut(
            type=format_type,
            label=config["label"],
            description=config["description"],
        )
        for format_type, config in AUDIO_FORMAT_CONFIGS.items()
    ]


def build_fallback_audio_suggestions(notebook_title: str) -> list[AudioSuggestionOut]:
    fallback_items = [
        {
            "title": "Recorrido por las ideas clave",
            "description": "Un panorama general de los conceptos mas importantes de tus fuentes.",
            "default_topic": f"Ideas clave y conexiones principales de {notebook_title}",
        },
        {
            "title": "Aplicaciones practicas",
            "description": "Ejemplos concretos y casos de uso derivados del material.",
            "default_topic": f"Aplicaciones practicas y ejemplos reales sobre {notebook_title}",
        },
        {
            "title": "Errores comunes y como evitarlos",
            "description": "Identifica confusiones frecuentes y entrega recomendaciones claras.",
            "default_topic": f"Errores frecuentes al aprender {notebook_title} y como prevenirlos",
        },
        {
            "title": "Conexiones entre temas",
            "description": "Hilo conductor que relaciona los distintos temas presentes en tus fuentes.",
            "default_topic": f"Conexiones y relaciones entre los temas de {notebook_title}",
        },
    ]
    return [
        AudioSuggestionOut(
            id=f"s{index}",
            title=item["title"],
            description=item["description"],
            default_topic=item["default_topic"],
        )
        for index, item in enumerate(fallback_items, start=1)
    ]


def ensure_suggestion_count(
    notebook_title: str, suggestions: list[AudioSuggestionOut]
) -> list[AudioSuggestionOut]:
    normalized: list[AudioSuggestionOut] = []
    seen_titles: set[str] = set()

    for suggestion in suggestions:
        title = normalize_title(suggestion.title)
        description = normalize_prompt(suggestion.description)
        default_topic = coerce_text(suggestion.default_topic).strip()
        title_key = title.lower()
        if not title or not description or not default_topic or title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        normalized.append(
            AudioSuggestionOut(
                id="",
                title=title[:80],
                description=description[:180],
                default_topic=default_topic[:500],
            )
        )
        if len(normalized) >= SUGGESTION_COUNT:
            break

    if len(normalized) < SUGGESTION_COUNT:
        fallback = build_fallback_audio_suggestions(notebook_title)
        for suggestion in fallback:
            title_key = normalize_title(suggestion.title).lower()
            if not title_key or title_key in seen_titles:
                continue
            seen_titles.add(title_key)
            normalized.append(
                AudioSuggestionOut(
                    id="",
                    title=suggestion.title,
                    description=suggestion.description,
                    default_topic=suggestion.default_topic,
                )
            )
            if len(normalized) >= SUGGESTION_COUNT:
                break

    return [
        AudioSuggestionOut(
            id=f"s{index}",
            title=suggestion.title,
            description=suggestion.description,
            default_topic=suggestion.default_topic,
        )
        for index, suggestion in enumerate(normalized[:SUGGESTION_COUNT], start=1)
    ]


def parse_cached_audio_suggestions(
    raw_suggestions: Any,
    notebook_title: str,
) -> list[AudioSuggestionOut]:
    if not isinstance(raw_suggestions, list):
        return []

    parsed: list[AudioSuggestionOut] = []
    for index, suggestion in enumerate(raw_suggestions, start=1):
        if not isinstance(suggestion, dict):
            continue
        title = normalize_title(coerce_text(suggestion.get("title")))
        description = normalize_prompt(coerce_text(suggestion.get("description")))
        default_topic = coerce_text(suggestion.get("default_topic")).strip()
        if not title or not description or not default_topic:
            continue
        parsed.append(
            AudioSuggestionOut(
                id=f"s{index}",
                title=title[:80],
                description=description[:180],
                default_topic=default_topic[:500],
            )
        )

    if not parsed:
        return []

    return ensure_suggestion_count(notebook_title, parsed)


async def get_cached_audio_suggestions(
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    notebook_title: str,
    sources_fingerprint: str,
) -> list[AudioSuggestionOut] | None:
    cache_doc = await db.audio_suggestions.find_one(
        {"owner_id": owner_id, "notebook_id": notebook_object_id}
    )
    if not cache_doc:
        return None
    if coerce_text(cache_doc.get("sources_fingerprint")) != sources_fingerprint:
        return None

    suggestions = parse_cached_audio_suggestions(
        cache_doc.get("suggestions"),
        notebook_title,
    )
    if not suggestions:
        return None
    return suggestions


async def get_audio_suggestions_snapshot(
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    notebook_title: str,
    sources_fingerprint: str,
) -> tuple[list[AudioSuggestionOut], bool]:
    cache_doc = await db.audio_suggestions.find_one(
        {"owner_id": owner_id, "notebook_id": notebook_object_id}
    )
    if not cache_doc:
        return [], False

    suggestions = parse_cached_audio_suggestions(
        cache_doc.get("suggestions"),
        notebook_title,
    )
    if not suggestions:
        return [], False

    cached_fingerprint = coerce_text(cache_doc.get("sources_fingerprint"))
    return suggestions, cached_fingerprint != sources_fingerprint


async def save_cached_audio_suggestions(
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    sources_fingerprint: str,
    suggestions: list[AudioSuggestionOut],
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.audio_suggestions.update_one(
        {"owner_id": owner_id, "notebook_id": notebook_object_id},
        {
            "$set": {
                "owner_id": owner_id,
                "notebook_id": notebook_object_id,
                "sources_fingerprint": sources_fingerprint,
                "suggestions": [s.model_dump() for s in suggestions],
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


async def generate_audio_suggestions(
    notebook_title: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> list[AudioSuggestionOut]:
    context_lines, _, _, _ = await retrieve_context(
        f"Temas atractivos para un podcast sobre {notebook_title}",
        notebook_object_id,
        user,
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_suggestions_prompt(notebook_title, context_text)

    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=AudioSuggestionsPayloadLLM.model_json_schema(),
        method="json_schema",
    )

    payload = await asyncio.to_thread(structured_llm.invoke, [system_message, user_message])
    payload_data = (
        payload.model_dump()
        if isinstance(payload, BaseModel)
        else payload
        if isinstance(payload, dict)
        else AudioSuggestionsPayloadLLM.model_validate(payload).model_dump()
    )
    logger.info("Audio suggestions payload:\n%s", json.dumps(payload_data, ensure_ascii=False))

    raw = payload_data.get("suggestions")
    if not isinstance(raw, list):
        return []

    normalized: list[AudioSuggestionOut] = []
    seen_titles: set[str] = set()
    for index, suggestion in enumerate(raw, start=1):
        if not isinstance(suggestion, dict):
            continue
        title = normalize_title(coerce_text(suggestion.get("title")))
        description = normalize_prompt(coerce_text(suggestion.get("description")))
        default_topic = coerce_text(suggestion.get("default_topic")).strip()
        if not title or not description or not default_topic:
            continue
        title_key = title.lower()
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        normalized.append(
            AudioSuggestionOut(
                id=f"s{index}",
                title=title[:80],
                description=description[:180],
                default_topic=default_topic[:500],
            )
        )
        if len(normalized) >= SUGGESTION_COUNT:
            break

    return ensure_suggestion_count(notebook_title, normalized)
