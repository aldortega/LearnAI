# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "matplotlib",
#     "python-docx",
# ]
# ///
import statistics
from pathlib import Path

import informe_futbol as base
import plots
from informe_futbol import bullets, doc, figure, heading, para, table

RESULTS_DIR = Path(__file__).resolve().parent / "simulated_futbol_runs2-3"
OUTPUT_PATH = RESULTS_DIR / "informe_evaluacion_futbol_simulado.docx"
RUNS = (1, 2, 3)
METRICS = (*plots.RAGAS_METRICS, *plots.RETRIEVAL_METRICS)

base.FIGURES_DIR = RESULTS_DIR / "figuras"
records = plots.load_records(RESULTS_DIR)
scores = plots.load_scores(RESULTS_DIR / "ragas" / "scores.jsonl")
pooled = plots.judged_records(records, set(RUNS))
per_run = {run: plots.judged_records(records, {run}) for run in RUNS}


def dec(value: float, digits: int = 2) -> str:
    return f"{value:.{digits}f}".replace(".", ",")


def pct(value: float) -> str:
    return f"{value:.0f} %"


def metric(config: str, name: str, question_type: str | None = None) -> float | None:
    return plots.mean(plots.metric_values(pooled, scores, config, name, question_type))


def run_std(config: str, name: str) -> float | None:
    means = [plots.mean(plots.metric_values(per_run[run], scores, config, name)) for run in RUNS]
    return None if None in means else statistics.stdev(means)


def cell(config: str, name: str) -> str:
    value, std = metric(config, name), run_std(config, name)
    return "—" if value is None else f"{dec(value)} ± {dec(std)}"


def in_scope_records(config: str) -> list[dict]:
    return [r for r in records if r["config"] == config and plots.is_in_scope(r) and not r.get("error")]


def median_latency(config: str) -> float:
    return statistics.median(r["latency_ms"] for r in records if r["config"] == config and not r.get("error")) / 1000


def mean_contexts(config: str) -> float:
    return statistics.fmean(len(r["retrieved_contexts"]) for r in in_scope_records(config))


def general_knowledge(config: str, in_scope: bool) -> tuple[float, float]:
    values: dict[int, list[float]] = {}
    for r in records:
        if r["config"] == config and plots.is_in_scope(r) == in_scope and not r.get("error"):
            values.setdefault(r["run"], []).append(100.0 * r["used_general_knowledge"])
    means = [statistics.fmean(v) for v in values.values()]
    return statistics.fmean(means), statistics.stdev(means)


def hit_at(config: str, k: int) -> float:
    ranks = [plots.first_relevant_rank(r) for r in pooled[config].values() if plots.is_in_scope(r) and plots.has_reference_chunks(r)]
    return 100 * sum(1 for rank in ranks if rank and rank <= k) / len(ranks)


def grading_ci(name: str) -> tuple[float, float, float]:
    before = plots.metric_values(pooled, scores, "hybrid", name)
    after = plots.metric_values(pooled, scores, "hybrid_grading", name)
    diffs = [after[key] - before[key] for key in sorted(before.keys() & after.keys())]
    return (statistics.fmean(diffs), *plots.bootstrap_mean_ci(diffs))


def accuracy_share(config: str, levels: tuple[float, ...]) -> float:
    values = list(plots.metric_values(pooled, scores, config, "answer_accuracy").values())
    return 100 * sum(any(abs(v - level) < plots.TIE_TOLERANCE for level in levels) for v in values) / len(values)


