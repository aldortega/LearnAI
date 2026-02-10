from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    last_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    birthdate: date
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class GoogleLoginRequest(BaseModel):
    credential: str


class CompleteProfileRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    birthdate: date


class UserOut(BaseModel):
    id: str
    name: str
    last_name: str
    email: EmailStr
    avatar_url: Optional[str] = None
    username: Optional[str] = None
    birthdate: Optional[date] = None
    profile_complete: bool = True


class AuthResponse(BaseModel):
    user: UserOut


class NotebookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    emoji: Optional[str] = Field(default=None, max_length=16)


class NotebookUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    emoji: Optional[str] = Field(default=None, max_length=16)


class NotebookOut(BaseModel):
    id: str
    owner_id: str
    title: str
    description: Optional[str] = None
    emoji: Optional[str] = None
    source_count: int = 0
    created_at: datetime
    updated_at: datetime


class DocumentCreate(BaseModel):
    file_path: str = Field(min_length=1, max_length=500)
    file_name: str = Field(min_length=1, max_length=200)
    content_type: Literal["pdf", "docx", "txt", "pptx"]


class DocumentOut(BaseModel):
    id: str
    owner_id: str
    notebook_id: str
    file_path: str
    file_name: str
    content_type: Literal["pdf", "docx", "txt", "pptx"]
    status: str
    created_at: datetime
    updated_at: datetime
    error: Optional[str] = None


class DocumentCreateResponse(BaseModel):
    document: DocumentOut
    job_id: str


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


class QuickstartTopicOut(BaseModel):
    id: str
    title: str
    summary: str
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
