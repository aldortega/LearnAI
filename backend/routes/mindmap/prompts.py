from langchain_core.messages import HumanMessage, SystemMessage

from .constants import (
    DETAIL_SCHEMA,
    SECONDARY_NODE_COUNT,
    TERTIARY_NODE_COUNT_PER_SECONDARY,
    TITLES_SCHEMA,
)


def build_mindmap_tree_prompt(
    notebook_title: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{TITLES_SCHEMA}"
    )
    total_pairs = SECONDARY_NODE_COUNT * TERTIARY_NODE_COUNT_PER_SECONDARY
    user_prompt = (
        f"Tema central del mapa (usa exactamente este titulo): {notebook_title}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Solo genera titulos para nodos, sin explicaciones. "
        f"Debes proponer exactamente {SECONDARY_NODE_COUNT} nodos secundarios y "
        f"{TERTIARY_NODE_COUNT_PER_SECONDARY} nodos terciarios por cada secundario. "
        f"En total devuelve exactamente {total_pairs} pares en 'pairs'. "
        "Cada par representa un secundario y uno de sus terciarios. "
        "Los titulos deben ser cortos, claros y utiles para estudiar. "
        "Evita duplicados y evita textos largos."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_node_detail_prompt(
    notebook_title: str,
    node_title: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{DETAIL_SCHEMA}"
    )
    user_prompt = (
        f"Tema general: {notebook_title}\n"
        f"Nodo seleccionado: {node_title}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Entrega una explicacion corta y directa del nodo en 1 o 2 parrafos breves."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
