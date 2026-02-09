import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Response, status
from langchain_core.messages import HumanMessage, SystemMessage
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from ..config import settings
from ..db import db
from ..rq_queue import quickstart_queue
from ..schemas import (
    QuickstartAddTopicRequest,
    QuickstartDetailItemType,
    QuickstartExpansionOut,
    QuickstartGenerationJobOut,
    QuickstartOut,
    QuickstartReorderTopicsRequest,
    QuickstartSourceRef,
    QuickstartSuggestionsOut,
    QuickstartTopicDetailOut,
    QuickstartTopicDetailRequest,
    QuickstartTopicOut,
    RagSource,
)
from .auth import get_current_user
from .rag import create_llm, retrieve_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notebooks", tags=["quickstart"])

TOPIC_COUNT = 6
TOPIC_LIMIT = 12
SUGGESTION_COUNT = 8
TOPIC_MIN_KEY_POINTS = 3
TOPIC_MAX_KEY_POINTS = 5
EXPANSION_MIN_KEY_POINTS = 3
EXPANSION_MAX_KEY_POINTS = 6
EXPANSION_MIN_QUESTIONS = 2
EXPANSION_MAX_QUESTIONS = 5
EXPANSION_MIN_CONTENT_CHARS = 80

DEFAULT_TOPIC_KEY_POINTS = [
    "Definiciones y conceptos centrales",
    "Ideas o procesos principales",
    "Aplicaciones y ejemplos habituales",
]
DEFAULT_EXPANSION_KEY_POINTS = [
    "Definiciones clave y contexto",
    "Procesos o componentes esenciales",
    "Aplicaciones practicas",
]
DEFAULT_EXPANSION_QUESTIONS = [
    "¿Como se aplica este tema en casos reales?",
    "¿Cuales son los errores mas comunes?",
]

QUICKSTART_SCHEMA = (
    "{\n"
    '  "notebook_summary": "string",\n'
    '  "topics": [\n'
    "    {\n"
    '      "title": "string",\n'
    '      "summary": "string",\n'
    '      "key_points": ["string"]\n'
    "    }\n"
    "  ]\n"
    "}\n"
)

EXPANSION_SCHEMA = (
    "{\n"
    '  "content": "string",\n'
    '  "key_points": ["string"],\n'
    '  "example_questions": ["string"]\n'
    "}\n"
)

SUGGESTIONS_SCHEMA = (
    "{\n"
    '  "suggestions": ["string"]\n'
    "}\n"
)

SINGLE_TOPIC_SCHEMA = (
    "{\n"
    '  "title": "string",\n'
    '  "summary": "string",\n'
    '  "key_points": ["string"]\n'
    "}\n"
)

DETAIL_SCHEMA = (
    "{\n"
    '  "content": "string"\n'
    "}\n"
)


class QuickstartTopicLLM(BaseModel):
    title: str
    summary: str
    key_points: list[str] = Field(min_length=1, max_length=8)


class QuickstartPayloadLLM(BaseModel):
    notebook_summary: str
    topics: list[QuickstartTopicLLM] = Field(min_length=1, max_length=12)


class QuickstartExpansionLLM(BaseModel):
    content: str
    key_points: list[str] = Field(min_length=1, max_length=10)
    example_questions: list[str] = Field(min_length=1, max_length=8)


class QuickstartSuggestionsLLM(BaseModel):
    suggestions: list[str] = Field(min_length=1, max_length=20)


class QuickstartSingleTopicLLM(BaseModel):
    title: str
    summary: str
    key_points: list[str] = Field(min_length=1, max_length=8)


class QuickstartTopicDetailLLM(BaseModel):
    content: str


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


