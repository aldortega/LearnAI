from pydantic import BaseModel, Field


TOPIC_COUNT = 6
TOPIC_LIMIT = 12
SUGGESTION_COUNT = 8
TOPIC_MIN_KEY_POINTS = 3
TOPIC_MAX_KEY_POINTS = 5
EXPANSION_MIN_KEY_POINTS = 3
EXPANSION_MAX_KEY_POINTS = 6
EXPANSION_MIN_QUESTIONS = 2
EXPANSION_MAX_QUESTIONS = 5
EXPANSION_MIN_CONTENT_CHARS = 80

DEFAULT_TOPIC_KEY_POINTS = [
    "Definiciones y conceptos centrales",
    "Ideas o procesos principales",
    "Aplicaciones y ejemplos habituales",
]
DEFAULT_EXPANSION_KEY_POINTS = [
    "Definiciones clave y contexto",
    "Procesos o componentes esenciales",
    "Aplicaciones practicas",
]
DEFAULT_EXPANSION_QUESTIONS = [
    "Como se aplica este tema en casos reales?",
    "Cuales son los errores mas comunes?",
]

QUICKSTART_SCHEMA = (
    "{\n"
    '  "notebook_summary": "string",\n'
    '  "topics": [\n'
    "    {\n"
    '      "title": "string",\n'
    '      "summary": "string",\n'
    '      "emoji": "string",\n'
    '      "key_points": ["string"]\n'
    "    }\n"
    "  ]\n"
    "}\n"
)

EXPANSION_SCHEMA = (
    "{\n"
    '  "content": "string",\n'
    '  "key_points": ["string"],\n'
    '  "example_questions": ["string"]\n'
    "}\n"
)

SUGGESTIONS_SCHEMA = (
    "{\n"
    '  "suggestions": ["string"]\n'
    "}\n"
)

SINGLE_TOPIC_SCHEMA = (
    "{\n"
    '  "title": "string",\n'
    '  "summary": "string",\n'
    '  "emoji": "string",\n'
    '  "key_points": ["string"]\n'
    "}\n"
)

DETAIL_SCHEMA = (
    "{\n"
    '  "content": "string"\n'
    "}\n"
)


class QuickstartTopicLLM(BaseModel):
    title: str
    summary: str
    emoji: str
    key_points: list[str] = Field(min_length=1, max_length=8)


class QuickstartPayloadLLM(BaseModel):
    notebook_summary: str
    topics: list[QuickstartTopicLLM] = Field(min_length=1, max_length=12)


class QuickstartExpansionLLM(BaseModel):
    content: str
    key_points: list[str] = Field(min_length=1, max_length=10)
    example_questions: list[str] = Field(min_length=1, max_length=8)


class QuickstartSuggestionsLLM(BaseModel):
    suggestions: list[str] = Field(min_length=1, max_length=20)


class QuickstartSingleTopicLLM(BaseModel):
    title: str
    summary: str
    emoji: str
    key_points: list[str] = Field(min_length=1, max_length=8)


class QuickstartTopicDetailLLM(BaseModel):
    content: str
