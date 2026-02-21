import asyncio
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ...config import settings
from ...db import db
from .generation_service import generate_mindmap_tree
from .normalization import coerce_text, flatten_tree_to_nodes
from .repository import compute_sources_fingerprint

logger = logging.getLogger(__name__)


async def mark_mindmap_job_processing(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.mindmap_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing", "started_at": now, "error": None}},
    )


async def mark_mindmap_job_failed(
    job_id: str, error: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.mindmap_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "failed", "error": error, "finished_at": now}},
    )


async def mark_mindmap_job_done(
    job_id: str, db_client: AsyncIOMotorDatabase | None = None
) -> None:
    db_ref = db if db_client is None else db_client
    now = datetime.now(timezone.utc)
    await db_ref.mindmap_generation_jobs.update_one(
        {"job_id": job_id},
        {"$set": {"status": "done", "finished_at": now}},
    )


def resolve_mindmap_error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException) and isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc, ValueError):
        return str(exc)
    return "No se pudo generar el mapa mental"


def process_mindmap_generation(
    notebook_id: str,
    owner_id: str,
    prompt: str | None = None,
) -> None:
    asyncio.run(_process_mindmap_generation(notebook_id, owner_id, prompt=prompt))


async def _process_mindmap_generation(
    notebook_id: str,
    owner_id: str,
    prompt: str | None = None,
) -> None:
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else None
    if not job_id:
        logger.error("Job de mindmap sin id")
        return

    worker_client = AsyncIOMotorClient(settings.mongodb_uri)
    worker_db = worker_client[settings.database_name]
    try:
        await mark_mindmap_job_processing(job_id, db_client=worker_db)
        try:
            notebook_object_id = ObjectId(notebook_id)
            owner_object_id = ObjectId(owner_id)
        except Exception as exc:
            await mark_mindmap_job_failed(
                job_id,
                "Identificador invalido",
                db_client=worker_db,
            )
            logger.exception(
                "Identificador invalido en mindmap",
                extra={"error": str(exc)},
            )
            return

        notebook = await worker_db.notebooks.find_one({"_id": notebook_object_id})
        if not notebook:
            await mark_mindmap_job_failed(
                job_id,
                "Notebook no encontrado",
                db_client=worker_db,
            )
            return

        queued_job_doc = await worker_db.mindmap_generation_jobs.find_one(
            {"job_id": job_id},
            {"prompt": 1},
        )
        queued_prompt = coerce_text(
            queued_job_doc.get("prompt") if queued_job_doc else ""
        ).strip()
        runtime_prompt = coerce_text(prompt).strip()

        fingerprint, ready_count = await compute_sources_fingerprint(
            notebook["title"],
            notebook_object_id,
            notebook["owner_id"],
            db_client=worker_db,
        )
        if ready_count == 0:
            await mark_mindmap_job_failed(
                job_id,
                "No hay fuentes listas para generar el mapa mental",
                db_client=worker_db,
            )
            return

        effective_topic = (
            runtime_prompt
            or queued_prompt
            or coerce_text(notebook.get("title"))
        )
        try:
            tree, generation_meta = await generate_mindmap_tree(
                effective_topic,
                notebook_object_id,
                {
                    "_id": owner_object_id,
                    "_source_owner_id": notebook["owner_id"],
                },
            )
            root_node_id, nodes = flatten_tree_to_nodes(tree)
            generation_meta["generated_nodes"] = len(nodes)
            now = datetime.now(timezone.utc)
            await worker_db.mindmap_maps.update_one(
                {"owner_id": owner_object_id, "notebook_id": notebook_object_id},
                {
                    "$set": {
                        "owner_id": owner_object_id,
                        "notebook_id": notebook_object_id,
                        "sources_fingerprint": fingerprint,
                        "topic": effective_topic,
                        "root_node_id": root_node_id,
                        "nodes": nodes,
                        "generation_meta": generation_meta,
                        "updated_at": now,
                    },
                    "$setOnInsert": {"created_at": now},
                },
                upsert=True,
            )
            await worker_db.mindmap_node_details.delete_many(
                {"owner_id": owner_object_id, "notebook_id": notebook_object_id}
            )
        except Exception as exc:
            error_message = resolve_mindmap_error_message(exc)
            await mark_mindmap_job_failed(job_id, error_message, db_client=worker_db)
            return

        await mark_mindmap_job_done(job_id, db_client=worker_db)
    finally:
        worker_client.close()
