import asyncio
import json
import logging

from bson import ObjectId
from fastapi import HTTPException, status

from ..rag import create_llm, retrieve_context
from .constants import MindmapNodeDetailLLM, MindmapTreePayloadLLM
from .normalization import (
    compact_context,
    coerce_payload,
    coerce_text,
    normalize_detail_explanation,
    normalize_tree_payload,
)
from .prompts import build_mindmap_tree_prompt, build_node_detail_prompt

logger = logging.getLogger(__name__)


def _parse_json_object_from_response(response: object) -> dict:
    raw_content = getattr(response, "content", response)
    if isinstance(raw_content, list):
        chunks: list[str] = []
        for item in raw_content:
            if isinstance(item, str):
                chunks.append(item)
                continue
            if isinstance(item, dict):
                chunks.append(coerce_text(item.get("text")))
        text = "\n".join(chunks).strip()
    else:
        text = coerce_text(raw_content).strip()

    if not text:
        raise ValueError("Respuesta vacia del modelo")

    try:
        parsed = json.loads(text)
    except Exception:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("Respuesta sin JSON valido") from None
        parsed = json.loads(text[start : end + 1])

    if not isinstance(parsed, dict):
        raise ValueError("JSON de respuesta invalido")
    return parsed


async def generate_mindmap_tree(
    topic: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> tuple[dict, dict]:
    question = f"Mapa mental completo sobre {topic}"
    context_lines, _, _, _ = await retrieve_context(
        question,
        notebook_object_id,
        user,
        top_k=12,
    )
    context_text = compact_context(context_lines, max_chars=5500)
    system_message, user_message = build_mindmap_tree_prompt(topic, context_text)
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=MindmapTreePayloadLLM.model_json_schema(),
        method="json_schema",
    )

    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke,
            [system_message, user_message],
        )
        payload_data = MindmapTreePayloadLLM.model_validate(
            coerce_payload(payload, MindmapTreePayloadLLM)
        ).model_dump()
    except Exception as exc:
        logger.warning(
            "Mindmap estructurado fallo; intentando parseo de JSON libre",
            extra={"error": str(exc)},
        )
        try:
            raw_response = await asyncio.to_thread(llm.invoke, [system_message, user_message])
            payload_data = MindmapTreePayloadLLM.model_validate(
                _parse_json_object_from_response(raw_response)
            ).model_dump()
        except Exception as raw_exc:
            logger.exception("Mindmap JSON invalido", extra={"error": str(raw_exc)})
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo generar el mapa mental",
            ) from raw_exc

    try:
        logger.info("Mindmap estructurado:\n%s", json.dumps(payload_data, ensure_ascii=False))
        tree, generation_meta = normalize_tree_payload(
            payload_data,
            topic,
            context_lines=context_lines,
        )
        logger.info(
            "Mindmap normalizado meta: %s",
            json.dumps(generation_meta, ensure_ascii=False),
        )
        return tree, generation_meta
    except Exception as exc:
        logger.exception("Mindmap normalizacion invalida", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar el mapa mental",
        ) from exc


async def generate_node_detail(
    topic: str,
    node_title: str,
    notebook_object_id: ObjectId,
    user: dict,
    lineage_titles: list[str],
    children_titles: list[str],
) -> str:
    lineage_path = " > ".join(
        [title.strip() for title in lineage_titles if isinstance(title, str) and title.strip()]
    )
    question = (
        f"Explica brevemente el concepto {node_title} en {topic}. "
        f"Ruta conceptual: {lineage_path or node_title}"
    )
    context_lines, _, _, _ = await retrieve_context(question, notebook_object_id, user)
    context_text = compact_context(context_lines, max_chars=4200)
    system_message, user_message = build_node_detail_prompt(
        topic,
        node_title,
        context_text,
        lineage_titles=lineage_titles,
        children_titles=children_titles,
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=MindmapNodeDetailLLM.model_json_schema(),
        method="json_schema",
    )
    try:
        payload = await asyncio.to_thread(
            structured_llm.invoke,
            [system_message, user_message],
        )
        payload_data = coerce_payload(payload, MindmapNodeDetailLLM)
        return normalize_detail_explanation(payload_data.get("explanation"), node_title)
    except Exception as exc:
        logger.exception("Detalle mindmap invalido", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar la explicacion del nodo",
        ) from exc