def build_expansion_additional_paragraph(topic_title: str) -> str:
    return (
        f"Tambien es util analizar {topic_title} en casos reales, identificar "
        "errores frecuentes y definir criterios simples para evaluar si se esta "
        "aplicando correctamente."
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

    if len(paragraphs) == 1:
        paragraphs.append(build_expansion_additional_paragraph(topic_title))

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


def build_quickstart_prompt(
    title: str, context_text: str
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{QUICKSTART_SCHEMA}"
    )
    user_prompt = (
        f"Tema general (usa exactamente este tema): {title}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Genera un notebook_summary general de 2 parrafos breves. "
        f"Genera un inicio rapido con exactamente {TOPIC_COUNT} temas. "
        "Cada tema debe tener un resumen breve y una lista de 3 a 5 puntos clave."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_expansion_prompt(
    notebook_title: str,
    topic_title: str,
    summary: str,
    key_points: list[str],
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{EXPANSION_SCHEMA}"
    )
    key_points_text = "\n".join(f"- {point}" for point in key_points)
    user_prompt = (
        f"Tema general (usa exactamente este tema): {notebook_title}\n"
        f"Tema a expandir: {topic_title}\n"
        f"Resumen actual: {summary}\n"
        f"Puntos clave:\n{key_points_text}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Expande el tema en detalle. En content entrega informacion general "
        "adicional y util para estudio (no repitas literal el resumen actual), "
        "en 1 a 3 parrafos claros. Incluye tambien puntos clave adicionales y "
        "preguntas sugeridas."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_topic_detail_prompt(
    notebook_title: str,
    topic_title: str,
    item_type: QuickstartDetailItemType,
    item_text: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{DETAIL_SCHEMA}"
    )
    item_label = (
        "pregunta sugerida"
        if item_type == "question"
        else "punto clave adicional"
    )
    user_prompt = (
        f"Tema general (usa exactamente este tema): {notebook_title}\n"
        f"Tema principal: {topic_title}\n"
        f"Tipo de item seleccionado: {item_label}\n"
        f"Texto del item: {item_text}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Explica el item de forma clara y concreta para estudio autonomo. "
        "Entrega 1 a 3 parrafos, con ejemplos breves cuando aporten valor."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_suggestions_prompt(
    notebook_title: str,
    existing_titles: list[str],
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{SUGGESTIONS_SCHEMA}"
    )
    existing_titles_text = "\n".join(f"- {title}" for title in existing_titles)
    user_prompt = (
        f"Tema general (usa exactamente este tema): {notebook_title}\n\n"
        "Temas ya existentes:\n"
        f"{existing_titles_text or '- (sin temas)'}\n\n"
        f"Contexto:\n{context_text}\n\n"
        f"Sugiere exactamente {SUGGESTION_COUNT} temas complementarios para estudiar "
        "despues, sin repetir ni reformular los ya existentes. Entrega solo los titulos."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_single_topic_prompt(
    notebook_title: str,
    requested_title: str,
    existing_titles: list[str],
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{SINGLE_TOPIC_SCHEMA}"
    )
    existing_titles_text = "\n".join(f"- {title}" for title in existing_titles)
    user_prompt = (
        f"Tema general (usa exactamente este tema): {notebook_title}\n"
        f"Tema nuevo solicitado (usa exactamente este titulo): {requested_title}\n\n"
        "Temas ya existentes:\n"
        f"{existing_titles_text or '- (sin temas)'}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Genera un unico tema nuevo con ese titulo exacto, un resumen breve y 3 a 5 "
        "puntos clave concretos. No repitas temas existentes."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


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


def topic_to_out(topic: dict) -> QuickstartTopicOut:
    return QuickstartTopicOut(
        id=str(topic.get("id", "")),
        title=coerce_text(topic.get("title")),
        summary=coerce_text(topic.get("summary")),
        key_points=[coerce_text(point) for point in topic.get("key_points", [])],
    )


def source_to_ref(source: RagSource) -> QuickstartSourceRef:
    return QuickstartSourceRef(
        document_id=source.document_id,
        chunk_id=source.chunk_id,
        score=source.score,
        file_name=source.file_name,
        page=source.page,
    )


def expansion_to_out(topic_id: str, expansion_doc: dict) -> QuickstartExpansionOut:
    sources_out = [
        QuickstartSourceRef(**source)
        for source in expansion_doc.get("sources", [])
        if isinstance(source, dict)
    ]
    return QuickstartExpansionOut(
        topic_id=topic_id,
        content=coerce_text(expansion_doc.get("content")),
        key_points=[coerce_text(point) for point in expansion_doc.get("key_points", [])],
        example_questions=[
            coerce_text(question)
            for question in expansion_doc.get("example_questions", [])
        ],
        sources=sources_out,
    )


async def get_notebook_or_404(notebook_id: str, user: dict) -> dict:
    try:
        notebook_object_id = ObjectId(notebook_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Notebook invalido"
        ) from exc

    notebook = await db.notebooks.find_one(
        {"_id": notebook_object_id, "owner_id": user["_id"]}
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notebook no encontrado"
        )
    return notebook


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
        notebook_object_id, owner_id, db_client=db_client
    )
    fingerprint = build_sources_fingerprint(title, documents)
    return fingerprint, len(documents)


async def resolve_quickstart_topic_context(
    notebook_id: str,
    topic_id: str,
    user: dict,
) -> tuple[dict, dict, str]:
    notebook = await get_notebook_or_404(notebook_id, user)
    summary = await db.quickstart_summaries.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inicio rapido no encontrado",
        )

    fingerprint, _ = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], user["_id"]
    )
    if summary.get("sources_fingerprint") != fingerprint:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El inicio rapido esta desactualizado. Regeneralo para continuar.",
        )

    topics = summary.get("topics", [])
    topics_list = topics if isinstance(topics, list) else []
    topic = next(
        (
            item
            for item in topics_list
            if isinstance(item, dict) and coerce_text(item.get("id")) == topic_id
        ),
        None,
    )
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tema no encontrado"
        )

    return notebook, topic, fingerprint


