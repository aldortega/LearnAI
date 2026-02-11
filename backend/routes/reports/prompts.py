from langchain_core.messages import HumanMessage, SystemMessage

from ...schemas.reports import ReportFormatType
from .constants import (
    MAX_REPORT_DESCRIPTION_CHARS,
    MAX_REPORT_TITLE_CHARS,
    REPORT_GENERATION_SCHEMA,
    SUGGESTION_COUNT,
    SUGGESTIONS_SCHEMA,
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


def build_report_prompt(
    notebook_title: str,
    format_type: ReportFormatType,
    prompt: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    format_guidance = {
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
    system_prompt = (
        "Eres un asistente de estudio. Usa primero el contexto de fuentes y complementa "
        "con conocimiento general cuando sea necesario. No inventes citas textuales. "
        "Responde solo con JSON valido en espanol y sin texto extra. "
        "El campo `content` debe venir en markdown simple y contener solo el desarrollo "
        "del informe (sin titulo principal ni introduccion).\n"
        f"Sigue exactamente este esquema:\n{REPORT_GENERATION_SCHEMA}\n"
        f"Directriz de formato del contenido: {format_guidance.get(format_type, format_guidance['freeform'])}"
    )
    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"Tipo de informe: {format_type}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Prompt del usuario (seguir al pie de la letra cuando no contradiga el contexto):\n"
        f"{prompt}\n\n"
        f"Genera un titulo breve (max {MAX_REPORT_TITLE_CHARS} chars), "
        f"una descripcion de preview muy breve (max {MAX_REPORT_DESCRIPTION_CHARS} chars), "
        "una introduccion breve de apertura (2 a 3 oraciones) y el contenido completo "
        "del informe sin repetir ni titulo ni introduccion."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
