from typing import Literal, Optional

from pydantic import BaseModel, Field

from ..config import LLMProvider
from ..schemas.rag import RagSource

QuestionType = Literal["single_hop", "multi_hop", "out_of_scope"]


class ChunkRef(BaseModel):
    document_id: str
    chunk_id: int


class EvalQuestion(BaseModel):
    id: str = Field(min_length=1)
    question: str = Field(min_length=1, max_length=2000)
    question_type: QuestionType
    reference: Optional[str] = None
    reference_contexts: list[str] = Field(default_factory=list)
    reference_chunks: list[ChunkRef] = Field(default_factory=list)
    reviewed: bool = False


class EvalRecord(BaseModel):
    id: str
    config: str
    run: int
    question_type: QuestionType
    user_input: str
    retrieved_contexts: list[str]
    response: str
    reference: Optional[str] = None
    reference_contexts: list[str] = Field(default_factory=list)
    reference_chunks: list[ChunkRef] = Field(default_factory=list)
    used_general_knowledge: bool
    sources: list[RagSource] = Field(default_factory=list)
    latency_ms: int
    provider: LLMProvider
    chat_model: str
    embedding_model: str
    temperature_omitted: bool
    error: Optional[str] = None
