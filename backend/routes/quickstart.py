import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status
from langchain_core.messages import HumanMessage, SystemMessage
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from ..config import settings
from ..db import db
from ..rq_queue import quickstart_queue
from ..schemas import (
    QuickstartExpansionOut,
    QuickstartGenerationJobOut,
    QuickstartOut,
    QuickstartSourceRef,
    QuickstartTopicOut,
    RagSource,
)
from .auth import get_current_user
from .rag import create_llm, retrieve_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notebooks", tags=["quickstart"])

TOPIC_COUNT = 6
TOPIC_MIN_KEY_POINTS = 3
TOPIC_MAX_KEY_POINTS = 5
EXPANSION_MIN_KEY_POINTS = 3
EXPANSION_MAX_KEY_POINTS = 6
EXPANSION_MIN_QUESTIONS = 2
EXPANSION_MAX_QUESTIONS = 5

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


class QuickstartTopicLLM(BaseModel):
    title: str
    summary: str
    key_points: list[str] = Field(min_length=1, max_length=8)


class QuickstartPayloadLLM(BaseModel):
    topics: list[QuickstartTopicLLM] = Field(min_length=1, max_length=12)


class QuickstartExpansionLLM(BaseModel):
    content: str
    key_points: list[str] = Field(min_length=1, max_length=10)
    example_questions: list[str] = Field(min_length=1, max_length=8)


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


def normalize_expansion(payload: dict, topic_title: str) -> dict:
    content = coerce_text(payload.get("content")).strip()
    if not content:
        content = f"Detalles principales sobre {topic_title}."

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
        "Expande el tema en detalle. Entrega un contenido claro, "
        "puntos clave adicionales y preguntas sugeridas."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


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


async def generate_quickstart_topics(
    title: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> list[dict]:
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
        return normalize_topics(payload_data, title)
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
        expansion = normalize_expansion(payload_data, coerce_text(topic.get("title")))
        return expansion, sources
    except Exception as exc:
        logger.exception("Expansion JSON invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo expandir el tema",
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
            topics = await generate_quickstart_topics(
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
                        "topics": topics,
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
    topics_out: list[QuickstartTopicOut] = []
    generated_at: datetime | None = None

    if summary:
        status_value = (
            "ready"
            if summary.get("sources_fingerprint") == fingerprint
            else "stale"
        )
        topics_out = [topic_to_out(topic) for topic in summary.get("topics", [])]
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
        topics=topics_out,
    )


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
    topic = next((item for item in topics if item.get("id") == topic_id), None)
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tema no encontrado"
        )

    cached = await db.quickstart_expansions.find_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "topic_id": topic_id,
            "sources_fingerprint": fingerprint,
        }
    )
    if cached:
        sources_out = [
            QuickstartSourceRef(**source)
            for source in cached.get("sources", [])
        ]
        return QuickstartExpansionOut(
            topic_id=topic_id,
            content=coerce_text(cached.get("content")),
            key_points=[
                coerce_text(point) for point in cached.get("key_points", [])
            ],
            example_questions=[
                coerce_text(question)
                for question in cached.get("example_questions", [])
            ],
            sources=sources_out,
        )

    expansion, sources = await generate_topic_expansion(
        notebook["title"], topic, notebook["_id"], user
    )
    sources_out = [source_to_ref(source) for source in sources]
    now = datetime.now(timezone.utc)
    await db.quickstart_expansions.update_one(
        {
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "topic_id": topic_id,
            "sources_fingerprint": fingerprint,
        },
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
