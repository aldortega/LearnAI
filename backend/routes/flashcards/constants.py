from pydantic import BaseModel, Field


CARD_COUNT_VALUES = {
    "less": 8,
    "default": 10,
    "more": 12,
}

DIFFICULTY_LABELS = {
    "easy": "facil",
    "medium": "medio",
    "hard": "dificil",
}

DIFFICULTY_GUIDANCE = {
    "easy": "Usa definiciones directas y terminos basicos.",
    "medium": "Usa definiciones con precision conceptual y una idea aplicada.",
    "hard": "Usa definiciones mas tecnicas y matices relevantes del concepto.",
}

MAX_CONTEXT_CHARS = 5500
MAX_TOPIC_PROMPT_CHARS = 500
MAX_TERM_CHARS = 80
MAX_DEFINITION_CHARS = 280
MIN_DEFINITION_CHARS = 24
MAX_EXPLANATION_MARKDOWN_CHARS = 2400

FLASHCARDS_SCHEMA = (
    "{\n"
    '  "cards": [\n'
    "    {\n"
    '      "term": "string",\n'
    '      "definition": "string"\n'
    "    }\n"
    "  ]\n"
    "}\n"
)


class FlashcardLLM(BaseModel):
    term: str
    definition: str


class FlashcardsPayloadLLM(BaseModel):
    cards: list[FlashcardLLM] = Field(min_length=1, max_length=20)
