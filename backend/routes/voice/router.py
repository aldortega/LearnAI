from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from ...config import settings
from ...db import db
from ..auth import get_current_user
from ..rag.service import get_notebook_object_id, retrieve_context
from .service import (
    TOOL_NAME_RETRIEVE_CONTEXT,
    build_system_instruction,
    build_tool_schema,
    create_ephemeral_token,
)


router = APIRouter(prefix="/voice", tags=["voice"])


class VoiceTokenResponse(BaseModel):
    token: str
    model: str
    system_instruction: str
    tool_name: str
    tool_schema: dict
    notebook_id: str


class VoiceRetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)


class VoiceChunkOut(BaseModel):
    text: str
    source_name: str | None = None
    page: int | None = None
    score: float


class VoiceRetrieveResponse(BaseModel):
    chunks: list[VoiceChunkOut]


@router.post("/{notebook_id}/token", response_model=VoiceTokenResponse)
async def issue_voice_token(notebook_id: str, request: Request) -> VoiceTokenResponse:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)

    notebook = await db.notebooks.find_one(
        {"_id": notebook_object_id}, {"title": 1}
    )
    title = (notebook or {}).get("title")

    token = await create_ephemeral_token()

    return VoiceTokenResponse(
        token=token,
        model=settings.gemini_live_model,
        system_instruction=build_system_instruction(title),
        tool_name=TOOL_NAME_RETRIEVE_CONTEXT,
        tool_schema=build_tool_schema(),
        notebook_id=notebook_id,
    )


@router.post("/{notebook_id}/retrieve", response_model=VoiceRetrieveResponse)
async def retrieve_for_voice(
    notebook_id: str, payload: VoiceRetrieveRequest, request: Request
) -> VoiceRetrieveResponse:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)

    question = payload.query.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Consulta invalida"
        )

    _, sources, _, _ = await retrieve_context(question, notebook_object_id, user)

    chunks = [
        VoiceChunkOut(
            text=source.text,
            source_name=source.file_name,
            page=source.page,
            score=source.score,
        )
        for source in sources
    ]
    return VoiceRetrieveResponse(chunks=chunks)
