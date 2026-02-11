from pydantic import BaseModel, Field

from ...schemas.reports import ReportFormatType


SUGGESTION_COUNT = 4
MAX_CONTEXT_CHARS = 5500
MAX_REPORT_TITLE_CHARS = 120
MAX_REPORT_DESCRIPTION_CHARS = 120
MAX_REPORT_INTRODUCTION_CHARS = 500

REPORT_TEMPLATE_CONFIGS: dict[ReportFormatType, dict[str, str]] = {
    "freeform": {
        "label": "Libre",
        "description": "Prompt abierto para definir estructura, estilo y tono.",
        "default_prompt": (
            "Crea un informe claro sobre esta notebook. "
            "Usa secciones con titulos, tono profesional y ejemplos concretos."
        ),
    },
    "summary": {
        "label": "Resumen",
        "description": "Vista general con informacion clave de las fuentes.",
        "default_prompt": (
            "Crea un documento de informe integral que sintetice los principales temas "
            "e ideas de las fuentes. Comienza con un Resumen Ejecutivo conciso que "
            "presente desde el inicio los puntos clave mas relevantes. El cuerpo del "
            "documento debe ofrecer un analisis detallado y exhaustivo de los temas "
            "principales, la evidencia y las conclusiones que se encuentran en las "
            "fuentes. Este analisis debe estar estructurado de manera logica, "
            "utilizando encabezados y vietas para garantizar la claridad. El tono "
            "debe ser objetivo y preciso."
        ),
    },
    "study_guide": {
        "label": "Guia de estudio",
        "description": "Cuestionario breve, puntos clave y plan de estudio.",
        "default_prompt": (
            "Eres un asistente de investigacion y tutor altamente capacitado. Crea una "
            "guia de estudio detallada disenada para repasar y evaluar la comprension "
            "de las fuentes. Elabora un cuestionario con diez preguntas de respuesta "
            "corta (de 2 a 3 oraciones cada una) e incluye una clave de respuestas "
            "separada. Propon cinco preguntas en formato de ensayo, pero no "
            "proporciones las respuestas. Concluye ademas con un glosario completo "
            "de terminos clave, con sus definiciones."
        ),
    },
    "blog_post": {
        "label": "Entrada de blog",
        "description": "Articulo facil de leer con conclusiones condensadas.",
        "default_prompt": (
            "Actua como un escritor reflexivo y sintetizador de ideas, encargado de "
            "crear una entrada de blog atractiva y facil de leer para una plataforma "
            "de publicacion en linea popular, conocida por su estetica limpia y "
            "contenido perspicaz. Tu objetivo es destilar los hallazgos mas "
            "sorprendentes, contraintuitivos o impactantes de los materiales fuente "
            "proporcionados en un listicle convincente. El estilo de escritura debe "
            "ser claro, accesible y altamente escaneable, empleando un tono "
            "conversacional pero inteligente. Redacta un titulo atractivo y llamativo. "
            "Comienza el articulo con una introduccion breve que atrape al lector "
            "planteando un problema o una curiosidad con la que pueda identificarse. "
            "Luego, presenta cada uno de los puntos clave como una seccion "
            "independiente, con un subtitulo claro y en negrita. Dentro de cada "
            "seccion, utiliza parrafos cortos para explicar el concepto con claridad "
            "y no te limites a resumir: ofrece un breve analisis o reflexion sobre "
            "por que ese punto resulta tan interesante o importante. Si existe una "
            "cita poderosa en las fuentes, destacala en un bloque de cita para darle "
            "mayor enfasis. Concluye la publicacion con un resumen breve y orientado "
            "al futuro, que deje al lector con una pregunta final que invite a la "
            "reflexion o con una idea poderosa para seguir pensando."
        ),
    },
    "ai_suggested": {
        "label": "Sugerido por IA",
        "description": "Formato recomendado segun el tema de la notebook.",
        "default_prompt": (
            "Crea un informe util y bien estructurado para estudiar este tema."
        ),
    },
}

SUGGESTIONS_SCHEMA = (
    "{\n"
    '  "suggestions": [\n'
    "    {\n"
    '      "title": "string",\n'
    '      "description": "string",\n'
    '      "default_prompt": "string"\n'
    "    }\n"
    "  ]\n"
    "}\n"
)

REPORT_GENERATION_SCHEMA = (
    "{\n"
    '  "title": "string",\n'
    '  "description": "string",\n'
    '  "introduction": "string",\n'
    '  "content": "string"\n'
    "}\n"
)


class ReportSuggestionLLM(BaseModel):
    title: str
    description: str
    default_prompt: str


class ReportSuggestionsPayloadLLM(BaseModel):
    suggestions: list[ReportSuggestionLLM] = Field(min_length=1, max_length=20)


class ReportGenerationPayloadLLM(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_REPORT_TITLE_CHARS)
    description: str = Field(min_length=1, max_length=MAX_REPORT_DESCRIPTION_CHARS)
    introduction: str = Field(min_length=1, max_length=MAX_REPORT_INTRODUCTION_CHARS)
    content: str = Field(min_length=1)
