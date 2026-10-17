import asyncio
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pydantic import BaseModel

from ...config import LLMProvider
from ...schemas.presentations import (
    PresentationGenerationStage,
    PresentationDetailLevel,
    PresentationSlideOut,
    PresentationSourceRef,
)
from ..agents import gather_limited
from ..rag import retrieve_context
from .agents import (
    SlideDraft,
    direct_scene,
    plan_visual_presentation,
    research_slides,
    review_visual_presentation,
    run_with_retry,
)
from .constants import (
    MAX_IMAGE_PROMPT_CHARS,
    MAX_IMAGE_RETRIES,
    MAX_PARALLEL_AGENTS,
    MAX_PARALLEL_IMAGES,
    MAX_PRESENTATION_SUMMARY_CHARS,
    MAX_PRESENTATION_TITLE_CHARS,
    MAX_REVIEW_ROUNDS,
    MAX_SLIDE_LABEL_CHARS,
    MAX_SLIDE_LABELS,
    MAX_SLIDE_RETRIES,
    MAX_SLIDES,
    MAX_STYLE_GUIDE_CHARS,
    MIN_SLIDES,
    OVERVIEW_CONTEXT_CHARS,
    PresentationSceneLLM,
)
from .generation_service import PresentationStageCallback, merge_sources
from .image_generation_service import (
    build_public_bucket_base_url,
    delete_public_images,
    generate_slide_image_bytes,
    get_public_bucket_or_raise,
    upload_public_image,
)
from .normalization import (
    coerce_text,
    compact_context,
    normalize_slide_subtitle,
    normalize_slide_title,
    normalize_text,
)

logger = logging.getLogger(__name__)


class PresentationImageGenerationResult(BaseModel):
    title: str
    summary: str
    slides: list[PresentationSlideOut]
    sources: list[PresentationSourceRef]


def _generation_error(
    detail: str = "No se pudo generar la presentacion visual",
) -> HTTPException:
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


def _apply_scene(slide: SlideDraft, scene: PresentationSceneLLM) -> bool:
    image_prompt = normalize_text(scene.image_prompt)[:MAX_IMAGE_PROMPT_CHARS]
    if not image_prompt:
        return False
    labels = [
        normalize_text(label)[:MAX_SLIDE_LABEL_CHARS] for label in scene.labels
    ]
    slide.image_prompt = image_prompt
    slide.labels = [label for label in labels if label][:MAX_SLIDE_LABELS]
    slide.subtitle = normalize_slide_subtitle(coerce_text(scene.subtitle))
    return True


async def _direct_with_retry(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    presentation_title: str,
    style_guide: str,
    slides: list[SlideDraft],
    slide_index: int,
    provider: LLMProvider,
    issues: list[str] | None = None,
) -> PresentationSceneLLM:
    return await run_with_retry(
        lambda: direct_scene(
            notebook_title,
            topic,
            detail_level,
            presentation_title,
            style_guide,
            slides,
            slide_index,
            provider,
            issues,
        ),
        MAX_SLIDE_RETRIES,
        "Fallo al disenar escena de slide",
    )