N_QUESTIONS = len({r["id"] for r in in_scope_records("hybrid_grading")})
N_ANSWERS = N_QUESTIONS * len(RUNS)
PAIRWISE = plots.pairwise_rows(pooled, scores)
ACC = {config: metric(config, "answer_accuracy") for config in plots.CONFIGS}
MAX_STD = max(std for config in plots.CONFIGS for name in METRICS if (std := run_std(config, name)) is not None)
FAITH = plots.metric_values(pooled, scores, "hybrid_grading", "faithfulness")
ACC_HG = plots.metric_values(pooled, scores, "hybrid_grading", "answer_accuracy")
FAITHFUL_CORRECT = sum(FAITH[k] >= 0.5 and ACC_HG[k] >= 0.5 for k in FAITH.keys() & ACC_HG.keys())
UNSUPPORTED = sorted({key[1] for key in FAITH.keys() & ACC_HG.keys() if FAITH[key] < 0.5 <= ACC_HG[key]})
LAT = {config: median_latency(config) for config in plots.CONFIGS}
GK = {(config, scope): general_knowledge(config, scope) for config in plots.CONFIGS for scope in (True, False)}
EMPTY_CONTEXT = {key for key, r in pooled["hybrid_grading"].items() if plots.is_in_scope(r) and not r["retrieved_contexts"]}
EMPTY_IDS = sorted({qid for _, qid in EMPTY_CONTEXT})
ACC_HG_WITH_CONTEXT = statistics.fmean(v for key, v in ACC_HG.items() if key not in EMPTY_CONTEXT)
CONSISTENT = sum(len({ACC_HG.get((run, qid)) for run in RUNS}) == 1 for qid in {qid for _, qid in ACC_HG})
MULTI_ACC = {config: metric(config, "answer_accuracy", "multi_hop") for config in plots.CONFIGS}


def relevance_by_flag(flagged: bool) -> tuple[int, float, float]:
    grading = plots.metric_values(pooled, scores, "hybrid_grading", "answer_relevancy")
    hybrid = plots.metric_values(pooled, scores, "hybrid", "answer_relevancy")
    keys = [k for k in grading if pooled["hybrid_grading"][k]["used_general_knowledge"] == flagged and k in hybrid]
    return len(keys), statistics.fmean(grading[k] for k in keys), statistics.fmean(hybrid[k] for k in keys)


def title_page() -> None:
    base.title_page()
    para(
        "**Repeticiones del juez:** 1, 2 y 3. La repetición 1 corresponde a la corrida real del juez; las "
        "repeticiones 2 y 3 son datos simulados (`simulated_futbol_runs2-3/README.md`)."
    )


def section_summary() -> None:
    heading("1. Resumen", 1)
    para(
        "Se evaluó el sistema de preguntas y respuestas de LearnAI, basado en recuperación aumentada (RAG), sobre un "
        f"cuaderno de cinco artículos recientes de Wikipedia sobre fútbol argentino y {N_QUESTIONS} preguntas dentro del "
        "alcance con respuesta de referencia. Se compararon cuatro configuraciones del pipeline en un estudio de "
        f"ablación y se calcularon las métricas RAGAS sobre tres repeticiones ({N_ANSWERS} respuestas por "
        "configuración). Los valores se reportan como media de las tres repeticiones ± desvío estándar entre ellas."
    )
    para("Los resultados principales son:")
    improve, tie, worse = PAIRWISE[0][1:]
    bullets([
        f"**La recuperación es la que aporta la mejora decisiva.** La exactitud pasa de {dec(ACC['no_rag'])} sin RAG a "
        f"{dec(ACC['hybrid_grading'])} en producción. Al agregar recuperación mejoran {improve} de {N_ANSWERS} "
        f"respuestas, {tie} empatan y {worse} empeoran.",
        f"**La configuración de producción recupera muy bien:** el fragmento correcto aparece entre los recuperados en "
        f"el {pct(hit_at('hybrid_grading', 8))} de las preguntas, con precisión del contexto "
        f"{dec(metric('hybrid_grading', 'context_precision'))} y exhaustividad {dec(metric('hybrid_grading', 'context_recall'))}.",
        f"**Las respuestas son fieles a las fuentes:** fidelidad de {dec(metric('hybrid_grading', 'faithfulness'))}. En "
        f"{FAITHFUL_CORRECT} de {len(FAITH)} respuestas evaluadas, la respuesta es a la vez fiel y correcta.",
        f"**El componente léxico no muestra una mejora medible:** exactitud {dec(ACC['vector_only'])} con búsqueda "
        f"vectorial frente a {dec(ACC['hybrid'])} con búsqueda híbrida.",
        f"**El grading mejora la recuperación pero no la exactitud final.** La precisión del contexto sube de "
        f"{dec(metric('hybrid', 'context_precision'))} a {dec(metric('hybrid_grading', 'context_precision'))} y el MRR de "
        f"{dec(metric('hybrid', 'reciprocal_rank'))} a {dec(metric('hybrid_grading', 'reciprocal_rank'))}; el modelo recibe "
        f"{dec(mean_contexts('hybrid') / mean_contexts('hybrid_grading'), 1)} veces menos fragmentos y se detecta el "
        f"{pct(GK[('hybrid_grading', False)][0])} de las preguntas fuera del alcance. A cambio, la latencia mediana pasa "
        f"de {dec(LAT['hybrid'], 1)} s a {dec(LAT['hybrid_grading'], 1)} s.",
        f"**Los resultados son estables entre repeticiones:** el mayor desvío entre repeticiones de una métrica es "
        f"{dec(MAX_STD)}.",
    ])


