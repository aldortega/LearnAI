import asyncio
import logging

from bson import ObjectId
from fastapi import HTTPException, status
from pydantic import BaseModel

from ...schemas.audio import (
    AudioDuration,
    AudioFormatType,
    AudioScriptSegment,
    AudioSourceRef,
)
from ..rag import create_llm, retrieve_context
from .constants import (
    AudioScriptPayloadLLM,
    MAX_PODCAST_DESCRIPTION_CHARS,
    MAX_PODCAST_TITLE_CHARS,
    MAX_SEGMENT_CHARS,
    SPEAKER_HOST_A,
    SPEAKER_HOST_B,
    is_multi_speaker_format,
    speakers_for_format,
)
from .normalization import (
    coerce_text,
    compact_context,
    normalize_prompt,
    normalize_title,
    source_to_ref,
)
from .prompts import build_script_prompt

logger = logging.getLogger(__name__)


class AudioScriptGenerationResult(BaseModel):
    title: str
    description: str
    segments: list[AudioScriptSegment]
    sources: list[AudioSourceRef]


def _coerce_speaker(value: str, format_type: AudioFormatType) -> str | None:
    allowed = speakers_for_format(format_type)
    if value in allowed:
        return value

    if not is_multi_speaker_format(format_type):
        return allowed[0]

    lowered = value.lower().strip()
    # Aceptar variantes "a"/"b", "host a", "1"/"2", nombres propios sueltos.
    if lowered in {"a", "host a", "anfitrion a", "speaker a", "speaker 1", "1"}:
        return SPEAKER_HOST_A
    if lowered in {"b", "host b", "anfitrion b", "speaker b", "speaker 2", "2"}:
        return SPEAKER_HOST_B
    return None


def _normalize_segments(
    raw_segments: list[dict],
    format_type: AudioFormatType,
) -> list[AudioScriptSegment]:
    normalized: list[AudioScriptSegment] = []
    last_speaker: str | None = None

    for raw in raw_segments:
        if not isinstance(raw, dict):
            continue
        speaker_raw = coerce_text(raw.get("speaker")).strip()
        text = coerce_text(raw.get("text")).strip()
        if not speaker_raw or not text:
            continue
        speaker = _coerce_speaker(speaker_raw, format_type)
        if not speaker:
            continue
        text = text[:MAX_SEGMENT_CHARS]

        if is_multi_speaker_format(format_type) and speaker == last_speaker and normalized:
            # Fusionar turnos consecutivos del mismo hablante para evitar artefactos.
            previous = normalized[-1]
            merged_text = f"{previous.text} {text}"[:MAX_SEGMENT_CHARS]
            normalized[-1] = AudioScriptSegment(speaker=speaker, text=merged_text)
            continue

        normalized.append(AudioScriptSegment(speaker=speaker, text=text))
        last_speaker = speaker

    return normalized


async def generate_audio_script(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    topic: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> AudioScriptGenerationResult:
    query = topic.strip() or notebook_title
    context_lines, sources, _, _ = await retrieve_context(
        f"Informacion para podcast sobre {query}",
        notebook_object_id,
        user,
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_script_prompt(
        notebook_title=notebook_title,
        format_type=format_type,
        duration=duration,
        topic=topic.strip(),
        context_text=context_text,
    )

    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=AudioScriptPayloadLLM.model_json_schema(),
        method="json_schema",
    )
    payload = await asyncio.to_thread(
        structured_llm.invoke, [system_message, user_message]
    )
    payload_data = (
        payload.model_dump()
        if isinstance(payload, BaseModel)
        else payload
        if isinstance(payload, dict)
        else AudioScriptPayloadLLM.model_validate(payload).model_dump()
    )

    title = normalize_title(coerce_text(payload_data.get("title")))[:MAX_PODCAST_TITLE_CHARS]
    description = normalize_prompt(
        coerce_text(payload_data.get("description"))
    )[:MAX_PODCAST_DESCRIPTION_CHARS]
    raw_segments = payload_data.get("segments") or []
    if not isinstance(raw_segments, list):
        raw_segments = []

    segments = _normalize_segments(raw_segments, format_type)

    if not title or not description or not segments:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar el guion del podcast",
        )

    return AudioScriptGenerationResult(
        title=title,
        description=description,
        segments=segments,
        sources=[source_to_ref(source) for source in sources],
    )
