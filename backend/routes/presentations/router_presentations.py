from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Response, status

from ...db import db
from ...schemas.presentations import (
    PresentationApplySlideRequest,
    PresentationDetailLevel,
    PresentationListOut,
    PresentationOut,
    PresentationRegenerateSlideOut,
    PresentationRegenerateSlideRequest,
)
from ..auth import get_current_user
from .generation_service import regenerate_presentation_slide_payload
from .normalization import (
    normalize_markdown_content,
    normalize_slide_subtitle,
    normalize_slide_title,
)
from .pdf_export import (
    PdfExportError,
    build_presentation_pdf_bytes,
    build_presentation_pdf_filename,
)
from .repository import (
    compute_sources_fingerprint,
    get_notebook_or_404,
    presentation_doc_to_out,
)
from .normalization import coerce_text

router = APIRouter(tags=["presentations"])


@router.get("/{notebook_id}/presentations", response_model=PresentationListOut)
async def list_presentations(notebook_id: str, request: Request) -> PresentationListOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    current_fingerprint, _ = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        notebook["owner_id"],
    )

    cursor = db.presentations.find(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    ).sort("created_at", -1)
    items = [
        presentation_doc_to_out(presentation_doc, current_fingerprint)
        async for presentation_doc in cursor
    ]
    return PresentationListOut(items=items)


@router.get(
    "/{notebook_id}/presentations/{presentation_id}", response_model=PresentationOut
)
async def get_presentation(
    notebook_id: str,
    presentation_id: str,
    request: Request,
) -> PresentationOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    presentation_doc = await _get_presentation_doc_or_404(
        presentation_id,
        user["_id"],
        notebook["_id"],
    )

    current_fingerprint, _ = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        notebook["owner_id"],
    )
    return presentation_doc_to_out(presentation_doc, current_fingerprint)


@router.get("/{notebook_id}/presentations/{presentation_id}/pdf")
async def download_presentation_pdf(
    notebook_id: str,
    presentation_id: str,
    request: Request,
) -> Response:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    presentation_doc = await _get_presentation_doc_or_404(
        presentation_id,
        user["_id"],
        notebook["_id"],
    )
    presentation = presentation_doc_to_out(
        presentation_doc,
        current_fingerprint=coerce_text(presentation_doc.get("sources_fingerprint")),
    )

    title = coerce_text(presentation.title).strip() or "Presentacion"
    try:
        pdf_bytes = await build_presentation_pdf_bytes(
            title=title,
            summary=presentation.summary,
            slides=presentation.slides,
            generation_mode=coerce_text(presentation.generation_mode),
        )
    except PdfExportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    filename = build_presentation_pdf_filename(title)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete(
    "/{notebook_id}/presentations/{presentation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_presentation(
    notebook_id: str,
    presentation_id: str,
    request: Request,
) -> Response:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    try:
        presentation_object_id = ObjectId(presentation_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Presentacion invalida",
        ) from exc

    delete_result = await db.presentations.delete_one(
        {
            "_id": presentation_object_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if delete_result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentacion no encontrada",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{notebook_id}/presentations/{presentation_id}/slides/{slide_index}/regenerate",
    response_model=PresentationRegenerateSlideOut,
)
async def regenerate_presentation_slide(
    notebook_id: str,
    presentation_id: str,
    slide_index: int,
    payload: PresentationRegenerateSlideRequest,
    request: Request,
) -> PresentationRegenerateSlideOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    presentation_doc = await _get_presentation_doc_or_404(
        presentation_id,
        user["_id"],
        notebook["_id"],
    )

    slides = _extract_slides_from_doc(presentation_doc)
    if slide_index < 1 or slide_index > len(slides):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Indice de diapositiva invalido",
        )

    prompt = coerce_text(payload.prompt).strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El prompt es obligatorio",
        )

    current_slide = slides[slide_index - 1]
    if current_slide.format == "image":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las diapositivas visuales no admiten regeneracion de markdown",
        )

    detail_level_value: PresentationDetailLevel = (
        "concise"
        if coerce_text(presentation_doc.get("detail_level")) == "concise"
        else "detailed"
    )

    regenerated_slide = await regenerate_presentation_slide_payload(
        notebook_title=coerce_text(notebook.get("title")),
        topic=coerce_text(presentation_doc.get("topic")),
        detail_level=detail_level_value,
        notebook_object_id=notebook["_id"],
        user={
            "_id": user["_id"],
            "_source_owner_id": notebook["owner_id"],
        },
        slide_index=slide_index,
        current_slide=current_slide,
        edit_prompt=prompt,
    )

    return PresentationRegenerateSlideOut(slide=regenerated_slide)


@router.post(
    "/{notebook_id}/presentations/{presentation_id}/slides/{slide_index}/apply"
)
async def apply_presentation_slide_changes(
    notebook_id: str,
    presentation_id: str,
    slide_index: int,
    payload: PresentationApplySlideRequest,
    request: Request,
) -> Response:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    presentation_doc = await _get_presentation_doc_or_404(
        presentation_id,
        user["_id"],
        notebook["_id"],
    )

    slides = _extract_slides_from_doc(presentation_doc)
    if slide_index < 1 or slide_index > len(slides):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Indice de diapositiva invalido",
        )

    current_slide = slides[slide_index - 1]
    if current_slide.format == "image":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las diapositivas visuales no admiten edicion de markdown",
        )

    next_title = normalize_slide_title(coerce_text(payload.title))
    next_subtitle = normalize_slide_subtitle(coerce_text(payload.subtitle)) or None
    next_content_markdown = normalize_markdown_content(
        coerce_text(payload.content_markdown)
    )
    if not next_title or not next_content_markdown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La diapositiva editada es invalida",
        )

    slide_doc = {
        "index": slide_index,
        "format": "markdown",
        "title": next_title,
        "subtitle": next_subtitle,
        "content_markdown": next_content_markdown,
    }
    raw_slides = presentation_doc.get("slides", [])
    if not isinstance(raw_slides, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Presentacion invalida",
        )
    target_position = slide_index - 1
    if target_position >= len(raw_slides) or not isinstance(
        raw_slides[target_position], dict
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar la diapositiva",
        )

    updated_slides = list(raw_slides)
    updated_slides[target_position] = slide_doc

    await db.presentations.update_one(
        {
            "_id": presentation_doc["_id"],
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        },
        {
            "$set": {
                "slides": updated_slides,
            }
        },
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _get_presentation_doc_or_404(
    presentation_id: str,
    owner_id: ObjectId,
    notebook_id: ObjectId,
) -> dict:
    try:
        presentation_object_id = ObjectId(presentation_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Presentacion invalida",
        ) from exc

    presentation_doc = await db.presentations.find_one(
        {
            "_id": presentation_object_id,
            "owner_id": owner_id,
            "notebook_id": notebook_id,
        }
    )
    if not presentation_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentacion no encontrada",
        )
    return presentation_doc


def _extract_slides_from_doc(presentation_doc: dict):
    presentation_out = presentation_doc_to_out(
        presentation_doc,
        current_fingerprint=coerce_text(presentation_doc.get("sources_fingerprint")),
    )
    return presentation_out.slides
