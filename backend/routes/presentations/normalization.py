from ...schemas.presentations import PresentationSourceRef
from ...schemas.rag import RagSource
from .constants import (
    MAX_CONTEXT_CHARS,
    MAX_SLIDE_CONTENT_MARKDOWN_CHARS,
    MAX_SLIDE_SUBTITLE_CHARS,
    MAX_SLIDE_TITLE_CHARS,
)


def coerce_text(value: object | None) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def normalize_text(value: str) -> str:
    return " ".join(value.split()).strip()


def compact_context(context_lines: list[str], max_chars: int = MAX_CONTEXT_CHARS) -> str:
    context_text = "\n\n".join(context_lines).strip()
    if not context_text:
        return "(sin informacion relevante)"
    if len(context_text) <= max_chars:
        return context_text
    return context_text[:max_chars].rstrip() + "..."


def normalize_slide_title(value: str) -> str:
    return normalize_text(value)[:MAX_SLIDE_TITLE_CHARS]


def normalize_slide_subtitle(value: str) -> str:
    return normalize_text(value)[:MAX_SLIDE_SUBTITLE_CHARS]


def normalize_markdown_content(value: str) -> str:
    normalized_lines = [line.rstrip() for line in coerce_text(value).splitlines()]
    return "\n".join(normalized_lines).strip()[:MAX_SLIDE_CONTENT_MARKDOWN_CHARS]


def bullets_to_markdown(values: list[object]) -> str:
    lines: list[str] = []
    for value in values:
        normalized = normalize_text(coerce_text(value))
        if not normalized:
            continue
        lines.append(f"- {normalized}")
    return normalize_markdown_content("\n".join(lines))


def source_to_ref(source: RagSource) -> PresentationSourceRef:
    return PresentationSourceRef(
        document_id=source.document_id,
        chunk_id=source.chunk_id,
        score=source.score,
        file_name=source.file_name,
        page=source.page,
    )