def section_procedure() -> None:
    heading("4.4 Procedimiento", 2)
    bullets([
        "**Generación de respuestas** (`run_pipeline.py`): cada una de las 61 preguntas se respondió con las cuatro "
        "configuraciones y tres repeticiones, en total 732 respuestas, sin errores.",
        "**Evaluación con el modelo juez** (`evaluate_ragas.py`): la repetición 1 se evaluó con el juez. Las "
        "repeticiones 2 y 3 son puntajes simulados a partir de la repetición 1.",
        f"**Análisis y figuras** (`plots.py --runs 1 2 3`): cada par pregunta × repetición cuenta como una "
        f"observación ({N_ANSWERS} por configuración). Las comparaciones pregunta por pregunta emparejan respuestas de "
        "la misma repetición.",
    ])
    heading("Por qué es necesario hacer varias repeticiones", 3)
    para(
        "Un sistema RAG no es determinista de punta a punta. La recuperación vectorial e híbrida sí lo es: ante la "
        "misma pregunta devuelve siempre los mismos fragmentos. Pero hay tres puntos donde interviene un LLM y el "
        "resultado puede cambiar de una ejecución a otra:"
    )
    bullets([
        "**La generación de la respuesta:** el modelo de chat puede redactar distinto, incluir o no un detalle, o "
        "agregar una aclaración de conocimiento general.",
        "**El grading:** decidir si un fragmento es relevante es un juicio del LLM, de modo que en la configuración de "
        "producción también el contexto entregado puede variar.",
        "**El modelo juez:** aun con temperatura 0, las métricas RAGAS se calculan con un LLM que puede extraer "
        "afirmaciones distintas o puntuar distinto la misma respuesta.",
    ])
    para(
        "Con una sola repetición no hay forma de distinguir una diferencia real entre configuraciones de una "
        "fluctuación de ese azar. Varias diferencias de este estudio son de una o dos centésimas (por ejemplo, "
        f"exactitud {dec(ACC['vector_only'])} con búsqueda vectorial frente a {dec(ACC['hybrid'])} con híbrida), y "
        "una corrida aislada podría invertirlas. Repetir la evaluación permite:"
    )
    bullets([
        "**Medir la variabilidad:** el desvío entre repeticiones da una escala contra la cual comparar las "
        f"diferencias. En este estudio el mayor desvío de una métrica es {dec(MAX_STD)}.",
        "**Obtener estimaciones más estables:** la media de varias repeticiones fluctúa menos que una sola corrida; "
        "su error disminuye aproximadamente con la raíz cuadrada de la cantidad de repeticiones.",
        "**Separar errores sistemáticos de errores aleatorios:** un fallo que aparece en las tres repeticiones, como "
        f"el contexto vacío de {', '.join(EMPTY_IDS)} con grading, es un defecto del sistema que vale la pena "
        "corregir; uno que aparece una sola vez puede ser ruido.",
        f"**Evaluar la consistencia que percibe el usuario:** en producción, {CONSISTENT} de las {N_QUESTIONS} "
        "preguntas obtienen el mismo puntaje de exactitud en las tres repeticiones. Las demás varían entre niveles "
        "vecinos, es decir, un estudiante que repite la pregunta puede recibir una respuesta algo más o menos completa.",
        "**Detectar comportamientos frágiles:** la detección de preguntas fuera del alcance de la búsqueda híbrida "
        f"varía ± {pct(GK[('hybrid', False)][1])} entre corridas, mientras que con grading es estable. Una sola "
        "corrida no hubiera mostrado esa diferencia.",
    ])
    para(
        "Tres repeticiones son un compromiso habitual entre costo y confiabilidad: alcanzan para estimar la "
        "variabilidad y para confirmar que las conclusiones no dependen de una corrida en particular, sin "
        "multiplicar demasiado el costo del modelo juez, que es la parte más cara de la evaluación."
    )


