from pydantic import BaseModel, Field

from ...schemas.presentations import PresentationStyle


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

PRESENTATION_STYLE_CONFIGS: dict[PresentationStyle, dict[str, str]] = {
    "clean": {
        "label": "Limpio",
        "description": "Minimalista y legible, ideal para explicar con claridad.",
        "guidance": "Paleta clara, jerarquia visual limpia y enfoque didactico.",
    },
    "corporate": {
        "label": "Corporativo",
        "description": "Estructura ejecutiva con tono profesional.",
        "guidance": "Mensaje formal, enfoque en decisiones y resultados.",
    },
    "creative": {
        "label": "Creativo",
        "description": "Narrativa dinamica con ideas memorables.",
        "guidance": "Tono inspirador, framing narrativo y ejemplos potentes.",
    },
    "academic": {
        "label": "Academico",
        "description": "Orden analitico con rigor conceptual.",
        "guidance": "Definiciones precisas, comparaciones y fundamento conceptual.",
    },
    "minimal": {
        "label": "Minimal",
        "description": "Mensajes cortos y directos para exponer oralmente.",
        "guidance": "Texto sintetico, foco en ideas clave y alto contraste.",
    },
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
    content_markdown: str = Field(min_length=1, max_length=MAX_SLIDE_CONTENT_MARKDOWN_CHARS)


class PresentationGenerationPayloadLLM(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_PRESENTATION_TITLE_CHARS)
    summary: str = Field(min_length=1, max_length=MAX_PRESENTATION_SUMMARY_CHARS)
    slides: list[PresentationSlideLLM] = Field(min_length=1, max_length=MAX_SLIDES)