async def get_or_create_topic_expansion(
    notebook: dict,
    user: dict,
    topic_id: str,
    topic: dict,
    fingerprint: str,
) -> QuickstartExpansionOut:
    expansion_filter = {
        "owner_id": user["_id"],
        "notebook_id": notebook["_id"],
        "topic_id": topic_id,
        "sources_fingerprint": fingerprint,
    }
    cached = await db.quickstart_expansions.find_one(expansion_filter)
    if cached:
        return expansion_to_out(topic_id, cached)

    expansion, sources = await generate_topic_expansion(
        notebook["title"], topic, notebook["_id"], user
    )
    sources_out = [source_to_ref(source) for source in sources]
    now = datetime.now(timezone.utc)
    await db.quickstart_expansions.update_one(
        expansion_filter,
        {
            "$set": {
                "owner_id": user["_id"],
                "notebook_id": notebook["_id"],
                "topic_id": topic_id,
                "sources_fingerprint": fingerprint,
                "content": expansion["content"],
                "key_points": expansion["key_points"],
                "example_questions": expansion["example_questions"],
                "sources": [source.model_dump() for source in sources_out],
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    return QuickstartExpansionOut(
        topic_id=topic_id,
        content=expansion["content"],
        key_points=expansion["key_points"],
        example_questions=expansion["example_questions"],
        sources=sources_out,
    )


async def generate_quickstart_topics(
    title: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> dict:
    context_lines, _, _, _ = await retrieve_context(
        f"Conceptos clave sobre {title}", notebook_object_id, user
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_quickstart_prompt(title, context_text)
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuickstartPayloadLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuickstartPayloadLLM)
        logger.info(
            "Quickstart estructurado:\n%s",
            json.dumps(payload_data, ensure_ascii=False),
        )
        return normalize_quickstart_payload(payload_data, title)
    except Exception as exc:
        logger.exception("Quickstart JSON invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar el inicio rapido",
        ) from exc


async def generate_topic_expansion(
    notebook_title: str,
    topic: dict,
    notebook_object_id: ObjectId,
    user: dict,
) -> tuple[dict, list[RagSource]]:
    question = f"Explica en profundidad el tema: {topic.get('title', '')}"
    context_lines, sources, _, _ = await retrieve_context(
        question, notebook_object_id, user
    )
    context_text = compact_context(context_lines, max_chars=4500)
    system_message, user_message = build_expansion_prompt(
        notebook_title,
        coerce_text(topic.get("title")),
        coerce_text(topic.get("summary")),
        [coerce_text(point) for point in topic.get("key_points", [])],
        context_text,
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuickstartExpansionLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuickstartExpansionLLM)
        logger.info(
            "Expansion quickstart:\n%s",
            json.dumps(payload_data, ensure_ascii=False),
        )
        expansion = normalize_expansion(
            payload_data,
            coerce_text(topic.get("title")),
            coerce_text(topic.get("summary")),
        )
        return expansion, sources
    except Exception as exc:
        logger.exception("Expansion JSON invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo expandir el tema",
        ) from exc


async def generate_topic_item_detail(
    notebook_title: str,
    topic_title: str,
    item_type: QuickstartDetailItemType,
    item_text: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> str:
    item_query = (
        f"Responde esta pregunta del tema {topic_title}: {item_text}"
        if item_type == "question"
        else f"Explica en detalle este punto del tema {topic_title}: {item_text}"
    )
    context_lines, _, _, _ = await retrieve_context(item_query, notebook_object_id, user)
    context_text = compact_context(context_lines, max_chars=4500)
    system_message, user_message = build_topic_detail_prompt(
        notebook_title, topic_title, item_type, item_text, context_text
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuickstartTopicDetailLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuickstartTopicDetailLLM)
        content = normalize_item_text(coerce_text(payload_data.get("content")))
        if content:
            return content
        return f"Detalle adicional sobre {item_text}."
    except Exception as exc:
        logger.exception("Detalle quickstart invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar el detalle del tema",
        ) from exc


async def generate_quickstart_suggestions(
    notebook_title: str,
    existing_titles: list[str],
    notebook_object_id: ObjectId,
    user: dict,
) -> list[str]:
    context_lines, _, _, _ = await retrieve_context(
        f"Temas complementarios sobre {notebook_title}", notebook_object_id, user
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_suggestions_prompt(
        notebook_title, existing_titles, context_text
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuickstartSuggestionsLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuickstartSuggestionsLLM)
        existing_title_keys = {title.lower() for title in existing_titles}
        return normalize_suggestions(payload_data, existing_title_keys)
    except Exception as exc:
        logger.exception("Quickstart sugerencias invalidas", extra={"error": str(exc)})
        return []


async def generate_single_quickstart_topic(
    notebook_title: str,
    requested_title: str,
    existing_titles: list[str],
    notebook_object_id: ObjectId,
    user: dict,
) -> dict:
    context_lines, _, _, _ = await retrieve_context(
        f"Conceptos clave y aplicaciones de {requested_title}", notebook_object_id, user
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_single_topic_prompt(
        notebook_title, requested_title, existing_titles, context_text
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=QuickstartSingleTopicLLM.model_json_schema(), method="json_schema"
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke, [system_message, user_message]
        )
        payload_data = coerce_payload(payload, QuickstartSingleTopicLLM)
        return normalize_single_topic(payload_data, requested_title)
    except Exception as exc:
        logger.exception("Quickstart tema unico invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar el tema",
        ) from exc


async def mark_quickstart_job_processing(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.quickstart_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "started_at": now, "error": None}},
    )


async def mark_quickstart_job_failed(
    job_id: str, error: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.quickstart_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "failed", "error": error, "finished_at": now}},
    )


async def mark_quickstart_job_done(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.quickstart_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "done", "finished_at": now}},
    )


def resolve_quickstart_error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException) and isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc, ValueError):
        return str(exc)
    return "No se pudo generar el inicio rapido"


