from langchain_core.messages import HumanMessage, SystemMessage

from ...schemas.presentations import PresentationDetailLevel, PresentationStyle
from .constants import (
    DETAIL_SLIDE_COUNT_TARGETS,
    PRESENTATION_GENERATION_SCHEMA,
    PRESENTATION_STYLE_CONFIGS,
)


def build_presentation_prompt(
    notebook_title: str,
    topic: str,
    style: PresentationStyle,
    detail_level: PresentationDetailLevel,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    style_guidance = PRESENTATION_STYLE_CONFIGS[style]["guidance"]
    slide_range = DETAIL_SLIDE_COUNT_TARGETS.get(detail_level, (6, 8))
    detail_guidance = (
        "Mantener contenido sintetico, priorizar ideas clave y facilitar exposicion oral."
        if detail_level == "concise"
        else "Incluir mayor profundidad conceptual y explicaciones mas completas."
    )

    system_prompt = (
        "Eres un asistente experto en crear presentaciones de estudio. "
        "Prioriza la informacion de las fuentes recuperadas. Si falta contexto, "
        "completa con conocimiento general util sin inventar citas textuales. "
        "Responde solo con JSON valido en espanol, sin markdown ni texto adicional. "
        "Sigue exactamente este esquema:\n"
        f"{PRESENTATION_GENERATION_SCHEMA}"
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tema solicitado: {topic}\n"
        f"Estilo visual: {style} ({style_guidance})\n"
        f"Nivel de detalle: {detail_level}. {detail_guidance}\n"
        f"Cantidad objetivo de slides: entre {slide_range[0]} y {slide_range[1]}.\n\n"
        f"Contexto disponible:\n{context_text}\n\n"
        "Genera una presentacion didactica con: "
        "titulo general, resumen breve y slides en orden logico. "
        "Cada slide debe incluir titulo, subtitulo opcional y `content_markdown` "
        "con mezcla de parrafos, listas y negritas cuando aporte claridad. "
        "No incluyas notas del presentador."
    )

    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
