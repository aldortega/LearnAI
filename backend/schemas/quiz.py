from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class RoadmapLevelOut(BaseModel):
    id: str
    unit_id: str
    title: str
    type: Literal["lesson", "exam"]
    order: int
    passing_score: int
    status: Literal["locked", "unlocked", "passed"]
    best_score: Optional[int] = None
    questions_status: Optional[Literal["idle", "generating", "ready", "failed"]] = None


class RoadmapUnitOut(BaseModel):
    id: str
    title: str
    description: str
    order: int
    levels: list[RoadmapLevelOut]


class RoadmapOut(BaseModel):
    id: str
    notebook_id: str
    owner_id: str
    title: str
    units: list[RoadmapUnitOut]
    created_at: datetime
    updated_at: datetime


QuizLength = Literal["short", "medium", "long"]
QuizDifficulty = Literal["basic", "intermediate", "advanced"]


class QuizGenerateRequest(BaseModel):
    length: QuizLength = "long"
    difficulty: QuizDifficulty = "basic"


class QuizGenerationJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class QuizQuestionsGenerationOut(BaseModel):
    status: Literal["idle", "generating", "ready", "failed"]
    error: Optional[str] = None


class QuizOptionOut(BaseModel):
    id: str
    text: str


class QuizQuestionOut(BaseModel):
    id: str
    level_id: str
    unit_id: str
    question: str
    options: list[QuizOptionOut]
    hint: str


class QuizSubmitRequest(BaseModel):
    question_id: str
    selected_option_id: str


class QuizSubmitResponse(BaseModel):
    is_correct: bool
    explanation: str
    correct_option_id: str
    level_score: int
    passed: bool
    unlocked_levels: list[str] = Field(default_factory=list)


class QuizAttemptOut(BaseModel):
    question_id: str
    selected_option_id: str
    is_correct: bool
    correct_option_id: str
    explanation: str
    created_at: datetime
