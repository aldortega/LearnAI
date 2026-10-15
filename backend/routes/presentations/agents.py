import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import TypeVar

from bson import ObjectId
from fastapi import HTTPException, status

from ...schemas.presentations import PresentationDetailLevel
from ...schemas.rag import RagSource
from ..agents import gather_limited, invoke_structured
from ..rag import retrieve_context
from .constants import (
    MAX_PARALLEL_AGENTS,
    SLIDE_CONTEXT_CHARS,
    PresentationOutlineLLM,
    PresentationReviewLLM,
    PresentationSceneLLM,
    PresentationSlideDraftLLM,
    PresentationVisualOutlineLLM,
)
from .normalization import compact_context
from .prompts import (
    build_outline_prompt,
    build_review_prompt,
    build_scene_prompt,
    build_slide_prompt,
    build_visual_review_prompt,
)

logger = logging.getLogger(__name__)

ResultT = TypeVar("ResultT")


@dataclass
class SlideDraft:
    title: str
    objective: str
    research_query: str
    notes: str = ""
    sources: list[RagSource] = field(default_factory=list)
    subtitle: str = ""
    content: str = ""
    image_prompt: str = ""
    labels: list[str] = field(default_factory=list)


async def run_with_retry(
    make_call: Callable[[], Awaitable[ResultT]],
    retries: int,
    description: str,
) -> ResultT:
    last_exc: Exception | None = None
    for _ in range(retries + 1):
        try:
            return await make_call()
        except Exception as exc:
            last_exc = exc
            logger.warning(description, extra={"error": str(exc)})
    raise last_exc or HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="No se pudo generar la presentacion",
    )


async def plan_presentation(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    overview_context: str,
) -> PresentationOutlineLLM:
    system_message, user_message = build_outline_prompt(
        notebook_title, topic, detail_level, overview_context
    )
    return await invoke_structured(
        PresentationOutlineLLM, [system_message, user_message]
    )


async def plan_visual_presentation(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    overview_context: str,
) -> PresentationVisualOutlineLLM:
    system_message, user_message = build_outline_prompt(
        notebook_title, topic, detail_level, overview_context, visual=True
    )
    return await invoke_structured(
        PresentationVisualOutlineLLM, [system_message, user_message]
    )


async def research_slide(
    slide: SlideDraft,
    notebook_object_id: ObjectId,
    user: dict,
) -> None:
    context_lines, sources, _, _ = await retrieve_context(
        slide.research_query,
        notebook_object_id,
        user,
        grade=True,
    )
    slide.notes = compact_context(context_lines, max_chars=SLIDE_CONTEXT_CHARS)
    slide.sources = sources


async def research_slides(
    slides: list[SlideDraft],
    notebook_object_id: ObjectId,
    user: dict,
) -> None:
    results = await gather_limited(
        [research_slide(slide, notebook_object_id, user) for slide in slides],
        MAX_PARALLEL_AGENTS,
    )
    failures = [result for result in results if isinstance(result, BaseException)]
    if len(failures) == len(slides):
        first_error = failures[0]
        if isinstance(first_error, HTTPException):
            raise first_error
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar la presentacion",
        )
    for slide, result in zip(slides, results):
        if isinstance(result, BaseException):
            logger.warning(
                "Fallo la busqueda de una slide",
                extra={"title": slide.title, "error": str(result)},
            )
            slide.notes = compact_context([])


async def write_slide(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    presentation_title: str,
    slides: list[SlideDraft],
    slide_index: int,
    issues: list[str] | None = None,
) -> PresentationSlideDraftLLM:
    slide = slides[slide_index - 1]
    system_message, user_message = build_slide_prompt(
        notebook_title=notebook_title,
        topic=topic,
        detail_level=detail_level,
        presentation_title=presentation_title,
        titles=[item.title for item in slides],
        slide_index=slide_index,
        objective=slide.objective,
        notes_text=slide.notes,
        previous_content=slide.content if issues else None,
        issues=issues,
    )
    return await invoke_structured(
        PresentationSlideDraftLLM, [system_message, user_message]
    )


async def direct_scene(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    presentation_title: str,
    style_guide: str,
    slides: list[SlideDraft],
    slide_index: int,
    issues: list[str] | None = None,
) -> PresentationSceneLLM:
    slide = slides[slide_index - 1]
    system_message, user_message = build_scene_prompt(
        notebook_title=notebook_title,
        topic=topic,
        detail_level=detail_level,
        presentation_title=presentation_title,
        style_guide=style_guide,
        titles=[item.title for item in slides],
        slide_index=slide_index,
        objective=slide.objective,
        notes_text=slide.notes,
        previous_prompt=slide.image_prompt if issues else None,
        issues=issues,
    )
    return await invoke_structured(PresentationSceneLLM, [system_message, user_message])


def _group_findings(
    review: PresentationReviewLLM, slide_count: int
) -> dict[int, list[str]]:
    issues_by_slide: dict[int, list[str]] = {}
    for finding in review.findings:
        if 1 <= finding.slide_index <= slide_count:
            issues_by_slide.setdefault(finding.slide_index, []).append(
                finding.issue.strip()
            )
    return issues_by_slide


async def review_presentation(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    slides: list[SlideDraft],
) -> dict[int, list[str]]:
    slides_text = "\n\n".join(
        f"### Slide {index}: {slide.title}\n"
        f"Notas de fuentes:\n{slide.notes}\n\n"
        f"Contenido:\n{slide.content}"
        for index, slide in enumerate(slides, start=1)
    )
    system_message, user_message = build_review_prompt(
        notebook_title, topic, detail_level, slides_text
    )
    review = await invoke_structured(
        PresentationReviewLLM, [system_message, user_message]
    )
    return _group_findings(review, len(slides))


async def review_visual_presentation(
    notebook_title: str,
    topic: str,
    style_guide: str,
    slides: list[SlideDraft],
) -> dict[int, list[str]]:
    scenes_text = "\n\n".join(
        f"### Slide {index}: {slide.title}\n"
        f"Notas de fuentes:\n{slide.notes}\n\n"
        f"Escena: {slide.image_prompt}\n"
        f"Textos en imagen: {', '.join(slide.labels) or '(ninguno)'}"
        for index, slide in enumerate(slides, start=1)
    )
    system_message, user_message = build_visual_review_prompt(
        notebook_title, topic, style_guide, scenes_text
    )
    review = await invoke_structured(
        PresentationReviewLLM, [system_message, user_message]
    )
    return _group_findings(review, len(slides))