def process_quickstart_generation(notebook_id: str, owner_id: str) -> None:
    asyncio.run(_process_quickstart_generation(notebook_id, owner_id))


async def _process_quickstart_generation(
    notebook_id: str,
    owner_id: str,
) -> None:
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else None
    if not job_id:
        logger.error("Job de quickstart sin id")
        return

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        await mark_quickstart_job_processing(job_id, db_client=worker_db)

        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            await mark_quickstart_job_failed(
                job_id, "Identificador invalido", db_client=worker_db
            )
            logger.exception(
                "Identificador invalido en quickstart", extra={"error": str(exc)}
            )
            return

        notebook = await worker_db.notebooks.find_one(
            {"_id": notebook_object_id, "owner_id": owner_object_id}
        )
        if not notebook:
            await mark_quickstart_job_failed(
                job_id, "Notebook no encontrado", db_client=worker_db
            )
            return

        fingerprint, ready_count = await compute_sources_fingerprint(
            notebook["title"], notebook_object_id, owner_object_id, db_client=worker_db
        )
        if ready_count == 0:
            await mark_quickstart_job_failed(
                job_id,
                "No hay fuentes listas para generar el inicio rapido",
                db_client=worker_db,
            )
            return

        try:
            quickstart_payload = await generate_quickstart_topics(
                notebook["title"],
                notebook_object_id,
                {"_id": owner_object_id},
            )
            now = datetime.now(timezone.utc)
            await worker_db.quickstart_summaries.update_one(
                {"owner_id": owner_object_id, "notebook_id": notebook_object_id},
                {
                    "$set": {
                        "owner_id": owner_object_id,
                        "notebook_id": notebook_object_id,
                        "sources_fingerprint": fingerprint,
                        "notebook_summary": quickstart_payload["notebook_summary"],
                        "topics": quickstart_payload["topics"],
                        "updated_at": now,
                    },
                    "$setOnInsert": {"created_at": now},
                },
                upsert=True,
            )
            await worker_db.quickstart_expansions.delete_many(
                {"owner_id": owner_object_id, "notebook_id": notebook_object_id}
            )
        except Exception as exc:
            error_message = resolve_quickstart_error_message(exc)
            await mark_quickstart_job_failed(job_id, error_message, db_client=worker_db)
            return

        await mark_quickstart_job_done(job_id, db_client=worker_db)
    finally:
        worker_client.close()


