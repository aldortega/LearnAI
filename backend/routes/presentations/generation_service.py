import asyncio
import logging
from collections.abc import Awaitable, Callable

from bson import ObjectId
from fastapi import HTTPException, status
from pydantic import BaseModel

from ...config import LLMProvider
from ...llm import is_transient_llm_error
from ...schemas.presentations import (
    PresentationDetailLevel,
    PresentationGenerationStage,
    PresentationSlideOut,
    PresentationSourceRef,
)
from ...schemas.rag import RagSource
from ..agents import gather_limited
from ..rag import create_llm, retrieve_context
from .agents import (
    SlideDraft,
    plan_presentation,
    research_slides,
    review_presentation,
    write_slide,
)
from .constants import (
    MAX_PARALLEL_AGENTS,
    MAX_PRESENTATION_SUMMARY_CHARS,
    MAX_PRESENTATION_TITLE_CHARS,
    MAX_REVIEW_ROUNDS,
    MAX_SLIDE_RETRIES,
    MAX_SLIDES,
    OVERVIEW_CONTEXT_CHARS,
    PresentationSlideDraftLLM,
)
from .normalization import (
    coerce_text,
    compact_context,
    normalize_markdown_content,
    normalize_slide_subtitle,
    normalize_slide_title,
    normalize_text,
    source_to_ref,
)
from .prompts import build_regenerate_slide_prompt

logger = logging.getLogger(__name__)

PresentationStageCallback = Callable[[PresentationGenerationStage], Awaitable[None]]


def _generation_error(
    detail: str = "No se pudo generar la presentacion",
) -> HTTPException:
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


def merge_sources(source_groups: list[list[RagSource]]) -> list[PresentationSourceRef]:
    merged: list[PresentationSourceRef] = []
    seen: set[tuple[str, int]] = set()
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
    topic: str,
    detail_level: PresentationDetailLevel,
    presentation_title: str,
    slides: list[SlideDraft],
    slide_index: int,
    provider: LLMProvider,
    issues: list[str] | None = None,
) -> PresentationSlideDraftLLM:
    last_exc: Exception | None = None
    for _ in range(MAX_SLIDE_RETRIES + 1):
        try:
            return await write_slide(
                notebook_title,
                topic,
                detail_level,
                presentation_title,
                slides,
                slide_index,
                provider,
                issues,
            )
        except Exception as exc:
            if isinstance(exc, HTTPException) and not is_transient_llm_error(
                provider, exc
            ):
                raise
            last_exc = exc
            logger.warning(
                "Fallo al redactar slide",
                extra={"slide_index": slide_index, "error": str(exc)},
            )
    raise last_exc or _generation_error()


def _apply_draft(slide: SlideDraft, draft: PresentationSlideDraftLLM) -> bool:
    content = normalize_markdown_content(draft.content_markdown)
    if not content:
        return False
    slide.content = content
    slide.subtitle = normalize_slide_subtitle(coerce_text(draft.subtitle))
    return True


async def _rewrite_flagged_slides(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    presentation_title: str,
    slides: list[SlideDraft],
    issues_by_slide: dict[int, list[str]],
    provider: LLMProvider,
) -> None:
    slide_indices = list(issues_by_slide)
    results = await gather_limited(
        [
            _write_with_retry(
                notebook_title,
                topic,
                detail_level,
                presentation_title,
                slides,
                slide_index,
                provider,
                issues_by_slide[slide_index],
            )
            for slide_index in slide_indices
        ],
        MAX_PARALLEL_AGENTS,
    )
    for slide_index, result in zip(slide_indices, results):
        if isinstance(result, PresentationSlideDraftLLM) and _apply_draft(
            slides[slide_index - 1], result
        ):
            continue
        logger.warning(
            "Se conserva el borrador original de la slide",
            extra={"slide_index": slide_index},
        )


