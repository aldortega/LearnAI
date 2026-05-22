from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class NotebookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)


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
    access_role: Literal["owner", "collaborator"] = "owner"
    can_manage_documents: bool = True
    source_count: int = 0
    created_at: datetime
    updated_at: datetime
