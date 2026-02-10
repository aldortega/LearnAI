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
from ..rq_queue import reports_queue
from ..schemas import (
    RagSource,
    ReportConfigOut,
    ReportFormatType,
    ReportGenerateRequest,
    ReportGenerationJobOut,
    ReportListOut,
    ReportOut,
    ReportPromptTemplateOut,
    ReportSourceRef,
    ReportSuggestionOut,
)
from .auth import get_current_user
from .rag import create_llm, retrieve_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notebooks", tags=["reports"])

SUGGESTION_COUNT = 4
MAX_CONTEXT_CHARS = 5500
MAX_REPORT_TITLE_CHARS = 120

REPORT_TEMPLATE_CONFIGS: dict[ReportFormatType, dict[str, str]] = {
    "freeform": {
        "label": "Libre",
        "description": "Prompt abierto para definir estructura, estilo y tono.",
        "default_prompt": (
            "Crea un informe claro sobre esta notebook. "
            "Usa secciones con titulos, tono profesional y ejemplos concretos."
        ),
    },
    "summary": {
        "label": "Resumen",
        "description": "Vista general con informacion clave de las fuentes.",
        "default_prompt": (
            "Crea un documento de informe integral que sintetice los principales temas "
            "e ideas de las fuentes. Comienza con un Resumen Ejecutivo conciso que "
            "presente desde el inicio los puntos clave mas relevantes. El cuerpo del "
            "documento debe ofrecer un analisis detallado y exhaustivo de los temas "
            "principales, la evidencia y las conclusiones que se encuentran en las "
            "fuentes. Este analisis debe estar estructurado de manera logica, "
            "utilizando encabezados y vietas para garantizar la claridad. El tono "
            "debe ser objetivo y preciso."
        ),
    },
    "study_guide": {
        "label": "Guia de estudio",
        "description": "Cuestionario breve, puntos clave y plan de estudio.",
        "default_prompt": (
            "Eres un asistente de investigacion y tutor altamente capacitado. Crea una "
            "guia de estudio detallada disenada para repasar y evaluar la comprension "
            "de las fuentes. Elabora un cuestionario con diez preguntas de respuesta "
            "corta (de 2 a 3 oraciones cada una) e incluye una clave de respuestas "
            "separada. Propon cinco preguntas en formato de ensayo, pero no "
            "proporciones las respuestas. Concluye ademas con un glosario completo "
            "de terminos clave, con sus definiciones."
        ),
    },
    "blog_post": {
        "label": "Entrada de blog",
        "description": "Articulo facil de leer con conclusiones condensadas.",
        "default_prompt": (
            "Actua como un escritor reflexivo y sintetizador de ideas, encargado de "
            "crear una entrada de blog atractiva y facil de leer para una plataforma "
            "de publicacion en linea popular, conocida por su estetica limpia y "
            "contenido perspicaz. Tu objetivo es destilar los hallazgos mas "
            "sorprendentes, contraintuitivos o impactantes de los materiales fuente "
            "proporcionados en un listicle convincente. El estilo de escritura debe "
            "ser claro, accesible y altamente escaneable, empleando un tono "
            "conversacional pero inteligente. Redacta un titulo atractivo y llamativo. "
            "Comienza el articulo con una introduccion breve que atrape al lector "
            "planteando un problema o una curiosidad con la que pueda identificarse. "
            "Luego, presenta cada uno de los puntos clave como una seccion "
            "independiente, con un subtitulo claro y en negrita. Dentro de cada "
            "seccion, utiliza parrafos cortos para explicar el concepto con claridad "
            "y no te limites a resumir: ofrece un breve analisis o reflexion sobre "
            "por que ese punto resulta tan interesante o importante. Si existe una "
            "cita poderosa en las fuentes, destacala en un bloque de cita para darle "
            "mayor enfasis. Concluye la publicacion con un resumen breve y orientado "
            "al futuro, que deje al lector con una pregunta final que invite a la "
            "reflexion o con una idea poderosa para seguir pensando."
        ),
    },
    "ai_suggested": {
        "label": "Sugerido por IA",
        "description": "Formato recomendado segun el tema de la notebook.",
        "default_prompt": (
            "Crea un informe util y bien estructurado para estudiar este tema."
        ),
    },
}

