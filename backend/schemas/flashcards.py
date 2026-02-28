from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


FlashcardCountPreset = Literal["less", "default", "more"]
FlashcardDifficulty = Literal["easy", "medium", "hard"]


class FlashcardsGenerateRequest(BaseModel):
    card_count: FlashcardCountPreset = "default"
    difficulty: FlashcardDifficulty = "medium"
    topic_prompt: str = Field(default="", max_length=500)


class FlashcardSourceRef(BaseModel):
    document_id: str
    chunk_id: int
    score: float
    file_name: Optional[str] = None
    page: Optional[int] = None


class FlashcardOut(BaseModel):
    id: str
    term: str
    definition: str


class FlashcardSetOut(BaseModel):
    set_id: str
    set_title: str
    status: Literal["ready", "stale"]
    generated_at: Optional[datetime] = None
    card_count: FlashcardCountPreset = "default"
    difficulty: FlashcardDifficulty = "medium"
    topic_prompt: str = ""
    cards: list[FlashcardOut] = Field(default_factory=list)


class FlashcardsOut(BaseModel):
    notebook_id: str
    has_ready_sources: bool
    status: Literal["missing", "ready", "stale"]
    sets: list[FlashcardSetOut] = Field(default_factory=list)


class FlashcardsGenerationJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class FlashcardExplainRequest(BaseModel):
    set_id: str = Field(min_length=1, max_length=120)
    card_id: str = Field(min_length=1, max_length=120)


class FlashcardExplainOut(BaseModel):
    card_id: str
    explanation_markdown: str
    cached: bool
    generated_at: datetime
