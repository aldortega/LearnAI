from langchain_core.messages import HumanMessage, SystemMessage

from ...schemas.audio import AudioDuration, AudioFormatType
from .constants import (
    AUDIO_DURATION_CONFIGS,
    AUDIO_FORMAT_CONFIGS,
    MAX_PODCAST_DESCRIPTION_CHARS,
    MAX_PODCAST_TITLE_CHARS,
    SCRIPT_SCHEMA,
    SPEAKER_HOST_A,
    SPEAKER_HOST_B,
    SPEAKER_NARRATOR,
    SUGGESTION_COUNT,
    SUGGESTIONS_SCHEMA,
    is_multi_speaker_format,
    speakers_for_format,
)


def build_suggestions_prompt(
    notebook_title: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio que sugiere temas atractivos para episodios de "
        "podcast educativo. Responde solo con JSON valido en espanol, sin markdown ni "
        "texto adicional. Sigue exactamente este esquema:\n"
        f"{SUGGESTIONS_SCHEMA}"
    )
    user_prompt = (
        f"Tema general de la notebook: {notebook_title}\n\n"
        f"Contexto extraido de las fuentes:\n{context_text}\n\n"
        f"Sugiere exactamente {SUGGESTION_COUNT} temas concretos y atractivos para "
        "generar un podcast educativo a partir de estas fuentes. Cada sugerencia debe "
        "incluir un titulo corto y llamativo, una descripcion breve (1-2 oraciones) y "
        "un campo `default_topic` con una formulacion lista para usar como input de tema."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def _format_guidance(format_type: AudioFormatType) -> str:
    guidance: dict[AudioFormatType, str] = {
        "deep_dive": (
            f"Conversacion fluida entre {SPEAKER_HOST_A} y {SPEAKER_HOST_B}. Alternan "
            "turnos cortos y medianos, exploran conexiones entre conceptos, hacen "
            "preguntas, retoman ideas, dan ejemplos y cierran con una sintesis."
        ),
        "debate": (
            f"Debate reflexivo entre {SPEAKER_HOST_A} y {SPEAKER_HOST_B}. Cada uno "
            "defiende una postura diferente sobre el tema, presenta argumentos "
            "fundamentados en el contexto, refuta al otro con respeto y cierran con un "
            "punto de acuerdo o reflexion abierta."
        ),
        "brief": (
            f"Narracion unica por {SPEAKER_NARRATOR}. Tono claro y didactico, ritmo "
            "agil, explica las ideas principales sin redundancias y termina con una "
            "conclusion breve."
        ),
        "critique": (
            f"Analisis experto narrado por {SPEAKER_NARRATOR}. Tono profesional, "
            "evalua fortalezas y debilidades del material, identifica supuestos, "
            "ofrece criticas constructivas y sugerencias accionables."
        ),
    }
    return guidance[format_type]


def build_script_prompt(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    topic: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    duration_cfg = AUDIO_DURATION_CONFIGS[duration]
    format_cfg = AUDIO_FORMAT_CONFIGS[format_type]
    speakers = speakers_for_format(format_type)
    speakers_line = ", ".join(speakers)

    if is_multi_speaker_format(format_type):
        speaker_rule = (
            f"Usa unicamente estos dos hablantes en el campo `speaker`: {speakers_line}. "
            "Alterna entre ambos en cada segmento (no permitas mas de dos turnos seguidos "
            "del mismo hablante)."
        )
    else:
        speaker_rule = (
            f"Usa siempre {speakers[0]} como valor del campo `speaker` en todos los "
            "segmentos."
        )

    system_prompt = (
        "Eres un guionista de podcasts educativos en espanol neutro. Devuelves solo "
        "JSON valido sin markdown ni comentarios. El guion debe basarse en el contexto "
        "de fuentes proporcionado; si falta informacion, complementa con conocimiento "
        "general pero sin inventar citas textuales. Cada segmento contiene unicamente "
        "texto hablado natural (sin acotaciones entre parentesis, sin markdown, sin "
        "anotaciones de sonido). Evita decir el nombre del hablante dentro del texto.\n"
        f"Sigue exactamente este esquema:\n{SCRIPT_SCHEMA}\n"
        f"Formato: {format_cfg['label']} - {format_cfg['description']}\n"
        f"Directriz de formato: {_format_guidance(format_type)}\n"
        f"{speaker_rule}"
    )

    topic_line = (
        f"Tema especifico solicitado por el usuario: {topic}\n"
        if topic
        else "Tema especifico: no especificado, definelo a partir del contexto y del titulo de la notebook.\n"
    )

    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"{topic_line}"
        f"Duracion objetivo: {duration_cfg['target_minutes']} "
        f"(~{duration_cfg['target_words']}). "
        f"Cantidad de segmentos: entre {duration_cfg['min_segments']} y "
        f"{duration_cfg['max_segments']}.\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Genera:\n"
        f"- `title`: titulo breve del episodio (max {MAX_PODCAST_TITLE_CHARS} chars).\n"
        f"- `description`: gancho de 1-2 oraciones (max {MAX_PODCAST_DESCRIPTION_CHARS} chars).\n"
        "- `segments`: arreglo ordenado de turnos hablados respetando la directriz de formato."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
