from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Response, status

from ...db import db
from ...schemas.reports import ReportListOut, ReportOut
from ..auth import get_current_user
from .service import (
    coerce_text,
    compute_sources_fingerprint,
    get_notebook_or_404,
    report_doc_to_out,
)

router = APIRouter(tags=["reports"])


@router.get("/{notebook_id}/reports", response_model=ReportListOut)
async def list_reports(notebook_id: str, request: Request) -> ReportListOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    current_fingerprint, _ = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        notebook["owner_id"],
    )

    cursor = db.reports.find(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    ).sort("created_at", -1)
    items = [report_doc_to_out(report_doc, current_fingerprint) async for report_doc in cursor]
    return ReportListOut(items=items)


@router.get("/{notebook_id}/reports/{report_id}", response_model=ReportOut)
async def get_report(
    notebook_id: str,
    report_id: str,
    request: Request,
) -> ReportOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    try:
        report_object_id = ObjectId(report_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reporte invalido",
        ) from exc

    report_doc = await db.reports.find_one(
        {
            "_id": report_object_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if not report_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reporte no encontrado",
        )

    current_fingerprint, _ = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        notebook["owner_id"],
    )
    return report_doc_to_out(report_doc, current_fingerprint)


@router.delete(
    "/{notebook_id}/reports/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_report(
    notebook_id: str,
    report_id: str,
    request: Request,
) -> Response:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    try:
        report_object_id = ObjectId(report_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reporte invalido",
        ) from exc

    delete_result = await db.reports.delete_one(
        {
            "_id": report_object_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if delete_result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reporte no encontrado",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
