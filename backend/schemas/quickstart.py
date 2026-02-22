from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class QuickstartTopicOut(BaseModel):
    id: str
    title: str
    summary: str
    emoji: Optional[str] = Field(default=None, max_length=16)
    key_points: list[str] = Field(default_factory=list)


class QuickstartOut(BaseModel):
    notebook_id: str
    has_ready_sources: bool
    status: Literal["missing", "ready", "stale"]
    generated_at: Optional[datetime] = None
    notebook_summary: str = ""
    topics: list[QuickstartTopicOut] = Field(default_factory=list)


class QuickstartGenerationJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class QuickstartSourceRef(BaseModel):
    document_id: str
    chunk_id: int
    score: float
    file_name: Optional[str] = None
    page: Optional[int] = None


class QuickstartExpansionOut(BaseModel):
    topic_id: str
    content: str
    key_points: list[str] = Field(default_factory=list)
    example_questions: list[str] = Field(default_factory=list)
    sources: list[QuickstartSourceRef] = Field(default_factory=list)


class QuickstartAddTopicRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class QuickstartReorderTopicsRequest(BaseModel):
    topic_ids: list[str] = Field(min_length=1, max_length=50)


QuickstartDetailItemType = Literal["additional_key_point", "question"]


class QuickstartTopicDetailRequest(BaseModel):
    item_type: QuickstartDetailItemType
    item_text: str = Field(min_length=1, max_length=500)


class QuickstartTopicDetailOut(BaseModel):
    topic_id: str
    item_type: QuickstartDetailItemType
    item_text: str
    content: str


class QuickstartSuggestionsOut(BaseModel):
    suggestions: list[str] = Field(default_factory=list)
    topic_count: int
    topic_limit: int
    can_add_topics: bool
