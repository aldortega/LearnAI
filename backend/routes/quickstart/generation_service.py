import asyncio
import json
import logging

from bson import ObjectId
from fastapi import HTTPException, status

from ...schemas.quickstart import QuickstartDetailItemType
from ...schemas.rag import RagSource
from ..rag import create_llm, retrieve_context
from .constants import (
    QuickstartExpansionLLM,
    QuickstartPayloadLLM,
    QuickstartSingleTopicLLM,
    QuickstartSuggestionsLLM,
    QuickstartTopicDetailLLM,
)
from .normalization import (
    coerce_payload,
    coerce_text,
    compact_context,
    normalize_expansion,
    normalize_item_text,
    normalize_quickstart_payload,
    normalize_single_topic,
    normalize_suggestions,
)
from .prompts import (
    build_expansion_prompt,
    build_quickstart_prompt,
    build_single_topic_prompt,
    build_suggestions_prompt,
    build_topic_detail_prompt,
)

logger = logging.getLogger(__name__)


async def generate_quickstart_topics(
    title: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> dict:
    context_lines, _, _, _ = await retrieve_context(
        f"Conceptos clave sobre {title}", notebook_object_id, user
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_quickstart_prompt(title, context_text)
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuickstartPayloadLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuickstartPayloadLLM)
        logger.info(
            "Quickstart estructurado:\n%s",
            json.dumps(payload_data, ensure_ascii=False),
        )
        return normalize_quickstart_payload(payload_data, title)
    except Exception as exc:
        logger.exception("Quickstart JSON invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar el inicio rapido",
        ) from exc


async def generate_topic_expansion(
    notebook_title: str,
    topic: dict,
    notebook_object_id: ObjectId,
    user: dict,
) -> tuple[dict, list[RagSource]]:
    question = f"Explica en profundidad el tema: {topic.get('title', '')}"
    context_lines, sources, _, _ = await retrieve_context(
        question, notebook_object_id, user
    )
    context_text = compact_context(context_lines, max_chars=4500)
    system_message, user_message = build_expansion_prompt(
        notebook_title,
        coerce_text(topic.get("title")),
        coerce_text(topic.get("summary")),
        [coerce_text(point) for point in topic.get("key_points", [])],
        context_text,
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuickstartExpansionLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuickstartExpansionLLM)
        logger.info(
            "Expansion quickstart:\n%s",
            json.dumps(payload_data, ensure_ascii=False),
        )
        expansion = normalize_expansion(
            payload_data,
            coerce_text(topic.get("title")),
            coerce_text(topic.get("summary")),
        )
        return expansion, sources
    except Exception as exc:
        logger.exception("Expansion JSON invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo expandir el tema",
        ) from exc


async def generate_topic_item_detail(
    notebook_title: str,
    topic_title: str,
    item_type: QuickstartDetailItemType,
    item_text: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> str:
    item_query = (
        f"Responde esta pregunta del tema {topic_title}: {item_text}"
        if item_type == "question"
        else f"Explica en detalle este punto del tema {topic_title}: {item_text}"
    )
    context_lines, _, _, _ = await retrieve_context(item_query, notebook_object_id, user)
    context_text = compact_context(context_lines, max_chars=4500)
    system_message, user_message = build_topic_detail_prompt(
        notebook_title, topic_title, item_type, item_text, context_text
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuickstartTopicDetailLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuickstartTopicDetailLLM)
        content = normalize_item_text(coerce_text(payload_data.get("content")))
        if content:
            return content
        return f"Detalle adicional sobre {item_text}."
    except Exception as exc:
        logger.exception("Detalle quickstart invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar el detalle del tema",
        ) from exc


async def generate_quickstart_suggestions(
    notebook_title: str,
    existing_titles: list[str],
    notebook_object_id: ObjectId,
    user: dict,
) -> list[str]:
    context_lines, _, _, _ = await retrieve_context(
        f"Temas complementarios sobre {notebook_title}", notebook_object_id, user
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_suggestions_prompt(
        notebook_title, existing_titles, context_text
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuickstartSuggestionsLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuickstartSuggestionsLLM)
        existing_title_keys = {title.lower() for title in existing_titles}
        return normalize_suggestions(payload_data, existing_title_keys)
    except Exception as exc:
        logger.exception("Quickstart sugerencias invalidas", extra={"error": str(exc)})
        return []


async def generate_single_quickstart_topic(
    notebook_title: str,
    requested_title: str,
    existing_titles: list[str],
    notebook_object_id: ObjectId,
    user: dict,
) -> dict:
    context_lines, _, _, _ = await retrieve_context(
        f"Conceptos clave y aplicaciones de {requested_title}", notebook_object_id, user
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_single_topic_prompt(
        notebook_title, requested_title, existing_titles, context_text
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuickstartSingleTopicLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuickstartSingleTopicLLM)
        return normalize_single_topic(payload_data, requested_title)
    except Exception as exc:
        logger.exception("Quickstart tema unico invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar el tema",
        ) from exc
