import asyncio

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from ...config import LLMProvider
from ...llm import GRADING_TEMPERATURE, create_chat_model

GRADER_SYSTEM_PROMPT = (
    "Sos un evaluador de relevancia para un sistema RAG educativo. "
    "Recibis una consulta y una lista de fragmentos numerados extraidos de "
    "los documentos del usuario. Marca un fragmento como relevante solo si "
    "contiene informacion que ayuda directamente a responder la consulta o "
    "a desarrollar el tema que pide. Un fragmento que solo comparte palabras "
    "o el tema general del documento, pero no aporta a la consulta, no es "
    "relevante. Evalua cada fragmento de forma independiente y devuelve una "
    "calificacion por cada indice recibido."
)


class ChunkGrade(BaseModel):
    index: int
    relevant: bool


class ChunkGrades(BaseModel):
    grades: list[ChunkGrade] = Field(default_factory=list)


def build_grader_messages(
    question: str, candidates: list[dict]
) -> list[SystemMessage | HumanMessage]:
    fragments = "\n\n".join(
        f"[{index}] {candidate.get('text', '')}"
        for index, candidate in enumerate(candidates)
    )
    user_prompt = f"Consulta:\n{question}\n\nFragmentos:\n{fragments}"
    return [SystemMessage(content=GRADER_SYSTEM_PROMPT), HumanMessage(content=user_prompt)]


async def grade_candidates(
    question: str,
    candidates: list[dict],
    provider: LLMProvider,
    model_name: str | None = None,
) -> list[dict]:
    if not candidates:
        return []
    grader = create_chat_model(provider, GRADING_TEMPERATURE, model_name).with_structured_output(
        schema=ChunkGrades.model_json_schema(),
        method="json_schema",
    )
    payload = await asyncio.to_thread(
        grader.invoke, build_grader_messages(question, candidates)
    )
    if isinstance(payload, BaseModel):
        payload = payload.model_dump()
    result = ChunkGrades.model_validate(payload)
    relevant_indices = {
        grade.index
        for grade in result.grades
        if grade.relevant and 0 <= grade.index < len(candidates)
    }
    return [
        candidate
        for index, candidate in enumerate(candidates)
        if index in relevant_indices
    ]
