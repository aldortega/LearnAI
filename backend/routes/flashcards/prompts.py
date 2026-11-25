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
        "Incluye un titulo breve para el set en 'set_title' (3 a 7 palabras, claro y especifico). "
        f"Genera exactamente {target_count} flashcards mixtas y balanceadas entre "
        "los tres tipos. Indica el tipo de cada tarjeta en 'type'. "
        "Usa siempre 'term' como frente de la tarjeta y 'definition' como reverso. "
        "type='definition': frente con el termino breve y reverso con su definicion "
        "clara en 1 o 2 oraciones. "
        "type='question': frente con una pregunta clara y reverso solo con la "
        "respuesta (sin explicacion extensa). "
        "type='cloze': frente con una oracion que incluya '___' en lugar de la "
        "palabra clave y reverso solo con la palabra o frase faltante. "
        "Evita duplicados y evita frentes demasiado genericos. "
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