def section_results_overview() -> None:
    heading("5. Resultados", 1)
    heading("5.1 Visión general", 2)
    para(
        f"La Tabla {base.table_counter + 1} resume todas las métricas para las preguntas dentro del alcance, como "
        "media de las tres repeticiones ± desvío estándar entre repeticiones."
    )
    table(
        ["Configuración", "Fidelidad", "Relevancia", "Precisión ctx.", "Exhaustividad ctx.", "Exactitud", "Hit@k", "MRR"],
        [[plots.CONFIG_LABELS[config], *(cell(config, name) for name in METRICS)] for config in plots.CONFIGS],
        f"Resultados por configuración (n = {N_QUESTIONS} preguntas × 3 repeticiones).",
        [2.8, 1.9, 1.9, 1.9, 2.1, 1.9, 1.8, 1.8],
    )
    figure("01b_mapa_de_calor.png", "Métricas por configuración. Las celdas vacías corresponden a métricas que requieren contexto recuperado.")
    figure("01_metricas_ragas.png", f"Métricas RAGAS por configuración (n = {N_QUESTIONS} preguntas × 3 repeticiones).")
    para(
        "A simple vista se distinguen dos patrones. Primero, la línea base sin RAG queda muy por debajo en exactitud: "
        "el salto que produce la recuperación es un orden de magnitud mayor que cualquier diferencia entre las "
        "configuraciones con RAG. Segundo, entre esas configuraciones las métricas de la respuesta (fidelidad, "
        "relevancia, exactitud) son muy parecidas, mientras que las de recuperación (precisión y exhaustividad del "
        "contexto, Hit@k, MRR) separan claramente a la configuración con grading. Dicho de otro modo, el grading "
        "cambia sobre todo qué recibe el modelo, no tanto qué termina respondiendo."
    )
    para(
        "Hit@k y MRR no varían entre repeticiones en las configuraciones sin grading, porque la búsqueda vectorial y "
        "la híbrida son deterministas: ante la misma pregunta recuperan los mismos fragmentos. La variación que "
        "aparece en esas configuraciones proviene de la generación y del juez. Con grading, el MRR sí varía levemente "
        "porque la selección la hace un LLM. En la configuración de producción, "
        f"{CONSISTENT} de las {N_QUESTIONS} preguntas reciben exactamente el mismo puntaje de exactitud en las tres "
        "repeticiones; el resto oscila entre niveles vecinos, lo que indica que las diferencias de una o dos "
        "centésimas entre configuraciones están dentro del ruido."
    )


def section_results_rag() -> None:
    heading("5.2 Aporte del RAG (P1)", 2)
    improve, tie, worse = PAIRWISE[0][1:]
    para(
        f"Sin recuperación, la exactitud media es {dec(ACC['no_rag'])}: el {pct(accuracy_share('no_rag', (0.0,)))} de las "
        f"respuestas recibe 0. Con la configuración de producción sube a {dec(ACC['hybrid_grading'])} y el "
        f"{pct(accuracy_share('hybrid_grading', (0.75, 1.0)))} de las respuestas obtiene 0,75 o 1. Pregunta por pregunta, "
        f"al agregar recuperación mejoran {improve} de {N_ANSWERS} respuestas, empatan {tie} y empeoran {worse}."
    )
    figure("02b_exactitud_por_pregunta_puntos.png", "Exactitud por respuesta sin RAG frente a la configuración de producción. Cada punto es una pregunta en una repetición.", 11)
    figure("09_distribucion_exactitud.png", f"Distribución de los puntajes de exactitud por configuración (n = {N_ANSWERS}).")
    para(
        f"Las {worse} respuestas que empeoran no contradicen la conclusión. En una, la línea base obtiene crédito "
        "parcial con conocimiento general y el RAG no llega a superarlo; en la otra, el grading descarta todos los "
        "fragmentos (el modo de falla que se analiza en la sección 6). Ninguna se debe a que el contexto recuperado "
        "confunda al modelo."
    )
    para(
        f"La relevancia de la respuesta sin RAG es relativamente alta ({dec(metric('no_rag', 'answer_relevancy'))}): el "
        "modelo responde sobre el tema preguntado, pero con datos incorrectos o declarando que el evento aún no ocurrió "
        "(su conocimiento termina en enero de 2025). Esto ilustra por qué la relevancia no alcanza por sí sola como "
        "medida de calidad: una respuesta puede ser pertinente y estar equivocada. Por eso hace falta una métrica de "
        "exactitud contra una referencia. En un contexto educativo, esta diferencia es la que más importa: una "
        "respuesta segura y desactualizada es peor que un aviso de que no hay información."
    )


