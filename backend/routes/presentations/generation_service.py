import asyncio

from bson import ObjectId
from fastapi import HTTPException, status
from pydantic import BaseModel

from ...schemas.presentations import (
    PresentationDetailLevel,
    PresentationSlideOut,
    PresentationSourceRef,
)
from ..rag import create_llm, retrieve_context
from .constants import (
    MAX_PRESENTATION_SUMMARY_CHARS,
    MAX_PRESENTATION_TITLE_CHARS,
    MAX_SLIDES,
    PresentationGenerationPayloadLLM,
)
from .normalization import (
    bullets_to_markdown,
    compact_context,
    coerce_text,
    normalize_markdown_content,
    normalize_slide_subtitle,
    normalize_slide_title,
    normalize_text,
    source_to_ref,
)
from .prompts import build_presentation_prompt
from .prompts import build_regenerate_slide_prompt


async def generate_presentation_payload(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    notebook_object_id: ObjectId,
    user: dict,
) -> tuple[str, str, list[PresentationSlideOut], list[PresentationSourceRef]]:
    context_lines, sources, _, _ = await retrieve_context(
        f"Informacion para presentacion sobre {topic}",
        notebook_object_id,
        user,
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_presentation_prompt(
        notebook_title=notebook_title,
        topic=topic,
        detail_level=detail_level,
        context_text=context_text,
    )

    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=PresentationGenerationPayloadLLM.model_json_schema(),
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
        else PresentationGenerationPayloadLLM.model_validate(payload).model_dump()
    )

    title = normalize_text(coerce_text(payload_data.get("title")))[
        :MAX_PRESENTATION_TITLE_CHARS
    ]
    summary = normalize_text(coerce_text(payload_data.get("summary")))[
        :MAX_PRESENTATION_SUMMARY_CHARS
    ]
    raw_slides = payload_data.get("slides")

    slides: list[PresentationSlideOut] = []
    if isinstance(raw_slides, list):
        for index, raw_slide in enumerate(raw_slides, start=1):
            if not isinstance(raw_slide, dict):
                continue
            slide_title = normalize_slide_title(coerce_text(raw_slide.get("title")))
            subtitle = normalize_slide_subtitle(coerce_text(raw_slide.get("subtitle")))
            content_markdown = normalize_markdown_content(
                coerce_text(raw_slide.get("content_markdown"))
            )
            if not content_markdown:
                legacy_bullets = raw_slide.get("bullets")
                if isinstance(legacy_bullets, list):
                    content_markdown = bullets_to_markdown(legacy_bullets)
            if not slide_title or not content_markdown:
                continue
            slides.append(
                PresentationSlideOut(
                    index=index,
                    title=slide_title,
                    subtitle=subtitle or None,
                    content_markdown=content_markdown,
                )
            )
            if len(slides) >= MAX_SLIDES:
                break

    if not title or not summary or not slides:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar la presentacion",
        )

    return (
        title,
        summary,
        slides,
        [source_to_ref(source) for source in sources],
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
) -> PresentationSlideOut:
    context_lines, _, _, _ = await retrieve_context(
        f"Informacion para editar slide de presentacion sobre {topic}",
        notebook_object_id,
        user,
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

    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema={
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
        title=slide_title,
        subtitle=subtitle or None,
        content_markdown=content_markdown,
    )
