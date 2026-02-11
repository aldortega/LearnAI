from datetime import datetime, timezone
import json
import time

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse

from ...db import db
from ...schemas.rag import (
    ChatMessageCreate,
    ChatMessageOut,
    ConversationOut,
    RagQueryRequest,
    RagResponse,
)
from ..auth import get_current_user
from .service import (
    build_source_summaries,
    conversation_to_out,
    ensure_conversation,
    generate_answer,
    get_notebook_object_id,
    message_to_out,
    record_rag_query,
    retrieve_context,
    run_rag_query,
    stream_answer,
)

router = APIRouter(prefix="/notebooks", tags=["rag"])


@router.post("/{notebook_id}/query", response_model=RagResponse)
async def query_notebook(
    notebook_id: str, payload: RagQueryRequest, request: Request
) -> RagResponse:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)

    question = payload.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Pregunta invalida"
        )

    answer_text, sources, _, _, _ = await run_rag_query(
        question, notebook_object_id, user, payload.top_k
    )
    return RagResponse(answer=answer_text, sources=sources)


@router.get("/{notebook_id}/conversation", response_model=ConversationOut)
async def get_conversation(notebook_id: str, request: Request) -> ConversationOut:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)
    conversation = await ensure_conversation(notebook_object_id, user["_id"])
    return conversation_to_out(conversation)


@router.get("/{notebook_id}/conversation/messages", response_model=list[ChatMessageOut])
async def list_conversation_messages(
    notebook_id: str, request: Request
) -> list[ChatMessageOut]:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)
    conversation = await ensure_conversation(notebook_object_id, user["_id"])

    cursor = db.rag_messages.find(
        {
            "conversation_id": conversation["_id"],
            "notebook_id": notebook_object_id,
            "owner_id": user["_id"],
        }
    ).sort("created_at", 1)
    return [message_to_out(message) async for message in cursor]


@router.delete(
    "/{notebook_id}/conversation/messages", status_code=status.HTTP_204_NO_CONTENT
)
async def clear_conversation_messages(notebook_id: str, request: Request) -> None:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)
    conversation = await ensure_conversation(notebook_object_id, user["_id"])

    await db.rag_messages.delete_many(
        {
            "conversation_id": conversation["_id"],
            "notebook_id": notebook_object_id,
            "owner_id": user["_id"],
        }
    )

    return None


@router.post("/{notebook_id}/conversation/messages", response_model=ChatMessageOut)
async def create_conversation_message(
    notebook_id: str, payload: ChatMessageCreate, request: Request
) -> ChatMessageOut:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)
    conversation = await ensure_conversation(notebook_object_id, user["_id"])

    question = payload.content.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Pregunta invalida"
        )

    now = datetime.now(timezone.utc)
    user_message_doc = {
        "owner_id": user["_id"],
        "notebook_id": notebook_object_id,
        "conversation_id": conversation["_id"],
        "role": "user",
        "content": question,
        "sources": [],
        "created_at": now,
    }
    await db.rag_messages.insert_one(user_message_doc)

    answer_text, sources, _, _, _ = await run_rag_query(
        question, notebook_object_id, user
    )
    source_summaries = build_source_summaries(sources)
    assistant_message_doc = {
        "owner_id": user["_id"],
        "notebook_id": notebook_object_id,
        "conversation_id": conversation["_id"],
        "role": "assistant",
        "content": answer_text,
        "sources": source_summaries,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.rag_messages.insert_one(assistant_message_doc)
    assistant_message_doc["_id"] = result.inserted_id

    return message_to_out(assistant_message_doc)


@router.post("/{notebook_id}/conversation/messages/stream")
async def stream_conversation_message(
    notebook_id: str, payload: ChatMessageCreate, request: Request
) -> StreamingResponse:
    user = await get_current_user(request)
    notebook_object_id = await get_notebook_object_id(notebook_id, user)
    conversation = await ensure_conversation(notebook_object_id, user["_id"])

    question = payload.content.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Pregunta invalida"
        )

    now = datetime.now(timezone.utc)
    user_message_doc = {
        "owner_id": user["_id"],
        "notebook_id": notebook_object_id,
        "conversation_id": conversation["_id"],
        "role": "user",
        "content": question,
        "sources": [],
        "created_at": now,
    }
    await db.rag_messages.insert_one(user_message_doc)

    async def event_generator():
        start = time.perf_counter()
        try:
            (
                context_lines,
                sources,
                document_ids,
                selected_top_k,
            ) = await retrieve_context(question, notebook_object_id, user)
        except HTTPException as exc:
            detail = (
                exc.detail
                if isinstance(exc.detail, str)
                else "No se pudo generar respuesta"
            )
            error_payload = json.dumps({"message": detail})
            yield f"event: error\ndata: {error_payload}\n\n"
            return
        except Exception:
            error_payload = json.dumps({"message": "No se pudo generar respuesta"})
            yield f"event: error\ndata: {error_payload}\n\n"
            return

        if not context_lines:
            answer_text = await generate_answer(question, context_lines)
            await record_rag_query(
                start,
                question,
                notebook_object_id,
                user,
                document_ids,
                selected_top_k,
                sources,
            )

            source_summaries = build_source_summaries(sources)
            assistant_message_doc = {
                "owner_id": user["_id"],
                "notebook_id": notebook_object_id,
                "conversation_id": conversation["_id"],
                "role": "assistant",
                "content": answer_text,
                "sources": source_summaries,
                "created_at": now,
            }
            result = await db.rag_messages.insert_one(assistant_message_doc)
            assistant_message_doc["_id"] = result.inserted_id

            payload_chunk = json.dumps({"content": answer_text})
            yield f"event: chunk\ndata: {payload_chunk}\n\n"
            done_payload = json.dumps(
                {"message": jsonable_encoder(message_to_out(assistant_message_doc))}
            )
            yield f"event: done\ndata: {done_payload}\n\n"
            return

        answer_parts: list[str] = []
        try:
            async for chunk in stream_answer(question, context_lines):
                if chunk:
                    answer_parts.append(chunk)
                    payload_chunk = json.dumps({"content": chunk})
                    yield f"event: chunk\ndata: {payload_chunk}\n\n"
        except Exception:
            error_payload = json.dumps({"message": "No se pudo generar respuesta"})
            yield f"event: error\ndata: {error_payload}\n\n"
            return

        answer_text = "".join(answer_parts).strip()
        if not answer_text:
            answer_text = "No se pudo generar respuesta"

        await record_rag_query(
            start,
            question,
            notebook_object_id,
            user,
            document_ids,
            selected_top_k,
            sources,
        )

        source_summaries = build_source_summaries(sources)
        assistant_message_doc = {
            "owner_id": user["_id"],
            "notebook_id": notebook_object_id,
            "conversation_id": conversation["_id"],
            "role": "assistant",
            "content": answer_text,
            "sources": source_summaries,
            "created_at": datetime.now(timezone.utc),
        }
        result = await db.rag_messages.insert_one(assistant_message_doc)
        assistant_message_doc["_id"] = result.inserted_id

        done_payload = json.dumps(
            {"message": jsonable_encoder(message_to_out(assistant_message_doc))}
        )
        yield f"event: done\ndata: {done_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