async def generate_presentation_payload(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    notebook_object_id: ObjectId,
    user: dict,
    provider: LLMProvider,
    on_stage: PresentationStageCallback | None = None,
) -> tuple[str, str, list[PresentationSlideOut], list[PresentationSourceRef]]:
    async def notify(stage: PresentationGenerationStage) -> None:
        if on_stage is not None:
            await on_stage(stage)

    await notify("planning")
    overview_lines, overview_sources, _, _ = await retrieve_context(
        f"Informacion para presentacion sobre {topic}",
        notebook_object_id,
        user,
    )
    outline = await plan_presentation(
        notebook_title,
        topic,
        detail_level,
        compact_context(overview_lines, max_chars=OVERVIEW_CONTEXT_CHARS),
        provider,
    )
    slides = [
        SlideDraft(
            title=normalize_slide_title(item.title),
            objective=normalize_text(item.objective),
            research_query=normalize_text(item.research_query),
        )
        for item in outline.slides[:MAX_SLIDES]
    ]
    presentation_title = normalize_text(outline.title)[:MAX_PRESENTATION_TITLE_CHARS]
    summary = normalize_text(outline.summary)[:MAX_PRESENTATION_SUMMARY_CHARS]
    if not presentation_title or not summary:
        raise _generation_error()

    await notify("researching")
    await research_slides(slides, notebook_object_id, user, provider)

    await notify("writing")
    draft_results = await gather_limited(
        [
            _write_with_retry(
                notebook_title,
                topic,
                detail_level,
                presentation_title,
                slides,
                index,
                provider,
            )
            for index in range(1, len(slides) + 1)
        ],
        MAX_PARALLEL_AGENTS,
    )
    for slide, result in zip(slides, draft_results):
        if isinstance(result, HTTPException):
            raise result
        if not isinstance(result, PresentationSlideDraftLLM) or not _apply_draft(
            slide, result
        ):
            raise _generation_error()

    await notify("reviewing")
    for _ in range(MAX_REVIEW_ROUNDS):
        try:
            issues_by_slide = await review_presentation(
                notebook_title, topic, detail_level, slides, provider
            )
        except Exception as exc:
            logger.warning(
                "Fallo la revision de la presentacion", extra={"error": str(exc)}
            )
            break
        if not issues_by_slide:
            break
        await _rewrite_flagged_slides(
            notebook_title,
            topic,
            detail_level,
            presentation_title,
            slides,
            issues_by_slide,
            provider,
        )

    await notify("assembling")
    slides_out = [
        PresentationSlideOut(
            index=index,
            format="markdown",
            title=slide.title,
            subtitle=slide.subtitle or None,
            content_markdown=slide.content,
        )
        for index, slide in enumerate(slides, start=1)
        if slide.title and slide.content
    ]
    if not slides_out:
        raise _generation_error()

    return (
        presentation_title,
        summary,
        slides_out,
        merge_sources([overview_sources] + [slide.sources for slide in slides]),
    )


async def regenerate_presentation_slide_payload(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    notebook_object_id: ObjectId,
    user: dict,
    slide_index: int,
    current_slide: PresentationSlideOut,
    edit_prompt: str,
    provider: LLMProvider,
) -> PresentationSlideOut:
    context_lines, _, _, _ = await retrieve_context(
        f"{current_slide.title}: {edit_prompt} (tema: {topic})",
        notebook_object_id,
        user,
        grade=True,
        provider=provider,
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_regenerate_slide_prompt(
        notebook_title=notebook_title,
        topic=topic,
        detail_level=detail_level,
        slide_index=slide_index,
        slide_title=current_slide.title,
        slide_subtitle=current_slide.subtitle,
        slide_content_markdown=current_slide.content_markdown,
        edit_prompt=edit_prompt,
        context_text=context_text,
    )

    llm = create_llm(provider)
    structured_llm = llm.with_structured_output(
        schema={
            "title": "PresentationSlideRegeneration",
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "subtitle": {"type": ["string", "null"]},
                "content_markdown": {"type": "string"},
            },
            "required": ["title", "content_markdown"],
            "additionalProperties": False,
        },
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
        else {
            "title": getattr(payload, "title", ""),
            "subtitle": getattr(payload, "subtitle", None),
            "content_markdown": getattr(payload, "content_markdown", ""),
        }
    )

    slide_title = normalize_slide_title(coerce_text(payload_data.get("title")))
    subtitle = normalize_slide_subtitle(coerce_text(payload_data.get("subtitle")))
    content_markdown = normalize_markdown_content(
        coerce_text(payload_data.get("content_markdown"))
    )

    if not slide_title or not content_markdown:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo regenerar la diapositiva",
        )

    return PresentationSlideOut(
        index=slide_index,
        format="markdown",
        title=slide_title,
        subtitle=subtitle or None,
        content_markdown=content_markdown,
    )
