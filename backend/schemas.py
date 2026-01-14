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


class UserOut(BaseModel):
    id: str
    name: str
    last_name: str
    email: EmailStr
    username: str
    birthdate: date


class AuthResponse(BaseModel):
    user: UserOut


class NotebookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)


class NotebookUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)


class NotebookOut(BaseModel):
    id: str
    owner_id: str
    title: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentCreate(BaseModel):
    file_path: str = Field(min_length=1, max_length=500)
    file_name: str = Field(min_length=1, max_length=200)
    content_type: Literal["pdf", "docx", "txt"]


class DocumentOut(BaseModel):
    id: str
    owner_id: str
    notebook_id: str
    file_path: str
    file_name: str
    content_type: Literal["pdf", "docx", "txt"]
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