REPORT_LABEL_BY_TYPE: dict[ReportFormatType, str] = {
    "freeform": "Informe libre",
    "summary": "Resumen",
    "study_guide": "Guia de estudio",
    "blog_post": "Entrada de blog",
    "ai_suggested": "Informe sugerido",
}

SUGGESTIONS_SCHEMA = (
    "{\n"
    '  "suggestions": [\n'
    "    {\n"
    '      "title": "string",\n'
    '      "description": "string",\n'
    '      "default_prompt": "string"\n'
    "    }\n"
    "  ]\n"
    "}\n"
)


class ReportSuggestionLLM(BaseModel):
    title: str
    description: str
    default_prompt: str


class ReportSuggestionsPayloadLLM(BaseModel):
    suggestions: list[ReportSuggestionLLM] = Field(min_length=1, max_length=20)


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


def source_to_ref(source: RagSource) -> ReportSourceRef:
    return ReportSourceRef(
        document_id=source.document_id,
        chunk_id=source.chunk_id,
        score=source.score,
        file_name=source.file_name,
        page=source.page,
    )


def resolve_report_title(
    format_type: ReportFormatType,
    prompt: str,
    suggestion_title: str | None = None,
) -> str:
    if format_type == "ai_suggested":
        normalized_suggestion_title = normalize_title(coerce_text(suggestion_title))
        if normalized_suggestion_title:
            return normalized_suggestion_title[:MAX_REPORT_TITLE_CHARS]

    first_sentence = prompt.split(".")[0].strip()
    if first_sentence and format_type == "freeform":
        return first_sentence[:MAX_REPORT_TITLE_CHARS]

    label = REPORT_LABEL_BY_TYPE.get(format_type, "Informe")
    return label[:MAX_REPORT_TITLE_CHARS]


def build_templates() -> list[ReportPromptTemplateOut]:
    return [
        ReportPromptTemplateOut(
            type=report_type,
            label=template["label"],
            description=template["description"],
            default_prompt=template["default_prompt"],
            is_editable=True,
        )
        for report_type, template in REPORT_TEMPLATE_CONFIGS.items()
        if report_type != "ai_suggested"
    ]


def build_fallback_report_suggestions(notebook_title: str) -> list[ReportSuggestionOut]:
    fallback_items = [
        {
            "title": "Mapa de conceptos clave",
            "description": (
                "Organiza los conceptos principales, sus relaciones y aplicaciones."
            ),
            "default_prompt": (
                f"Crea un informe tipo mapa conceptual sobre {notebook_title}. "
                "Incluye conceptos clave, relaciones entre ellos y ejemplos practicos."
            ),
        },
        {
            "title": "Analisis comparativo",
            "description": (
                "Contrasta enfoques, ventajas, limites y casos recomendados."
            ),
            "default_prompt": (
                f"Genera un analisis comparativo de los enfoques sobre {notebook_title}. "
                "Incluye diferencias, fortalezas, riesgos y contexto de uso."
            ),
        },
        {
            "title": "Checklist de aplicacion",
            "description": (
                "Resume pasos accionables para aplicar lo aprendido."
            ),
            "default_prompt": (
                f"Redacta un checklist practico para aplicar {notebook_title}. "
                "Incluye pasos, validaciones, errores comunes y recomendaciones."
            ),
        },
        {
            "title": "FAQ de estudio",
            "description": (
                "Responde preguntas frecuentes para reforzar la comprension."
            ),
            "default_prompt": (
                f"Crea un FAQ de estudio sobre {notebook_title} con preguntas y respuestas "
                "claras, enfocadas en dudas frecuentes y conceptos confusos."
            ),
        },
    ]

    return [
        ReportSuggestionOut(
            id=f"s{index}",
            title=item["title"],
            description=item["description"],
            default_prompt=item["default_prompt"],
        )
        for index, item in enumerate(fallback_items, start=1)
    ]


