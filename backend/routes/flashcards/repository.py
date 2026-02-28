import hashlib
from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db import db
from ...schemas.flashcards import FlashcardOut, FlashcardSetOut, FlashcardsOut
from ..notebook_access import resolve_notebook_access
from .normalization import (
    coerce_text,
    normalize_definition,
    normalize_set_title,
    normalize_term,
    normalize_topic_prompt,
)


async def get_notebook_or_404(notebook_id: str, user: dict) -> dict:
    access = await resolve_notebook_access(notebook_id, user)
    return access.notebook


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
        notebook_object_id,
        owner_id,
        db_client=db_client,
    )
    fingerprint = build_sources_fingerprint(title, documents)
    return fingerprint, len(documents)


def map_cards_to_out(cards_data: object) -> list[FlashcardOut]:
    if not isinstance(cards_data, list):
        return []

    cards_out: list[FlashcardOut] = []
    for index, raw_card in enumerate(cards_data, start=1):
        if not isinstance(raw_card, dict):
            continue
        card_id = coerce_text(raw_card.get("id")) or f"card-{index}"
        term = normalize_term(raw_card.get("term"), index)
        definition = normalize_definition(raw_card.get("definition"), term)
        cards_out.append(
            FlashcardOut(
                id=card_id,
                term=term,
                definition=definition,
            )
        )
    return cards_out


def map_set_to_out(
    flashcards_doc: dict,
    *,
    index: int,
    current_fingerprint: str,
    notebook_title: str,
) -> FlashcardSetOut:
    cards_out = map_cards_to_out(flashcards_doc.get("cards"))
    generated_at = flashcards_doc.get("updated_at") or flashcards_doc.get("created_at")
    raw_card_count = coerce_text(flashcards_doc.get("card_count"))
    raw_difficulty = coerce_text(flashcards_doc.get("difficulty"))
    card_count = (
        raw_card_count if raw_card_count in {"less", "default", "more"} else "default"
    )
    difficulty = (
        raw_difficulty if raw_difficulty in {"easy", "medium", "hard"} else "medium"
    )
    topic_prompt = normalize_topic_prompt(flashcards_doc.get("topic_prompt"))
    set_id = coerce_text(flashcards_doc.get("set_id")) or f"legacy-{index}"
    set_title = normalize_set_title(
        flashcards_doc.get("set_title"),
        topic_prompt=topic_prompt,
        notebook_title=notebook_title,
    )
    status = (
        "ready"
        if coerce_text(flashcards_doc.get("sources_fingerprint")) == current_fingerprint
        else "stale"
    )

    return FlashcardSetOut(
        set_id=set_id,
        set_title=set_title,
        status=status,
        generated_at=generated_at,
        card_count=card_count,
        difficulty=difficulty,
        topic_prompt=topic_prompt,
        cards=cards_out,
    )


def build_flashcards_out(
    notebook_id: str,
    has_ready_sources: bool,
    status_value: str,
    flashcards_docs: list[dict],
    current_fingerprint: str,
    notebook_title: str,
) -> FlashcardsOut:
    sets_out = [
        map_set_to_out(
            flashcards_doc,
            index=index,
            current_fingerprint=current_fingerprint,
            notebook_title=notebook_title,
        )
        for index, flashcards_doc in enumerate(flashcards_docs, start=1)
    ]

    status_normalized = (
        status_value if status_value in ("missing", "ready", "stale") else "missing"
    )

    return FlashcardsOut(
        notebook_id=notebook_id,
        has_ready_sources=has_ready_sources,
        status=status_normalized,
        sets=sets_out,
    )