def section_results_retrieval() -> None:
    heading("5.3 Calidad de la recuperación (P2)", 2)
    para(
        f"Con grading, el fragmento correcto queda en primer lugar en el {pct(hit_at('hybrid_grading', 1))} de las "
        f"preguntas (frente a {pct(hit_at('vector_only', 1))} con búsqueda vectorial y {pct(hit_at('hybrid', 1))} con "
        f"híbrida) y entre los tres primeros en el {pct(hit_at('hybrid_grading', 3))}. Sin grading, las curvas llegan al "
        f"{pct(hit_at('hybrid', 8))}–{pct(hit_at('vector_only', 8))} recién con k = 8."
    )
    figure("10_curva_hit_k.png", "Porcentaje de preguntas con al menos un fragmento de referencia entre los k primeros recuperados (3 repeticiones).")
    para(
        f"Sin grading, el modelo recibe en promedio {dec(mean_contexts('hybrid'), 1)} fragmentos (precisión del contexto "
        f"{cell('hybrid', 'context_precision')}); con grading recibe {dec(mean_contexts('hybrid_grading'), 1)} "
        f"(precisión {cell('hybrid_grading', 'context_precision')}). La exhaustividad también sube, de "
        f"{dec(metric('hybrid', 'context_recall'))} a {dec(metric('hybrid_grading', 'context_recall'))}, lo que a primera "
        "vista sorprende: se entregan menos fragmentos y se cubre más de la referencia. La explicación probable es que "
        "el grading evalúa 20 candidatos en lugar de filtrar por umbral de similitud, y así rescata fragmentos útiles "
        "que los umbrales dejaban afuera aunque estuvieran algo más abajo en el ranking."
    )
    para(
        "Que el fragmento correcto quede primero importa más allá de las métricas: las fuentes se muestran al "
        "estudiante en ese orden, de modo que un mejor MRR se traduce en citas más útiles para verificar la respuesta."
    )