@router.get("/{notebook_id}/quickstart", response_model=QuickstartOut)
async def get_quickstart(notebook_id: str, request: Request) -> QuickstartOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    summary = await db.quickstart_summaries.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    fingerprint, ready_count = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], user["_id"]
    )
    has_ready_sources = ready_count > 0

    status_value: str = "missing"
    notebook_summary = ""
    topics_out: list[QuickstartTopicOut] = []
    generated_at: datetime | None = None

    if summary:
        raw_topics = summary.get("topics", [])
        topics_list = raw_topics if isinstance(raw_topics, list) else []
        status_value = (
            "ready"
            if summary.get("sources_fingerprint") == fingerprint
            else "stale"
        )
        topics_out = [topic_to_out(topic) for topic in topics_list]
        notebook_summary = normalize_notebook_summary(
            summary.get("notebook_summary"),
            notebook["title"],
            topics_list,
        )
        generated_at = summary.get("updated_at") or summary.get("created_at")

    return QuickstartOut(
        notebook_id=str(notebook["_id"]),
        has_ready_sources=has_ready_sources,
        status=(
            status_value
            if status_value in ("missing", "ready", "stale")
            else "missing"
        ),
        generated_at=generated_at,
        notebook_summary=notebook_summary,
        topics=topics_out,
    )


@router.get(
    "/{notebook_id}/quickstart/suggestions",
    response_model=QuickstartSuggestionsOut,
)
async def get_quickstart_suggestions(
    notebook_id: str, request: Request
) -> QuickstartSuggestionsOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    summary = await db.quickstart_summaries.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inicio rapido no encontrado",
        )

    topics = summary.get("topics", [])
    topics_list = topics if isinstance(topics, list) else []
    topic_count = len(topics_list)
    fingerprint, ready_count = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], user["_id"]
    )
    has_ready_sources = ready_count > 0
    is_stale = summary.get("sources_fingerprint") != fingerprint

    can_add_topics = has_ready_sources and not is_stale and topic_count < TOPIC_LIMIT
    if not can_add_topics:
        return QuickstartSuggestionsOut(
            suggestions=[],
            topic_count=topic_count,
            topic_limit=TOPIC_LIMIT,
            can_add_topics=False,
        )

    existing_titles = [
        normalize_topic_title(coerce_text(topic.get("title")))
        for topic in topics_list
        if normalize_topic_title(coerce_text(topic.get("title")))
    ]
    suggestions = await generate_quickstart_suggestions(
        notebook["title"], existing_titles, notebook["_id"], user
    )
    return QuickstartSuggestionsOut(
        suggestions=suggestions,
        topic_count=topic_count,
        topic_limit=TOPIC_LIMIT,
        can_add_topics=True,
    )


