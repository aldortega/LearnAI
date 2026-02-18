from pydantic import BaseModel

from .constants import (
    DEFAULT_EXPANSION_KEY_POINTS,
    DEFAULT_EXPANSION_QUESTIONS,
    DEFAULT_TOPIC_KEY_POINTS,
    EXPANSION_MAX_KEY_POINTS,
    EXPANSION_MAX_QUESTIONS,
    EXPANSION_MIN_CONTENT_CHARS,
    EXPANSION_MIN_KEY_POINTS,
    EXPANSION_MIN_QUESTIONS,
    SUGGESTION_COUNT,
    TOPIC_COUNT,
    TOPIC_MAX_KEY_POINTS,
    TOPIC_MIN_KEY_POINTS,
)


def coerce_text(value: object | None) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def compact_context(context_lines: list[str], max_chars: int = 4000) -> str:
    context_text = "\n\n".join(context_lines).strip()
    if not context_text:
        return "(sin informacion relevante)"
    if len(context_text) <= max_chars:
        return context_text
    return context_text[:max_chars].rstrip() + "..."


def normalize_list(
    items: list[object],
    min_items: int,
    max_items: int,
    defaults: list[str],
) -> list[str]:
    if not isinstance(items, list):
        items = []
    normalized: list[str] = []
    for item in items:
        value = coerce_text(item).strip()
        if value:
            normalized.append(value)
    if len(normalized) < min_items:
        for fallback in defaults:
            if len(normalized) >= min_items:
                break
            normalized.append(fallback)
    return normalized[:max_items]


def normalize_topics(payload: dict, title: str) -> list[dict]:
    raw_topics = payload.get("topics") if isinstance(payload, dict) else None
    if not isinstance(raw_topics, list):
        raw_topics = []

    normalized: list[dict] = []
    for index, topic in enumerate(raw_topics[:TOPIC_COUNT], start=1):
        if not isinstance(topic, dict):
            continue
        topic_title = coerce_text(topic.get("title")).strip() or f"Tema {index}"
        summary = coerce_text(topic.get("summary")).strip()
        key_points = normalize_list(
            topic.get("key_points", []),
            TOPIC_MIN_KEY_POINTS,
            TOPIC_MAX_KEY_POINTS,
            DEFAULT_TOPIC_KEY_POINTS,
        )
        if not summary:
            summary = f"Aspectos clave de {topic_title}."
        normalized.append(
            {
                "id": f"t{index}",
                "title": topic_title,
                "summary": summary,
                "key_points": key_points,
            }
        )

    if len(normalized) < TOPIC_COUNT:
        for index in range(len(normalized) + 1, TOPIC_COUNT + 1):
            topic_title = f"Tema {index}"
            normalized.append(
                {
                    "id": f"t{index}",
                    "title": topic_title,
                    "summary": f"Conceptos generales sobre {title}.",
                    "key_points": normalize_list(
                        [],
                        TOPIC_MIN_KEY_POINTS,
                        TOPIC_MAX_KEY_POINTS,
                        DEFAULT_TOPIC_KEY_POINTS,
                    ),
                }
            )

    return normalized


def normalize_topic_title(title: str) -> str:
    return " ".join(title.split()).strip()


def normalize_item_text(item_text: str) -> str:
    return " ".join(item_text.split()).strip()


def normalize_item_cache_key(item_text: str) -> str:
    return normalize_item_text(item_text).lower()


def build_existing_topic_title_keys(topics: list[dict]) -> set[str]:
    title_keys: set[str] = set()
    for topic in topics:
        topic_title = normalize_topic_title(coerce_text(topic.get("title")))
        if topic_title:
            title_keys.add(topic_title.lower())
    return title_keys


def build_next_topic_id(topics: list[dict]) -> str:
    max_id = 0
    for topic in topics:
        raw_id = coerce_text(topic.get("id")).strip().lower()
        if raw_id.startswith("t"):
            maybe_number = raw_id[1:]
            if maybe_number.isdigit():
                max_id = max(max_id, int(maybe_number))
    return f"t{max_id + 1}"


def build_notebook_summary_fallback(title: str, topics: list[dict]) -> str:
    topic_titles = [
        coerce_text(topic.get("title")).strip()
        for topic in topics
        if coerce_text(topic.get("title")).strip()
    ][:3]
    if topic_titles:
        joined_titles = ", ".join(topic_titles)
        return (
            f"Esta notebook trata sobre {title} y presenta una vista general para "
            "empezar con rapidez.\n\n"
            f"Se enfoca en {joined_titles}, con conceptos y puntos clave para "
            "ordenar tu estudio."
        )
    return (
        f"Esta notebook trata sobre {title} y ofrece una introduccion practica "
        "para comenzar.\n\n"
        "Incluye conceptos centrales y temas clave para construir una base solida."
    )


