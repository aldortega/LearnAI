from __future__ import annotations

from pydantic import BaseModel

from .constants import (
    DETAIL_MAX_CHARS,
    FALLBACK_SECONDARY_TITLES,
    FALLBACK_TERTIARY_TITLES,
    SECONDARY_NODE_COUNT,
    TERTIARY_NODE_COUNT_PER_SECONDARY,
)


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


def _append_unique_title(
    titles: list[str],
    seen: set[str],
    value: object,
    max_count: int,
) -> None:
    if len(titles) >= max_count:
        return
    title = normalize_title(value, "")
    if not title:
        return
    key = title.casefold()
    if key in seen:
        return
    seen.add(key)
    titles.append(title[:80])


def _extract_title_pairs(payload: dict) -> list[tuple[str, str]]:
    raw_pairs = payload.get("pairs")
    if not isinstance(raw_pairs, list):
        return []

    pairs: list[tuple[str, str]] = []
    for pair in raw_pairs[:40]:
        if not isinstance(pair, dict):
            continue
        secondary_title = normalize_title(pair.get("secondary_title"), "")
        tertiary_title = normalize_title(pair.get("tertiary_title"), "")
        if not secondary_title or not tertiary_title:
            continue
        pairs.append((secondary_title[:80], tertiary_title[:80]))
    return pairs


def _build_secondary_titles(pairs: list[tuple[str, str]]) -> list[str]:
    titles: list[str] = []
    seen: set[str] = set()

    for secondary_title, _ in pairs:
        _append_unique_title(titles, seen, secondary_title, SECONDARY_NODE_COUNT)
        if len(titles) >= SECONDARY_NODE_COUNT:
            break

    for fallback in FALLBACK_SECONDARY_TITLES:
        _append_unique_title(titles, seen, fallback, SECONDARY_NODE_COUNT)
        if len(titles) >= SECONDARY_NODE_COUNT:
            break

    while len(titles) < SECONDARY_NODE_COUNT:
        _append_unique_title(
            titles,
            seen,
            f"Tema {len(titles) + 1}",
            SECONDARY_NODE_COUNT,
        )
    return titles


def _build_tertiary_titles(
    secondary_title: str,
    pairs: list[tuple[str, str]],
) -> list[str]:
    titles: list[str] = []
    seen: set[str] = set()
    secondary_key = secondary_title.casefold()

    for raw_secondary_title, tertiary_title in pairs:
        if raw_secondary_title.casefold() != secondary_key:
            continue
        _append_unique_title(
            titles,
            seen,
            tertiary_title,
            TERTIARY_NODE_COUNT_PER_SECONDARY,
        )
        if len(titles) >= TERTIARY_NODE_COUNT_PER_SECONDARY:
            return titles

    for _, tertiary_title in pairs:
        _append_unique_title(
            titles,
            seen,
            tertiary_title,
            TERTIARY_NODE_COUNT_PER_SECONDARY,
        )
        if len(titles) >= TERTIARY_NODE_COUNT_PER_SECONDARY:
            return titles

    for fallback in FALLBACK_TERTIARY_TITLES:
        _append_unique_title(
            titles,
            seen,
            fallback,
            TERTIARY_NODE_COUNT_PER_SECONDARY,
        )
        if len(titles) >= TERTIARY_NODE_COUNT_PER_SECONDARY:
            return titles

    while len(titles) < TERTIARY_NODE_COUNT_PER_SECONDARY:
        _append_unique_title(
            titles,
            seen,
            f"Subtema {len(titles) + 1}",
            TERTIARY_NODE_COUNT_PER_SECONDARY,
        )
    return titles


def normalize_tree_payload(payload: dict, notebook_title: str) -> dict:
    root_title = normalize_title(notebook_title, "Mapa mental")
    pairs = _extract_title_pairs(payload)
    secondary_titles = _build_secondary_titles(pairs)

    children: list[dict] = []
    for secondary_title in secondary_titles:
        tertiary_titles = _build_tertiary_titles(secondary_title, pairs)
        children.append(
            {
                "title": secondary_title,
                "children": [
                    {"title": tertiary_title, "children": []}
                    for tertiary_title in tertiary_titles
                ],
            }
        )

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
