import asyncio
from datetime import datetime, timezone
import logging
from pathlib import Path
import tempfile
import time
import uuid

import httpx
from bson import ObjectId
import docx2txt
from langchain_core.documents import Document
from pydantic import SecretStr
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pypdf import PdfReader
from rq import get_current_job
from supabase import create_client

from .config import settings


logger = logging.getLogger(__name__)

_worker_client: AsyncIOMotorClient | None = None
_worker_db: AsyncIOMotorDatabase | None = None


def process_document(document_id: str) -> None:
    asyncio.run(_process_document(document_id))


def get_worker_db() -> AsyncIOMotorDatabase:
    global _worker_client, _worker_db
    if _worker_db is None:
        _worker_client = AsyncIOMotorClient(settings.mongodb_uri)
        _worker_db = _worker_client[settings.database_name]
    return _worker_db


async def _process_document(document_id: str) -> None:
    now = datetime.now(timezone.utc)
    try:
        document_object_id = ObjectId(document_id)
    except Exception:
        return

    job = get_current_job()
    job_id = job.id if job else None
    worker_db = get_worker_db()

    document = await worker_db.documents.find_one({"_id": document_object_id})
    if not document:
        logger.warning("Documento no encontrado", extra={"document_id": document_id})
        return

    await worker_db.documents.update_one(
        {"_id": document_object_id},
        {"$set": {"status": "processing", "updated_at": now}},
    )
    if job_id:
        await worker_db.ingestion_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "processing", "started_at": now}},
        )

    start = time.perf_counter()
    try:
        file_path = document["file_path"]
        file_bytes = await asyncio.to_thread(download_supabase_file, file_path)
        documents = await asyncio.to_thread(
            load_documents, file_bytes, document["content_type"]
        )
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size, chunk_overlap=settings.chunk_overlap
        )
        chunks = splitter.split_documents(documents)
        filtered_chunks = [chunk for chunk in chunks if chunk.page_content]
        texts = [chunk.page_content for chunk in filtered_chunks]
        if not texts:
            raise RuntimeError("Documento sin texto utilizable")
        if not settings.gemini_api_key:
            raise RuntimeError("Gemini no está configurado")
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            api_key=SecretStr(settings.gemini_api_key),
            output_dimensionality=settings.qdrant_vector_size,
        )
        vectors = await asyncio.to_thread(embeddings.embed_documents, texts)
        await upsert_chunks(document, filtered_chunks, vectors)
    except Exception as exc:
        logger.exception(
            "Ingesta fallida",
            extra={
                "document_id": document_id,
                "job_id": job_id,
                "error": str(exc),
            },
        )
        await mark_failed(worker_db, document_object_id, job_id, str(exc))
        return

    latency_ms = int((time.perf_counter() - start) * 1000)
    logger.info(
        "Ingesta completada",
        extra={
            "document_id": document_id,
            "job_id": job_id,
            "chunks": len(filtered_chunks),
            "latency_ms": latency_ms,
        },
    )
    await mark_done(worker_db, document_object_id, job_id)


def download_supabase_file(file_path: str) -> bytes:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase no está configurado")
    if not file_path:
        raise RuntimeError("file_path inválido")

    bucket, storage_path = parse_storage_path(file_path)
    supabase_client = create_client(
        settings.supabase_url, settings.supabase_service_role_key
    )
    result = supabase_client.storage.from_(bucket).download(storage_path)
    if isinstance(result, bytes):
        return result
    return bytes(result)


def parse_storage_path(file_path: str) -> tuple[str, str]:
    if "/" in file_path:
        bucket, storage_path = file_path.split("/", 1)
        return bucket, storage_path
    if settings.supabase_storage_bucket:
        return settings.supabase_storage_bucket, file_path
    raise RuntimeError(
        "file_path debe incluir bucket/path o configurar supabase_storage_bucket"
    )


def load_documents(file_bytes: bytes, content_type: str) -> list[Document]:
    suffix_map = {"pdf": ".pdf", "docx": ".docx", "txt": ".txt"}
    suffix = suffix_map.get(content_type)
    if not suffix:
        raise RuntimeError("Tipo de archivo no soportado")

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        if content_type == "pdf":
            reader = PdfReader(tmp_path)
            documents: list[Document] = []
            for index, page in enumerate(reader.pages, start=1):
                text = page.extract_text() or ""
                if text.strip():
                    documents.append(
                        Document(page_content=text, metadata={"page": index})
                    )
            return documents
        if content_type == "docx":
            text = docx2txt.process(tmp_path) or ""
            return [Document(page_content=text, metadata={})] if text.strip() else []
        text = Path(tmp_path).read_text(encoding="utf-8", errors="ignore")
        return [Document(page_content=text, metadata={})] if text.strip() else []
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except FileNotFoundError:
            pass


async def upsert_chunks(document: dict, chunks, vectors) -> None:
    async with httpx.AsyncClient(base_url=settings.qdrant_url, timeout=20) as client:
        collection = settings.qdrant_collection_name
        owner_id = str(document["owner_id"])
        notebook_id = str(document["notebook_id"])
        document_id = str(document["_id"])
        file_path = document["file_path"]
        file_name = document["file_name"]
        created_at = document["created_at"].isoformat()
        source_type = document["content_type"]

        points = []
        for index, (chunk, vector) in enumerate(zip(chunks, vectors)):
            metadata = chunk.metadata or {}
            point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{document_id}:{index}"))
            points.append(
                {
                    "id": point_id,
                    "vector": vector,
                    "payload": {
                        "document_id": document_id,
                        "notebook_id": notebook_id,
                        "owner_id": owner_id,
                        "file_path": file_path,
                        "file_name": file_name,
                        "chunk_id": index,
                        "page": metadata.get("page"),
                        "source_type": source_type,
                        "created_at": created_at,
                        "text": chunk.page_content,
                    },
                }
            )

        batch_size = 100
        for start in range(0, len(points), batch_size):
            batch = points[start : start + batch_size]
            response = await client.put(
                f"/collections/{collection}/points",
                json={"points": batch},
                params={"wait": "true"},
            )
            if response.status_code not in (200, 201):
                raise RuntimeError(
                    "No se pudo insertar en Qdrant: "
                    f"{response.status_code} {response.text}"
                )


async def mark_failed(
    worker_db: AsyncIOMotorDatabase,
    document_id: ObjectId,
    job_id: str | None,
    error: str,
) -> None:
    end = datetime.now(timezone.utc)
    await worker_db.documents.update_one(
        {"_id": document_id},
        {"$set": {"status": "failed", "error": error, "updated_at": end}},
    )
    if job_id:
        await worker_db.ingestion_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "failed", "error": error, "finished_at": end}},
        )


async def mark_done(
    worker_db: AsyncIOMotorDatabase, document_id: ObjectId, job_id: str | None
) -> None:
    end = datetime.now(timezone.utc)
    await worker_db.documents.update_one(
        {"_id": document_id},
        {"$set": {"status": "done", "error": None, "updated_at": end}},
    )
    if job_id:
        await worker_db.ingestion_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "done", "error": None, "finished_at": end}},
        )
