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
from ...schemas.rag import RagSource
from ..agents import gather_limited
from ..rag import create_llm, retrieve_context
from .agents import (
    BlockDraft,
    plan_podcast,
    research_blocks,
    review_script,
    write_block,
)
from .constants import (
    AUDIO_DURATION_CONFIGS,
    AudioScriptPayloadLLM,
    MAX_BLOCK_RETRIES,
    MAX_PARALLEL_AGENTS,
    MAX_PODCAST_DESCRIPTION_CHARS,
    MAX_PODCAST_TITLE_CHARS,
    MAX_REVIEW_ROUNDS,
    MAX_SEGMENT_CHARS,
    OVERVIEW_CONTEXT_CHARS,
    PodcastBlockLLM,
    PodcastOutlineLLM,
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


def _generation_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="No se pudo generar el guion del podcast",
    )


def _merge_sources(source_groups: list[list[RagSource]]) -> list[AudioSourceRef]:
    seen: set[tuple[str, str]] = set()
    merged: list[AudioSourceRef] = []
    for group in source_groups:
        for source in group:
            key = (source.document_id, source.chunk_id)
            if key in seen:
                continue
            seen.add(key)
            merged.append(source_to_ref(source))
    return merged


async def _write_with_retry(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    outline: PodcastOutlineLLM,
    blocks: list[BlockDraft],
    block_index: int,
    issues: list[str] | None = None,
) -> PodcastBlockLLM:
    last_exc: Exception | None = None
    for _ in range(MAX_BLOCK_RETRIES + 1):
        try:
            return await write_block(
                notebook_title,
                format_type,
                duration,
                outline,
                blocks,
                block_index,
                issues,
            )
        except HTTPException:
            raise
        except Exception as exc:
            last_exc = exc
            logger.warning(
                "Fallo al redactar bloque",
                extra={"block_index": block_index, "error": str(exc)},
            )
    raise last_exc or _generation_error()


def _apply_draft(
    block: BlockDraft, draft: PodcastBlockLLM, format_type: AudioFormatType
) -> bool:
    segments = _normalize_segments(
        [segment.model_dump() for segment in draft.segments], format_type
    )
    if not segments:
        return False
    block.segments = segments
    return True


async def _rewrite_flagged_blocks(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    outline: PodcastOutlineLLM,
    blocks: list[BlockDraft],
    issues_by_block: dict[int, list[str]],
) -> None:
    block_indices = list(issues_by_block)
    results = await gather_limited(
        [
            _write_with_retry(
                notebook_title,
                format_type,
                duration,
                outline,
                blocks,
                block_index,
                issues_by_block[block_index],
            )
            for block_index in block_indices
        ],
        MAX_PARALLEL_AGENTS,
    )
    for block_index, result in zip(block_indices, results):
        if isinstance(result, PodcastBlockLLM) and _apply_draft(
            blocks[block_index - 1], result, format_type
        ):
            continue
        logger.warning(
            "Se conserva el borrador original del bloque",
            extra={"block_index": block_index},
        )


async def generate_audio_script(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    topic: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> AudioScriptGenerationResult:
    if int(AUDIO_DURATION_CONFIGS[duration]["blocks"]) <= 1:
        return await _generate_single_call_script(
            notebook_title, format_type, duration, topic, notebook_object_id, user
        )
    return await _generate_multi_agent_script(
        notebook_title, format_type, duration, topic, notebook_object_id, user
    )


async def _generate_multi_agent_script(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    topic: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> AudioScriptGenerationResult:
    topic = topic.strip()
    overview_lines, overview_sources, _, _ = await retrieve_context(
        f"Informacion para podcast sobre {topic or notebook_title}",
        notebook_object_id,
        user,
    )
    outline = await plan_podcast(
        notebook_title,
        format_type,
        duration,
        topic,
        compact_context(overview_lines, max_chars=OVERVIEW_CONTEXT_CHARS),
    )
    title = normalize_title(outline.title)[:MAX_PODCAST_TITLE_CHARS]
    description = normalize_prompt(outline.description)[:MAX_PODCAST_DESCRIPTION_CHARS]
    blocks = [
        BlockDraft(
            title=normalize_title(item.title),
            objective=normalize_prompt(item.objective),
            research_query=normalize_prompt(item.research_query),
        )
        for item in outline.blocks
    ]
    if not title or not description or not blocks:
        raise _generation_error()

    await research_blocks(blocks, notebook_object_id, user)

    draft_results = await gather_limited(
        [
            _write_with_retry(
                notebook_title, format_type, duration, outline, blocks, index
            )
            for index in range(1, len(blocks) + 1)
        ],
        MAX_PARALLEL_AGENTS,
    )
    for block, result in zip(blocks, draft_results):
        if isinstance(result, HTTPException):
            raise result
        if not isinstance(result, PodcastBlockLLM) or not _apply_draft(
            block, result, format_type
        ):
            raise _generation_error()

    for _ in range(MAX_REVIEW_ROUNDS):
        try:
            issues_by_block = await review_script(
                notebook_title, format_type, topic, blocks
            )
        except Exception as exc:
            logger.warning("Fallo la revision del guion", extra={"error": str(exc)})
            break
        if not issues_by_block:
            break
        await _rewrite_flagged_blocks(
            notebook_title, format_type, duration, outline, blocks, issues_by_block
        )

    segments = _normalize_segments(
        [
            segment.model_dump()
            for block in blocks
            for segment in block.segments
        ],
        format_type,
    )
    if not segments:
        raise _generation_error()

    return AudioScriptGenerationResult(
        title=title,
        description=description,
        segments=segments,
        sources=_merge_sources(
            [overview_sources] + [block.sources for block in blocks]
        ),
    )


async def _generate_single_call_script(
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
