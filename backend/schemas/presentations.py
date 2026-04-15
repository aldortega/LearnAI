from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


PresentationDetailLevel = Literal["concise", "detailed"]


class PresentationGenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=300)
    detail_level: PresentationDetailLevel


class PresentationSourceRef(BaseModel):
    document_id: str
    chunk_id: int
    score: float
    file_name: Optional[str] = None
    page: Optional[int] = None


class PresentationSlideOut(BaseModel):
    index: int = Field(ge=1)
    title: str
    subtitle: Optional[str] = None
    content_markdown: str


class PresentationOut(BaseModel):
    id: str
    notebook_id: str
    owner_id: str
    topic: str
    detail_level: PresentationDetailLevel
    title: str
    summary: str
    slides: list[PresentationSlideOut] = Field(default_factory=list)
    sources_fingerprint: str
    is_stale: bool
    sources: list[PresentationSourceRef] = Field(default_factory=list)
    created_at: datetime


class PresentationListOut(BaseModel):
    items: list[PresentationOut] = Field(default_factory=list)


class PresentationConfigOut(BaseModel):
    has_ready_sources: bool


class PresentationGenerationJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    error: Optional[str] = None
    presentation_id: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
