import asyncio
from datetime import datetime, timezone
import logging
from pathlib import Path
import re
import tempfile
import time
import uuid

import httpx
from bson import ObjectId
import docx2txt
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pypdf import PdfReader
from pptx import Presentation
from rq import get_current_job
from supabase import create_client

from .config import settings
from .gemini import embed_documents_with_fallback, has_gemini_api_keys


logger = logging.getLogger(__name__)


def normalize_chunk_text(text: str) -> str:
    normalized = text.replace("\u00a0", " ")
    normalized = re.sub(r"(\w)-\n(\w)", r"\1\2", normalized)
    normalized = re.sub(r"[ \t]+\n", "\n", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    normalized = re.sub(r"[ \t]{2,}", " ", normalized)
    return normalized.strip()


def split_documents_for_ingestion(
    documents: list[Document], content_type: str
) -> list[Document]:
    chunk_size = settings.chunk_size
    chunk_overlap = settings.chunk_overlap
    if content_type in {"pdf", "pptx"}:
        chunk_size = max(700, int(settings.chunk_size * 0.9))
        chunk_overlap = max(100, int(settings.chunk_overlap * 1.2))

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", "? ", "! ", "; ", " ", ""],
    )

    normalized_documents: list[Document] = []
    for doc in documents:
        text = normalize_chunk_text(doc.page_content)
        if not text:
            continue
        normalized_documents.append(
            Document(page_content=text, metadata=dict(doc.metadata or {}))
        )

    if not normalized_documents:
        return []
    return splitter.split_documents(normalized_documents)


def process_document(document_id: str) -> None:
    asyncio.run(_process_document(document_id))


async def _process_document(document_id: str) -> None:
    now = datetime.now(timezone.utc)
    try:
        document_object_id = ObjectId(document_id)
    except Exception:
        return

    job = get_current_job()
    job_id = job.id if job else None

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        document = await worker_db.documents.find_one({"_id": document_object_id})
        if not document:
            logger.warning(
                "Documento no encontrado", extra={"document_id": document_id}
            )
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
            chunks = await asyncio.to_thread(
                split_documents_for_ingestion, documents, document["content_type"]
            )
            filtered_chunks = [
                chunk for chunk in chunks if chunk.page_content and chunk.page_content.strip()
            ]
            texts = [chunk.page_content for chunk in filtered_chunks]
            if not texts:
                raise RuntimeError("Documento sin texto utilizable")
            if not has_gemini_api_keys():
                raise RuntimeError("Gemini no está configurado")
            vectors = await asyncio.to_thread(
                embed_documents_with_fallback,
                texts,
                "models/gemini-embedding-001",
                settings.qdrant_vector_size,
            )
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
    finally:
        worker_client.close()


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
    suffix_map = {"pdf": ".pdf", "docx": ".docx", "txt": ".txt", "pptx": ".pptx"}
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
        if content_type == "pptx":
            presentation = Presentation(tmp_path)
            documents: list[Document] = []
            for index, slide in enumerate(presentation.slides, start=1):
                slide_sections: list[str] = []
                for shape in slide.shapes:
                    if getattr(shape, "has_table", False):
                        table_rows: list[str] = []
                        for row in shape.table.rows:
                            cells = [
                                cell.text.strip()
                                for cell in row.cells
                                if cell.text and cell.text.strip()
                            ]
                            if cells:
                                table_rows.append(" | ".join(cells))
                        if table_rows:
                            slide_sections.append("\n".join(table_rows))
                        continue

                    text = (getattr(shape, "text", "") or "").strip()
                    if text:
                        slide_sections.append(text)

                if slide_sections:
                    documents.append(
                        Document(
                            page_content="\n\n".join(slide_sections),
                            metadata={"page": index},
                        )
                    )
            return documents
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
