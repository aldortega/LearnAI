from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


AudioFormatType = Literal["deep_dive", "brief", "critique", "debate"]
AudioDuration = Literal["short", "default", "long"]


class AudioFormatTemplateOut(BaseModel):
    type: AudioFormatType
    label: str
    description: str


class AudioSuggestionOut(BaseModel):
    id: str
    title: str
    description: str
    default_topic: str


class AudioGenerateRequest(BaseModel):
    format_type: AudioFormatType
    duration: AudioDuration = "default"
    topic: Optional[str] = Field(default=None, max_length=500)
    suggestion_id: Optional[str] = Field(default=None, max_length=64)


class AudioSourceRef(BaseModel):
    document_id: str
    chunk_id: int
    score: float
    file_name: Optional[str] = None
    page: Optional[int] = None


class AudioScriptSegment(BaseModel):
    speaker: str
    text: str


class PodcastOut(BaseModel):
    id: str
    notebook_id: str
    owner_id: str
    format_type: AudioFormatType
    duration: AudioDuration
    title: str
    description: str = ""
    topic: str = ""
    audio_url: str
    audio_path: str
    duration_seconds: float = 0.0
    sources_fingerprint: str
    is_stale: bool
    sources: list[AudioSourceRef] = Field(default_factory=list)
    created_at: datetime


class PodcastDetailOut(PodcastOut):
    script: list[AudioScriptSegment] = Field(default_factory=list)


class PodcastListOut(BaseModel):
    items: list[PodcastOut] = Field(default_factory=list)


class AudioConfigOut(BaseModel):
    has_ready_sources: bool
    templates: list[AudioFormatTemplateOut] = Field(default_factory=list)
    suggestions: list[AudioSuggestionOut] = Field(default_factory=list)
    suggestions_status: Literal["ready", "generating", "failed", "missing"] = "missing"
    suggestions_is_stale: bool = False
    suggestions_error: Optional[str] = None
    suggestions_job_id: Optional[str] = None


class AudioGenerationJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    error: Optional[str] = None
    podcast_id: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class AudioSuggestionsJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
