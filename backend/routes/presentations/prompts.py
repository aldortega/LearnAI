from langchain_core.messages import HumanMessage, SystemMessage

from ...schemas.presentations import PresentationDetailLevel
from .constants import (
    DETAIL_SLIDE_COUNT_TARGETS,
    MAX_PRESENTATION_SUMMARY_CHARS,
    MAX_IMAGE_PROMPT_CHARS,
    MAX_PRESENTATION_TITLE_CHARS,
    MAX_SLIDE_LABEL_CHARS,
    MAX_SLIDE_LABELS,
    MAX_STYLE_GUIDE_CHARS,
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


JSON_ONLY_RULE = (
    "Responde solo con JSON valido en espanol, sin markdown envolvente ni texto extra."
)


def _detail_guidance(detail_level: PresentationDetailLevel) -> str:
    if detail_level == "concise":
        return "Contenido sintetico, ideas clave y facil de exponer oralmente."
    return "Mayor profundidad conceptual y explicaciones mas completas."


def build_outline_prompt(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    overview_context: str,
    visual: bool = False,
) -> tuple[SystemMessage, HumanMessage]:
    slide_range = DETAIL_SLIDE_COUNT_TARGETS.get(detail_level, (6, 8))
    system_prompt = (
        "Eres el planificador de un equipo que crea presentaciones de estudio. "
        "Disenas la narrativa de la presentacion a partir de las fuentes disponibles. "
        f"{JSON_ONLY_RULE}"
    )
    style_instruction = (
        " Incluye tambien `style_guide`: una descripcion visual unica y concreta "
        "(paleta de colores, tipo de ilustracion, tipografia, fondo y tratamiento "
        f"grafico, max {MAX_STYLE_GUIDE_CHARS} chars) que se aplicara identica a todas "
        "las slides, que son imagenes 16:9."
        if visual
        else ""
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tema solicitado: {topic}\n"
        f"Nivel de detalle: {detail_level}. {_detail_guidance(detail_level)}\n\n"
        f"Vista general de las fuentes:\n{overview_context}\n\n"
        f"Disena entre {slide_range[0]} y {slide_range[1]} slides en orden logico "
        "(apertura, desarrollo y cierre), sin solapamientos entre slides. Para cada slide "
        "indica: `title` (corto), `objective` (que debe transmitir, en una oracion) y "
        "`research_query` (consulta autocontenida para buscar en las fuentes). "
        "Incluye tambien `title` general (max "
        f"{MAX_PRESENTATION_TITLE_CHARS} chars) y `summary` breve (max "
        f"{MAX_PRESENTATION_SUMMARY_CHARS} chars)."
        f"{style_instruction}"
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_slide_prompt(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    presentation_title: str,
    titles: list[str],
    slide_index: int,
    objective: str,
    notes_text: str,
    previous_content: str | None = None,
    issues: list[str] | None = None,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un redactor de slides de estudio. Escribes el contenido de una sola slide. "
        "Usa primero las notas de las fuentes y complementa con conocimiento general solo "
        "cuando sea necesario. No inventes citas textuales, cifras ni nombres. "
        f"{JSON_ONLY_RULE} "
        "`content_markdown` mezcla parrafos breves, listas y negritas; si usas listas, "
        "cada item va en su propia linea. No incluyas el titulo ni notas del presentador. "
        "`subtitle` es opcional (null si no aporta)."
    )
    outline = "\n".join(f"{index}. {title}" for index, title in enumerate(titles, start=1))
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Presentacion: {presentation_title} (tema: {topic})\n"
        f"Nivel de detalle: {detail_level}. {_detail_guidance(detail_level)}\n"
        f"Esquema completo (no repitas lo que cubren las otras slides):\n{outline}\n\n"
        f"Slide a redactar: {slide_index}. {titles[slide_index - 1]}\n"
        f"Objetivo: {objective}\n\n"
        f"Notas de las fuentes:\n{notes_text}"
    )
    if previous_content and issues:
        listed_issues = "\n".join(f"- {issue}" for issue in issues)
        user_prompt += (
            "\n\nBorrador anterior:\n"
            f"{previous_content}\n\n"
            "Un revisor encontro estos problemas. Reescribe la slide corrigiendolos:\n"
            f"{listed_issues}"
        )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_review_prompt(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    slides_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres el revisor critico de una presentacion de estudio basada en fuentes. "
        "Solo marcas problemas reales, no preferencias de estilo. "
        f"{JSON_ONLY_RULE}"
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tema solicitado: {topic}\n"
        f"Nivel de detalle: {detail_level}. {_detail_guidance(detail_level)}\n\n"
        f"Slides con sus notas de fuentes:\n{slides_text}\n\n"
        "Devuelve en `findings` los problemas encontrados, con `slide_index` (desde 1) "
        "e `issue` (que esta mal y como corregirlo). Marca solo: (a) datos especificos "
        "(cifras, nombres, fechas, citas) que no estan en las notas ni son conocimiento "
        "general evidente, (b) contradicciones con las notas o entre slides, (c) repeticion "
        "sustancial entre slides, (d) exceso de texto para una slide cuando el nivel es "
        "`concise`. Maximo 2 problemas por slide. "
        "Si todo esta bien, devuelve `findings` como lista vacia."
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



def build_scene_prompt(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    presentation_title: str,
    style_guide: str,
    titles: list[str],
    slide_index: int,
    objective: str,
    notes_text: str,
    previous_prompt: str | None = None,
    issues: list[str] | None = None,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres el director de arte de una presentacion de estudio hecha de imagenes 16:9. "
        "Disenas la escena de una sola slide a partir de las notas de las fuentes, sin "
        "inventar cifras, nombres ni citas. "
        f"{JSON_ONLY_RULE} "
        "`image_prompt` describe la escena (composicion, elementos y metaforas visuales "
        f"relevantes al tema, max {MAX_IMAGE_PROMPT_CHARS} chars) sin repetir la guia de "
        "estilo. `labels` son los unicos textos que apareceran escritos en la imagen: "
        f"maximo {MAX_SLIDE_LABELS}, cada uno de pocas palabras (max "
        f"{MAX_SLIDE_LABEL_CHARS} chars) y respaldado por las notas. `subtitle` es opcional."
    )
    outline = "\n".join(f"{index}. {title}" for index, title in enumerate(titles, start=1))
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Presentacion: {presentation_title} (tema: {topic})\n"
        f"Nivel de detalle: {detail_level}. {_detail_guidance(detail_level)}\n"
        f"Guia de estilo global (se aplica aparte, no la repitas):\n{style_guide}\n\n"
        f"Esquema completo (cada slide debe ser una escena distinta):\n{outline}\n\n"
        f"Slide a disenar: {slide_index}. {titles[slide_index - 1]}\n"
        f"Objetivo: {objective}\n\n"
        f"Notas de las fuentes:\n{notes_text}"
    )
    if previous_prompt and issues:
        listed_issues = "\n".join(f"- {issue}" for issue in issues)
        user_prompt += (
            "\n\nEscena anterior:\n"
            f"{previous_prompt}\n\n"
            "Un revisor encontro estos problemas. Redisena la escena corrigiendolos:\n"
            f"{listed_issues}"
        )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_visual_review_prompt(
    notebook_title: str,
    topic: str,
    style_guide: str,
    scenes_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres el revisor critico de una presentacion visual de estudio basada en fuentes. "
        "Revisas los guiones de las imagenes antes de generarlas. "
        "Solo marcas problemas reales, no preferencias de estilo. "
        f"{JSON_ONLY_RULE}"
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tema solicitado: {topic}\n"
        f"Guia de estilo global:\n{style_guide}\n\n"
        f"Slides con sus notas de fuentes, escena y textos en imagen:\n{scenes_text}\n\n"
        "Devuelve en `findings` los problemas encontrados, con `slide_index` (desde 1) "
        "e `issue` (que esta mal y como corregirlo). Marca solo: (a) textos en imagen o "
        "datos (cifras, nombres, fechas) que no estan en las notas ni son conocimiento "
        "general evidente, (b) escenas que repiten encuadre o idea de otra slide, "
        "(c) escenas que contradicen la guia de estilo global o piden otro estilo, "
        "(d) demasiado texto para una imagen o textos largos. Maximo 2 problemas por "
        "slide. Si todo esta bien, devuelve `findings` como lista vacia."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
