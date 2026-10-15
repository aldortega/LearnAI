from pydantic import BaseModel, Field

from ...schemas.presentations import PresentationGenerationStage


MAX_CONTEXT_CHARS = 5500
MAX_PRESENTATION_TITLE_CHARS = 120
MAX_PRESENTATION_SUMMARY_CHARS = 220
MAX_SLIDE_TITLE_CHARS = 90
MAX_SLIDE_SUBTITLE_CHARS = 140
MAX_SLIDE_CONTENT_MARKDOWN_CHARS = 2600
MAX_SLIDES = 12
MIN_SLIDES = 6

DETAIL_SLIDE_COUNT_TARGETS: dict[str, tuple[int, int]] = {
    "concise": (6, 8),
    "detailed": (10, 12),
}

MAX_PARALLEL_AGENTS = 3
MAX_REVIEW_ROUNDS = 1
MAX_SLIDE_RETRIES = 1
SLIDE_CONTEXT_CHARS = 2500
OVERVIEW_CONTEXT_CHARS = 2500

PRESENTATION_STAGE_PROGRESS: dict[PresentationGenerationStage, int] = {
    "planning": 5,
    "researching": 20,
    "writing": 45,
    "reviewing": 70,
    "illustrating": 80,
    "assembling": 95,
}

MAX_PARALLEL_IMAGES = 2
MAX_IMAGE_RETRIES = 1
MAX_SLIDE_LABELS = 5
MAX_SLIDE_LABEL_CHARS = 60
MAX_STYLE_GUIDE_CHARS = 600
MAX_IMAGE_PROMPT_CHARS = 500

PRESENTATION_GENERATION_SCHEMA = (
    "{\n"
    '  "title": "string",\n'
    '  "summary": "string",\n'
    '  "slides": [\n'
    "    {\n"
    '      "title": "string",\n'
    '      "subtitle": "string | null",\n'
    '      "content_markdown": "string"\n'
    "    }\n"
    "  ]\n"
    "}\n"
)


class PresentationSlideLLM(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_SLIDE_TITLE_CHARS)
    subtitle: str | None = Field(default=None, max_length=MAX_SLIDE_SUBTITLE_CHARS)
    content_markdown: str = Field(
        min_length=1, max_length=MAX_SLIDE_CONTENT_MARKDOWN_CHARS
    )


class PresentationGenerationPayloadLLM(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_PRESENTATION_TITLE_CHARS)
    summary: str = Field(min_length=1, max_length=MAX_PRESENTATION_SUMMARY_CHARS)
    slides: list[PresentationSlideLLM] = Field(min_length=1, max_length=MAX_SLIDES)


class PresentationOutlineSlideLLM(BaseModel):
    title: str = Field(min_length=1)
    objective: str = Field(min_length=1)
    research_query: str = Field(min_length=1)


class PresentationOutlineLLM(BaseModel):
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    slides: list[PresentationOutlineSlideLLM] = Field(min_length=1)


class PresentationSlideDraftLLM(BaseModel):
    subtitle: str | None = None
    content_markdown: str = Field(min_length=1)


class PresentationReviewFindingLLM(BaseModel):
    slide_index: int
    issue: str = Field(min_length=1)


class PresentationReviewLLM(BaseModel):
    findings: list[PresentationReviewFindingLLM]


class PresentationVisualOutlineLLM(PresentationOutlineLLM):
    style_guide: str = Field(min_length=1)


class PresentationSceneLLM(BaseModel):
    subtitle: str | None = None
    image_prompt: str = Field(min_length=1)
    labels: list[str] = Field(default_factory=list)
