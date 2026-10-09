from dataclasses import dataclass, field

from bson import ObjectId

from ...schemas.rag import RagSource
from ...schemas.reports import ReportFormatType
from ..agents import invoke_structured
from ..rag import retrieve_context
from .constants import (
    MAX_REPORT_SECTIONS,
    SECTION_CONTEXT_CHARS,
    ReportOutlineLLM,
    ReportReviewLLM,
    ReportSectionDraftLLM,
    ReportSummaryLLM,
)
from .normalization import compact_context
from .prompts import (
    build_outline_prompt,
    build_review_prompt,
    build_section_prompt,
    build_summary_prompt,
)


@dataclass
class ReportSection:
    heading: str
    objective: str
    research_query: str
    notes: str = ""
    sources: list[RagSource] = field(default_factory=list)
    content: str = ""


async def plan_report(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    overview_context: str,
) -> ReportOutlineLLM:
    system_message, user_message = build_outline_prompt(
        notebook_title, format_type, prompt, overview_context
    )
    outline = await invoke_structured(ReportOutlineLLM, [system_message, user_message])
    outline.sections = outline.sections[:MAX_REPORT_SECTIONS]
    return outline


async def research_section(
    section: ReportSection,
    notebook_object_id: ObjectId,
    user: dict,
) -> None:
    context_lines, sources, _, _ = await retrieve_context(
        section.research_query,
        notebook_object_id,
        user,
        grade=True,
    )
    section.notes = compact_context(context_lines, max_chars=SECTION_CONTEXT_CHARS)
    section.sources = sources


async def write_section(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    report_title: str,
    sections: list[ReportSection],
    section_index: int,
    issues: list[str] | None = None,
) -> str:
    section = sections[section_index - 1]
    system_message, user_message = build_section_prompt(
        notebook_title=notebook_title,
        format_type=format_type,
        prompt=prompt,
        report_title=report_title,
        headings=[item.heading for item in sections],
        section_index=section_index,
        objective=section.objective,
        notes_text=section.notes,
        previous_content=section.content if issues else None,
        issues=issues,
    )
    draft = await invoke_structured(ReportSectionDraftLLM, [system_message, user_message])
    return draft.content.strip()


async def review_report(
    notebook_title: str,
    prompt: str,
    sections: list[ReportSection],
) -> dict[int, list[str]]:
    sections_text = "\n\n".join(
        f"### Seccion {index}: {section.heading}\n"
        f"Notas de fuentes:\n{section.notes}\n\n"
        f"Texto:\n{section.content}"
        for index, section in enumerate(sections, start=1)
    )
    system_message, user_message = build_review_prompt(
        notebook_title, prompt, sections_text
    )
    review = await invoke_structured(ReportReviewLLM, [system_message, user_message])

    issues_by_section: dict[int, list[str]] = {}
    for finding in review.findings:
        if 1 <= finding.section_index <= len(sections):
            issues_by_section.setdefault(finding.section_index, []).append(
                finding.issue.strip()
            )
    return issues_by_section


async def summarize_report(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    draft_title: str,
    draft_description: str,
    body_text: str,
) -> ReportSummaryLLM:
    system_message, user_message = build_summary_prompt(
        notebook_title=notebook_title,
        format_type=format_type,
        prompt=prompt,
        draft_title=draft_title,
        draft_description=draft_description,
        body_text=body_text,
    )
    return await invoke_structured(ReportSummaryLLM, [system_message, user_message])
