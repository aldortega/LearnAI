from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


ReportFormatType = Literal[
    "freeform",
    "summary",
    "study_guide",
    "blog_post",
    "ai_suggested",
]


class ReportPromptTemplateOut(BaseModel):
    type: ReportFormatType
    label: str
    description: str
    default_prompt: str
    is_editable: bool = True


class ReportSuggestionOut(BaseModel):
    id: str
    title: str
    description: str
    default_prompt: str


class ReportGenerateRequest(BaseModel):
    format_type: ReportFormatType
    prompt: str = Field(min_length=1, max_length=12000)
    suggestion_id: Optional[str] = Field(default=None, max_length=64)


class ReportSourceRef(BaseModel):
    document_id: str
    chunk_id: int
    score: float
    file_name: Optional[str] = None
    page: Optional[int] = None


class ReportOut(BaseModel):
    id: str
    notebook_id: str
    owner_id: str
    format_type: ReportFormatType
    title: str
    description: str = ""
    prompt_used: str
    content: str
    sources_fingerprint: str
    is_stale: bool
    sources: list[ReportSourceRef] = Field(default_factory=list)
    created_at: datetime


class ReportListOut(BaseModel):
    items: list[ReportOut] = Field(default_factory=list)


class ReportConfigOut(BaseModel):
    has_ready_sources: bool
    templates: list[ReportPromptTemplateOut] = Field(default_factory=list)
    suggestions: list[ReportSuggestionOut] = Field(default_factory=list)


class ReportGenerationJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    error: Optional[str] = None
    report_id: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
