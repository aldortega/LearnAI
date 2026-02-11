from __future__ import annotations

from pydantic import BaseModel, Field


SECONDARY_NODE_COUNT = 3
TERTIARY_NODE_COUNT_PER_SECONDARY = 3
DETAIL_MAX_CHARS = 650

FALLBACK_SECONDARY_TITLES = [
    "Fundamentos",
    "Conceptos clave",
    "Aplicaciones",
]

FALLBACK_TERTIARY_TITLES = [
    "Definicion y alcance",
    "Elementos clave",
    "Caso practico",
]

TITLES_SCHEMA = (
    "{\n"
    '  "pairs": [\n'
    "    {\n"
    '      "secondary_title": "string",\n'
    '      "tertiary_title": "string"\n'
    "    }\n"
    "  ]\n"
    "}\n"
)

DETAIL_SCHEMA = (
    "{\n"
    '  "explanation": "string"\n'
    "}\n"
)


class MindmapTitlePairLLM(BaseModel):
    secondary_title: str
    tertiary_title: str


class MindmapTitlesPayloadLLM(BaseModel):
    pairs: list[MindmapTitlePairLLM] = Field(default_factory=list)


class MindmapNodeDetailLLM(BaseModel):
    explanation: str
