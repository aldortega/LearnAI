import logging
from dataclasses import dataclass, field

from bson import ObjectId
from fastapi import HTTPException, status

from ...schemas.audio import AudioDuration, AudioFormatType, AudioScriptSegment
from ...schemas.rag import RagSource
from ..agents import gather_limited, invoke_structured
from ..rag import retrieve_context
from .constants import (
    BLOCK_CONTEXT_CHARS,
    MAX_PARALLEL_AGENTS,
    PodcastBlockLLM,
    PodcastOutlineLLM,
    PodcastReviewLLM,
)
from .normalization import compact_context
from .prompts import build_block_prompt, build_outline_prompt, build_review_prompt

logger = logging.getLogger(__name__)


@dataclass
class BlockDraft:
    title: str
    objective: str
    research_query: str
    notes: str = ""
    sources: list[RagSource] = field(default_factory=list)
    segments: list[AudioScriptSegment] = field(default_factory=list)


async def plan_podcast(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    topic: str,
    overview_context: str,
) -> PodcastOutlineLLM:
    system_message, user_message = build_outline_prompt(
        notebook_title, format_type, duration, topic, overview_context
    )
    return await invoke_structured(PodcastOutlineLLM, [system_message, user_message])


async def research_block(
    block: BlockDraft,
    notebook_object_id: ObjectId,
    user: dict,
) -> None:
    context_lines, sources, _, _ = await retrieve_context(
        block.research_query,
        notebook_object_id,
        user,
        grade=True,
    )
    block.notes = compact_context(context_lines, max_chars=BLOCK_CONTEXT_CHARS)
    block.sources = sources


async def research_blocks(
    blocks: list[BlockDraft],
    notebook_object_id: ObjectId,
    user: dict,
) -> None:
    results = await gather_limited(
        [research_block(block, notebook_object_id, user) for block in blocks],
        MAX_PARALLEL_AGENTS,
    )
    failures = [result for result in results if isinstance(result, BaseException)]
    if len(failures) == len(blocks):
        first_error = failures[0]
        if isinstance(first_error, HTTPException):
            raise first_error
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar el guion del podcast",
        )
    for block, result in zip(blocks, results):
        if isinstance(result, BaseException):
            logger.warning(
                "Fallo la busqueda de un bloque",
                extra={"title": block.title, "error": str(result)},
            )
            block.notes = compact_context([])


async def write_block(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    outline: PodcastOutlineLLM,
    blocks: list[BlockDraft],
    block_index: int,
    issues: list[str] | None = None,
) -> PodcastBlockLLM:
    block = blocks[block_index - 1]
    system_message, user_message = build_block_prompt(
        notebook_title=notebook_title,
        format_type=format_type,
        duration=duration,
        podcast_title=outline.title,
        stance_a=outline.stance_a,
        stance_b=outline.stance_b,
        block_titles=[item.title for item in blocks],
        block_index=block_index,
        objective=block.objective,
        notes_text=block.notes,
        previous_segments=(
            [(segment.speaker, segment.text) for segment in block.segments]
            if issues
            else None
        ),
        issues=issues,
    )
    return await invoke_structured(PodcastBlockLLM, [system_message, user_message])


async def review_script(
    notebook_title: str,
    format_type: AudioFormatType,
    topic: str,
    blocks: list[BlockDraft],
) -> dict[int, list[str]]:
    blocks_text = "\n\n".join(
        f"### Bloque {index}: {block.title}\n"
        f"Notas de fuentes:\n{block.notes}\n\n"
        "Guion:\n"
        + "\n".join(f"{segment.speaker}: {segment.text}" for segment in block.segments)
        for index, block in enumerate(blocks, start=1)
    )
    system_message, user_message = build_review_prompt(
        notebook_title, format_type, topic, blocks_text
    )
    review = await invoke_structured(PodcastReviewLLM, [system_message, user_message])
    issues_by_block: dict[int, list[str]] = {}
    for finding in review.findings:
        if 1 <= finding.block_index <= len(blocks):
            issues_by_block.setdefault(finding.block_index, []).append(
                finding.issue.strip()
            )
    return issues_by_block
