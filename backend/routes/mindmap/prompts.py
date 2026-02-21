from langchain_core.messages import HumanMessage, SystemMessage

from .constants import (
    DETAIL_SCHEMA,
    TITLES_SCHEMA,
)


def build_mindmap_tree_prompt(
    topic: str,
    context_text: str,
) -> tuple[SystemMessage, HumanMessage]:
    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{TITLES_SCHEMA}"
    )
    user_prompt = (
        f"Tema central del mapa (usa exactamente este titulo): {topic}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Genera un arbol de nodos (title + children) con profundidad variable. "
        "No hay un numero fijo de nodos ni profundidad fija. "
        # "Objetivo de cobertura: intenta producir al menos 6 nodos totales cuando el contexto lo permita. "
        # "En la raiz, prioriza 2 a 4 subtemas principales distintos. "
        "Cada nodo no-hoja debe tener hijos relacionados con su titulo padre sin repetir su prefijo literal. "
        "Evita nodos intermedios genericos: no uses titulos vacios como funcion, detalle, info, general, concepto o tema. "
        "Si ibas a crear un nodo generico con un unico hijo, elimina ese nodo y conecta directo con el hijo especifico. "
        "Ejemplo incorrecto: Capa Aplicacion -> Funcion -> Detalle. "
        "Ejemplo correcto: Capa Aplicacion -> Protocolos de aplicacion -> HTTP. "
        "Si un concepto ya es atomico, puedes dejarlo como hoja (children vacio). "
        "Usa titulos cortos, concretos y utiles para estudiar. "
        "Evita duplicados entre hermanos, evita texto largo y no incluyas explicaciones."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)


def build_node_detail_prompt(
    topic: str,
    node_title: str,
    context_text: str,
    lineage_titles: list[str],
    children_titles: list[str],
) -> tuple[SystemMessage, HumanMessage]:
    clean_lineage = [title.strip() for title in lineage_titles if title.strip()]
    lineage_path = " > ".join(clean_lineage) if clean_lineage else node_title
    parent_title = clean_lineage[-2] if len(clean_lineage) >= 2 else ""
    child_list = ", ".join(
        [title.strip() for title in children_titles if title.strip()][:10]
    ) or "(sin subtemas directos)"

    system_prompt = (
        "Eres un asistente de estudio. Responde solo con JSON valido en espanol. "
        "No uses markdown ni texto adicional. Sigue exactamente este esquema:\n"
        f"{DETAIL_SCHEMA}"
    )
    user_prompt = (
        f"Tema general: {topic}\n"
        f"Nodo seleccionado: {node_title}\n\n"
        f"Ruta del nodo: {lineage_path}\n"
        f"Padre inmediato: {parent_title or '(sin padre)'}\n"
        f"Subtemas directos del nodo: {child_list}\n\n"
        f"Contexto:\n{context_text}\n\n"
        "Entrega una explicacion corta y directa del nodo en 1 o 2 parrafos breves. "
        "La explicacion debe estar alineada con la ruta del nodo y diferenciarlo de sus vecinos."
    )
    return SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)
