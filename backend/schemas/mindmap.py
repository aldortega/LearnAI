from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class MindmapNodeOut(BaseModel):
    id: str
    title: str
    parent_id: Optional[str] = None
    depth: int = Field(ge=0)
    has_children: bool


class MindmapOut(BaseModel):
    notebook_id: str
    has_ready_sources: bool
    status: Literal["missing", "ready", "stale"]
    generated_at: Optional[datetime] = None
    root_node_id: Optional[str] = None
    nodes: list[MindmapNodeOut] = Field(default_factory=list)


class MindmapGenerationJobOut(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed"]
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class MindmapNodeDetailOut(BaseModel):
    node_id: str
    explanation: str
