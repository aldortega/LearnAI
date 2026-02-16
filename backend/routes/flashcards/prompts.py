from langchain_core.messages import HumanMessage, SystemMessage

from .constants import FLASHCARDS_SCHEMA


def build_flashcards_prompt(
    notebook_title: str,
    target_count: int,
    difficulty_label: str,
    difficulty_guidance: str,
    topic_prompt: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{FLASHCARDS_SCHEMA}"
    )

    topic_line = (
        f"Tema preferido por el usuario: {topic_prompt}"
        if topic_prompt
        else "Tema preferido por el usuario: (usar el tema general de la notebook)"
    )

    user_prompt = (
        f"Notebook: {notebook_title}\n"
        f"{topic_line}\n"
        f"Dificultad objetivo: {difficulty_label}. {difficulty_guidance}\n\n"
        f"Contexto:\n{context_text}\n\n"
        f"Genera exactamente {target_count} flashcards de definicion. "
        "Cada tarjeta debe tener un termino breve y una definicion clara en 1 o 2 "
        "oraciones. Evita duplicados y evita terminos demasiado genericos. "
        "Si el contexto es insuficiente, puedes complementar con conocimiento "
        "general confiable sobre el tema pedido."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
