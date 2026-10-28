import logging
from collections.abc import Awaitable, Callable

from bson import ObjectId
from fastapi import HTTPException, status

from ...config import LLMProvider
from ...llm import is_transient_llm_error
from ...schemas.rag import RagSource
from ...schemas.reports import ReportFormatType, ReportGenerationStage, ReportSourceRef
from ..agents import gather_limited
from ..rag import retrieve_context
from .agents import (
    ReportSection,
    plan_report,
    research_section,
    review_report,
    summarize_report,
    write_section,
)
from .constants import (
    MAX_PARALLEL_AGENTS,
    MAX_REPORT_DESCRIPTION_CHARS,
    MAX_REPORT_INTRODUCTION_CHARS,
    MAX_REPORT_TITLE_CHARS,
    MAX_REVIEW_ROUNDS,
    MAX_SECTION_RETRIES,
    OVERVIEW_CONTEXT_CHARS,
    SUMMARY_BODY_CHARS,
)
from .normalization import (
    compact_context,
    normalize_prompt,
    normalize_title,
    source_to_ref,
)

logger = logging.getLogger(__name__)

ReportStageCallback = Callable[[ReportGenerationStage], Awaitable[None]]


def _generation_error(detail: str = "No se pudo generar el informe") -> HTTPException:
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


def _merge_sources(source_groups: list[list[RagSource]]) -> list[ReportSourceRef]:
    merged: list[ReportSourceRef] = []
    seen: set[tuple[str, int]] = set()
    for group in source_groups:
        for source in group:
            key = (source.document_id, source.chunk_id)
            if key in seen:
                continue
            seen.add(key)
            merged.append(source_to_ref(source))
    return merged


async def _write_with_retry(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    report_title: str,
    sections: list[ReportSection],
    section_index: int,
    provider: LLMProvider,
    issues: list[str] | None = None,
) -> str:
    last_exc: Exception | None = None
    for _ in range(MAX_SECTION_RETRIES + 1):
        try:
            return await write_section(
                notebook_title,
                format_type,
                prompt,
                report_title,
                sections,
                section_index,
                provider,
                issues,
            )
        except Exception as exc:
            if isinstance(exc, HTTPException) and not is_transient_llm_error(
                provider, exc
            ):
                raise
            last_exc = exc
            logger.warning(
                "Fallo al redactar seccion de informe",
                extra={"section_index": section_index, "error": str(exc)},
            )
    raise last_exc or _generation_error()


async def _rewrite_flagged_sections(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    report_title: str,
    sections: list[ReportSection],
    issues_by_section: dict[int, list[str]],
    provider: LLMProvider,
) -> None:
    section_indices = list(issues_by_section)
    results = await gather_limited(
        [
            _write_with_retry(
                notebook_title,
                format_type,
                prompt,
                report_title,
                sections,
                section_index,
                provider,
                issues_by_section[section_index],
            )
            for section_index in section_indices
        ],
        MAX_PARALLEL_AGENTS,
    )
    for section_index, result in zip(section_indices, results):
        if isinstance(result, str) and result:
            sections[section_index - 1].content = result
        else:
            logger.warning(
                "Se conserva el borrador original de la seccion",
                extra={"section_index": section_index},
            )


async def generate_report_payload(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    notebook_object_id: ObjectId,
    user: dict,
    provider: LLMProvider,
    on_stage: ReportStageCallback | None = None,
) -> tuple[str, str, str, list[ReportSourceRef]]:
    async def notify(stage: ReportGenerationStage) -> None:
        if on_stage is not None:
            await on_stage(stage)

    await notify("planning")
    overview_lines, overview_sources, _, _ = await retrieve_context(
        f"Informacion para informe de {notebook_title}: {prompt}",
        notebook_object_id,
        user,
    )
    outline = await plan_report(
        notebook_title,
        format_type,
        prompt,
        compact_context(overview_lines, max_chars=OVERVIEW_CONTEXT_CHARS),
        provider,
    )
    sections = [
        ReportSection(
            heading=normalize_title(item.heading),
            objective=normalize_prompt(item.objective),
            research_query=normalize_prompt(item.research_query),
        )
        for item in outline.sections
    ]
    report_title = normalize_title(outline.title)

    await notify("researching")
    research_results = await gather_limited(
        [
            research_section(section, notebook_object_id, user, provider)
            for section in sections
        ],
        MAX_PARALLEL_AGENTS,
    )
    failed_research = [
        result for result in research_results if isinstance(result, BaseException)
    ]
    if len(failed_research) == len(sections):
        first_error = failed_research[0]
        if isinstance(first_error, HTTPException):
            raise first_error
        raise _generation_error()
    for section, result in zip(sections, research_results):
        if isinstance(result, BaseException):
            logger.warning(
                "Fallo la busqueda de una seccion",
                extra={"heading": section.heading, "error": str(result)},
            )
            section.notes = compact_context([])

    await notify("writing")
    draft_results = await gather_limited(
        [
            _write_with_retry(
                notebook_title,
                format_type,
                prompt,
                report_title,
                sections,
                index,
                provider,
            )
            for index in range(1, len(sections) + 1)
        ],
        MAX_PARALLEL_AGENTS,
    )
    for section, result in zip(sections, draft_results):
        if not isinstance(result, str) or not result:
            if isinstance(result, HTTPException):
                raise result
            raise _generation_error()
        section.content = result

    await notify("reviewing")
    for _ in range(MAX_REVIEW_ROUNDS):
        try:
            issues_by_section = await review_report(
                notebook_title, prompt, sections, provider
            )
        except Exception as exc:
            logger.warning("Fallo la revision del informe", extra={"error": str(exc)})
            break
        if not issues_by_section:
            break
        await _rewrite_flagged_sections(
            notebook_title,
            format_type,
            prompt,
            report_title,
            sections,
            issues_by_section,
            provider,
        )

    await notify("summarizing")
    body_text = "\n\n".join(
        f"## {section.heading}\n\n{section.content}" for section in sections
    )
    summary = await summarize_report(
        notebook_title,
        format_type,
        prompt,
        report_title,
        normalize_prompt(outline.description),
        body_text[:SUMMARY_BODY_CHARS],
        provider,
    )

    await notify("assembling")
    title = normalize_title(summary.title)[:MAX_REPORT_TITLE_CHARS]
    description = normalize_prompt(summary.description)[:MAX_REPORT_DESCRIPTION_CHARS]
    introduction = summary.introduction.strip()[:MAX_REPORT_INTRODUCTION_CHARS]
    if not title or not description or not introduction or not body_text.strip():
        raise _generation_error("No se pudo generar la metadata del informe")

    full_content = f"# {title}\n\n{introduction}\n\n{body_text}"
    return (
        title,
        description,
        full_content,
        _merge_sources(
            [overview_sources] + [section.sources for section in sections]
        ),
    )
