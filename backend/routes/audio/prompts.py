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
        "un campo `default_topic` con una formulacion lista para usar como input de tema. "
        "Ademas elige para cada una el `format_type` que mejor encaje con el tema "
        "(`deep_dive`: conversacion que explora y conecta ideas; `brief`: resumen "
        "conciso de las ideas principales; `critique`: analisis critico del material; "
        "`debate`: contraste de posturas opuestas) y la `duration` adecuada a su "
        "alcance (`short`: 3-5 min, `default`: 7-10 min, `long`: 15-20 min). Varia los "
        "formatos entre las sugerencias cuando tenga sentido."
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


def _speaker_rule(format_type: AudioFormatType) -> str:
    speakers = speakers_for_format(format_type)
    if is_multi_speaker_format(format_type):
        return (
            f"Usa unicamente estos dos hablantes en el campo `speaker`: {', '.join(speakers)}. "
            "Alterna entre ambos en cada segmento (no permitas mas de dos turnos seguidos "
            "del mismo hablante)."
        )
    return (
        f"Usa siempre {speakers[0]} como valor del campo `speaker` en todos los "
        "segmentos."
    )


def build_script_prompt(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    topic: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    duration_cfg = AUDIO_DURATION_CONFIGS[duration]
    format_cfg = AUDIO_FORMAT_CONFIGS[format_type]
    speaker_rule = _speaker_rule(format_type)

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


def _segment_range(
    duration: AudioDuration, block_count: int
) -> tuple[int, int]:
    duration_cfg = AUDIO_DURATION_CONFIGS[duration]
    min_segments = int(duration_cfg["min_segments"])
    max_segments = int(duration_cfg["max_segments"])
    return (
        max(2, min_segments // block_count),
        max(3, max_segments // block_count),
    )


def build_outline_prompt(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    topic: str,
    overview_context: str,
) -> tuple[SystemMessage, HumanMessage]:
    duration_cfg = AUDIO_DURATION_CONFIGS[duration]
    format_cfg = AUDIO_FORMAT_CONFIGS[format_type]
    block_count = int(duration_cfg["blocks"])
    topic_line = (
        f"Tema especifico solicitado por el usuario: {topic}\n"
        if topic
        else "Tema especifico: no especificado, definelo a partir del contexto y del titulo de la notebook.\n"
    )
    system_prompt = (
        "Eres el productor de un podcast educativo en espanol neutro. Planificas el "
        "episodio en bloques con una progresion clara (apertura, desarrollo, cierre) "
        "sin solapamientos entre bloques. Devuelves solo JSON valido, sin markdown. "
        f"Formato: {format_cfg['label']} - {format_cfg['description']}\n"
        f"Directriz de formato: {_format_guidance(format_type)}"
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"{topic_line}"
        f"Duracion objetivo: {duration_cfg['target_minutes']}.\n\n"
        f"Contexto general de las fuentes:\n{overview_context}\n\n"
        "Genera:\n"
        f"- `title`: titulo breve del episodio (max {MAX_PODCAST_TITLE_CHARS} chars).\n"
        f"- `description`: gancho de 1-2 oraciones (max {MAX_PODCAST_DESCRIPTION_CHARS} chars).\n"
        f"- `blocks`: exactamente {block_count} bloques ordenados. Cada uno con `title`, "
        "`objective` (que idea debe quedar clara) y `research_query` (consulta "
        "autocontenida para buscar en las fuentes la informacion de ese bloque).\n"
        "- `stance_a` y `stance_b`: solo para debate, la postura de "
        f"{SPEAKER_HOST_A} y de {SPEAKER_HOST_B} respectivamente, ambas defendibles "
        "con las fuentes. En cualquier otro formato dejalos como cadena vacia."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_block_prompt(
    notebook_title: str,
    format_type: AudioFormatType,
    duration: AudioDuration,
    podcast_title: str,
    stance_a: str,
    stance_b: str,
    block_titles: list[str],
    block_index: int,
    objective: str,
    notes_text: str,
    previous_segments: list[tuple[str, str]] | None = None,
    issues: list[str] | None = None,
) -> tuple[SystemMessage, HumanMessage]:
    block_count = len(block_titles)
    min_segments, max_segments = _segment_range(duration, block_count)
    format_cfg = AUDIO_FORMAT_CONFIGS[format_type]

    if block_index == 1 and block_count > 1:
        position_rule = "Es el primer bloque: abre el episodio con un saludo y un gancho breve."
    elif block_index == block_count and block_count > 1:
        position_rule = (
            "Es el ultimo bloque: cierra con una sintesis y una despedida breve. "
            "No saludes de nuevo."
        )
    elif block_count > 1:
        position_rule = (
            "Es un bloque intermedio: no saludes ni te despidas, y enlaza de forma "
            "natural con el bloque anterior."
        )
    else:
        position_rule = "Es el unico bloque: abre y cierra el episodio."

    stance_rule = ""
    if format_type == "debate" and (stance_a or stance_b):
        stance_rule = (
            f"\nPostura de {SPEAKER_HOST_A}: {stance_a}\n"
            f"Postura de {SPEAKER_HOST_B}: {stance_b}"
        )

    system_prompt = (
        "Eres un guionista de podcasts educativos en espanol neutro. Escribes un solo "
        "bloque de un episodio. Devuelves solo JSON valido sin markdown. Basa el "
        "contenido en las notas de fuentes; no inventes cifras, nombres, fechas ni citas "
        "textuales. Cada segmento contiene unicamente texto hablado natural (sin "
        "acotaciones, sin markdown, sin anotaciones de sonido) y no menciona el nombre "
        "del hablante.\n"
        f"Formato: {format_cfg['label']} - {format_cfg['description']}\n"
        f"Directriz de formato: {_format_guidance(format_type)}\n"
        f"{_speaker_rule(format_type)}"
    )

    outline_text = "\n".join(
        f"{index}. {title}" for index, title in enumerate(block_titles, start=1)
    )
    sections = [
        f"Notebook: {notebook_title}",
        f"Episodio: {podcast_title}{stance_rule}",
        f"Estructura del episodio:\n{outline_text}",
        f"Bloque a escribir: {block_index} de {block_count} - {block_titles[block_index - 1]}",
        f"Objetivo del bloque: {objective}",
        position_rule,
        f"Notas de fuentes para este bloque:\n{notes_text}",
        (
            f"Escribe entre {min_segments} y {max_segments} segmentos para este bloque. "
            "No repitas contenido de los otros bloques."
        ),
    ]
    if previous_segments:
        previous_text = "\n".join(
            f"{speaker}: {text}" for speaker, text in previous_segments
        )
        sections.append(
            f"Borrador anterior de este bloque:\n{previous_text}\n\n"
            "Problemas a corregir:\n"
            + "\n".join(f"- {issue}" for issue in issues or [])
            + "\nReescribe el bloque corrigiendo solo esos problemas."
        )
    return SystemMessage(content=system_prompt), HumanMessage(
        content="\n\n".join(sections)
    )


def build_review_prompt(
    notebook_title: str,
    format_type: AudioFormatType,
    topic: str,
    blocks_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres el revisor critico de un guion de podcast educativo basado en fuentes. "
        "Solo marcas problemas reales, no preferencias de estilo. Devuelves solo JSON "
        "valido, sin markdown."
    )
    debate_rule = (
        " (e) un hablante que abandona su postura sin que haya sido refutado."
        if format_type == "debate"
        else ""
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tema solicitado: {topic or '(libre)'}\n\n"
        f"Bloques con sus notas de fuentes:\n{blocks_text}\n\n"
        "Devuelve en `findings` los problemas encontrados, con `block_index` (desde 1) "
        "e `issue` (que esta mal y como corregirlo). Marca solo: (a) datos especificos "
        "(cifras, nombres, fechas, citas) que no estan en las notas ni son conocimiento "
        "general evidente, (b) contradicciones con las notas o entre bloques, (c) "
        "repeticion sustancial entre bloques, (d) saludos o despedidas fuera del primer "
        f"o ultimo bloque.{debate_rule} No marques informacion omitida. Maximo 2 "
        "problemas por bloque. Si todo esta bien, devuelve `findings` como lista vacia."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
