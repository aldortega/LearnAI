from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from .collaboration import InvitationPermission, InvitationStatus


NotificationType = Literal["notebook_invitation"]


class NotificationInvitationOut(BaseModel):
    invitation_id: str
    notebook_id: str
    notebook_title: str
    owner_id: str
    owner_username: str
    owner_display_name: str
    permission: InvitationPermission
    status: InvitationStatus
    expires_at: datetime


class NotificationOut(BaseModel):
    id: str
    type: NotificationType
    title: str
    body: str
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None
    invitation: NotificationInvitationOut | None = None


class NotificationListOut(BaseModel):
    items: list[NotificationOut]


class NotificationUnreadCountOut(BaseModel):
    unread_count: int
