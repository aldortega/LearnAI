from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Response, status

from ...db import db
from ...schemas.presentations import PresentationListOut, PresentationOut
from ..auth import get_current_user
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
