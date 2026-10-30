from bson import ObjectId

from ...config import LLMProvider
from ..rag import retrieve_context
from ..rag.service import build_source_summaries, generate_answer
from .normalization import normalize_explanation_markdown
from .prompts import build_flashcard_explain_question


async def generate_flashcard_explanation_markdown(
    notebook_title: str,
    term: str,
    definition: str,
    notebook_object_id: ObjectId,
    user: dict,
    provider: LLMProvider,
) -> tuple[str, list[dict]]:
    question = build_flashcard_explain_question(
        notebook_title=notebook_title,
        term=term,
        definition=definition,
    )
    context_lines, sources, _, _ = await retrieve_context(
        question,
        notebook_object_id,
        user,
    )
    answer_text = await generate_answer(
        question, context_lines, cite=True, provider=provider
    )
    return (
        normalize_explanation_markdown(answer_text),
        build_source_summaries(sources),
    )
