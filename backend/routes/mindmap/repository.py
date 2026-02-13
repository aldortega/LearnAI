import hashlib
from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db import db
from ...schemas.mindmap import MindmapNodeOut, MindmapOut
from ..notebook_access import resolve_notebook_access
from .normalization import coerce_text, strip_parent_prefix


async def get_notebook_or_404(notebook_id: str, user: dict) -> dict:
    access = await resolve_notebook_access(notebook_id, user)
    return access.notebook


async def fetch_ready_documents(
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    db_client: AsyncIOMotorDatabase | None = None,
) -> list[dict]:
    db_ref = db if db_client is None else db_client
    cursor = db_ref.documents.find(
        {"notebook_id": notebook_object_id, "owner_id": owner_id, "status": "done"},
        {"_id": 1, "updated_at": 1},
    ).sort("_id", 1)
    return [document async for document in cursor]


def build_sources_fingerprint(title: str, documents: list[dict]) -> str:
    hasher = hashlib.sha256()
    hasher.update(title.strip().encode("utf-8"))
    for document in documents:
        hasher.update(str(document.get("_id", "")).encode("utf-8"))
        updated_at = document.get("updated_at")
        if isinstance(updated_at, datetime):
            hasher.update(updated_at.isoformat().encode("utf-8"))
        else:
            hasher.update(coerce_text(updated_at).encode("utf-8"))
    return hasher.hexdigest()


async def compute_sources_fingerprint(
    title: str,
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    db_client: AsyncIOMotorDatabase | None = None,
) -> tuple[str, int]:
    documents = await fetch_ready_documents(
        notebook_object_id,
        owner_id,
        db_client=db_client,
    )
    fingerprint = build_sources_fingerprint(title, documents)
    return fingerprint, len(documents)


def map_nodes_to_out(nodes_data: object) -> list[MindmapNodeOut]:
    if not isinstance(nodes_data, list):
        return []
    node_by_id: dict[str, dict] = {}
    for raw in nodes_data:
        if not isinstance(raw, dict):
            continue
        node_id = coerce_text(raw.get("id"))
        if not node_id:
            continue
        node_by_id[node_id] = raw

    sanitized_title_by_id: dict[str, str] = {}

    def resolve_sanitized_title(node_id: str, path: set[str] | None = None) -> str:
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
                parent_title = resolve_sanitized_title(parent_id, current_path)
                sanitized = strip_parent_prefix(parent_title, raw_title) or raw_title

            sanitized_title_by_id[node_id] = sanitized
            return sanitized
        finally:
            current_path.discard(node_id)

    nodes_out: list[MindmapNodeOut] = []
    for raw in nodes_data:
        if not isinstance(raw, dict):
            continue
        raw_id = coerce_text(raw.get("id"))
        if not raw_id:
            continue
        depth_raw = raw.get("depth")
        depth = int(depth_raw) if isinstance(depth_raw, int) else 0
        nodes_out.append(
            MindmapNodeOut(
                id=raw_id,
                title=resolve_sanitized_title(raw_id) or coerce_text(raw.get("title")),
                parent_id=coerce_text(raw.get("parent_id")) or None,
                depth=max(0, depth),
                has_children=bool(raw.get("has_children")),
            )
        )
    return nodes_out


def build_mindmap_out(
    notebook_id: str,
    has_ready_sources: bool,
    status_value: str,
    mindmap_doc: dict | None,
) -> MindmapOut:
    nodes_out = map_nodes_to_out(mindmap_doc.get("nodes") if mindmap_doc else [])
    generated_at = None
    root_node_id = None
    if mindmap_doc:
        generated_at = mindmap_doc.get("updated_at") or mindmap_doc.get("created_at")
        root_node_id = coerce_text(mindmap_doc.get("root_node_id")) or None
    status_normalized = (
        status_value if status_value in ("missing", "ready", "stale") else "missing"
    )
    return MindmapOut(
        notebook_id=notebook_id,
        has_ready_sources=has_ready_sources,
        status=status_normalized,
        generated_at=generated_at,
        root_node_id=root_node_id,
        nodes=nodes_out,
    )


async def resolve_mindmap_node_context(
    notebook_id: str,
    node_id: str,
    user: dict,
) -> tuple[dict, dict, dict, str]:
    notebook = await get_notebook_or_404(notebook_id, user)

    mindmap_doc = await db.mindmap_maps.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not mindmap_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mapa mental no encontrado",
        )

    fingerprint, _ = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], notebook["owner_id"]
    )
    if mindmap_doc.get("sources_fingerprint") != fingerprint:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El mapa mental esta desactualizado. Regeneralo para continuar.",
        )

    nodes = mindmap_doc.get("nodes", [])
    node = next(
        (
            item
            for item in nodes
            if isinstance(item, dict) and coerce_text(item.get("id")) == node_id
        ),
        None,
    )
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nodo no encontrado",
        )

    return notebook, mindmap_doc, node, fingerprint
