from datetime import datetime, timedelta, timezone
import re

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, Request, status
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from ..db import db
from ..schemas.collaboration import (
    NotebookInviteCreate,
    NotebookInviteOut,
    NotebookMemberPermissionUpdate,
    UserSearchItemOut,
)
from .auth import get_current_user
from .notebook_access import require_notebook_owner

router = APIRouter(tags=["collaboration"])

INVITATION_TTL_DAYS = 7


def invitation_to_out(invitation: dict) -> NotebookInviteOut:
    return NotebookInviteOut(
        id=str(invitation["_id"]),
        notebook_id=str(invitation["notebook_id"]),
        owner_id=str(invitation["owner_id"]),
        invitee_id=str(invitation["invitee_id"]),
        invitee_username=str(invitation.get("invitee_username") or ""),
        invitee_name=str(invitation.get("invitee_name") or "") or None,
        invitee_last_name=str(invitation.get("invitee_last_name") or "") or None,
        invitee_email=str(invitation.get("invitee_email") or "") or None,
        invitee_avatar_url=str(invitation.get("invitee_avatar_url") or "") or None,
        permission=str(invitation.get("permission") or "read_only"),
        status=str(invitation.get("status") or "pending"),
        expires_at=invitation["expires_at"],
        created_at=invitation["created_at"],
        updated_at=invitation["updated_at"],
        responded_at=invitation.get("responded_at"),
    )


def _normalize_username(username: str) -> str:
    return username.strip()


def _normalize_email_query(value: str) -> str:
    return value.strip().lower()