def ensure_suggestion_count(
    notebook_title: str, suggestions: list[ReportSuggestionOut]
) -> list[ReportSuggestionOut]:
    normalized: list[ReportSuggestionOut] = []
    seen_titles: set[str] = set()

    for suggestion in suggestions:
        title = normalize_title(suggestion.title)
        description = normalize_prompt(suggestion.description)
        default_prompt = coerce_text(suggestion.default_prompt).strip()
        title_key = title.lower()
        if not title or not description or not default_prompt or title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        normalized.append(
            ReportSuggestionOut(
                id="",
                title=title[:80],
                description=description[:180],
                default_prompt=default_prompt[:2000],
            )
        )
        if len(normalized) >= SUGGESTION_COUNT:
            break

    if len(normalized) < SUGGESTION_COUNT:
        fallback = build_fallback_report_suggestions(notebook_title)
        for suggestion in fallback:
            title_key = normalize_title(suggestion.title).lower()
            if not title_key or title_key in seen_titles:
                continue
            seen_titles.add(title_key)
            normalized.append(
                ReportSuggestionOut(
                    id="",
                    title=suggestion.title,
                    description=suggestion.description,
                    default_prompt=suggestion.default_prompt,
                )
            )
            if len(normalized) >= SUGGESTION_COUNT:
                break

    return [
        ReportSuggestionOut(
            id=f"s{index}",
            title=suggestion.title,
            description=suggestion.description,
            default_prompt=suggestion.default_prompt,
        )
        for index, suggestion in enumerate(normalized[:SUGGESTION_COUNT], start=1)
    ]


async def get_cached_report_suggestions(
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    notebook_title: str,
    sources_fingerprint: str,
) -> list[ReportSuggestionOut] | None:
    cache_doc = await db.report_suggestions.find_one(
        {"owner_id": owner_id, "notebook_id": notebook_object_id}
    )
    if not cache_doc:
        return None
    if coerce_text(cache_doc.get("sources_fingerprint")) != sources_fingerprint:
        return None

    raw_suggestions = cache_doc.get("suggestions")
    if not isinstance(raw_suggestions, list):
        return None

    parsed_suggestions: list[ReportSuggestionOut] = []
    for index, suggestion in enumerate(raw_suggestions, start=1):
        if not isinstance(suggestion, dict):
            continue
        title = normalize_title(coerce_text(suggestion.get("title")))
        description = normalize_prompt(coerce_text(suggestion.get("description")))
        default_prompt = coerce_text(suggestion.get("default_prompt")).strip()
        if not title or not description or not default_prompt:
            continue
        parsed_suggestions.append(
            ReportSuggestionOut(
                id=f"s{index}",
                title=title[:80],
                description=description[:180],
                default_prompt=default_prompt[:2000],
            )
        )

    if not parsed_suggestions:
        return None

    return ensure_suggestion_count(notebook_title, parsed_suggestions)


