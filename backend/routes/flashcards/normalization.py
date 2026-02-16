from ...schemas.flashcards import FlashcardSourceRef
from ...schemas.rag import RagSource
from .constants import (
    CARD_COUNT_VALUES,
    DIFFICULTY_GUIDANCE,
    DIFFICULTY_LABELS,
    MAX_CONTEXT_CHARS,
    MAX_DEFINITION_CHARS,
    MAX_TERM_CHARS,
    MAX_TOPIC_PROMPT_CHARS,
    MIN_DEFINITION_CHARS,
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


def normalize_definition(value: object | None, term: str) -> str:
    definition = " ".join(coerce_text(value).split()).strip()
    if not definition:
        definition = f"Definicion basica de {term.lower()}."
    if len(definition) < MIN_DEFINITION_CHARS:
        definition = (
            f"{definition} Este concepto es importante para comprender el tema."
        )
    return definition[:MAX_DEFINITION_CHARS]


def normalize_cards(
    payload: dict, target_count: int, fallback_topic: str
) -> list[dict]:
    raw_cards = payload.get("cards") if isinstance(payload, dict) else None
    cards_data = raw_cards if isinstance(raw_cards, list) else []
    normalized_cards: list[dict] = []
    seen_terms: set[str] = set()

    for raw_card in cards_data:
        if len(normalized_cards) >= target_count:
            break
        if not isinstance(raw_card, dict):
            continue
        term = normalize_term(raw_card.get("term"), len(normalized_cards) + 1)
        term_key = term.casefold()
        if term_key in seen_terms:
            continue
        seen_terms.add(term_key)
        normalized_cards.append(
            {
                "id": f"card-{len(normalized_cards) + 1}",
                "term": term,
                "definition": normalize_definition(raw_card.get("definition"), term),
            }
        )

    topic_base = normalize_topic_prompt(fallback_topic) or "este tema"
    while len(normalized_cards) < target_count:
        card_number = len(normalized_cards) + 1
        term = f"Concepto {card_number}"
        term_key = term.casefold()
        if term_key in seen_terms:
            continue
        seen_terms.add(term_key)
        normalized_cards.append(
            {
                "id": f"card-{card_number}",
                "term": term,
                "definition": (
                    f"Definicion clave de {term.lower()} relacionada con {topic_base}."
                )[:MAX_DEFINITION_CHARS],
            }
        )

    return normalized_cards[:target_count]


def source_to_ref(source: RagSource) -> FlashcardSourceRef:
    return FlashcardSourceRef(
        document_id=source.document_id,
        chunk_id=source.chunk_id,
        score=source.score,
        file_name=source.file_name,
        page=source.page,
    )
