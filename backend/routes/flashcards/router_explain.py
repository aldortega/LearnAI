from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from ...db import db
from ...schemas.flashcards import FlashcardExplainOut, FlashcardExplainRequest
from ..auth import get_current_user
from .explain_service import generate_flashcard_explanation_markdown
from .normalization import coerce_text, normalize_definition, normalize_term
from .repository import compute_sources_fingerprint, get_notebook_or_404

router = APIRouter(tags=["flashcards"])


def resolve_requested_card(cards_data: object, requested_card_id: str) -> tuple[str, str]:
    if not isinstance(cards_data, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La tarjeta solicitada no es valida",
        )

    for index, raw_card in enumerate(cards_data, start=1):
        if not isinstance(raw_card, dict):
            continue
        card_id = coerce_text(raw_card.get("id")) or f"card-{index}"
        if card_id != requested_card_id:
            continue
        term = normalize_term(raw_card.get("term"), index)
        definition = normalize_definition(raw_card.get("definition"), term)
        return term, definition

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No se encontro la flashcard solicitada",
    )


async def resolve_flashcards_set_doc(
    notebook_id: object,
    owner_id: object,
    requested_set_id: str,
) -> dict:
    flashcards_doc = await db.flashcard_sets.find_one(
        {
            "owner_id": owner_id,
            "notebook_id": notebook_id,
            "set_id": requested_set_id,
        }
    )
    if flashcards_doc:
        return flashcards_doc

    if requested_set_id.startswith("legacy-"):
        legacy_docs = [
            doc
            async for doc in db.flashcard_sets.find(
                {
                    "owner_id": owner_id,
                    "notebook_id": notebook_id,
                    "set_id": {"$exists": False},
                }
            ).sort("created_at", 1)
        ]
        try:
            legacy_index = int(requested_set_id.removeprefix("legacy-")) - 1
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Set de flashcards no encontrado",
            ) from exc
        if 0 <= legacy_index < len(legacy_docs):
            return legacy_docs[legacy_index]

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Set de flashcards no encontrado",
    )


@router.post(
    "/{notebook_id}/flashcards/explain",
    response_model=FlashcardExplainOut,
)
async def explain_flashcard(
    notebook_id: str,
    payload: FlashcardExplainRequest,
    request: Request,
) -> FlashcardExplainOut:
    user = await get_current_user(request)
    notebook = await get_notebook_or_404(notebook_id, user)

    flashcards_doc = await resolve_flashcards_set_doc(
        notebook_id=notebook["_id"],
        owner_id=user["_id"],
        requested_set_id=payload.set_id.strip(),
    )

    fingerprint, ready_count = await compute_sources_fingerprint(
        notebook["title"],
        notebook["_id"],
        notebook["owner_id"],
    )
    if ready_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Necesitas al menos una fuente lista para explicar flashcards",
        )

    term, definition = resolve_requested_card(
        flashcards_doc.get("cards"),
        payload.card_id.strip(),
    )

    detail_filter = {
        "owner_id": user["_id"],
        "notebook_id": notebook["_id"],
        "set_id": payload.set_id.strip(),
        "card_id": payload.card_id.strip(),
        "sources_fingerprint": fingerprint,
    }

    cached_detail = await db.flashcard_explanations.find_one(detail_filter)
    if cached_detail:
        cached_markdown = coerce_text(cached_detail.get("explanation_markdown")).strip()
        cached_term = coerce_text(cached_detail.get("term")).strip()
        cached_definition = coerce_text(cached_detail.get("definition")).strip()
        if cached_markdown and cached_term == term and cached_definition == definition:
            generated_at = cached_detail.get("updated_at") or cached_detail.get(
                "created_at"
            )
            if isinstance(generated_at, datetime):
                return FlashcardExplainOut(
                    card_id=payload.card_id.strip(),
                    explanation_markdown=cached_markdown,
                    cached=True,
                    generated_at=generated_at,
                )

    explanation_markdown = await generate_flashcard_explanation_markdown(
        notebook_title=coerce_text(notebook.get("title")),
        term=term,
        definition=definition,
        notebook_object_id=notebook["_id"],
        user=user,
    )
    now = datetime.now(timezone.utc)
    await db.flashcard_explanations.update_one(
        detail_filter,
        {
            "$set": {
                "owner_id": user["_id"],
                "notebook_id": notebook["_id"],
                "set_id": payload.set_id.strip(),
                "card_id": payload.card_id.strip(),
                "term": term,
                "definition": definition,
                "sources_fingerprint": fingerprint,
                "explanation_markdown": explanation_markdown,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    return FlashcardExplainOut(
        card_id=payload.card_id.strip(),
        explanation_markdown=explanation_markdown,
        cached=False,
        generated_at=now,
    )
