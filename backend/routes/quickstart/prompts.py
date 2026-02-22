from langchain_core.messages import HumanMessage, SystemMessage

from ...schemas.quickstart import QuickstartDetailItemType
from .constants import (
    DETAIL_SCHEMA,
    EXPANSION_SCHEMA,
    QUICKSTART_SCHEMA,
    SINGLE_TOPIC_SCHEMA,
    SUGGESTION_COUNT,
    SUGGESTIONS_SCHEMA,
    TOPIC_COUNT,
)


def build_quickstart_prompt(
    title: str, context_text: str
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "Puedes usar markdown simple dentro de los campos de texto "
        "(por ejemplo **negrita** y saltos de linea). "
        "Sigue exactamente este esquema:\n"
        f"{QUICKSTART_SCHEMA}"
    )
    user_prompt = (
        f"Tema general (usa exactamente este tema): {title}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Genera un notebook_summary general de 2 parrafos breves. "
        f"Genera un inicio rapido con exactamente {TOPIC_COUNT} temas. "
        "Cada tema debe tener un resumen breve, un emoji representativo (solo emoji) "
        "y una lista de 3 a 5 puntos clave."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_expansion_prompt(
    notebook_title: str,
    topic_title: str,
    summary: str,
    key_points: list[str],
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "Puedes usar markdown simple dentro de los campos de texto "
        "(por ejemplo **negrita** y saltos de linea). "
        "Sigue exactamente este esquema:\n"
        f"{EXPANSION_SCHEMA}"
    )
    key_points_text = "\n".join(f"- {point}" for point in key_points)
    user_prompt = (
        f"Tema general (usa exactamente este tema): {notebook_title}\n"
        f"Tema a expandir: {topic_title}\n"
        f"Resumen actual: {summary}\n"
        f"Puntos clave:\n{key_points_text}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Expande el tema en detalle. En content entrega informacion general "
        "adicional y util para estudio (no repitas literal el resumen actual), "
        "en 2 a 4 parrafos claros. Cada parrafo debe tener 2 a 4 oraciones y "
        "debe estar separado por una linea en blanco (\\n\\n). "
        "No devuelvas todo el contenido en un solo bloque corrido. "
        "Incluye tambien puntos clave adicionales y preguntas sugeridas."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_topic_detail_prompt(
    notebook_title: str,
    topic_title: str,
    item_type: QuickstartDetailItemType,
    item_text: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "Puedes usar markdown simple dentro de los campos de texto "
        "(por ejemplo **negrita** y saltos de linea). "
        "Sigue exactamente este esquema:\n"
        f"{DETAIL_SCHEMA}"
    )
    item_label = (
        "pregunta sugerida"
        if item_type == "question"
        else "punto clave adicional"
    )
    user_prompt = (
        f"Tema general (usa exactamente este tema): {notebook_title}\n"
        f"Tema principal: {topic_title}\n"
        f"Tipo de item seleccionado: {item_label}\n"
        f"Texto del item: {item_text}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Explica el item de forma clara y concreta para estudio autonomo. "
        "Entrega 2 a 3 parrafos, separados por una linea en blanco (\\n\\n), "
        "con ejemplos breves cuando aporten valor. "
        "No devuelvas todo en un solo parrafo."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_suggestions_prompt(
    notebook_title: str,
    existing_titles: list[str],
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "Puedes usar markdown simple dentro de los campos de texto "
        "(por ejemplo **negrita** y saltos de linea). "
        "Sigue exactamente este esquema:\n"
        f"{SUGGESTIONS_SCHEMA}"
    )
    existing_titles_text = "\n".join(f"- {title}" for title in existing_titles)
    user_prompt = (
        f"Tema general (usa exactamente este tema): {notebook_title}\n\n"
        "Temas ya existentes:\n"
        f"{existing_titles_text or '- (sin temas)'}\n\n"
        f"Contexto:\n{context_text}\n\n"
        f"Sugiere exactamente {SUGGESTION_COUNT} temas complementarios para estudiar "
        "despues, sin repetir ni reformular los ya existentes. Entrega solo los titulos."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_single_topic_prompt(
    notebook_title: str,
    requested_title: str,
    existing_titles: list[str],
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "Puedes usar markdown simple dentro de los campos de texto "
        "(por ejemplo **negrita** y saltos de linea). "
        "Sigue exactamente este esquema:\n"
        f"{SINGLE_TOPIC_SCHEMA}"
    )
    existing_titles_text = "\n".join(f"- {title}" for title in existing_titles)
    user_prompt = (
        f"Tema general (usa exactamente este tema): {notebook_title}\n"
        f"Tema nuevo solicitado (usa exactamente este titulo): {requested_title}\n\n"
        "Temas ya existentes:\n"
        f"{existing_titles_text or '- (sin temas)'}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Genera un unico tema nuevo con ese titulo exacto, un resumen breve, un emoji "
        "representativo (solo emoji) y 3 a 5 puntos clave concretos. No repitas temas "
        "existentes."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
