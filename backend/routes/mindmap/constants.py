from __future__ import annotations

from pydantic import BaseModel, Field


TECHNICAL_MAX_NODES = 120
TECHNICAL_MAX_DEPTH = 8
TECHNICAL_MAX_CHILDREN_PER_NODE = 12
FALLBACK_CHILD_TITLES = [
    "Fundamentos",
    "Conceptos clave",
    "Aplicaciones",
]

TITLES_SCHEMA = (
    "{\n"
    '  "title": "string",\n'
    '  "children": [\n'
    "    {\n"
    '      "title": "string",\n'
    '      "children": [\n'
    "        {\n"
    '          "title": "string",\n'
    '          "children": []\n'
    "        }\n"
    "      ]\n"
    "    }\n"
    "  ]\n"
    "}\n"
)

DETAIL_SCHEMA = '{\n  "explanation": "string"\n}\n'


class MindmapTreeNodeLLM(BaseModel):
    title: str
    children: list["MindmapTreeNodeLLM"] = Field(default_factory=list)


class MindmapTreePayloadLLM(BaseModel):
    title: str
    children: list[MindmapTreeNodeLLM] = Field(default_factory=list)


class MindmapNodeDetailLLM(BaseModel):
    explanation: str


MindmapTreeNodeLLM.model_rebuild()
