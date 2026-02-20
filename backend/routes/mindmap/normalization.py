from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from .constants import (
    FALLBACK_CHILD_TITLES,
    TECHNICAL_MAX_CHILDREN_PER_NODE,
    TECHNICAL_MAX_DEPTH,
    TECHNICAL_MAX_NODES,
)


@dataclass
class TreeNormalizationState:
    total_nodes: int = 1
    discarded_empty: int = 0
    discarded_duplicate: int = 0
    discarded_limit: int = 0
    used_contextual_fallback: bool = False
    used_generic_fallback: bool = False


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


def strip_parent_prefix(parent_title: str, child_title: object | None) -> str:
    parent = normalize_title(parent_title, "")
    cleaned = normalize_title(child_title, "")
    if not cleaned:
        return ""

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
        rf"^{parent_pattern}\s*[:>\-|/\\]+\s*(.+)$",
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


def _clean_child_title(parent_title: str, child_title: str) -> str:
    title = strip_parent_prefix(parent_title, child_title)
    if not title:
        return ""
    return title[:80]


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
            state.discarded_limit += 1
            break
        if state.total_nodes >= TECHNICAL_MAX_NODES:
            state.discarded_limit += 1
            break
        if not isinstance(raw_child, dict):
            state.discarded_empty += 1
            continue

        raw_title = normalize_title(raw_child.get("title"), "")
        title = _clean_child_title(parent_title, raw_title)
        if not title:
            state.discarded_empty += 1
            continue
        if title.casefold() == parent_title.casefold():
            state.discarded_duplicate += 1
            continue

        title_key = title.casefold()
        if title_key in seen_titles:
            state.discarded_duplicate += 1
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


def _split_context_segments(raw_line: str) -> list[str]:
    cleaned = " ".join(coerce_text(raw_line).split()).strip()
    if not cleaned:
        return []
    return [
        " ".join(segment.split()).strip()
        for segment in re.split(r"[.;\n]+", cleaned)
        if " ".join(segment.split()).strip()
    ]


def _normalize_context_candidate(candidate: str, root_title: str) -> str:
    cleaned = normalize_title(candidate, "")
    cleaned = re.sub(r"^[\-\*\d\)\(]+\s*", "", cleaned).strip()
    if not cleaned:
        return ""
    if ":" in cleaned:
        right = cleaned.split(":", 1)[1].strip()
        if right:
            cleaned = right
    cleaned = strip_parent_prefix(root_title, cleaned)
    cleaned = normalize_title(cleaned, "")
    if not cleaned:
        return ""
    if cleaned.casefold() == root_title.casefold():
        return ""
    if len(cleaned) < 3:
        return ""
    return cleaned[:80]


def _extract_contextual_title_candidates(
    context_lines: list[str],
    root_title: str,
) -> list[str]:
    seen: set[str] = set()
    candidates: list[str] = []

    for line in context_lines:
        for segment in _split_context_segments(line):
            normalized = _normalize_context_candidate(segment, root_title)
            if not normalized:
                continue
            key = normalized.casefold()
            if key in seen:
                continue
            seen.add(key)
            candidates.append(normalized)
            if len(candidates) >= TECHNICAL_MAX_CHILDREN_PER_NODE * 3:
                return candidates

    return candidates


def _build_contextual_fallback_children(
    root_title: str,
    context_lines: list[str],
    state: TreeNormalizationState,
) -> list[dict]:
    children: list[dict] = []
    seen_titles: set[str] = set()
    candidates = _extract_contextual_title_candidates(context_lines, root_title)

    for candidate in candidates:
        if len(children) >= TECHNICAL_MAX_CHILDREN_PER_NODE:
            break
        if state.total_nodes >= TECHNICAL_MAX_NODES:
            break
        key = candidate.casefold()
        if key in seen_titles:
            continue
        seen_titles.add(key)
        state.total_nodes += 1
        children.append({"title": candidate, "children": []})

    if children:
        state.used_contextual_fallback = True
    return children


def _build_fallback_children(
    root_title: str, state: TreeNormalizationState
) -> list[dict]:
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

    if children:
        state.used_generic_fallback = True
    return children


def _build_generation_meta(state: TreeNormalizationState) -> dict[str, Any]:
    return {
        "generated_nodes": state.total_nodes,
        "discarded_empty": state.discarded_empty,
        "discarded_duplicate": state.discarded_duplicate,
        "discarded_limit": state.discarded_limit,
        "used_contextual_fallback": state.used_contextual_fallback,
        "used_generic_fallback": state.used_generic_fallback,
    }


def normalize_tree_payload(
    payload: dict,
    notebook_title: str,
    context_lines: list[str] | None = None,
) -> tuple[dict, dict[str, Any]]:
    root_title = normalize_title(notebook_title, "Mapa mental")
    state = TreeNormalizationState(total_nodes=1)
    children = _normalize_children(payload.get("children"), root_title, 1, state)
    if not children:
        fallback_context_lines = context_lines if isinstance(context_lines, list) else []
        children = _build_contextual_fallback_children(
            root_title,
            fallback_context_lines,
            state,
        )
    if not children:
        children = _build_fallback_children(root_title, state)
    tree = {"title": root_title, "children": children}
    return tree, _build_generation_meta(state)


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

    return "\n\n".join(paragraphs[:2]).strip()
