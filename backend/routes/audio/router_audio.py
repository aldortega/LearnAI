import asyncio

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Response, status

from ...db import db
from ...schemas.audio import PodcastDetailOut, PodcastListOut
from ..auth import get_current_user
from .normalization import coerce_text
from .repository import (
    compute_sources_fingerprint,
    get_notebook_or_404,
    podcast_doc_to_detail,
    podcast_doc_to_out,
)
from .tts_service import delete_public_audio


router = APIRouter(tags=["audio"])


@router.get("/{notebook_id}/audio", response_model=PodcastListOut)
async def list_podcasts(notebook_id: str, request: Request) -> PodcastListOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    current_fingerprint, _ = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        notebook["owner_id"],
    )

    cursor = db.podcasts.find(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    ).sort("created_at", -1)
    items = [podcast_doc_to_out(doc, current_fingerprint) async for doc in cursor]
    return PodcastListOut(items=items)


@router.get("/{notebook_id}/audio/{podcast_id}", response_model=PodcastDetailOut)
async def get_podcast(
    notebook_id: str,
    podcast_id: str,
    request: Request,
) -> PodcastDetailOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    podcast_doc = await _get_podcast_doc_or_404(podcast_id, user["_id"], notebook["_id"])

    current_fingerprint, _ = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        notebook["owner_id"],
    )
    return podcast_doc_to_detail(podcast_doc, current_fingerprint)


@router.delete(
    "/{notebook_id}/audio/{podcast_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_podcast(
    notebook_id: str,
    podcast_id: str,
    request: Request,
) -> Response:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    podcast_doc = await _get_podcast_doc_or_404(podcast_id, user["_id"], notebook["_id"])

    audio_path = coerce_text(podcast_doc.get("audio_path"))
    delete_result = await db.podcasts.delete_one(
        {
            "_id": podcast_doc["_id"],
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if delete_result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast no encontrado",
        )

    if audio_path:
        await asyncio.to_thread(delete_public_audio, audio_path)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _get_podcast_doc_or_404(
    podcast_id: str,
    owner_id: ObjectId,
    notebook_id: ObjectId,
) -> dict:
    try:
        podcast_object_id = ObjectId(podcast_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Podcast invalido",
        ) from exc

    podcast_doc = await db.podcasts.find_one(
        {
            "_id": podcast_object_id,
            "owner_id": owner_id,
            "notebook_id": notebook_id,
        }
    )
    if not podcast_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast no encontrado",
        )
    return podcast_doc