@router.post(
    "/{notebook_id}/quickstart/topics",
    response_model=QuickstartTopicOut,
)
async def add_quickstart_topic(
    notebook_id: str,
    payload: QuickstartAddTopicRequest,
    request: Request,
) -> QuickstartTopicOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    summary = await db.quickstart_summaries.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inicio rapido no encontrado",
        )

    fingerprint, ready_count = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], user["_id"]
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para agregar temas",
        )
    if summary.get("sources_fingerprint") != fingerprint:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El inicio rapido esta desactualizado. Regeneralo para continuar.",
        )

    topics = summary.get("topics", [])
    topics_list = topics if isinstance(topics, list) else []
    if len(topics_list) >= TOPIC_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Llegaste al limite de {TOPIC_LIMIT} temas",
        )

    requested_title = normalize_topic_title(payload.title)
    if not requested_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El tema es obligatorio",
        )

    existing_title_keys = build_existing_topic_title_keys(topics_list)
    if requested_title.lower() in existing_title_keys:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ese tema ya existe en tu inicio rapido",
        )

    existing_titles = [
        normalize_topic_title(coerce_text(topic.get("title")))
        for topic in topics_list
        if normalize_topic_title(coerce_text(topic.get("title")))
    ]
    generated_topic = await generate_single_quickstart_topic(
        notebook["title"], requested_title, existing_titles, notebook["_id"], user
    )
    final_title = normalize_topic_title(generated_topic["title"])
    if final_title.lower() in existing_title_keys:
        final_title = requested_title

    new_topic = {
        "id": build_next_topic_id(topics_list),
        "title": final_title,
        "summary": generated_topic["summary"],
        "key_points": generated_topic["key_points"],
    }

    now = datetime.now(timezone.utc)
    await db.quickstart_summaries.update_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        {
            "$push": {"topics": new_topic},
            "$set": {"updated_at": now},
        },
    )

    return topic_to_out(new_topic)


