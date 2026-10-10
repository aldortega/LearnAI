from langchain_core.messages import HumanMessage, SystemMessage

from ...schemas.reports import ReportFormatType
from .constants import (
    MAX_REPORT_DESCRIPTION_CHARS,
    MAX_REPORT_INTRODUCTION_CHARS,
    MAX_REPORT_SECTIONS,
    MAX_REPORT_TITLE_CHARS,
    SUGGESTION_COUNT,
    SUGGESTIONS_SCHEMA,
)

FORMAT_GUIDANCE: dict[str, str] = {
    "freeform": (
        "Sigue exactamente las instrucciones del usuario sobre estructura, tono y estilo."
    ),
    "summary": (
        "Entrega una vista general con ideas clave, hallazgos y conclusiones claras."
    ),
    "study_guide": (
        "Incluye puntos clave, preguntas de respuesta corta, preguntas sugeridas "
        "y secuencia recomendada de estudio."
    ),
    "blog_post": (
        "Escribe un articulo facil de leer con titulo, subtitulos y cierre concreto."
    ),
    "ai_suggested": (
        "Sigue el enfoque del prompt sugerido y manten claridad pedagogica."
    ),
}

JSON_ONLY_RULE = (
    "Responde solo con JSON valido en espanol, sin markdown envolvente ni texto extra."
)


def build_suggestions_prompt(
    notebook_title: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{SUGGESTIONS_SCHEMA}"
    )
    user_prompt = (
        f"Tema general de la notebook: {notebook_title}\n\n"
        f"Contexto:\n{context_text}\n\n"
        f"Sugiere exactamente {SUGGESTION_COUNT} tipos de informe utiles para estudiar "
        "este tema. Cada sugerencia debe incluir titulo corto, descripcion breve y "
        "un prompt base listo para editar."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def _format_guidance(format_type: ReportFormatType) -> str:
    return FORMAT_GUIDANCE.get(format_type, FORMAT_GUIDANCE["freeform"])


def build_outline_prompt(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    overview_context: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres el planificador de un equipo que redacta informes de estudio. "
        "Disenas el esquema del informe a partir de las fuentes disponibles. "
        f"{JSON_ONLY_RULE}\n"
        f"Directriz de formato: {_format_guidance(format_type)}"
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tipo de informe: {format_type}\n\n"
        f"Vista general de las fuentes:\n{overview_context}\n\n"
        "Prompt del usuario (seguir al pie de la letra cuando no contradiga el contexto):\n"
        f"{prompt}\n\n"
        f"Disena un esquema de 1 a {MAX_REPORT_SECTIONS} secciones que cubra lo pedido, "
        "sin solapamientos entre secciones y en orden logico. Para cada seccion indica: "
        "`heading` (titulo corto), `objective` (que debe cubrir, en una oracion) y "
        "`research_query` (consulta autocontenida para buscar en las fuentes). "
        f"Incluye tambien `title` (max {MAX_REPORT_TITLE_CHARS} chars) y `description` "
        f"(preview muy breve, max {MAX_REPORT_DESCRIPTION_CHARS} chars). "
        "No incluyas una seccion de introduccion: se redacta aparte."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_section_prompt(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    report_title: str,
    headings: list[str],
    section_index: int,
    objective: str,
    notes_text: str,
    previous_content: str | None = None,
    issues: list[str] | None = None,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un redactor de informes de estudio. Escribes una sola seccion del informe. "
        "Usa primero las notas de las fuentes y complementa con conocimiento general solo "
        "cuando sea necesario. No inventes citas textuales, cifras ni nombres. "
        f"{JSON_ONLY_RULE} "
        "El campo `content` debe ser markdown simple con solo el desarrollo de la seccion: "
        "sin el titulo de la seccion y, si necesitas subtitulos, usa `###`.\n"
        f"Directriz de formato: {_format_guidance(format_type)}"
    )
    outline = "\n".join(
        f"{index}. {heading}" for index, heading in enumerate(headings, start=1)
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Informe: {report_title}\n"
        f"Esquema completo (no repitas lo que cubren las otras secciones):\n{outline}\n\n"
        f"Seccion a redactar: {section_index}. {headings[section_index - 1]}\n"
        f"Objetivo: {objective}\n\n"
        f"Notas de las fuentes:\n{notes_text}\n\n"
        "Prompt original del usuario:\n"
        f"{prompt}"
    )
    if previous_content and issues:
        listed_issues = "\n".join(f"- {issue}" for issue in issues)
        user_prompt += (
            "\n\nBorrador anterior:\n"
            f"{previous_content}\n\n"
            "Un revisor encontro estos problemas. Reescribe la seccion corrigiendolos:\n"
            f"{listed_issues}"
        )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_review_prompt(
    notebook_title: str,
    prompt: str,
    sections_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres el revisor critico de un informe de estudio basado en fuentes. "
        "Solo marcas problemas reales, no preferencias de estilo. "
        f"{JSON_ONLY_RULE}"
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Prompt del usuario:\n{prompt}\n\n"
        f"Secciones con sus notas de fuentes:\n{sections_text}\n\n"
        "Devuelve en `findings` los problemas encontrados, con `section_index` (numero "
        "de seccion, desde 1) e `issue` (que esta mal y como corregirlo). Marca solo: "
        "(a) datos especificos (cifras, nombres, fechas, citas) que no estan en las notas "
        "ni son conocimiento general evidente, (b) contradicciones con las notas o entre "
        "secciones, (c) incumplimiento claro de lo que pidio el usuario, (d) repeticion "
        "sustancial entre secciones. Maximo 2 problemas por seccion. "
        "Si todo esta bien, devuelve `findings` como lista vacia."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_summary_prompt(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    draft_title: str,
    draft_description: str,
    body_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres el editor final de un informe de estudio. A partir del cuerpo ya redactado "
        f"escribes su titulo, descripcion e introduccion. {JSON_ONLY_RULE}"
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tipo de informe: {format_type}\n"
        f"Prompt del usuario:\n{prompt}\n\n"
        f"Titulo provisional: {draft_title}\n"
        f"Descripcion provisional: {draft_description}\n\n"
        f"Cuerpo del informe:\n{body_text}\n\n"
        f"Devuelve `title` (breve, max {MAX_REPORT_TITLE_CHARS} chars), `description` "
        f"(preview muy breve, max {MAX_REPORT_DESCRIPTION_CHARS} chars) e `introduction` "
        f"(2 a 3 oraciones, max {MAX_REPORT_INTRODUCTION_CHARS} chars) que reflejen lo que "
        "el cuerpo realmente dice. No repitas el cuerpo."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
