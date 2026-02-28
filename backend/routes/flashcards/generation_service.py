import asyncio
import json
import logging

from bson import ObjectId
from fastapi import HTTPException, status
from pydantic import BaseModel

from ...schemas.flashcards import FlashcardSourceRef
from ..rag import create_llm, retrieve_context
from .constants import FlashcardsPayloadLLM
from .normalization import (
    compact_context,
    coerce_text,
    normalize_cards,
    normalize_set_title,
    normalize_topic_prompt,
    resolve_difficulty_config,
    resolve_target_cards,
    source_to_ref,
)
from .prompts import build_flashcards_prompt

logger = logging.getLogger(__name__)


def coerce_payload(payload: object, model: type[BaseModel]) -> dict:
    if isinstance(payload, BaseModel):
        return payload.model_dump()
    if isinstance(payload, dict):
        return payload
    return model.model_validate(payload).model_dump()


async def generate_flashcards_payload(
    notebook_title: str,
    card_count: str,
    difficulty: str,
    topic_prompt: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> tuple[str, list[dict], list[FlashcardSourceRef], str]:
    normalized_topic_prompt = normalize_topic_prompt(topic_prompt)
    query_text = (
        f"Conceptos y definiciones sobre {normalized_topic_prompt}"
        if normalized_topic_prompt
        else f"Conceptos clave y definiciones sobre {notebook_title}"
    )

    context_lines, sources, _, _ = await retrieve_context(
        query_text,
        notebook_object_id,
        user,
    )

    target_count = resolve_target_cards(card_count)
    difficulty_label, difficulty_guidance = resolve_difficulty_config(difficulty)
    context_text = compact_context(context_lines)
    system_message, user_message = build_flashcards_prompt(
        notebook_title=notebook_title,
        target_count=target_count,
        difficulty_label=difficulty_label,
        difficulty_guidance=difficulty_guidance,
        topic_prompt=normalized_topic_prompt,
        context_text=context_text,
    )

    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=FlashcardsPayloadLLM.model_json_schema(),
        method="json_schema",
    )

    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke,
            [system_message, user_message],
        )
        payload_data = coerce_payload(payload, FlashcardsPayloadLLM)
        logger.info(
            "Flashcards estructuradas:\n%s",
            json.dumps(payload_data, ensure_ascii=False),
        )
    except Exception as exc:
        logger.exception("Flashcards JSON invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudieron generar las flashcards",
        ) from exc

    cards = normalize_cards(
        payload_data,
        target_count=target_count,
        fallback_topic=normalized_topic_prompt or notebook_title,
    )
    if not cards:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudieron generar las flashcards",
        )

    set_title = normalize_set_title(
        coerce_text(payload_data.get("set_title")),
        topic_prompt=normalized_topic_prompt,
        notebook_title=notebook_title,
    )

    return (
        set_title,
        cards,
        [source_to_ref(source) for source in sources],
        normalized_topic_prompt,
    )
