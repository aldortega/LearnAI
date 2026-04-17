from langchain_core.messages import HumanMessage, SystemMessage

from ...schemas.presentations import PresentationDetailLevel
from .constants import (
    DETAIL_SLIDE_COUNT_TARGETS,
    PRESENTATION_GENERATION_SCHEMA,
)


def build_presentation_prompt(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
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
        f"Nivel de detalle: {detail_level}. {detail_guidance}\n"
        f"Cantidad objetivo de slides: entre {slide_range[0]} y {slide_range[1]}.\n\n"
        f"Contexto disponible:\n{context_text}\n\n"
        "Genera una presentacion didactica con: "
        "titulo general, resumen breve y slides en orden logico. "
        "Cada slide debe incluir titulo, subtitulo opcional y `content_markdown` "
        "con mezcla de parrafos, listas y negritas cuando aporte claridad. "
        "Si usas listas markdown, cada item debe ir en su propia linea, "
        "nunca varios items en una sola linea. "
        "No incluyas notas del presentador."
    )

    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_regenerate_slide_prompt(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    slide_index: int,
    slide_title: str,
    slide_subtitle: str | None,
    slide_content_markdown: str,
    edit_prompt: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    detail_guidance = (
        "Mantener contenido sintetico, priorizar ideas clave, sin extendense con mucho texto explicativo."
        if detail_level == "concise"
        else "Incluir mayor profundidad conceptual y explicaciones mas completas, con mas texto."
    )
    subtitle_text = slide_subtitle or "(sin subtitulo)"

    system_prompt = (
        "Eres un asistente experto en editar slides de estudio. "
        "Debes proponer una unica slide mejorada basada en el pedido del usuario. "
        "Prioriza el contexto recuperado y conserva coherencia con la presentacion. "
        "Responde solo con JSON valido en espanol, sin markdown ni texto adicional. "
        "Usa exactamente este esquema:\n"
        '{\n  "title": "string",\n  "subtitle": "string | null",\n  "content_markdown": "string"\n}\n'
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tema general: {topic}\n"
        f"Nivel de detalle: {detail_level}. {detail_guidance}\n"
        f"Slide a editar: #{slide_index}\n\n"
        "Slide actual:\n"
        f"- Titulo: {slide_title}\n"
        f"- Subtitulo: {subtitle_text}\n"
        f"- Contenido markdown:\n{slide_content_markdown}\n\n"
        "Instrucciones del usuario para editar/regenerar la slide:\n"
        f"{edit_prompt}\n\n"
        f"Contexto disponible:\n{context_text}\n\n"
        "Devuelve una sola slide completa (titulo, subtitulo opcional y content_markdown). "
        "Si usas listas markdown, cada item debe ir en su propia linea, "
        "nunca varios items en una sola linea. "
        "No incluyas notas del presentador."
    )

    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_presentation_image_outline_prompt(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    slide_range = DETAIL_SLIDE_COUNT_TARGETS.get(detail_level, (6, 8))
    detail_guidance = (
        "Mantener contenido sintetico, priorizar ideas clave, sin extendense con mucho texto explicativo."
        if detail_level == "concise"
        else "Incluir mayor profundidad conceptual y explicaciones mas completas, con mas texto."
    )

    system_prompt = (
        "Eres un asistente experto en crear guiones visuales de presentaciones de estudio. "
        "Debes responder solo con JSON valido en espanol, sin markdown ni texto adicional. "
        "Genera title, summary y slides; cada slide debe incluir title, subtitle opcional e image_prompt. "
        "El image_prompt debe describir una imagen tipo diapositiva 16:9 horizontal, "
         "Todas las diapositivas deben seguir un MISMO estilo visual global y consistente: "
         "El estilo global no cambia entre slides; solo cambia el contenido visual de cada escena. "
        "con jerarquia visual clara, fondo limpio y elementos relevantes al tema. "
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tema solicitado: {topic}\n"
        f"Nivel de detalle: {detail_level}. {detail_guidance}\n"
        f"Cantidad objetivo de slides: entre {slide_range[0]} y {slide_range[1]}.\n\n"
        f"Contexto disponible:\n{context_text}\n\n"
        "Devuelve un JSON con esta forma exacta: "
        '{"title":"string","summary":"string","slides":[{"title":"string","subtitle":"string|null","image_prompt":"string"}]}'
        "\nEn cada image_prompt, enfatiza que la salida debe ser visual y referida al tema."
         "\nReglas obligatorias:"
    "\n1) Mantener estilo visual unico y consistente en TODAS las slides."
    "\n2) Cada slide debe representar una escena distinta (sin repetir encuadre/idea)."
    "\n3) Los titulos de slides no deben repetirse entre si."
    "\n4) No repetir el titulo general dentro de cada imagen."
    )

    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
