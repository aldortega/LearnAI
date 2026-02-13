from __future__ import annotations

import re
from dataclasses import dataclass

from pydantic import BaseModel

from .constants import (
    DETAIL_MAX_CHARS,
    FALLBACK_CHILD_TITLES,
    TECHNICAL_MAX_CHILDREN_PER_NODE,
    TECHNICAL_MAX_DEPTH,
    TECHNICAL_MAX_NODES,
)

SPANISH_STOPWORDS = {
    "ante",
    "bajo",
    "cada",
    "como",
    "con",
    "contra",
    "desde",
    "donde",
    "entre",
    "esta",
    "este",
    "hacia",
    "hasta",
    "para",
    "pero",
    "por",
    "que",
    "sin",
    "sobre",
    "tema",
    "una",
    "uno",
}


@dataclass
class TreeNormalizationState:
    total_nodes: int = 1


def coerce_text(value: object | None) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def coerce_payload(payload: object, model: type[BaseModel]) -> dict:
    if isinstance(payload, BaseModel):
        return payload.model_dump()
    if isinstance(payload, dict):
        return payload
    return model.model_validate(payload).model_dump()


def normalize_title(value: object | None, fallback: str) -> str:
    title = " ".join(coerce_text(value).split()).strip()
    return title or fallback


def compact_context(context_lines: list[str], max_chars: int = 5000) -> str:
    context_text = "\n\n".join(context_lines).strip()
    if not context_text:
        return "(sin informacion relevante)"
    if len(context_text) <= max_chars:
        return context_text
    return context_text[:max_chars].rstrip() + "..."


def _tokenize_title(value: str) -> set[str]:
    tokens = re.findall(r"[0-9a-zA-Z]+", value.casefold())
    return {
        token
        for token in tokens
        if len(token) >= 3 and token not in SPANISH_STOPWORDS
    }


def strip_parent_prefix(parent_title: str, child_title: object | None) -> str:
    parent = normalize_title(parent_title, "")
    cleaned = normalize_title(child_title, "")
    if not cleaned:
        return ""

    # Sanitizacion directa solicitada: conservar texto despues de ":".
    for _ in range(3):
        if ":" not in cleaned:
            break
        right_side = cleaned.split(":", 1)[1].strip()
        if not right_side:
            break
        cleaned = right_side

    if not parent:
        return cleaned[:80]

    parent_pattern = re.escape(parent)
    prefix_pattern = re.compile(
        rf"^{parent_pattern}\s*[:>\-–|/\\]+\s*(.+)$",
        flags=re.IGNORECASE,
    )
    for _ in range(3):
        match = prefix_pattern.match(cleaned)
        if not match:
            break
        next_title = normalize_title(match.group(1), "")
        if not next_title:
            break
        cleaned = next_title
    return cleaned[:80]


def _is_related_title(parent_title: str, child_title: str) -> bool:
    parent_key = normalize_title(parent_title, "").casefold()
    child_key = strip_parent_prefix(parent_title, child_title).casefold()
    if not parent_key or not child_key:
        return False
    if parent_key == child_key:
        return False
    if child_key.startswith(parent_key) or parent_key in child_key:
        return True

    parent_tokens = _tokenize_title(parent_key)
    child_tokens = _tokenize_title(child_key)
    if not parent_tokens or not child_tokens:
        return False
    return len(parent_tokens.intersection(child_tokens)) > 0


def _clean_related_title(parent_title: str, child_title: str) -> str:
    title = strip_parent_prefix(parent_title, child_title)
    if not title:
        return ""
    if not parent_title or _is_related_title(parent_title, title):
        return title[:80]
    return ""


def _normalize_children(
    raw_children: object,
    parent_title: str,
    depth: int,
    state: TreeNormalizationState,
) -> list[dict]:
    if depth > TECHNICAL_MAX_DEPTH:
        return []
    if not isinstance(raw_children, list):
        return []

    children: list[dict] = []
    seen_titles: set[str] = set()
    for raw_child in raw_children:
        if len(children) >= TECHNICAL_MAX_CHILDREN_PER_NODE:
            break
        if state.total_nodes >= TECHNICAL_MAX_NODES:
            break
        if not isinstance(raw_child, dict):
            continue

        raw_title = normalize_title(raw_child.get("title"), "")
        title = _clean_related_title(parent_title, raw_title)
        if not title:
            continue
        if title.casefold() == parent_title.casefold():
            continue

        title_key = title.casefold()
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)

        state.total_nodes += 1
        children.append(
            {
                "title": title,
                "children": _normalize_children(
                    raw_child.get("children"),
                    title,
                    depth + 1,
                    state,
                ),
            }
        )
    return children


def _build_fallback_children(root_title: str, state: TreeNormalizationState) -> list[dict]:
    children: list[dict] = []
    seen_titles: set[str] = set()

    for fallback_title in FALLBACK_CHILD_TITLES:
        if state.total_nodes >= TECHNICAL_MAX_NODES:
            break
        title = normalize_title(f"{fallback_title} de {root_title}", "")[:80]
        if not title:
            continue
        key = title.casefold()
        if key in seen_titles:
            continue
        seen_titles.add(key)
        state.total_nodes += 1
        children.append({"title": title, "children": []})

    return children


def normalize_tree_payload(payload: dict, notebook_title: str) -> dict:
    root_title = normalize_title(notebook_title, "Mapa mental")
    state = TreeNormalizationState(total_nodes=1)
    children = _normalize_children(payload.get("children"), root_title, 1, state)
    if not children:
        children = _build_fallback_children(root_title, state)
    return {"title": root_title, "children": children}


def flatten_tree_to_nodes(tree: dict) -> tuple[str, list[dict]]:
    counter = 0
    nodes: list[dict] = []

    def visit(node: dict, parent_id: str | None, depth: int) -> str:
        nonlocal counter
        counter += 1
        node_id = f"n{counter}"
        child_ids = [
            visit(child, node_id, depth + 1)
            for child in node.get("children", [])
            if isinstance(child, dict)
        ]
        nodes.append(
            {
                "id": node_id,
                "title": normalize_title(node.get("title"), "Tema"),
                "parent_id": parent_id,
                "depth": depth,
                "children_ids": child_ids,
                "has_children": len(child_ids) > 0,
            }
        )
        return node_id

    root_node_id = visit(tree, None, 0)
    return root_node_id, nodes


def normalize_detail_explanation(raw_explanation: object, node_title: str) -> str:
    text = coerce_text(raw_explanation).strip()
    if not text:
        return f"{node_title} es un concepto importante dentro de esta notebook."

    paragraphs = [
        " ".join(paragraph.split()).strip()
        for paragraph in text.split("\n\n")
        if " ".join(paragraph.split()).strip()
    ]
    if not paragraphs:
        return f"{node_title} es un concepto importante dentro de esta notebook."

    normalized = "\n\n".join(paragraphs[:2]).strip()
    if len(normalized) > DETAIL_MAX_CHARS:
        return normalized[:DETAIL_MAX_CHARS].rstrip() + "..."
    return normalized
