from ...schemas.audio import AudioSourceRef
from ...schemas.rag import RagSource
from .constants import MAX_CONTEXT_CHARS


def coerce_text(value: object | None) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def normalize_prompt(value: str) -> str:
    return " ".join(value.split()).strip()


def normalize_title(value: str) -> str:
    return " ".join(value.split()).strip()


def compact_context(context_lines: list[str], max_chars: int = MAX_CONTEXT_CHARS) -> str:
    context_text = "\n\n".join(context_lines).strip()
    if not context_text:
        return "(sin informacion relevante)"
    if len(context_text) <= max_chars:
        return context_text
    return context_text[:max_chars].rstrip() + "..."


def source_to_ref(source: RagSource) -> AudioSourceRef:
    return AudioSourceRef(
        document_id=source.document_id,
        chunk_id=source.chunk_id,
        score=source.score,
        file_name=source.file_name,
        page=source.page,
    )
