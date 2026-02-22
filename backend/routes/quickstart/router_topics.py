from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Response, status

from ...db import db
from ...schemas.quickstart import (
    QuickstartAddTopicRequest,
    QuickstartExpansionOut,
    QuickstartReorderTopicsRequest,
    QuickstartTopicDetailOut,
    QuickstartTopicDetailRequest,
    QuickstartTopicOut,
)
from ..auth import get_current_user
from .service import (
    TOPIC_LIMIT,
    build_existing_topic_title_keys,
    build_next_topic_id,
    coerce_text,
    compute_sources_fingerprint,
    generate_single_quickstart_topic,
    generate_topic_item_detail,
    get_notebook_or_404,
    get_or_create_topic_expansion,
    normalize_item_cache_key,
    normalize_item_text,
    normalize_topic_title,
    resolve_quickstart_topic_context,
    topic_to_out,
)

router = APIRouter(tags=["quickstart"])


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
        notebook["title"], notebook["_id"], notebook["owner_id"]
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
        "emoji": generated_topic["emoji"],
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
