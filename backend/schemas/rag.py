from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class RagQueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    top_k: Optional[int] = Field(default=None, ge=1, le=20)


class RagSource(BaseModel):
    document_id: str
    chunk_id: int
    score: float
    text: str
    file_name: Optional[str] = None
    page: Optional[int] = None


class RagResponse(BaseModel):
    answer: str
    sources: list[RagSource]


class ConversationOut(BaseModel):
    id: str
    owner_id: str
    notebook_id: str
    created_at: datetime


class ChatMessageSource(BaseModel):
    file_name: str


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class ChatMessageOut(BaseModel):
    id: str
    conversation_id: str
    notebook_id: str
    owner_id: str
    role: Literal["user", "assistant"]
    content: str
    sources: list[ChatMessageSource] = Field(default_factory=list)
    created_at: datetime
