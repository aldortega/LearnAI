from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


InvitationPermission = Literal["read_only", "can_manage_documents"]
InvitationStatus = Literal[
    "pending",
    "accepted",
    "rejected",
    "revoked",
    "expired",
]


class UserSearchItemOut(BaseModel):
    id: str
    username: str
    email: str
    avatar_url: str | None = None
    name: str
    last_name: str


class NotebookInviteCreate(BaseModel):
    invitee_username: str = Field(min_length=3, max_length=30)
    permission: InvitationPermission = "read_only"


class NotebookInviteOut(BaseModel):
    id: str
    notebook_id: str
    owner_id: str
    invitee_id: str
    invitee_username: str
    invitee_name: str | None = None
    invitee_last_name: str | None = None
    invitee_email: str | None = None
    invitee_avatar_url: str | None = None
    permission: InvitationPermission
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    responded_at: datetime | None = None


class NotebookMemberPermissionUpdate(BaseModel):
    permission: InvitationPermission


class NotebookMemberOut(BaseModel):
    notebook_id: str
    owner_id: str
    member_id: str
    permission: InvitationPermission
    created_at: datetime
    updated_at: datetime


class NotebookAccessOut(BaseModel):
    role: Literal["owner", "collaborator"]
    can_manage_documents: bool