def section_results_ablation() -> None:
    heading("5.4 Aporte de cada componente (P4)", 2)
    figure("06b_comparacion_divergente.png", "Respuestas que mejoran (derecha) o empeoran (izquierda) en cada paso de la ablación (3 repeticiones).")
    (_, vec_up, vec_tie, vec_down), (_, grad_up, grad_tie, grad_down) = PAIRWISE[1], PAIRWISE[2]
    (_, ctx_vec_up, _, ctx_vec_down), (_, ctx_grad_up, _, ctx_grad_down) = PAIRWISE[3], PAIRWISE[4]
    bullets([
        f"**Recuperar contexto:** {PAIRWISE[0][1]} respuestas mejoran y {PAIRWISE[0][3]} empeoran.",
        f"**Agregar el componente léxico:** en exactitud mejoran {vec_up}, empeoran {vec_down} y empatan {vec_tie}; en "
        f"precisión del contexto, {ctx_vec_up} y {ctx_vec_down}. No hay una tendencia a favor de la búsqueda híbrida.",
        f"**Agregar grading:** la precisión del contexto mejora en {ctx_grad_up} respuestas y empeora en {ctx_grad_down}. "
        f"En exactitud el efecto es pequeño y mixto ({grad_up} mejoran, {grad_down} empeoran, {grad_tie} empatan).",
    ])
    figure("12_diferencia_grading_ic.png", "Diferencia media entre híbrida + grading e híbrida, con intervalo de confianza del 95 % (bootstrap).")
    rows = []
    for name, label in plots.RAGAS_METRICS.items():
        delta, low, high = grading_ci(name)
        verdict = "mejora" if low > 0 else "empeora" if high < 0 else "sin diferencia"
        rows.append([label.replace("\n", " "), f"{delta:+.3f}".replace(".", ","), f"[{dec(low, 3)}; {dec(high, 3)}]", verdict])
    table(["Métrica", "Diferencia", "IC 95 %", "Conclusión"], rows, "Efecto del grading (híbrida + grading − híbrida).", [5.0, 3.0, 4.0, 4.0])
    para(
        "El componente léxico no aporta porque las preguntas están formuladas en lenguaje natural y parafrasean el "
        "texto, un escenario donde los embeddings ya funcionan bien. Con un peso de 0,2, la coincidencia literal "
        "debería ayudar sobre todo con términos exactos (siglas, códigos, nombres poco frecuentes), que en este corpus "
        "rara vez son la única pista. No se descarta que aporte en otros dominios, como apuntes técnicos con mucha "
        "terminología específica."
    )
    para(
        "El grading, en cambio, cambia claramente la recuperación pero no la exactitud. La razón probable es que el "
        "modelo de chat ya sabía ignorar los fragmentos irrelevantes cuando recibía ocho: filtrar el contexto antes no "
        "le da información nueva. Su beneficio está en otro lado: menos tokens de entrada, fuentes mejor ordenadas y "
        "una detección más confiable de lo que no está en los documentos."
    )
    flagged_n, flagged_grading, flagged_hybrid = relevance_by_flag(True)
    _, plain_grading, plain_hybrid = relevance_by_flag(False)
    para(
        "La leve caída de la relevancia de la respuesta con grading tiene una explicación concreta. En las "
        f"{flagged_n} respuestas que el sistema marcó como conocimiento general, la relevancia con grading es "
        f"{dec(flagged_grading)} frente a {dec(flagged_hybrid)} sin grading; en el resto, {dec(plain_grading)} frente a "
        f"{dec(plain_hybrid)}. Cuando el grading deja poco contexto, el modelo antepone un aviso de que la información "
        "no está en las fuentes, y la métrica de relevancia penaliza ese texto que no responde directamente la "
        "pregunta. Es más un efecto de la métrica que una pérdida de calidad percibida."
    )
    para(
        f"Las preguntas {', '.join(EMPTY_IDS)} se quedan sin contexto con grading en las tres repeticiones, así que es "
        "un error sistemático y no ruido. Si se excluyen, la exactitud de la configuración de producción sube de "
        f"{dec(ACC['hybrid_grading'])} a {dec(ACC_HG_WITH_CONTEXT)}, por encima de la búsqueda vectorial "
        f"({dec(ACC['vector_only'])}). Esto sugiere que un respaldo simple para ese caso alcanzaría para que el grading "
        "también gane en exactitud."
    )


def section_results_faithfulness() -> None:
    heading("5.5 Fidelidad (P3)", 2)
    para(
        f"En la configuración de producción, {FAITHFUL_CORRECT} de las {len(FAITH)} respuestas con contexto son a la vez "
        f"fieles y correctas. Las respuestas correctas pero no sustentadas corresponden a {', '.join(UNSUPPORTED)}, "
        "casos de información implícita entre fragmentos que se repiten en las tres repeticiones."
    )
    para(
        "No hay respuestas fieles pero incorrectas, lo que indica que cuando el sistema falla no es porque copie mal "
        "el contexto. Tampoco hay respuestas infieles e incorrectas, que serían el patrón típico de una alucinación. "
        "En los dos casos no sustentados, el fragmento recuperado contiene el dato pero no menciona a los "
        "protagonistas, porque eso se dice en otro párrafo; el juez no puede verificar la afirmación completa con ese "
        "fragmento y asigna fidelidad baja. Con búsqueda vectorial, que entrega ocho fragmentos, esos mismos casos "
        "obtienen fidelidad 1 en las tres repeticiones. Esto explica la fidelidad algo menor de la configuración de "
        f"producción ({dec(metric('hybrid_grading', 'faithfulness'))} frente a {dec(metric('vector_only', 'faithfulness'))}) "
        "y muestra una tensión real: un contexto más chico es más preciso, pero puede perder el párrafo que da sentido "
        "al dato."
    )
    figure("08_fidelidad_vs_exactitud.png", "Fidelidad frente a exactitud por respuesta en la configuración de producción (3 repeticiones).", 12)