@router.delete(
    "/{notebook_id}/quickstart/topics/{topic_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_quickstart_topic(
    notebook_id: str,
    topic_id: str,
    request: Request,
) -> Response:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    summary = await db.quickstart_summaries.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inicio rapido no encontrado",
        )

    topics = summary.get("topics", [])
    topics_list = topics if isinstance(topics, list) else []
    topic_exists = any(
        isinstance(topic, dict) and coerce_text(topic.get("id")) == topic_id
        for topic in topics_list
    )
    if not topic_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tema no encontrado"
        )

    now = datetime.now(timezone.utc)
    await db.quickstart_summaries.update_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        {
            "$pull": {"topics": {"id": topic_id}},
            "$set": {"updated_at": now},
        },
    )
    await db.quickstart_expansions.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"], "topic_id": topic_id}
    )
    await db.quickstart_topic_details.delete_many(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"], "topic_id": topic_id}
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{notebook_id}/quickstart/topics/reorder",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def reorder_quickstart_topics(
    notebook_id: str,
    payload: QuickstartReorderTopicsRequest,
    request: Request,
) -> Response:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    summary = await db.quickstart_summaries.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inicio rapido no encontrado",
        )

    topics = summary.get("topics", [])
    topics_list = topics if isinstance(topics, list) else []
    if not topics_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay temas para reordenar",
        )

    requested_topic_ids = [
        coerce_text(topic_id).strip() for topic_id in payload.topic_ids
    ]
    if not all(requested_topic_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Todos los ids de temas son obligatorios",
        )

    if len(requested_topic_ids) != len(topics_list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes enviar todos los temas para reordenar",
        )

    if len(set(requested_topic_ids)) != len(requested_topic_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La lista de temas no puede tener ids repetidos",
        )

    existing_topic_ids = [
        coerce_text(topic.get("id")).strip()
        for topic in topics_list
        if isinstance(topic, dict) and coerce_text(topic.get("id")).strip()
    ]
    if len(existing_topic_ids) != len(topics_list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hay temas con ids invalidos en el inicio rapido",
        )

    if set(requested_topic_ids) != set(existing_topic_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La lista de temas no coincide con los temas actuales",
        )

    topic_by_id = {
        coerce_text(topic.get("id")).strip(): topic
        for topic in topics_list
        if isinstance(topic, dict)
    }
    reordered_topics = [topic_by_id[topic_id] for topic_id in requested_topic_ids]

    now = datetime.now(timezone.utc)
    await db.quickstart_summaries.update_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        {"$set": {"topics": reordered_topics, "updated_at": now}},
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{notebook_id}/quickstart/generate",
    response_model=QuickstartGenerationJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_quickstart(
    notebook_id: str, request: Request
) -> QuickstartGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    _, ready_count = await compute_sources_fingerprint(
        notebook["title"], notebook["_id"], user["_id"]
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para generar el inicio rapido",
        )

    job = quickstart_queue.enqueue(
        process_quickstart_generation,
        str(notebook["_id"]),
        str(user["_id"]),
    )
    now = datetime.now(timezone.utc)
    await db.quickstart_generation_jobs.insert_one(
        {
            "job_id": job.id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "error": None,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    return QuickstartGenerationJobOut(job_id=job.id, status="queued")


@router.get(
    "/{notebook_id}/quickstart/generate", response_model=QuickstartGenerationJobOut
)
async def get_latest_quickstart_generation(
    notebook_id: str, request: Request
) -> QuickstartGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.quickstart_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado"
        )

    return QuickstartGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get(
    "/{notebook_id}/quickstart/generate/{job_id}",
    response_model=QuickstartGenerationJobOut,
)
async def get_quickstart_generation_status(
    notebook_id: str, job_id: str, request: Request
) -> QuickstartGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.quickstart_generation_jobs.find_one(
        {
            "job_id": job_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado"
        )

    return QuickstartGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.post(
    "/{notebook_id}/quickstart/topics/{topic_id}/expand",
    response_model=QuickstartExpansionOut,
)
async def expand_quickstart_topic(
    notebook_id: str, topic_id: str, request: Request
) -> QuickstartExpansionOut:
    user = await get_current_user(request)
    notebook, topic, fingerprint = await resolve_quickstart_topic_context(
        notebook_id, topic_id, user
    )
    return await get_or_create_topic_expansion(
        notebook, user, topic_id, topic, fingerprint
    )


@router.post(
    "/{notebook_id}/quickstart/topics/{topic_id}/details",
    response_model=QuickstartTopicDetailOut,
)
async def get_quickstart_topic_detail(
    notebook_id: str,
    topic_id: str,
    payload: QuickstartTopicDetailRequest,
    request: Request,
) -> QuickstartTopicDetailOut:
    user = await get_current_user(request)
    notebook, topic, fingerprint = await resolve_quickstart_topic_context(
        notebook_id, topic_id, user
    )
    expansion = await get_or_create_topic_expansion(
        notebook, user, topic_id, topic, fingerprint
    )

    requested_item_text = normalize_item_text(payload.item_text)
    if not requested_item_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El texto del item es obligatorio",
        )

    valid_items = (
        expansion.example_questions
        if payload.item_type == "question"
        else expansion.key_points
    )
    valid_item_map = {
        normalize_item_cache_key(item): normalize_item_text(item)
        for item in valid_items
        if normalize_item_text(item)
    }
    requested_item_key = normalize_item_cache_key(requested_item_text)
    resolved_item_text = valid_item_map.get(requested_item_key)
    if not resolved_item_text:
        detail_message = (
            "La pregunta seleccionada no pertenece a este tema"
            if payload.item_type == "question"
            else "El punto seleccionado no pertenece a este tema"
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail_message)

    detail_filter = {
        "owner_id": user["_id"],
        "notebook_id": notebook["_id"],
        "topic_id": topic_id,
        "item_type": payload.item_type,
        "item_text_normalized": requested_item_key,
        "sources_fingerprint": fingerprint,
    }
    cached_detail = await db.quickstart_topic_details.find_one(detail_filter)
    if cached_detail:
        return QuickstartTopicDetailOut(
            topic_id=topic_id,
            item_type=payload.item_type,
            item_text=coerce_text(cached_detail.get("item_text")) or resolved_item_text,
            content=coerce_text(cached_detail.get("content")),
        )

    content = await generate_topic_item_detail(
        notebook_title=coerce_text(notebook.get("title")),
        topic_title=coerce_text(topic.get("title")),
        item_type=payload.item_type,
        item_text=resolved_item_text,
        notebook_object_id=notebook["_id"],
        user=user,
    )
    now = datetime.now(timezone.utc)
    await db.quickstart_topic_details.update_one(
        detail_filter,
        {
            "$set": {
                "owner_id": user["_id"],
                "notebook_id": notebook["_id"],
                "topic_id": topic_id,
                "item_type": payload.item_type,
                "item_text_normalized": requested_item_key,
                "item_text": resolved_item_text,
                "sources_fingerprint": fingerprint,
                "content": content,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    return QuickstartTopicDetailOut(
        topic_id=topic_id,
        item_type=payload.item_type,
        item_text=resolved_item_text,
        content=content,
    )