def normalize_notebook_summary(raw_summary: object, title: str, topics: list[dict]) -> str:
    summary = coerce_text(raw_summary).strip()
    if summary:
        return summary
    return build_notebook_summary_fallback(title, topics)


def normalize_quickstart_payload(payload: dict, title: str) -> dict:
    topics = normalize_topics(payload, title)
    notebook_summary = normalize_notebook_summary(
        payload.get("notebook_summary"),
        title,
        topics,
    )
    return {"notebook_summary": notebook_summary, "topics": topics}


def build_expansion_content_fallback(topic_title: str, summary: str) -> str:
    normalized_summary = normalize_item_text(summary)
    base_summary = (
        normalized_summary
        if normalized_summary
        else f"{topic_title} es un tema central para avanzar con esta notebook."
    )
    return (
        f"{base_summary}\n\n"
        f"Para profundizar en {topic_title}, conviene relacionar sus conceptos "
        "fundamentales, entender como se conectan entre si y revisar ejemplos de "
        "aplicacion practica para consolidar el aprendizaje."
    )


def normalize_expansion_content(
    raw_content: object, topic_title: str, summary: str
) -> str:
    content = coerce_text(raw_content).strip()
    if not content:
        return build_expansion_content_fallback(topic_title, summary)

    paragraphs = [
        normalize_item_text(paragraph)
        for paragraph in content.split("\n\n")
        if normalize_item_text(paragraph)
    ]
    if not paragraphs:
        return build_expansion_content_fallback(topic_title, summary)

    normalized_content = "\n\n".join(paragraphs)
    summary_key = normalize_item_cache_key(summary)
    content_key = normalize_item_cache_key(normalized_content)
    content_is_summary = summary_key and summary_key == content_key
    content_is_short = len(normalized_content) < EXPANSION_MIN_CONTENT_CHARS

    if content_is_summary or content_is_short:
        return build_expansion_content_fallback(topic_title, summary)

    return "\n\n".join(paragraphs)


def normalize_expansion(payload: dict, topic_title: str, summary: str) -> dict:
    content = normalize_expansion_content(payload.get("content"), topic_title, summary)
    key_points = normalize_list(
        payload.get("key_points", []),
        EXPANSION_MIN_KEY_POINTS,
        EXPANSION_MAX_KEY_POINTS,
        DEFAULT_EXPANSION_KEY_POINTS,
    )
    example_questions = normalize_list(
        payload.get("example_questions", []),
        EXPANSION_MIN_QUESTIONS,
        EXPANSION_MAX_QUESTIONS,
        DEFAULT_EXPANSION_QUESTIONS,
    )
    return {
        "content": content,
        "key_points": key_points,
        "example_questions": example_questions,
    }


def normalize_suggestions(payload: dict, existing_title_keys: set[str]) -> list[str]:
    raw_suggestions = payload.get("suggestions") if isinstance(payload, dict) else None
    if not isinstance(raw_suggestions, list):
        return []

    normalized: list[str] = []
    seen_lower: set[str] = set()
    for suggestion in raw_suggestions:
        value = normalize_topic_title(coerce_text(suggestion))
        value_key = value.lower()
        if not value or value_key in seen_lower or value_key in existing_title_keys:
            continue
        seen_lower.add(value_key)
        normalized.append(value)
        if len(normalized) >= SUGGESTION_COUNT:
            break
    return normalized


def normalize_single_topic(payload: dict, requested_title: str) -> dict:
    title = normalize_topic_title(coerce_text(payload.get("title")) or requested_title)
    if not title:
        title = requested_title
    summary = coerce_text(payload.get("summary")).strip()
    if not summary:
        summary = f"Aspectos clave de {title}."
    key_points = normalize_list(
        payload.get("key_points", []),
        TOPIC_MIN_KEY_POINTS,
        TOPIC_MAX_KEY_POINTS,
        DEFAULT_TOPIC_KEY_POINTS,
    )
    return {"title": title, "summary": summary, "key_points": key_points}


def coerce_payload(payload: object, model: type[BaseModel]) -> dict:
    if isinstance(payload, BaseModel):
        return payload.model_dump()
    if isinstance(payload, dict):
        return payload
    return model.model_validate(payload).model_dump()