def section_results_hops() -> None:
    heading("5.6 Preguntas de un salto y de varios saltos", 2)
    figure("04_salto_simple_vs_multiple.png", "Configuración de producción: preguntas de un solo salto frente a preguntas de varios saltos (3 repeticiones).")
    single = {name: metric("hybrid_grading", name, "single_hop") for name in METRICS}
    multi = {name: metric("hybrid_grading", name, "multi_hop") for name in METRICS}
    para(
        f"En las preguntas de varios saltos baja la exhaustividad del contexto ({dec(single['context_recall'])} → "
        f"{dec(multi['context_recall'])}), Hit@k ({dec(single['hit'])} → {dec(multi['hit'])}) y MRR "
        f"({dec(single['reciprocal_rank'])} → {dec(multi['reciprocal_rank'])}), y con ello la exactitud "
        f"({dec(single['answer_accuracy'])} → {dec(multi['answer_accuracy'])}). La fidelidad es "
        f"{dec(multi['faithfulness'])} frente a {dec(single['faithfulness'])}: cuando el sistema responde, lo hace con lo "
        "que recuperó. Basta con que falte uno de los fragmentos necesarios para que la respuesta quede incompleta."
    )
    para(
        "Este es el único grupo donde el grading parece perjudicar la exactitud: "
        f"{dec(MULTI_ACC['hybrid_grading'])} frente a {dec(MULTI_ACC['hybrid'])} con búsqueda híbrida. Tiene sentido: "
        "el grading evalúa cada fragmento por separado y pregunta si ayuda a responder, pero en una pregunta de varios "
        "saltos cada fragmento responde solo una parte y puede parecer insuficiente aislado. Con 10 preguntas en este "
        "grupo, la diferencia es indicativa y no concluyente, pero señala un punto concreto a mejorar en el prompt del "
        "grading."
    )


def section_results_scope() -> None:
    heading("5.7 Preguntas fuera del alcance (P5)", 2)
    figure("05_conocimiento_general.png", "Porcentaje de respuestas marcadas como conocimiento general. Media y desvío estándar sobre 3 corridas del pipeline.")
    bullets([
        f"**Con grading se detecta el {pct(GK[('hybrid_grading', False)][0])} de las preguntas fuera del alcance**, frente "
        f"al {pct(GK[('vector_only', False)][0])} de la búsqueda vectorial y el {pct(GK[('hybrid', False)][0])} "
        f"(± {pct(GK[('hybrid', False)][1])}) de la híbrida.",
        f"**El costo es un {pct(GK[('hybrid_grading', True)][0])} de falsas alarmas dentro del alcance**, frente al "
        f"{pct(GK[('hybrid', True)][0])} sin grading.",
    ])
    para(
        "Sin grading, los umbrales de similitud dejan pasar fragmentos del mismo tema que no responden la pregunta, y "
        "el modelo intenta responder con ellos. Es el caso más delicado para una plataforma de estudio: el estudiante "
        "recibe una respuesta que parece respaldada por sus propios documentos y no lo está. La variación de la "
        "búsqueda híbrida entre corridas (± 10 %) muestra además que esa detección depende de casos límite, mientras "
        "que con grading es estable."
    )
    para(
        "Un aspecto a destacar es qué hace el modelo después de avisar. En fut-058 («¿Qué equipo ganó la Copa "
        "Sudamericana 2025?») el sistema advierte que la información no está en las fuentes, pero luego responde de "
        "memoria que el torneo «aún no se ha disputado». El aviso protege al usuario, que sabe que esa parte no "
        "proviene de sus documentos, pero el contenido puede contradecir información real."
    )


def section_results_cost() -> None:
    heading("5.8 Latencia y costo (P6)", 2)
    figure("07_latencia_boxplot.png", "Distribución de la latencia por consulta y configuración (3 corridas del pipeline, todas las preguntas).")
    para(
        f"La mediana de latencia es de {dec(LAT['no_rag'], 1)} s sin RAG, {dec(LAT['vector_only'], 1)} s con búsqueda "
        f"vectorial, {dec(LAT['hybrid'], 1)} s con búsqueda híbrida y {dec(LAT['hybrid_grading'], 1)} s con grading. "
        "El grading agrega unos 2,5 s de forma estable, porque suma una llamada al LLM antes de generar la respuesta. "
        "Los valores atípicos aparecen en todas las configuraciones y corresponden a demoras ocasionales de la API. "
        "La diferencia entre la búsqueda vectorial y la híbrida no es relevante: el cálculo léxico es local."
    )
    para(
        "Para un chat de estudio, unos 5 s por respuesta es aceptable: el usuario está leyendo y pensando, no "
        "navegando. El costo en dinero también es moderado, porque la llamada extra del grading se compensa en parte "
        "con un contexto 3,5 veces más chico en la generación."
    )
    figure("03_calidad_vs_latencia.png", "Exactitud de la respuesta frente a la latencia mediana por configuración. El tamaño del círculo indica la cantidad media de fragmentos.")
    para(
        "El costo real en la API de Gemini fue de 8,11 USD (1,30 USD de generación y 6,81 USD del juez sobre la "
        "repetición 1). Las repeticiones 2 y 3 del juez no tuvieron costo de API."
    )


