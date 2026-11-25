import re

from ...schemas.flashcards import FlashcardSourceRef, FlashcardType
from ...schemas.rag import RagSource
from .constants import (
    CARD_COUNT_VALUES,
    DIFFICULTY_GUIDANCE,
    DIFFICULTY_LABELS,
    MAX_EXPLANATION_MARKDOWN_CHARS,
    MAX_SET_TITLE_CHARS,
    MAX_CONTEXT_CHARS,
    MAX_DEFINITION_CHARS,
    MAX_TERM_CHARS,
    MAX_TOPIC_PROMPT_CHARS,
)


def coerce_text(value: object | None) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def compact_context(
    context_lines: list[str], max_chars: int = MAX_CONTEXT_CHARS
) -> str:
    context_text = "\n\n".join(context_lines).strip()
    if not context_text:
        return "(sin informacion relevante)"
    if len(context_text) <= max_chars:
        return context_text
    return context_text[:max_chars].rstrip() + "..."


def normalize_topic_prompt(value: object | None) -> str:
    topic = " ".join(coerce_text(value).split()).strip()
    return topic[:MAX_TOPIC_PROMPT_CHARS]


def normalize_set_title(
    value: object | None,
    *,
    topic_prompt: str,
    notebook_title: str,
) -> str:
    title = " ".join(coerce_text(value).split()).strip()
    if title:
        return title[:MAX_SET_TITLE_CHARS]

    topic_base = normalize_topic_prompt(topic_prompt)
    if topic_base:
        return topic_base[:MAX_SET_TITLE_CHARS]

    notebook_base = " ".join(coerce_text(notebook_title).split()).strip()
    if notebook_base:
        return f"Set de {notebook_base}"[:MAX_SET_TITLE_CHARS]

    return "Set de estudio"


def resolve_target_cards(card_count: str) -> int:
    target = CARD_COUNT_VALUES.get(card_count)
    if not target:
        raise ValueError("Cantidad de flashcards invalida")
    return target


def resolve_difficulty_config(difficulty: str) -> tuple[str, str]:
    difficulty_label = DIFFICULTY_LABELS.get(difficulty)
    guidance = DIFFICULTY_GUIDANCE.get(difficulty)
    if not difficulty_label or not guidance:
        raise ValueError("Dificultad invalida")
    return difficulty_label, guidance


def normalize_term(value: object | None, fallback_index: int) -> str:
    term = " ".join(coerce_text(value).split()).strip()
    if not term:
        term = f"Concepto {fallback_index}"
    return term[:MAX_TERM_CHARS]


def normalize_card_type(value: object | None) -> FlashcardType | None:
    card_type = coerce_text(value).strip().lower()
    if card_type == "definition" or card_type == "question" or card_type == "cloze":
        return card_type
    return None


def is_cloze_front(term: str) -> bool:
    return "___" in term


def ensure_cloze_blank(term: str, answer: str) -> str:
    if is_cloze_front(term) or not answer:
        return term

    with_boundaries = rf"\b{re.escape(answer)}\b"
    if re.search(with_boundaries, term, flags=re.IGNORECASE):
        return re.sub(with_boundaries, "___", term, count=1, flags=re.IGNORECASE)

    return term


def normalize_definition(value: object | None) -> str:
    definition = " ".join(coerce_text(value).split()).strip()
    return definition[:MAX_DEFINITION_CHARS]


def normalize_cards(payload: dict, target_count: int) -> list[dict]:
    raw_cards = payload.get("cards") if isinstance(payload, dict) else None
    cards_data = raw_cards if isinstance(raw_cards, list) else []
    normalized_cards: list[dict] = []
    seen_terms: set[str] = set()

    for raw_card in cards_data:
        if len(normalized_cards) >= target_count:
            break
        if not isinstance(raw_card, dict):
            continue
        card_type = normalize_card_type(raw_card.get("type"))
        term = " ".join(coerce_text(raw_card.get("term")).split()).strip()
        definition = normalize_definition(raw_card.get("definition"))
        if card_type is None or not term or not definition:
            continue
        if card_type == "cloze":
            term = ensure_cloze_blank(term, definition)
            if not is_cloze_front(term):
                continue
        term = term[:MAX_TERM_CHARS]
        term_key = term.casefold()
        if term_key in seen_terms:
            continue
        seen_terms.add(term_key)
        normalized_cards.append(
            {
                "id": f"card-{len(normalized_cards) + 1}",
                "type": card_type,
                "term": term,
                "definition": definition,
            }
        )

    return normalized_cards


def source_to_ref(source: RagSource) -> FlashcardSourceRef:
    return FlashcardSourceRef(
        document_id=source.document_id,
        chunk_id=source.chunk_id,
        score=source.score,
        file_name=source.file_name,
        page=source.page,
    )


def normalize_explanation_markdown(value: object | None) -> str:
    markdown = coerce_text(value).replace("\r\n", "\n").replace("\r", "\n").strip()
    if not markdown:
        return "No se pudo generar una explicacion para esta flashcard."

    cleaned_lines: list[str] = []
    for line in markdown.split("\n"):
        stripped = line.strip()
        if stripped.lower().startswith("<") and stripped.lower().endswith(">"):
            continue
        cleaned_lines.append(line.rstrip())

    cleaned = "\n".join(cleaned_lines).strip()
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    if not cleaned:
        return "No se pudo generar una explicacion para esta flashcard."
    if len(cleaned) > MAX_EXPLANATION_MARKDOWN_CHARS:
        cleaned = cleaned[:MAX_EXPLANATION_MARKDOWN_CHARS].rstrip() + "..."
    return cleaned