async def _rewrite_flagged_scenes(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    presentation_title: str,
    style_guide: str,
    slides: list[SlideDraft],
    issues_by_slide: dict[int, list[str]],
    provider: LLMProvider,
) -> None:
    slide_indices = list(issues_by_slide)
    results = await gather_limited(
        [
            _direct_with_retry(
                notebook_title,
                topic,
                detail_level,
                presentation_title,
                style_guide,
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
        if isinstance(result, PresentationSceneLLM) and _apply_scene(
            slides[slide_index - 1], result
        ):
            continue
        logger.warning(
            "Se conserva la escena original de la slide",
            extra={"slide_index": slide_index},
        )


async def _illustrate_slides(
    topic: str,
    style_guide: str,
    slides: list[SlideDraft],
    bucket: str,
    public_base_url: str,
    storage_prefix: str,
) -> list[PresentationSlideOut]:
    uploaded_paths: list[str] = []

    async def render(
        index: int, reference_image: bytes | None
    ) -> tuple[PresentationSlideOut, bytes]:
        slide = slides[index - 1]
        image_bytes = await run_with_retry(
            lambda: generate_slide_image_bytes(
                slide_title=slide.title,
                slide_subtitle=slide.subtitle or None,
                image_prompt=slide.image_prompt,
                topic=topic,
                style_guide=style_guide,
                labels=slide.labels,
                reference_image=reference_image,
            ),
            MAX_IMAGE_RETRIES,
            "Fallo al generar imagen de slide",
        )
        image_path = f"{storage_prefix}/slide-{index}.webp"
        await asyncio.to_thread(upload_public_image, bucket, image_path, image_bytes)
        uploaded_paths.append(image_path)
        return (
            PresentationSlideOut(
                index=index,
                format="image",
                title=slide.title,
                subtitle=slide.subtitle or None,
                content_markdown=None,
                image_path=image_path,
                image_url=f"{public_base_url}/{image_path}",
                image_prompt=slide.image_prompt,
            ),
            image_bytes,
        )

    rendered: list[PresentationSlideOut] = []
    reference_image: bytes | None = None
    try:
        try:
            first_slide, reference_image = await render(1, None)
            rendered.append(first_slide)
        except Exception as exc:
            logger.warning(
                "Fallo la slide de referencia de estilo", extra={"error": str(exc)}
            )

        remaining = list(range(2, len(slides) + 1))
        results = await gather_limited(
            [render(index, reference_image) for index in remaining],
            MAX_PARALLEL_IMAGES,
        )
        for index, result in zip(remaining, results):
            if isinstance(result, BaseException):
                logger.warning(
                    "Se descarta slide sin imagen",
                    extra={"slide_index": index, "error": str(result)},
                )
                continue
            rendered.append(result[0])

        if len(rendered) < min(MIN_SLIDES, len(slides)):
            raise _generation_error(
                "No se pudieron generar imagenes para la presentacion"
            )
    except Exception:
        try:
            await asyncio.to_thread(delete_public_images, bucket, uploaded_paths)
        except Exception as cleanup_exc:
            logger.warning(
                "No se pudieron limpiar imagenes huerfanas",
                extra={"error": str(cleanup_exc)},
            )
        raise

    rendered.sort(key=lambda item: item.index)
    return [
        item.model_copy(update={"index": position})
        for position, item in enumerate(rendered, start=1)
    ]


async def generate_image_presentation_payload(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    user: dict,
    provider: LLMProvider,
    on_stage: PresentationStageCallback | None = None,
) -> PresentationImageGenerationResult:
    async def notify(stage: PresentationGenerationStage) -> None:
        if on_stage is not None:
            await on_stage(stage)

    bucket = get_public_bucket_or_raise()
    public_base_url = build_public_bucket_base_url(bucket)

    await notify("planning")
    overview_lines, overview_sources, _, _ = await retrieve_context(
        f"Informacion para presentacion visual sobre {topic}",
        notebook_object_id,
        user,
    )
    outline = await plan_visual_presentation(
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
    style_guide = normalize_text(outline.style_guide)[:MAX_STYLE_GUIDE_CHARS]
    if not presentation_title or not summary or not style_guide:
        raise _generation_error()

    await notify("researching")
    await research_slides(slides, notebook_object_id, user, provider)

    await notify("writing")
    scene_results = await gather_limited(
        [
            _direct_with_retry(
                notebook_title,
                topic,
                detail_level,
                presentation_title,
                style_guide,
                slides,
                index,
                provider,
            )
            for index in range(1, len(slides) + 1)
        ],
        MAX_PARALLEL_AGENTS,
    )
    for slide, result in zip(slides, scene_results):
        if isinstance(result, HTTPException):
            raise result
        if not isinstance(result, PresentationSceneLLM) or not _apply_scene(
            slide, result
        ):
            raise _generation_error()

    await notify("reviewing")
    for _ in range(MAX_REVIEW_ROUNDS):
        try:
            issues_by_slide = await review_visual_presentation(
                notebook_title, topic, style_guide, slides, provider
            )
        except Exception as exc:
            logger.warning(
                "Fallo la revision de la presentacion visual",
                extra={"error": str(exc)},
            )
            break
        if not issues_by_slide:
            break
        await _rewrite_flagged_scenes(
            notebook_title,
            topic,
            detail_level,
            presentation_title,
            style_guide,
            slides,
            issues_by_slide,
            provider,
        )

    await notify("illustrating")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    slides_out = await _illustrate_slides(
        topic,
        style_guide,
        slides,
        bucket,
        public_base_url,
        f"presentations/{owner_id}/{notebook_object_id}/{timestamp}",
    )

    await notify("assembling")
    return PresentationImageGenerationResult(
        title=presentation_title,
        summary=summary,
        slides=slides_out,
        sources=merge_sources(
            [overview_sources] + [slide.sources for slide in slides]
        ),
    )