async def save_cached_report_suggestions(
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    sources_fingerprint: str,
    suggestions: list[ReportSuggestionOut],
) -> None:
    now = datetime.now(timezone.utc)
    await db.report_suggestions.update_one(
        {"owner_id": owner_id, "notebook_id": notebook_object_id},
        {
            "$set": {
                "owner_id": owner_id,
                "notebook_id": notebook_object_id,
                "sources_fingerprint": sources_fingerprint,
                "suggestions": [suggestion.model_dump() for suggestion in suggestions],
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


def build_suggestions_prompt(
    notebook_title: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{SUGGESTIONS_SCHEMA}"
    )
    user_prompt = (
        f"Tema general de la notebook: {notebook_title}\n\n"
        f"Contexto:\n{context_text}\n\n"
        f"Sugiere exactamente {SUGGESTION_COUNT} tipos de informe utiles para estudiar "
        "este tema. Cada sugerencia debe incluir titulo corto, descripcion breve y "
        "un prompt base listo para editar."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_report_prompt(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    format_guidance = {
        "freeform": (
            "Sigue exactamente las instrucciones del usuario sobre estructura, tono y estilo."
        ),
        "summary": (
            "Entrega una vista general con ideas clave, hallazgos y conclusiones claras."
        ),
        "study_guide": (
            "Incluye puntos clave, preguntas de respuesta corta, preguntas sugeridas "
            "y secuencia recomendada de estudio."
        ),
        "blog_post": (
            "Escribe un articulo facil de leer con titulo, subtitulos y cierre concreto."
        ),
        "ai_suggested": (
            "Sigue el enfoque del prompt sugerido y manten claridad pedagogica."
        ),
    }
    system_prompt = (
        "Eres un asistente de estudio. Usa primero el contexto de fuentes y complementa "
        "con conocimiento general cuando sea necesario. No inventes citas textuales. "
        "Responde en espanol claro. Formatea en markdown simple.\n"
        f"Directriz de formato: {format_guidance.get(format_type, format_guidance['freeform'])}"
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tipo de informe: {format_type}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Prompt del usuario (seguir al pie de la letra cuando no contradiga el contexto):\n"
        f"{prompt}"
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


async def get_notebook_or_404(notebook_id: str, user: dict) -> dict:
    try:
        notebook_object_id = ObjectId(notebook_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notebook invalido",
        ) from exc

    notebook = await db.notebooks.find_one(
        {"_id": notebook_object_id, "owner_id": user["_id"]}
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook no encontrado",
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
    return build_sources_fingerprint(title, documents), len(documents)


def report_doc_to_out(report_doc: dict, current_fingerprint: str) -> ReportOut:
    source_docs = report_doc.get("sources", [])
    sources = [
        ReportSourceRef(**source_doc)
        for source_doc in source_docs
        if isinstance(source_doc, dict)
    ]
    report_fingerprint = coerce_text(report_doc.get("sources_fingerprint"))
    return ReportOut(
        id=str(report_doc["_id"]),
        notebook_id=str(report_doc["notebook_id"]),
        owner_id=str(report_doc["owner_id"]),
        format_type=report_doc["format_type"],
        title=coerce_text(report_doc.get("title")),
        prompt_used=coerce_text(report_doc.get("prompt_used")),
        content=coerce_text(report_doc.get("content")),
        sources_fingerprint=report_fingerprint,
        is_stale=report_fingerprint != current_fingerprint,
        sources=sources,
        created_at=report_doc["created_at"],
    )


async def generate_report_suggestions(
    notebook_title: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> list[ReportSuggestionOut]:
    context_lines, _, _, _ = await retrieve_context(
        f"Tipos de informe utiles para estudiar {notebook_title}",
        notebook_object_id,
        user,
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_suggestions_prompt(notebook_title, context_text)

    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=ReportSuggestionsPayloadLLM.model_json_schema(),
        method="json_schema",
    )

    payload = await asyncio.to_thread(structured_llm.invoke, [system_message, user_message])
    payload_data = (
        payload.model_dump()
        if isinstance(payload, BaseModel)
        else payload
        if isinstance(payload, dict)
        else ReportSuggestionsPayloadLLM.model_validate(payload).model_dump()
    )
    logger.info("Report suggestions payload:\n%s", json.dumps(payload_data, ensure_ascii=False))

    raw_suggestions = payload_data.get("suggestions")
    if not isinstance(raw_suggestions, list):
        return []

    normalized: list[ReportSuggestionOut] = []
    seen_titles: set[str] = set()
    for index, suggestion in enumerate(raw_suggestions, start=1):
        if not isinstance(suggestion, dict):
            continue
        title = normalize_title(coerce_text(suggestion.get("title")))
        description = normalize_prompt(coerce_text(suggestion.get("description")))
        default_prompt = coerce_text(suggestion.get("default_prompt")).strip()

        if not title or not description or not default_prompt:
            continue
        title_key = title.lower()
        if title_key in seen_titles:
            continue

        seen_titles.add(title_key)
        normalized.append(
            ReportSuggestionOut(
                id=f"s{index}",
                title=title[:80],
                description=description[:180],
                default_prompt=default_prompt[:2000],
            )
        )
        if len(normalized) >= SUGGESTION_COUNT:
            break

    return ensure_suggestion_count(notebook_title, normalized)


async def generate_report_content(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> tuple[str, list[ReportSourceRef]]:
    context_lines, sources, _, _ = await retrieve_context(
        f"Informacion para informe de {notebook_title}",
        notebook_object_id,
        user,
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_report_prompt(
        notebook_title, format_type, prompt, context_text
    )
    llm = create_llm()
    answer = await asyncio.to_thread(llm.invoke, [system_message, user_message])
    answer_text = coerce_text(getattr(answer, "content", answer)).strip()
    if not answer_text:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar el informe",
        )
    return answer_text, [source_to_ref(source) for source in sources]


async def mark_report_job_processing(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.report_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "started_at": now, "error": None}},
    )


async def mark_report_job_failed(
    job_id: str,
    error: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.report_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "failed", "error": error, "finished_at": now}},
    )


async def mark_report_job_done(
    job_id: str,
    report_id: str,
    db_client: AsyncIOMotorDatabase | None = None,
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.report_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "done", "report_id": report_id, "finished_at": now}},
    )


def resolve_report_error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException) and isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc, ValueError):
        return str(exc)
    return "No se pudo generar el informe"


def process_report_generation(notebook_id: str, owner_id: str) -> None:
    asyncio.run(_process_report_generation(notebook_id, owner_id))


async def _process_report_generation(notebook_id: str, owner_id: str) -> None:
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else None
    if not job_id:
        logger.error("Job de reportes sin id")
        return

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        await mark_report_job_processing(job_id, db_client=worker_db)

        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            await mark_report_job_failed(job_id, "Identificador invalido", db_client=worker_db)
            logger.exception("Identificador invalido en reportes", extra={"error": str(exc)})
            return

        notebook = await worker_db.notebooks.find_one(
            {"_id": notebook_object_id, "owner_id": owner_object_id}
        )
        if not notebook:
            await mark_report_job_failed(job_id, "Notebook no encontrado", db_client=worker_db)
            return

        job_doc = await worker_db.report_generation_jobs.find_one(
            {"job_id": job_id, "owner_id": owner_object_id, "notebook_id": notebook_object_id}
        )
        if not job_doc:
            await mark_report_job_failed(job_id, "Job no encontrado", db_client=worker_db)
            return

        prompt = coerce_text(job_doc.get("prompt")).strip()
        if not prompt:
            await mark_report_job_failed(job_id, "El prompt es obligatorio", db_client=worker_db)
            return

        format_type = coerce_text(job_doc.get("format_type")) or "freeform"
        if format_type not in REPORT_TEMPLATE_CONFIGS:
            await mark_report_job_failed(
                job_id,
                "Tipo de informe invalido",
                db_client=worker_db,
            )
            return

        fingerprint, ready_count = await compute_sources_fingerprint(
            notebook["title"],
            notebook_object_id,
            owner_object_id,
            db_client=worker_db,
        )
        if ready_count == 0:
            await mark_report_job_failed(
                job_id,
                "Necesitas al menos una fuente lista para generar informes",
                db_client=worker_db,
            )
            return

        try:
            content, sources = await generate_report_content(
                notebook_title=coerce_text(notebook.get("title")),
                format_type=format_type,
                prompt=prompt,
                notebook_object_id=notebook_object_id,
                user={"_id": owner_object_id},
            )
            report_title = resolve_report_title(
                format_type,
                prompt,
                suggestion_title=coerce_text(job_doc.get("suggestion_title")) or None,
            )
            now = datetime.now(timezone.utc)
            report_doc = {
                "owner_id": owner_object_id,
                "notebook_id": notebook_object_id,
                "format_type": format_type,
                "title": report_title,
                "prompt_used": prompt,
                "content": content,
                "sources_fingerprint": fingerprint,
                "sources": [source.model_dump() for source in sources],
                "created_at": now,
            }
            report_result = await worker_db.reports.insert_one(report_doc)
        except Exception as exc:
            error_message = resolve_report_error_message(exc)
            await mark_report_job_failed(job_id, error_message, db_client=worker_db)
            return

        await mark_report_job_done(job_id, str(report_result.inserted_id), db_client=worker_db)
    finally:
        worker_client.close()


@router.get("/{notebook_id}/reports/config", response_model=ReportConfigOut)
async def get_reports_config(notebook_id: str, request: Request) -> ReportConfigOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    notebook_title = coerce_text(notebook.get("title"))
    sources_fingerprint, ready_count = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        user["_id"],
    )
    has_ready_sources = ready_count > 0

    cached_suggestions = await get_cached_report_suggestions(
        notebook["_id"],
        user["_id"],
        notebook_title,
        sources_fingerprint,
    )
    if cached_suggestions is not None:
        return ReportConfigOut(
            has_ready_sources=has_ready_sources,
            templates=build_templates(),
            suggestions=cached_suggestions,
        )

    suggestions: list[ReportSuggestionOut] = build_fallback_report_suggestions(
        notebook_title
    )
    try:
        suggestions = await generate_report_suggestions(
            notebook_title,
            notebook["_id"],
            user,
        )
    except Exception as exc:
        logger.exception(
            "No se pudieron generar sugerencias de reportes",
            extra={"error": str(exc)},
        )
        suggestions = build_fallback_report_suggestions(notebook_title)

    await save_cached_report_suggestions(
        notebook["_id"],
        user["_id"],
        sources_fingerprint,
        suggestions,
    )

    return ReportConfigOut(
        has_ready_sources=has_ready_sources,
        templates=build_templates(),
        suggestions=suggestions,
    )


