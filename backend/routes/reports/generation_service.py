import asyncio

from bson import ObjectId
from fastapi import HTTPException, status
from pydantic import BaseModel

from ...schemas.reports import ReportFormatType, ReportSourceRef
from ..rag import create_llm, retrieve_context
from .constants import (
    MAX_REPORT_DESCRIPTION_CHARS,
    MAX_REPORT_INTRODUCTION_CHARS,
    MAX_REPORT_TITLE_CHARS,
    ReportGenerationPayloadLLM,
)
from .normalization import (
    compact_context,
    coerce_text,
    normalize_prompt,
    normalize_title,
    source_to_ref,
)
from .prompts import build_report_prompt


async def generate_report_payload(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    notebook_object_id: ObjectId,
    user: dict,
) -> tuple[str, str, str, list[ReportSourceRef]]:
    context_lines, sources, _, _ = await retrieve_context(
        f"Informacion para informe de {notebook_title}",
        notebook_object_id,
        user,
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_report_prompt(
        notebook_title, format_type, prompt, context_text
    )
    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=ReportGenerationPayloadLLM.model_json_schema(),
        method="json_schema",
    )
    payload = await asyncio.to_thread(structured_llm.invoke, [system_message, user_message])
    payload_data = (
        payload.model_dump()
        if isinstance(payload, BaseModel)
        else payload
        if isinstance(payload, dict)
        else ReportGenerationPayloadLLM.model_validate(payload).model_dump()
    )
    title = normalize_title(coerce_text(payload_data.get("title")))[:MAX_REPORT_TITLE_CHARS]
    description = normalize_prompt(coerce_text(payload_data.get("description")))[:MAX_REPORT_DESCRIPTION_CHARS]
    introduction = coerce_text(payload_data.get("introduction")).strip()[:MAX_REPORT_INTRODUCTION_CHARS]
    content = coerce_text(payload_data.get("content")).strip()

    if not title or not description or not introduction or not content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar la metadata del informe",
        )

    full_content = f"# {title}\n\n{introduction}\n\n{content}"
    return (
        title,
        description,
        full_content,
        [source_to_ref(source) for source in sources],
    )
