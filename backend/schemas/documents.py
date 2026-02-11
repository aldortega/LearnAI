from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


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