@router.post(
    "/{notebook_id}/reports/generate",
    response_model=ReportGenerationJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_report(
    notebook_id: str,
    payload: ReportGenerateRequest,
    request: Request,
) -> ReportGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    prompt = coerce_text(payload.prompt).strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El prompt es obligatorio",
        )

    _, ready_count = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        user["_id"],
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para generar informes",
        )

    format_type = payload.format_type
    if format_type not in REPORT_TEMPLATE_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de informe invalido",
        )

    suggestion_title = (
        resolve_report_title("ai_suggested", prompt)
        if format_type == "ai_suggested"
        else None
    )

    job = reports_queue.enqueue(
        process_report_generation,
        str(notebook["_id"]),
        str(user["_id"]),
    )
    now = datetime.now(timezone.utc)
    await db.report_generation_jobs.insert_one(
        {
            "job_id": job.id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
            "status": "queued",
            "error": None,
            "report_id": None,
            "format_type": format_type,
            "prompt": prompt,
            "suggestion_id": payload.suggestion_id,
            "suggestion_title": suggestion_title,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
    )

    return ReportGenerationJobOut(job_id=job.id, status="queued")


@router.get("/{notebook_id}/reports/generate", response_model=ReportGenerationJobOut)
async def get_latest_report_generation(
    notebook_id: str,
    request: Request,
) -> ReportGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.report_generation_jobs.find_one(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]},
        sort=[("created_at", -1)],
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )

    return ReportGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        report_id=str(job_doc["report_id"]) if job_doc.get("report_id") else None,
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get(
    "/{notebook_id}/reports/generate/{job_id}",
    response_model=ReportGenerationJobOut,
)
async def get_report_generation_status(
    notebook_id: str,
    job_id: str,
    request: Request,
) -> ReportGenerationJobOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    job_doc = await db.report_generation_jobs.find_one(
        {
            "job_id": job_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if not job_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job no encontrado",
        )

    return ReportGenerationJobOut(
        job_id=job_doc["job_id"],
        status=job_doc["status"],
        error=job_doc.get("error"),
        report_id=str(job_doc["report_id"]) if job_doc.get("report_id") else None,
        started_at=job_doc.get("started_at"),
        finished_at=job_doc.get("finished_at"),
    )


@router.get("/{notebook_id}/reports", response_model=ReportListOut)
async def list_reports(notebook_id: str, request: Request) -> ReportListOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)
    current_fingerprint, _ = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        user["_id"],
    )

    cursor = db.reports.find(
        {"owner_id": user["_id"], "notebook_id": notebook["_id"]}
    ).sort("created_at", -1)
    items = [report_doc_to_out(report_doc, current_fingerprint) async for report_doc in cursor]
    return ReportListOut(items=items)


@router.get("/{notebook_id}/reports/{report_id}", response_model=ReportOut)
async def get_report(
    notebook_id: str,
    report_id: str,
    request: Request,
) -> ReportOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    try:
        report_object_id = ObjectId(report_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reporte invalido",
        ) from exc

    report_doc = await db.reports.find_one(
        {
            "_id": report_object_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if not report_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reporte no encontrado",
        )

    current_fingerprint, _ = await compute_sources_fingerprint(
        coerce_text(notebook.get("title")),
        notebook["_id"],
        user["_id"],
    )
    return report_doc_to_out(report_doc, current_fingerprint)


@router.delete(
    "/{notebook_id}/reports/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_report(
    notebook_id: str,
    report_id: str,
    request: Request,
) -> Response:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    try:
        report_object_id = ObjectId(report_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reporte invalido",
        ) from exc

    delete_result = await db.reports.delete_one(
        {
            "_id": report_object_id,
            "owner_id": user["_id"],
            "notebook_id": notebook["_id"],
        }
    )
    if delete_result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reporte no encontrado",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
