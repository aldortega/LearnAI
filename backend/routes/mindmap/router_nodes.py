from datetime import datetime, timezone

from fastapi import APIRouter, Request

from ...db import db
from ...schemas.mindmap import MindmapNodeDetailOut
from ..auth import get_current_user
from .generation_service import generate_node_detail
from .normalization import coerce_text
from .repository import resolve_mindmap_node_context

router = APIRouter(tags=["mindmap"])


@router.post(
    "/{notebook_id}/mindmap/nodes/{node_id}/detail",
    response_model=MindmapNodeDetailOut,
)
async def get_mindmap_node_detail(
    notebook_id: str,
    node_id: str,
    request: Request,
) -> MindmapNodeDetailOut:
    user = await get_current_user(request)
    notebook, _, node, fingerprint = await resolve_mindmap_node_context(
        notebook_id, node_id, user
    )
    detail_filter = {
        "owner_id": user["_id"],
        "notebook_id": notebook["_id"],
        "node_id": node_id,
        "sources_fingerprint": fingerprint,
    }
    cached_detail = await db.mindmap_node_details.find_one(detail_filter)
    if cached_detail:
        return MindmapNodeDetailOut(
            node_id=node_id, explanation=coerce_text(cached_detail.get("explanation"))
        )

    explanation = await generate_node_detail(
        notebook["title"],
        coerce_text(node.get("title")),
        notebook["_id"],
        user,
    )
    now = datetime.now(timezone.utc)
    await db.mindmap_node_details.update_one(
        detail_filter,
        {
            "$set": {
                "owner_id": user["_id"],
                "notebook_id": notebook["_id"],
                "node_id": node_id,
                "sources_fingerprint": fingerprint,
                "explanation": explanation,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return MindmapNodeDetailOut(node_id=node_id, explanation=explanation)
