from pydantic import BaseModel, Field

from ...schemas.audio import AudioDuration, AudioFormatType


SUGGESTION_COUNT = 4
MAX_CONTEXT_CHARS = 5500
MAX_PODCAST_TITLE_CHARS = 120
MAX_PODCAST_DESCRIPTION_CHARS = 180
MAX_TOPIC_CHARS = 500
MAX_SCRIPT_SEGMENTS = 80
MAX_SEGMENT_CHARS = 1200

SPEAKER_HOST_A = "Anfitrion A"
SPEAKER_HOST_B = "Anfitrion B"
SPEAKER_NARRATOR = "Narrador"


AUDIO_FORMAT_CONFIGS: dict[AudioFormatType, dict[str, str]] = {
    "deep_dive": {
        "label": "Analisis en profundidad",
        "description": (
            "Una animada conversacion entre dos presentadores que analizan y conectan "
            "temas presentes en tus fuentes."
        ),
    },
    "brief": {
        "label": "Breve resumen",
        "description": (
            "Una descripcion concisa para comprender rapidamente las ideas principales "
            "de tus fuentes."
        ),
    },
    "critique": {
        "label": "Critica",
        "description": (
            "Analisis experto de tus fuentes con comentarios constructivos para ayudarte "
            "a mejorar tu material."
        ),
    },
    "debate": {
        "label": "Debate",
        "description": (
            "Un debate reflexivo entre dos presentadores que arroja luz sobre diferentes "
            "perspectivas respecto a tus fuentes."
        ),
    },
}


AUDIO_DURATION_CONFIGS: dict[AudioDuration, dict[str, object]] = {
    "short": {
        "label": "Corto",
        "min_segments": 6,
        "max_segments": 12,
        "target_minutes": "3 a 5 minutos",
        "target_words": "450 a 750 palabras",
    },
    "default": {
        "label": "Por defecto",
        "min_segments": 14,
        "max_segments": 24,
        "target_minutes": "7 a 10 minutos",
        "target_words": "1100 a 1500 palabras",
    },
    "long": {
        "label": "Largo",
        "min_segments": 28,
        "max_segments": 48,
        "target_minutes": "15 a 20 minutos",
        "target_words": "2300 a 3000 palabras",
    },
}


# Voces oficiales del modelo TTS de Gemini.
AUDIO_VOICE_CONFIGS: dict[AudioFormatType, dict[str, str]] = {
    "deep_dive": {
        SPEAKER_HOST_A: "Kore",
        SPEAKER_HOST_B: "Puck",
    },
    "debate": {
        SPEAKER_HOST_A: "Charon",
        SPEAKER_HOST_B: "Fenrir",
    },
    "brief": {
        SPEAKER_NARRATOR: "Aoede",
    },
    "critique": {
        SPEAKER_NARRATOR: "Algieba",
    },
}


def is_multi_speaker_format(format_type: AudioFormatType) -> bool:
    return format_type in {"deep_dive", "debate"}


def speakers_for_format(format_type: AudioFormatType) -> list[str]:
    return list(AUDIO_VOICE_CONFIGS[format_type].keys())


SUGGESTIONS_SCHEMA = (
    "{\n"
    '  "suggestions": [\n'
    "    {\n"
    '      "title": "string",\n'
    '      "description": "string",\n'
    '      "default_topic": "string"\n'
    "    }\n"
    "  ]\n"
    "}\n"
)

SCRIPT_SCHEMA = (
    "{\n"
    '  "title": "string",\n'
    '  "description": "string",\n'
    '  "segments": [\n'
    "    {\n"
    '      "speaker": "string",\n'
    '      "text": "string"\n'
    "    }\n"
    "  ]\n"
    "}\n"
)


class AudioSuggestionLLM(BaseModel):
    title: str
    description: str
    default_topic: str


class AudioSuggestionsPayloadLLM(BaseModel):
    suggestions: list[AudioSuggestionLLM] = Field(min_length=1, max_length=20)


class AudioScriptSegmentLLM(BaseModel):
    speaker: str
    text: str = Field(min_length=1, max_length=MAX_SEGMENT_CHARS)


class AudioScriptPayloadLLM(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_PODCAST_TITLE_CHARS)
    description: str = Field(min_length=1, max_length=MAX_PODCAST_DESCRIPTION_CHARS)
    segments: list[AudioScriptSegmentLLM] = Field(
        min_length=1, max_length=MAX_SCRIPT_SEGMENTS
    )
