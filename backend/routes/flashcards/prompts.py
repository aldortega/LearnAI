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
        f"Genera exactamente {target_count} flashcards mixtas y balanceadas: "
        "Incluye un titulo breve para el set en 'set_title' (3 a 7 palabras, claro y especifico). "
        "definicion, pregunta-respuesta y completar espacios en blanco. "
        "Usa siempre 'term' como frente de la tarjeta y 'definition' como reverso. "
        "Para preguntas, el frente debe ser una pregunta clara y el reverso solo la "
        "respuesta (sin explicacion extensa). "
        "Para completar espacios, el frente debe incluir '___' y el reverso solo la "
        "respuesta faltante. "
        "Para definiciones clasicas, usa frente breve y reverso claro en 1 o 2 "
        "oraciones. Evita duplicados y evita frentes demasiado genericos. "
        "Si el contexto es insuficiente, puedes complementar con conocimiento "
        "general confiable sobre el tema pedido."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_flashcard_explain_question(
    notebook_title: str,
    term: str,
    definition: str,
) -> str:
    return (
        f'Notebook: "{notebook_title}".\n'
        f'Termino de la flashcard: "{term}".\n'
        f'Definicion actual: "{definition}".\n\n'
        "Explica este termino con mas detalle en espanol, con markdown basico "
        "(parrafos, negritas o listas simples). "
        "No uses HTML, no uses tablas, no uses bloques de codigo. "
        "Mantén la explicacion corta y util para estudio (aprox. 120-220 palabras)."
    )
