from dataclasses import dataclass


DEFAULT_UNITS_PER_ROADMAP = 5
DEFAULT_LESSONS_PER_UNIT = 3
DEFAULT_QUESTIONS_PER_LESSON = 6
DEFAULT_QUESTIONS_PER_EXAM = 12
PASSING_LESSON_SCORE = 70
PASSING_EXAM_SCORE = 75
QUESTION_GENERATION_WAIT_SECONDS = 20
QUESTION_GENERATION_POLL_SECONDS = 0.5


@dataclass(frozen=True)
class QuizGenerationConfig:
    units_per_roadmap: int
    lessons_per_unit: int
    questions_per_lesson: int
    questions_per_exam: int


LENGTH_CONFIGS: dict[str, QuizGenerationConfig] = {
    "short": QuizGenerationConfig(
        units_per_roadmap=3,
        lessons_per_unit=2,
        questions_per_lesson=4,
        questions_per_exam=8,
    ),
    "medium": QuizGenerationConfig(
        units_per_roadmap=4,
        lessons_per_unit=3,
        questions_per_lesson=5,
        questions_per_exam=10,
    ),
    "long": QuizGenerationConfig(
        units_per_roadmap=DEFAULT_UNITS_PER_ROADMAP,
        lessons_per_unit=DEFAULT_LESSONS_PER_UNIT,
        questions_per_lesson=DEFAULT_QUESTIONS_PER_LESSON,
        questions_per_exam=DEFAULT_QUESTIONS_PER_EXAM,
    ),
}

DIFFICULTY_LABELS = {
    "basic": "bÃ¡sica",
    "intermediate": "intermedia",
    "advanced": "avanzada",
}

ROADMAP_SCHEMA = (
    "{\n"
    '  "units": [\n'
    "    {\n"
    '      "title": "string",\n'
    '      "description": "string",\n'
    '      "lessons": ["string"],\n'
    '      "exam_title": "string"\n'
    "    }\n"
    "  ]\n"
    "}\n"
)

QUESTIONS_SCHEMA = (
    "{\n"
    '  "questions": [\n'
    "    {\n"
    '      "question": "string",\n'
    '      "options": [\n'
    '        {"id": "A", "text": "string"},\n'
    '        {"id": "B", "text": "string"},\n'
    '        {"id": "C", "text": "string"},\n'
    '        {"id": "D", "text": "string"}\n'
    "      ],\n"
    '      "correct_option_id": "A|B|C|D",\n'
    '      "hint": "string",\n'
    '      "explanations": {\n'
    '        "correct": "string",\n'
    '        "by_option": {"A": "string", "B": "string", "C": "string", "D": "string"}\n'
    "      }\n"
    "    }\n"
    "  ]\n"
    "}\n"
)
