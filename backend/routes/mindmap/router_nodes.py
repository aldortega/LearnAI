from datetime import datetime, timezone

from fastapi import APIRouter, Request

from ...db import db
from ...schemas.mindmap import MindmapNodeDetailOut
from ..auth import get_current_user
from .generation_service import generate_node_detail
from .normalization import coerce_text, strip_parent_prefix
from .repository import resolve_mindmap_node_context

router = APIRouter(tags=["mindmap"])


def _build_sanitized_title_map(nodes: list[dict]) -> dict[str, str]:
    node_by_id: dict[str, dict] = {}
    for raw_node in nodes:
        if not isinstance(raw_node, dict):
            continue
        raw_id = coerce_text(raw_node.get("id"))
        if not raw_id:
            continue
        node_by_id[raw_id] = raw_node

    sanitized_title_by_id: dict[str, str] = {}

    def resolve_title(node_id: str, path: set[str] | None = None) -> str:
        if node_id in sanitized_title_by_id:
            return sanitized_title_by_id[node_id]

        current_path = set() if path is None else path
        if node_id in current_path:
            return ""
        current_path.add(node_id)
        try:
            raw_node = node_by_id.get(node_id)
            if not raw_node:
                return ""

            raw_title = coerce_text(raw_node.get("title"))
            parent_id = coerce_text(raw_node.get("parent_id")) or None
            if not parent_id:
                sanitized = raw_title
            else:
                parent_title = resolve_title(parent_id, current_path)
                sanitized = strip_parent_prefix(parent_title, raw_title) or raw_title

            sanitized_title_by_id[node_id] = sanitized
            return sanitized
        finally:
            current_path.discard(node_id)

    for node_id in node_by_id:
        resolve_title(node_id)

    return sanitized_title_by_id


def _build_lineage_titles(
    nodes: list[dict],
    node_id: str,
    sanitized_title_by_id: dict[str, str],
) -> list[str]:
    node_by_id: dict[str, dict] = {}
    for raw_node in nodes:
        if not isinstance(raw_node, dict):
            continue
        raw_id = coerce_text(raw_node.get("id"))
        if not raw_id:
            continue
        node_by_id[raw_id] = raw_node

    lineage_reversed: list[str] = []
    visited: set[str] = set()
    current_id = node_id
    while current_id and current_id not in visited:
        visited.add(current_id)
        current_node = node_by_id.get(current_id)
        if not current_node:
            break
        lineage_reversed.append(sanitized_title_by_id.get(current_id, ""))
        current_id = coerce_text(current_node.get("parent_id"))

    lineage = [title for title in reversed(lineage_reversed) if title]
    return lineage


def _build_direct_children_titles(
    nodes: list[dict],
    parent_node_id: str,
    sanitized_title_by_id: dict[str, str],
) -> list[str]:
    seen: set[str] = set()
    children_titles: list[str] = []
    for raw_node in nodes:
        if not isinstance(raw_node, dict):
            continue
        child_id = coerce_text(raw_node.get("id"))
        if not child_id:
            continue
        if coerce_text(raw_node.get("parent_id")) != parent_node_id:
            continue
        title = sanitized_title_by_id.get(child_id, "").strip()
        if not title:
            continue
        key = title.casefold()
        if key in seen:
            continue
        seen.add(key)
        children_titles.append(title)
    return children_titles


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
    notebook, mindmap_doc, node, fingerprint = await resolve_mindmap_node_context(
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

    nodes = mindmap_doc.get("nodes", []) if isinstance(mindmap_doc, dict) else []
    nodes_list = nodes if isinstance(nodes, list) else []
    sanitized_title_by_id = _build_sanitized_title_map(nodes_list)
    selected_node_title = sanitized_title_by_id.get(node_id, coerce_text(node.get("title")))
    lineage_titles = _build_lineage_titles(nodes_list, node_id, sanitized_title_by_id)
    children_titles = _build_direct_children_titles(
        nodes_list,
        node_id,
        sanitized_title_by_id,
    )

    explanation = await generate_node_detail(
        notebook["title"],
        selected_node_title,
        notebook["_id"],
        user,
        lineage_titles=lineage_titles,
        children_titles=children_titles,
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