async def expire_pending_invitations(
    notebook_id: ObjectId | None = None,
    invitee_id: ObjectId | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    query: dict[str, object] = {
        "status": "pending",
        "expires_at": {"$lte": now},
    }
    if notebook_id is not None:
        query["notebook_id"] = notebook_id
    if invitee_id is not None:
        query["invitee_id"] = invitee_id

    await db.notebook_invitations.update_many(
        query,
        {
            "$set": {
                "status": "expired",
                "updated_at": now,
                "responded_at": now,
            }
        },
    )


@router.get("/users/search", response_model=list[UserSearchItemOut])
async def search_users(
    request: Request,
    email: str | None = Query(default=None, min_length=2, max_length=254),
    username: str | None = Query(default=None, min_length=2, max_length=30),
) -> list[UserSearchItemOut]:
    user = await get_current_user(request)
    if email is None and username is None:
        return []

    field = "email_normalized" if email is not None else "username"
    raw_value = email if email is not None else username or ""
    value = _normalize_email_query(raw_value) if field == "email_normalized" else _normalize_username(raw_value)
    if len(value) < 2:
        return []

    escaped = re.escape(value)
    cursor = db.users.find(
        {
            field: {"$regex": escaped, "$options": "i"},
            "_id": {"$ne": user["_id"]},
        },
        {"username": 1, "email": 1, "avatar_url": 1, "name": 1, "last_name": 1},
    ).limit(10)

    return [
        UserSearchItemOut(
            id=str(item["_id"]),
            username=str(item.get("username") or ""),
            email=str(item.get("email") or ""),
            avatar_url=str(item.get("avatar_url") or "") or None,
            name=str(item.get("name") or ""),
            last_name=str(item.get("last_name") or ""),
        )
        async for item in cursor
        if item.get("username") and item.get("email")
    ]


@router.post(
    "/notebooks/{notebook_id}/invitations",
    response_model=NotebookInviteOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_notebook_invitation(
    notebook_id: str,
    payload: NotebookInviteCreate,
    request: Request,
) -> NotebookInviteOut:
    user = await get_current_user(request)
    access = await require_notebook_owner(notebook_id, user)

    invitee_username = _normalize_username(payload.invitee_username)
    escaped = re.escape(invitee_username)
    invitee = await db.users.find_one(
        {"username": {"$regex": f"^{escaped}$", "$options": "i"}}
    )
    if not invitee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    if invitee["_id"] == user["_id"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No puedes invitarte a ti mismo",
        )

    existing_member = await db.notebook_memberships.find_one(
        {
            "notebook_id": access.notebook["_id"],
            "member_id": invitee["_id"],
            "revoked_at": None,
        }
    )
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El usuario ya tiene acceso a esta notebook",
        )

    await expire_pending_invitations(notebook_id=access.notebook["_id"])

    now = datetime.now(timezone.utc)
    invitation_doc = {
        "notebook_id": access.notebook["_id"],
        "owner_id": user["_id"],
        "invitee_id": invitee["_id"],
        "invitee_username": str(invitee.get("username") or ""),
        "permission": payload.permission,
        "status": "pending",
        "expires_at": now + timedelta(days=INVITATION_TTL_DAYS),
        "created_at": now,
        "updated_at": now,
        "responded_at": None,
    }

    try:
        result = await db.notebook_invitations.insert_one(invitation_doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una invitacion pendiente para ese usuario",
        ) from None

    invitation_doc["_id"] = result.inserted_id

    owner_username = str(user.get("username") or "")
    owner_display_name = (
        f"{str(user.get('name') or '').strip()} {str(user.get('last_name') or '').strip()}"
    ).strip() or owner_username

    await db.notifications.insert_one(
        {
            "user_id": invitee["_id"],
            "type": "notebook_invitation",
            "entity_id": result.inserted_id,
            "title": "Nueva invitacion a notebook",
            "body": f"{owner_display_name} te invito a {access.notebook['title']}",
            "is_read": False,
            "read_at": None,
            "created_at": now,
            "meta": {
                "notebook_id": access.notebook["_id"],
                "notebook_title": str(access.notebook.get("title") or "Notebook"),
                "owner_id": user["_id"],
                "owner_username": owner_username,
                "owner_display_name": owner_display_name,
                "permission": payload.permission,
            },
        }
    )

    return invitation_to_out(invitation_doc)


@router.get(
    "/notebooks/{notebook_id}/invitations",
    response_model=list[NotebookInviteOut],
)
async def list_notebook_invitations(
    notebook_id: str,
    request: Request,
) -> list[NotebookInviteOut]:
    user = await get_current_user(request)
    access = await require_notebook_owner(notebook_id, user)

    await expire_pending_invitations(notebook_id=access.notebook["_id"])

    active_member_ids = {
        item["member_id"]
        async for item in db.notebook_memberships.find(
            {
                "notebook_id": access.notebook["_id"],
                "owner_id": user["_id"],
                "revoked_at": None,
            },
            {"member_id": 1},
        )
    }

    cursor = db.notebook_invitations.find(
        {"notebook_id": access.notebook["_id"], "owner_id": user["_id"]}
    ).sort("created_at", -1)

    now = datetime.now(timezone.utc)
    stale_accepted_ids: list[ObjectId] = []
    invitation_docs: list[dict] = []
    async for invitation in cursor:
        if (
            invitation.get("status") == "accepted"
            and invitation.get("invitee_id") not in active_member_ids
        ):
            stale_accepted_ids.append(invitation["_id"])
            invitation = {
                **invitation,
                "status": "revoked",
                "updated_at": now,
                "responded_at": now,
            }
        invitation_docs.append(invitation)

    if stale_accepted_ids:
        await db.notebook_invitations.update_many(
            {
                "_id": {"$in": stale_accepted_ids},
                "status": "accepted",
            },
            {
                "$set": {
                    "status": "revoked",
                    "updated_at": now,
                    "responded_at": now,
                }
            },
        )

    invitee_ids = [
        item["invitee_id"]
        for item in invitation_docs
        if isinstance(item.get("invitee_id"), ObjectId)
    ]
    users_by_id: dict[ObjectId, dict] = {}
    if invitee_ids:
        users_cursor = db.users.find(
            {"_id": {"$in": invitee_ids}},
            {"name": 1, "last_name": 1, "email": 1, "avatar_url": 1},
        )
        users_by_id = {item["_id"]: item async for item in users_cursor}

    items: list[NotebookInviteOut] = []
    for invitation in invitation_docs:
        invitee = users_by_id.get(invitation.get("invitee_id"))
        if invitee:
            invitation = {
                **invitation,
                "invitee_name": str(invitee.get("name") or ""),
                "invitee_last_name": str(invitee.get("last_name") or ""),
                "invitee_email": str(invitee.get("email") or ""),
                "invitee_avatar_url": str(invitee.get("avatar_url") or "") or None,
            }
        items.append(invitation_to_out(invitation))

    return items


@router.post("/invitations/{invitation_id}/accept", response_model=NotebookInviteOut)
async def accept_invitation(invitation_id: str, request: Request) -> NotebookInviteOut:
    user = await get_current_user(request)

    try:
        invitation_object_id = ObjectId(invitation_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitacion invalida",
        ) from exc

    await expire_pending_invitations(invitee_id=user["_id"])

    invitation = await db.notebook_invitations.find_one(
        {"_id": invitation_object_id, "invitee_id": user["_id"]}
    )
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitacion no encontrada",
        )

    if invitation.get("status") != "pending":
        status_value = str(invitation.get("status") or "")
        if status_value == "expired":
            detail = "La invitacion expiro"
        elif status_value == "revoked":
            detail = "La invitacion fue revocada"
        else:
            detail = "La invitacion ya no esta pendiente"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )

    now = datetime.now(timezone.utc)
    await db.notebook_memberships.update_one(
        {
            "notebook_id": invitation["notebook_id"],
            "member_id": user["_id"],
        },
        {
            "$set": {
                "owner_id": invitation["owner_id"],
                "permission": invitation.get("permission") or "read_only",
                "updated_at": now,
                "revoked_at": None,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    invitation = await db.notebook_invitations.find_one_and_update(
        {"_id": invitation_object_id, "invitee_id": user["_id"]},
        {
            "$set": {
                "status": "accepted",
                "updated_at": now,
                "responded_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    await db.notifications.delete_many(
        {
            "user_id": user["_id"],
            "type": "notebook_invitation",
            "entity_id": invitation_object_id,
        }
    )

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitacion no encontrada",
        )
    return invitation_to_out(invitation)


@router.post("/invitations/{invitation_id}/reject", response_model=NotebookInviteOut)
async def reject_invitation(invitation_id: str, request: Request) -> NotebookInviteOut:
    user = await get_current_user(request)

    try:
        invitation_object_id = ObjectId(invitation_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitacion invalida",
        ) from exc

    await expire_pending_invitations(invitee_id=user["_id"])

    invitation = await db.notebook_invitations.find_one(
        {"_id": invitation_object_id, "invitee_id": user["_id"]}
    )
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitacion no encontrada",
        )

    if invitation.get("status") != "pending":
        status_value = str(invitation.get("status") or "")
        if status_value == "expired":
            detail = "La invitacion expiro"
        elif status_value == "revoked":
            detail = "La invitacion fue revocada"
        else:
            detail = "La invitacion ya no esta pendiente"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )

    now = datetime.now(timezone.utc)
    invitation = await db.notebook_invitations.find_one_and_update(
        {"_id": invitation_object_id, "invitee_id": user["_id"]},
        {
            "$set": {
                "status": "rejected",
                "updated_at": now,
                "responded_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    await db.notifications.delete_many(
        {
            "user_id": user["_id"],
            "type": "notebook_invitation",
            "entity_id": invitation_object_id,
        }
    )

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitacion no encontrada",
        )
    return invitation_to_out(invitation)


@router.patch(
    "/notebooks/{notebook_id}/members/{member_id}/permission",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def update_member_permission(
    notebook_id: str,
    member_id: str,
    payload: NotebookMemberPermissionUpdate,
    request: Request,
) -> None:
    user = await get_current_user(request)
    access = await require_notebook_owner(notebook_id, user)

    try:
        member_object_id = ObjectId(member_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario invalido",
        ) from exc

    if member_object_id == user["_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes cambiar tu propio permiso",
        )

    now = datetime.now(timezone.utc)
    membership = await db.notebook_memberships.find_one_and_update(
        {
            "notebook_id": access.notebook["_id"],
            "member_id": member_object_id,
            "revoked_at": None,
        },
        {"$set": {"permission": payload.permission, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Miembro no encontrado",
        )

    await db.notebook_invitations.update_many(
        {
            "notebook_id": access.notebook["_id"],
            "invitee_id": member_object_id,
            "status": "accepted",
        },
        {"$set": {"permission": payload.permission, "updated_at": now}},
    )
    return None


@router.post(
    "/notebooks/{notebook_id}/members/{member_id}/revoke",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_member_access(
    notebook_id: str,
    member_id: str,
    request: Request,
) -> None:
    user = await get_current_user(request)
    access = await require_notebook_owner(notebook_id, user)

    try:
        member_object_id = ObjectId(member_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario invalido",
        ) from exc

    if member_object_id == user["_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes revocarte a ti mismo",
        )

    now = datetime.now(timezone.utc)
    membership = await db.notebook_memberships.find_one_and_update(
        {
            "notebook_id": access.notebook["_id"],
            "member_id": member_object_id,
            "revoked_at": None,
        },
        {
            "$set": {
                "revoked_at": now,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Miembro no encontrado",
        )

    active_invitation_ids = [
        item["_id"]
        async for item in db.notebook_invitations.find(
            {
                "notebook_id": access.notebook["_id"],
                "invitee_id": member_object_id,
                "status": {"$in": ["pending", "accepted"]},
            },
            {"_id": 1},
        )
    ]
    await db.notebook_invitations.update_many(
        {
            "notebook_id": access.notebook["_id"],
            "invitee_id": member_object_id,
            "status": {"$in": ["pending", "accepted"]},
        },
        {
            "$set": {
                "status": "revoked",
                "updated_at": now,
                "responded_at": now,
            }
        },
    )

    if active_invitation_ids:
        await db.notifications.update_many(
            {
                "type": "notebook_invitation",
                "entity_id": {"$in": active_invitation_ids},
            },
            {"$set": {"is_read": True, "read_at": now}},
        )

    return None