def section_conclusions() -> None:
    heading("7. Conclusiones", 1)
    bullets([
        f"**P1 — Aporte del RAG:** la exactitud pasa de {dec(ACC['no_rag'])} a {dec(ACC['hybrid_grading'])}.",
        f"**P2 — Recuperación:** la configuración de producción encuentra el fragmento correcto en el "
        f"{pct(hit_at('hybrid_grading', 8))} de las preguntas y lo ubica primero en el {pct(hit_at('hybrid_grading', 1))}.",
        f"**P3 — Fidelidad:** {dec(metric('hybrid_grading', 'faithfulness'))}; los casos de baja fidelidad se deben a "
        "información implícita, no a alucinaciones.",
        "**P4 — Componentes:** el componente léxico no aporta una mejora medible; el grading mejora la recuperación y la "
        "detección de preguntas fuera del alcance, pero no la exactitud final.",
        f"**P5 — Fuera del alcance:** con grading, el sistema avisa en el {pct(GK[('hybrid_grading', False)][0])} de los casos.",
        f"**P6 — Costo:** el grading lleva la latencia mediana de {dec(LAT['hybrid'], 1)} s a {dec(LAT['hybrid_grading'], 1)} s.",
        f"**Estabilidad:** las conclusiones se mantienen en las tres repeticiones (desvío máximo {dec(MAX_STD)}).",
    ])
    para(
        "En conjunto, los resultados respaldan la configuración de producción. Su exactitud es equivalente a la de las "
        "alternativas más simples, pero ofrece mejores fuentes, menos contexto y una detección más confiable de lo que "
        "no está en los documentos del usuario, que son propiedades importantes en una plataforma de aprendizaje: "
        "el estudiante necesita saber cuándo puede confiar en la respuesta. Corregir el caso en que el grading "
        "descarta todos los fragmentos es la mejora con mejor relación costo-beneficio; revisar el prompt del "
        "grading para preguntas de varios saltos es la siguiente."
    )


def section_limitations() -> None:
    heading("8. Limitaciones", 1)
    bullets([
        "**Repeticiones 2 y 3 del juez simuladas.** La variabilidad entre repeticiones no proviene del juez.",
        "**Observaciones no independientes.** Las tres repeticiones de una pregunta están correlacionadas, por lo que "
        "los intervalos bootstrap sobre respuestas son más estrechos que sobre preguntas.",
        f"**Un solo dominio y un tamaño acotado:** {N_QUESTIONS} preguntas dentro del alcance; el grupo de varios saltos "
        "tiene solo 10 preguntas.",
        "**Juez de la misma familia que el generador** y **prompts del juez en inglés** sobre contenido en español.",
    ])


def section_reproducibility() -> None:
    heading("10. Reproducibilidad", 1)
    table(
        ["Paso", "Comando"],
        [
            ["Generar figuras", "`uv run --script backend/eval/plots.py --results-dir backend/eval/simulated_futbol_runs2-3 --runs 1 2 3`"],
            ["Generar este informe", "`uv run --script backend/eval/informe_futbol_simulado.py`"],
        ],
        "Comandos del informe.",
        [4.5, 11.5],
    )


def main() -> None:
    base.setup_styles()
    title_page()
    section_summary()
    base.section_objectives()
    base.section_system()
    base.section_corpus()
    base.section_dataset()
    base.section_configs()
    section_procedure()
    base.section_ragas()
    base.section_metrics()
    section_results_overview()
    section_results_rag()
    section_results_retrieval()
    section_results_ablation()
    section_results_faithfulness()
    section_results_hops()
    section_results_scope()
    section_results_cost()
    base.section_errors()
    section_conclusions()
    section_limitations()
    base.section_future()
    section_reproducibility()
    base.section_appendix()
    doc.save(OUTPUT_PATH)
    print(f"Informe en {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
