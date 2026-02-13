from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status

from ..db import db
from ..schemas.notifications import (
    NotificationInvitationOut,
    NotificationListOut,
    NotificationOut,
    NotificationUnreadCountOut,
)
from .auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


async def _expire_pending_for_user(user_id: ObjectId) -> None:
    now = datetime.now(timezone.utc)
    await db.notebook_invitations.update_many(
        {
            "invitee_id": user_id,
            "status": "pending",
            "expires_at": {"$lte": now},
        },
        {
            "$set": {
                "status": "expired",
                "updated_at": now,
                "responded_at": now,
            }
        },
    )


async def _build_invitation_payload(
    user_id: ObjectId,
    entity_id: ObjectId,
) -> NotificationInvitationOut | None:
    invitation = await db.notebook_invitations.find_one(
        {"_id": entity_id, "invitee_id": user_id}
    )
    if not invitation:
        return None

    notebook = await db.notebooks.find_one(
        {"_id": invitation["notebook_id"]},
        {"title": 1},
    )
    owner = await db.users.find_one(
        {"_id": invitation["owner_id"]},
        {"username": 1, "name": 1, "last_name": 1},
    )

    owner_username = str((owner or {}).get("username") or "")
    owner_display_name = (
        f"{str((owner or {}).get('name') or '').strip()} "
        f"{str((owner or {}).get('last_name') or '').strip()}"
    ).strip() or owner_username

    return NotificationInvitationOut(
        invitation_id=str(invitation["_id"]),
        notebook_id=str(invitation["notebook_id"]),
        notebook_title=str((notebook or {}).get("title") or "Notebook"),
        owner_id=str(invitation["owner_id"]),
        owner_username=owner_username,
        owner_display_name=owner_display_name,
        permission=str(invitation.get("permission") or "read_only"),
        status=str(invitation.get("status") or "pending"),
        expires_at=invitation["expires_at"],
    )


async def _notification_to_out(
    notification: dict,
    user_id: ObjectId,
) -> NotificationOut:
    invitation_payload: NotificationInvitationOut | None = None
    if notification.get("type") == "notebook_invitation":
        entity_id = notification.get("entity_id")
        if isinstance(entity_id, ObjectId):
            invitation_payload = await _build_invitation_payload(user_id, entity_id)

    return NotificationOut(
        id=str(notification["_id"]),
        type=str(notification.get("type") or "notebook_invitation"),
        title=str(notification.get("title") or ""),
        body=str(notification.get("body") or ""),
        is_read=bool(notification.get("is_read")),
        created_at=notification["created_at"],
        read_at=notification.get("read_at"),
        invitation=invitation_payload,
    )


@router.get("", response_model=NotificationListOut)
async def list_notifications(request: Request) -> NotificationListOut:
    user = await get_current_user(request)
    await _expire_pending_for_user(user["_id"])

    cursor = db.notifications.find({"user_id": user["_id"]}).sort("created_at", -1).limit(50)
    notifications = [item async for item in cursor]
    items: list[NotificationOut] = []
    for notification in notifications:
        items.append(await _notification_to_out(notification, user["_id"]))

    return NotificationListOut(items=items)


@router.get("/unread-count", response_model=NotificationUnreadCountOut)
async def get_unread_notification_count(request: Request) -> NotificationUnreadCountOut:
    user = await get_current_user(request)
    count = await db.notifications.count_documents(
        {"user_id": user["_id"], "is_read": False}
    )
    return NotificationUnreadCountOut(unread_count=count)


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_as_read(notification_id: str, request: Request) -> None:
    user = await get_current_user(request)

    try:
        notification_object_id = ObjectId(notification_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notificacion invalida",
        ) from exc

    result = await db.notifications.update_one(
        {"_id": notification_object_id, "user_id": user["_id"]},
        {
            "$set": {
                "is_read": True,
                "read_at": datetime.now(timezone.utc),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificacion no encontrada",
        )

    return None
