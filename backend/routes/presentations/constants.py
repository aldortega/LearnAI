from pydantic import BaseModel, Field


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


class PresentationImageSlideLLM(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_SLIDE_TITLE_CHARS)
    subtitle: str | None = Field(default=None, max_length=MAX_SLIDE_SUBTITLE_CHARS)
    image_prompt: str = Field(min_length=1, max_length=500)


class PresentationImagePayloadLLM(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_PRESENTATION_TITLE_CHARS)
    summary: str = Field(min_length=1, max_length=MAX_PRESENTATION_SUMMARY_CHARS)
    slides: list[PresentationImageSlideLLM] = Field(min_length=1, max_length=MAX_SLIDES)
