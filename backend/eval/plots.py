# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "matplotlib",
# ]
# ///
import argparse
import json
import math
import random
import statistics
from collections import Counter
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.axes import Axes
from matplotlib.figure import Figure

CM = 1 / 2.54
FIG_WIDTH = 16 * CM
DPI = 300
TIE_TOLERANCE = 1e-6

CONFIGS = ("no_rag", "vector_only", "hybrid", "hybrid_grading")
CONFIG_LABELS = {
    "no_rag": "Sin RAG",
    "vector_only": "Solo vectorial",
    "hybrid": "Híbrida",
    "hybrid_grading": "Híbrida + grading",
}
CONFIG_COLORS = {
    "no_rag": "#BDDF26",
    "vector_only": "#35B779",
    "hybrid": "#31688E",
    "hybrid_grading": "#440154",
}
RAGAS_METRICS = {
    "faithfulness": "Fidelidad",
    "answer_relevancy": "Relevancia\nde la respuesta",
    "context_precision": "Precisión\ndel contexto",
    "context_recall": "Exhaustividad\ndel contexto",
    "answer_accuracy": "Exactitud\nde la respuesta",
}
RETRIEVAL_METRICS = {"hit": "Hit@k", "reciprocal_rank": "MRR"}
SHORT_METRIC_LABELS = {
    "faithfulness": "Fidelidad",
    "answer_relevancy": "Relevancia",
    "context_precision": "Precisión\ncontexto",
    "context_recall": "Exhaustividad\ncontexto",
    "answer_accuracy": "Exactitud",
    **RETRIEVAL_METRICS,
}
LATENCY_LABEL_OFFSETS = {
    "no_rag": (10, -4, "left", "top"),
    "vector_only": (12, 6, "left", "bottom"),
    "hybrid": (-12, -8, "right", "top"),
    "hybrid_grading": (-12, -8, "right", "top"),
}
COST_LABEL_OFFSETS = {
    "vector_only": (0, 9, "center", "bottom"),
    "hybrid": (0, -9, "center", "top"),
    "hybrid_grading": (0, 9, "center", "bottom"),
}
HIT_LABEL_OFFSETS = {"vector_only": 0, "hybrid": -7, "hybrid_grading": 5}
IMPROVE_COLOR = "#21918C"
TIE_COLOR = "#D9D9D9"
WORSE_COLOR = "#440154"

CAPTIONS = {
    "01_metricas_ragas.png": "Métricas RAGAS por configuración (preguntas dentro del alcance, n = {n_in_scope}).",
    "02_exactitud_por_pregunta.png": "Exactitud de la respuesta por pregunta: sin RAG frente a la configuración de producción. "
    "El tamaño de cada círculo indica la cantidad de preguntas.",
    "02b_exactitud_por_pregunta_puntos.png": "Exactitud de la respuesta por pregunta: sin RAG frente a la configuración "
    "de producción. Cada punto es una pregunta; los puntos con igual puntaje se agrupan alrededor del valor.",
    "03_calidad_vs_latencia.png": "Exactitud de la respuesta frente a la latencia mediana por configuración. "
    "El tamaño del círculo indica la cantidad media de fragmentos entregados al modelo.",
    "04_salto_simple_vs_multiple.png": "Configuración de producción: preguntas de un solo salto (n = {n_single}) "
    "frente a preguntas de varios saltos (n = {n_multi}).",
    "05_conocimiento_general.png": "Porcentaje de respuestas marcadas como conocimiento general. "
    "Media y desvío estándar sobre {pipeline_runs} corridas del pipeline.",
    "06_comparacion_por_pregunta.png": "Comparación pregunta por pregunta entre pasos consecutivos de la ablación.",
    "06b_comparacion_divergente.png": "Preguntas que mejoran (derecha) o empeoran (izquierda) en cada paso de la ablación.",
    "01b_mapa_de_calor.png": "Métricas por configuración (preguntas dentro del alcance, n = {n_in_scope}). "
    "Las celdas vacías corresponden a métricas que requieren contexto recuperado.",
    "02c_exactitud_slope.png": "Exactitud de la respuesta por pregunta al pasar de sin RAG a la configuración de producción. "
    "El grosor de cada línea indica la cantidad de preguntas; la línea punteada une las medias.",
    "07_latencia_boxplot.png": "Distribución de la latencia por consulta y configuración "
    "({pipeline_runs} corridas del pipeline, todas las preguntas).",
    "12_diferencia_grading_ic.png": "Diferencia media por pregunta entre híbrida + grading e híbrida, con intervalo de confianza "
    "del 95 % (bootstrap con 10 000 remuestreos sobre las preguntas). Un intervalo que no cruza el cero indica una diferencia sistemática.",
    "13_hibrida_vs_grading_pareado.png": "Puntaje por pregunta con y sin grading. Los puntos sobre la diagonal empatan; "
    "arriba mejora con grading y abajo empeora. El número indica la cantidad de preguntas.",
    "03b_costo_beneficio.png": "Ganancia de exactitud de la respuesta frente a la latencia mediana extra, "
    "tomando como referencia la configuración sin RAG (preguntas dentro del alcance, n = {n_in_scope}).",
    "07c_latencia_percentiles.png": "Latencia por consulta: mediana, percentil 95 y máximo por configuración "
    "({pipeline_runs} corridas del pipeline, todas las preguntas).",
    "07b_latencia_acumulada.png": "Distribución acumulada de la latencia por consulta y configuración "
    "({pipeline_runs} corridas del pipeline, todas las preguntas). El punto marca la mediana.",
    "08_fidelidad_vs_exactitud.png": "Fidelidad frente a exactitud por pregunta en la configuración de producción. "
    "Se agregó un desplazamiento vertical pequeño para evitar superposiciones.",
    "08b_fidelidad_vs_exactitud_por_config.png": "Fidelidad frente a exactitud por pregunta en cada configuración con recuperación. "
    "Se agregó un desplazamiento pequeño para evitar superposiciones.",
    "11_radar_configuraciones.png": "Métricas RAGAS medias por configuración (preguntas dentro del alcance, n = {n_in_scope}). "
    "Sin RAG solo se muestra en las métricas que no requieren contexto recuperado.",
    "09_distribucion_exactitud.png": "Distribución de los puntajes de exactitud de la respuesta por configuración "
    "(n = {n_in_scope}).",
    "10_curva_hit_k.png": "Porcentaje de preguntas con al menos un fragmento de referencia entre los k primeros recuperados.",
}


def load_records(results_dir: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in sorted(results_dir.glob("*_run*.jsonl")):
        records += [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not records:
        raise SystemExit(f"No hay resultados en {results_dir}")
    return records


def load_scores(scores_path: Path) -> dict[str, dict[str, float]]:
    if not scores_path.exists():
        raise SystemExit(f"No existe {scores_path}; corre primero evaluate_ragas.py")
    scores: dict[str, dict[str, float]] = {}
    for line in scores_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            entry = json.loads(line)
            if entry.get("value") is not None:
                scores.setdefault(entry["key"], {})[entry["metric"]] = entry["value"]
    return scores


def has_reference_chunks(record: dict[str, Any]) -> bool:
    return bool(record.get("reference_chunks")) and record["config"] != "no_rag"


def first_relevant_rank(record: dict[str, Any]) -> int | None:
    reference_ids = {f"{chunk['document_id']}:{chunk['chunk_id']}" for chunk in record.get("reference_chunks", [])}
    retrieved_ids = [f"{source['document_id']}:{source['chunk_id']}" for source in record["sources"]]
    return next((index + 1 for index, chunk in enumerate(retrieved_ids) if chunk in reference_ids), None)


def retrieval_scores(record: dict[str, Any]) -> dict[str, float]:
    if not has_reference_chunks(record):
        return {}
    rank = first_relevant_rank(record)
    return {"hit": 1.0 if rank else 0.0, "reciprocal_rank": 1.0 / rank if rank else 0.0}


def is_in_scope(record: dict[str, Any]) -> bool:
    return record["question_type"] != "out_of_scope"


def judged_records(records: list[dict[str, Any]], runs: set[int]) -> dict[str, dict[tuple[int, str], dict[str, Any]]]:
    by_config: dict[str, dict[tuple[int, str], dict[str, Any]]] = {}
    for record in records:
        if record["run"] in runs and not record.get("error"):
            by_config.setdefault(record["config"], {})[(record["run"], record["id"])] = record
    return by_config


def run_count(by_config: dict) -> int:
    return len({run for records in by_config.values() for run, _ in records}) or 1


def count_label(by_config: dict) -> str:
    runs = run_count(by_config)
    return "Cantidad de preguntas" if runs == 1 else f"Cantidad de respuestas ({runs} repeticiones por pregunta)"


def metric_values(
    by_config: dict[str, dict[str, dict[str, Any]]],
    scores: dict[str, dict[str, float]],
    config: str,
    metric: str,
    question_type: str | None = None,
) -> dict[tuple[int, str], float]:
    values: dict[tuple[int, str], float] = {}
    for question_id, record in by_config.get(config, {}).items():
        if not is_in_scope(record) or (question_type and record["question_type"] != question_type):
            continue
        key = f"{record['config']}|{record['run']}|{record['id']}"
        value = retrieval_scores(record).get(metric) if metric in RETRIEVAL_METRICS else scores.get(key, {}).get(metric)
        if value is not None:
            values[question_id] = value
    return values


def mean(values: dict[tuple[int, str], float]) -> float | None:
    return statistics.fmean(values.values()) if values else None


def style_axes(ax: Axes) -> None:
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(length=0)
    ax.set_axisbelow(True)


def label_bars(ax: Axes, bars: Any, fmt: str = "{:.2f}", extra: list[float] | None = None) -> None:
    for index, bar in enumerate(bars):
        height = bar.get_height()
        ax.annotate(
            fmt.format(height),
            (bar.get_x() + bar.get_width() / 2, height + (extra[index] if extra else 0)),
            xytext=(0, 2),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=6,
            rotation=90,
        )


def save(fig: Figure, output_dir: Path, name: str) -> None:
    fig.savefig(output_dir / name, dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"Figura {output_dir / name}")


def plot_ragas_metrics(by_config: dict, scores: dict, output_dir: Path) -> None:
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 8 * CM))
    width = 0.2
    for offset, config in enumerate(CONFIGS):
        positions, heights = [], []
        for index, metric in enumerate(RAGAS_METRICS):
            value = mean(metric_values(by_config, scores, config, metric))
            if value is not None:
                positions.append(index + (offset - 1.5) * width)
                heights.append(value)
        bars = ax.bar(positions, heights, width, color=CONFIG_COLORS[config], label=CONFIG_LABELS[config])
        label_bars(ax, bars)
    ax.set_xticks(range(len(RAGAS_METRICS)), RAGAS_METRICS.values())
    ax.set_ylim(0, 1.15)
    ax.set_yticks([0, 0.25, 0.5, 0.75, 1])
    ax.set_ylabel("Puntaje medio")
    ax.grid(axis="y", color="#EEEEEE")
    ax.legend(ncol=4, loc="upper center", bbox_to_anchor=(0.5, -0.18), frameon=False)
    style_axes(ax)
    save(fig, output_dir, "01_metricas_ragas.png")


def plot_accuracy_per_question(by_config: dict, scores: dict, output_dir: Path) -> None:
    baseline = metric_values(by_config, scores, "no_rag", "answer_accuracy")
    production = metric_values(by_config, scores, "hybrid_grading", "answer_accuracy")
    pairs = Counter((baseline[qid], production[qid]) for qid in baseline.keys() & production.keys())
    runs = run_count(by_config)
    fig, ax = plt.subplots(figsize=(11 * CM, 10 * CM))
    ax.plot([-0.1, 1.1], [-0.1, 1.1], linestyle="--", color="#9E9E9E", linewidth=0.8, zorder=1)
    for (x, y), count in pairs.items():
        ax.scatter(x, y, s=60 + count * 45 / runs, color=CONFIG_COLORS["hybrid_grading"], alpha=0.85, zorder=2)
        ax.annotate(str(count), (x, y), ha="center", va="center", color="white", fontsize=7, fontweight="bold", zorder=3)
    ticks = [0, 0.25, 0.5, 0.75, 1]
    ax.set_xticks(ticks)
    ax.set_yticks(ticks)
    ax.set_xlim(-0.12, 1.12)
    ax.set_ylim(-0.12, 1.12)
    ax.set_xlabel(f"Exactitud — {CONFIG_LABELS['no_rag']}")
    ax.set_ylabel(f"Exactitud — {CONFIG_LABELS['hybrid_grading']}")
    ax.grid(color="#EEEEEE")
    ax.set_aspect("equal")
    style_axes(ax)
    save(fig, output_dir, "02_exactitud_por_pregunta.png")


def grid_offsets(count: int, spacing: float) -> list[tuple[float, float]]:
    columns = math.ceil(math.sqrt(count))
    rows = math.ceil(count / columns)
    offsets = []
    for index in range(count):
        row, column = divmod(index, columns)
        row_size = min(columns, count - row * columns)
        offsets.append(((column - (row_size - 1) / 2) * spacing, ((rows - 1) / 2 - row) * spacing))
    return offsets


def plot_accuracy_points(by_config: dict, scores: dict, output_dir: Path) -> None:
    baseline = metric_values(by_config, scores, "no_rag", "answer_accuracy")
    production = metric_values(by_config, scores, "hybrid_grading", "answer_accuracy")
    question_types = {qid: r["question_type"] for qid, r in by_config.get("hybrid_grading", {}).items()}
    cells: dict[tuple[float, float], list[str]] = {}
    for qid in sorted(baseline.keys() & production.keys(), key=lambda q: (question_types[q], q)):
        cells.setdefault((baseline[qid], production[qid]), []).append(qid)
    groups = {"single_hop": ("Un solo salto", "#5EC962"), "multi_hop": ("Varios saltos", "#3B528B")}
    points: dict[str, tuple[list[float], list[float]]] = {key: ([], []) for key in groups}
    runs = run_count(by_config)
    for (x, y), qids in cells.items():
        for qid, (dx, dy) in zip(qids, grid_offsets(len(qids), 0.04 / math.sqrt(runs))):
            points[question_types[qid]][0].append(x + dx)
            points[question_types[qid]][1].append(y + dy)
    fig, ax = plt.subplots(figsize=(11 * CM, 11 * CM))
    ax.plot([-0.15, 1.15], [-0.15, 1.15], linestyle="--", color="#9E9E9E", linewidth=0.8, zorder=1)
    for question_type, (label, color) in groups.items():
        xs, ys = points[question_type]
        ax.scatter(xs, ys, s=14 / runs, color=color, edgecolor="white", linewidth=0.4 / runs, label=f"{label} (n = {len(xs)})", zorder=2)
    ticks = [0, 0.25, 0.5, 0.75, 1]
    ax.set_xticks(ticks)
    ax.set_yticks(ticks)
    ax.set_xlim(-0.15, 1.15)
    ax.set_ylim(-0.15, 1.15)
    ax.set_xlabel(f"Exactitud — {CONFIG_LABELS['no_rag']}")
    ax.set_ylabel(f"Exactitud — {CONFIG_LABELS['hybrid_grading']}")
    ax.grid(color="#EEEEEE")
    ax.set_aspect("equal")
    ax.legend(ncol=2, loc="upper center", bbox_to_anchor=(0.5, -0.14), frameon=False)
    style_axes(ax)
    save(fig, output_dir, "02b_exactitud_por_pregunta_puntos.png")


def plot_quality_vs_latency(records: list[dict], by_config: dict, scores: dict, output_dir: Path) -> None:
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 8 * CM))
    for config in CONFIGS:
        config_records = [r for r in records if r["config"] == config and is_in_scope(r) and not r.get("error")]
        latency = statistics.median(r["latency_ms"] for r in config_records) / 1000
        contexts = statistics.fmean(len(r["retrieved_contexts"]) for r in config_records)
        accuracy = mean(metric_values(by_config, scores, config, "answer_accuracy"))
        if accuracy is None:
            continue
        ax.scatter(latency, accuracy, s=80 + contexts * 40, color=CONFIG_COLORS[config], edgecolor="#333333", linewidth=0.5, zorder=2)
        ax.annotate(
            f"{CONFIG_LABELS[config]}\n{contexts:.1f} fragmentos",
            (latency, accuracy),
            xytext=LATENCY_LABEL_OFFSETS[config][:2],
            textcoords="offset points",
            fontsize=7,
            ha=LATENCY_LABEL_OFFSETS[config][2],
            va=LATENCY_LABEL_OFFSETS[config][3],
        )
    ax.set_xlabel("Latencia mediana (s)")
    ax.set_ylabel("Exactitud de la respuesta")
    ax.set_ylim(0, 1.05)
    ax.set_xlim(left=0)
    ax.margins(x=0.25)
    ax.grid(color="#EEEEEE")
    style_axes(ax)
    save(fig, output_dir, "03_calidad_vs_latencia.png")


def plot_hops(by_config: dict, scores: dict, output_dir: Path) -> None:
    metrics = SHORT_METRIC_LABELS
    groups = {"single_hop": ("Un solo salto", "#5EC962"), "multi_hop": ("Varios saltos", "#3B528B")}
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 8 * CM))
    width = 0.38
    for offset, (question_type, (label, color)) in enumerate(groups.items()):
        heights = [mean(metric_values(by_config, scores, "hybrid_grading", m, question_type)) or 0 for m in metrics]
        positions = [index + (offset - 0.5) * width for index in range(len(metrics))]
        label_bars(ax, ax.bar(positions, heights, width, color=color, label=label))
    ax.set_xticks(range(len(metrics)), metrics.values(), fontsize=7)
    ax.set_ylim(0, 1.15)
    ax.set_yticks([0, 0.25, 0.5, 0.75, 1])
    ax.set_ylabel("Puntaje medio")
    ax.grid(axis="y", color="#EEEEEE")
    ax.legend(ncol=2, loc="upper center", bbox_to_anchor=(0.5, -0.18), frameon=False)
    style_axes(ax)
    save(fig, output_dir, "04_salto_simple_vs_multiple.png")


def plot_general_knowledge(records: list[dict], output_dir: Path) -> None:
    groups = {"Dentro del alcance": True, "Fuera del alcance": False}
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 7 * CM))
    width = 0.2
    for offset, config in enumerate(CONFIGS):
        means, stds = [], []
        for in_scope in groups.values():
            per_run: dict[int, list[float]] = {}
            for r in records:
                if r["config"] == config and is_in_scope(r) == in_scope and not r.get("error"):
                    per_run.setdefault(r["run"], []).append(100.0 * r["used_general_knowledge"])
            run_means = [statistics.fmean(values) for values in per_run.values()]
            means.append(statistics.fmean(run_means))
            stds.append(statistics.stdev(run_means) if len(run_means) > 1 else 0.0)
        positions = [index + (offset - 1.5) * width for index in range(len(groups))]
        bars = ax.bar(positions, means, width, color=CONFIG_COLORS[config], label=CONFIG_LABELS[config])
        for position, value, std in zip(positions, means, stds):
            if std > 0:
                ax.errorbar(position, value, yerr=std, color="#333333", capsize=2, linewidth=0.7)
        label_bars(ax, bars, "{:.0f} %", stds)
    ax.set_xticks(range(len(groups)), groups.keys())
    ax.set_ylim(0, 125)
    ax.set_yticks([0, 25, 50, 75, 100])
    ax.set_ylabel("Respuestas marcadas (%)")
    ax.grid(axis="y", color="#EEEEEE")
    ax.legend(ncol=4, loc="upper center", bbox_to_anchor=(0.5, -0.12), frameon=False)
    style_axes(ax)
    save(fig, output_dir, "05_conocimiento_general.png")


def pairwise_rows(by_config: dict, scores: dict) -> list[tuple[str, int, int, int]]:
    comparisons = [
        ("answer_accuracy", "no_rag", "vector_only"),
        ("answer_accuracy", "vector_only", "hybrid"),
        ("answer_accuracy", "hybrid", "hybrid_grading"),
        ("context_precision", "vector_only", "hybrid"),
        ("context_precision", "hybrid", "hybrid_grading"),
    ]
    rows = []
    for metric, before, after in comparisons:
        old = metric_values(by_config, scores, before, metric)
        new = metric_values(by_config, scores, after, metric)
        diffs = [new[qid] - old[qid] for qid in old.keys() & new.keys()]
        label = f"{RAGAS_METRICS[metric].replace(chr(10), ' ')}\n{CONFIG_LABELS[before]} → {CONFIG_LABELS[after]}"
        rows.append((
            label,
            sum(d > TIE_TOLERANCE for d in diffs),
            sum(abs(d) <= TIE_TOLERANCE for d in diffs),
            sum(d < -TIE_TOLERANCE for d in diffs),
        ))
    return rows


def plot_pairwise(by_config: dict, scores: dict, output_dir: Path) -> None:
    rows = pairwise_rows(by_config, scores)
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 9 * CM))
    positions = list(range(len(rows)))[::-1]
    lefts = [0] * len(rows)
    for column, (label, color, text_color) in enumerate(
        [("Mejora", IMPROVE_COLOR, "white"), ("Empata", TIE_COLOR, "#333333"), ("Empeora", WORSE_COLOR, "white")], start=1
    ):
        widths = [row[column] for row in rows]
        ax.barh(positions, widths, left=lefts, color=color, label=label, height=0.6)
        for y, left, value in zip(positions, lefts, widths):
            if value:
                ax.annotate(str(value), (left + value / 2, y), ha="center", va="center", fontsize=7, color=text_color)
        lefts = [left + value for left, value in zip(lefts, widths)]
    ax.set_yticks(positions, [row[0] for row in rows], fontsize=7)
    ax.set_xlabel(count_label(by_config))
    ax.legend(ncol=3, loc="upper center", bbox_to_anchor=(0.5, -0.15), frameon=False)
    style_axes(ax)
    ax.spines["left"].set_visible(False)
    save(fig, output_dir, "06_comparacion_por_pregunta.png")


def plot_pairwise_diverging(by_config: dict, scores: dict, output_dir: Path) -> None:
    rows = pairwise_rows(by_config, scores)
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 9 * CM))
    positions = list(range(len(rows)))[::-1]
    right = max(row[1] for row in rows) * 1.12 + 6
    left = max(row[3] for row in rows) * 1.12 + 6
    step = 10 * run_count(by_config)
    ax.barh(positions, [row[1] for row in rows], color=IMPROVE_COLOR, label="Mejora", height=0.6)
    ax.barh(positions, [-row[3] for row in rows], color=WORSE_COLOR, label="Empeora", height=0.6)
    for y, (_, improve, tie, worse) in zip(positions, rows):
        if improve:
            ax.annotate(str(improve), (improve, y), xytext=(3, 0), textcoords="offset points", va="center", fontsize=7)
        if worse:
            ax.annotate(str(worse), (-worse, y), xytext=(-3, 0), textcoords="offset points", va="center", ha="right", fontsize=7)
        ax.annotate(
            f"empatan: {tie}", (1.02, y), xycoords=("axes fraction", "data"),
            ha="left", va="center", fontsize=7, color="#757575",
        )
    ax.axvline(0, color="#333333", linewidth=0.8)
    ax.set_xlim(-left, right)
    ticks = [tick for tick in range(-20 * step, 20 * step + 1, step) if -left < tick < right]
    ax.set_xticks(ticks, [str(abs(tick)) for tick in ticks])
    ax.set_yticks(positions, [row[0] for row in rows], fontsize=7)
    ax.set_xlabel(count_label(by_config))
    ax.grid(axis="x", color="#EEEEEE")
    ax.legend(ncol=2, loc="upper center", bbox_to_anchor=(0.5, -0.15), frameon=False)
    style_axes(ax)
    ax.spines["left"].set_visible(False)
    save(fig, output_dir, "06b_comparacion_divergente.png")


def plot_metrics_heatmap(by_config: dict, scores: dict, output_dir: Path) -> None:
    metrics = SHORT_METRIC_LABELS
    matrix = [
        [mean(metric_values(by_config, scores, config, metric)) for metric in metrics]
        for config in CONFIGS
    ]
    cmap = matplotlib.colormaps["viridis"].copy()
    cmap.set_bad("#F5F5F5")
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 6 * CM))
    ax.imshow(
        [[float("nan") if value is None else value for value in row] for row in matrix],
        cmap=cmap, vmin=0, vmax=1, aspect="auto",
    )
    for row_index, row in enumerate(matrix):
        for column_index, value in enumerate(row):
            text = "—" if value is None else f"{value:.2f}"
            color = "white" if value is not None and value < 0.6 else "#333333"
            ax.annotate(text, (column_index, row_index), ha="center", va="center", fontsize=8, color=color)
    ax.set_xticks(range(len(metrics)), metrics.values(), fontsize=7)
    ax.set_yticks(range(len(CONFIGS)), [CONFIG_LABELS[config] for config in CONFIGS])
    ax.xaxis.tick_top()
    ax.tick_params(length=0)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.set_xticks([x - 0.5 for x in range(1, len(metrics))], minor=True)
    ax.set_yticks([y - 0.5 for y in range(1, len(CONFIGS))], minor=True)
    ax.grid(which="minor", color="white", linewidth=2)
    ax.tick_params(which="minor", length=0)
    save(fig, output_dir, "01b_mapa_de_calor.png")


def plot_accuracy_slope(by_config: dict, scores: dict, output_dir: Path) -> None:
    baseline = metric_values(by_config, scores, "no_rag", "answer_accuracy")
    production = metric_values(by_config, scores, "hybrid_grading", "answer_accuracy")
    question_ids = baseline.keys() & production.keys()
    pairs = Counter((baseline[qid], production[qid]) for qid in question_ids)
    runs = run_count(by_config)
    fig, ax = plt.subplots(figsize=(10 * CM, 10 * CM))
    for (start, end), count in sorted(pairs.items(), key=lambda item: item[1]):
        color = IMPROVE_COLOR if end > start else WORSE_COLOR if end < start else "#BDBDBD"
        ax.plot([0, 1], [start, end], color=color, linewidth=0.6 + count * 0.45 / runs, alpha=0.75, solid_capstyle="round", zorder=2)
    for x, values in ((0, baseline), (1, production)):
        levels = Counter(values[qid] for qid in question_ids)
        for level, count in levels.items():
            ax.scatter(x, level, s=22, color=CONFIG_COLORS["no_rag" if x == 0 else "hybrid_grading"], zorder=3)
            ax.annotate(
                str(count), (x, level), xytext=(-8 if x == 0 else 8, 0), textcoords="offset points",
                ha="right" if x == 0 else "left", va="center", fontsize=7,
            )
    baseline_mean = statistics.fmean(baseline[qid] for qid in question_ids)
    production_mean = statistics.fmean(production[qid] for qid in question_ids)
    ax.plot([0, 1], [baseline_mean, production_mean], color="#333333", linestyle="--", linewidth=1.2, zorder=4, label="Media")
    ax.annotate(f"{baseline_mean:.2f}", (0, baseline_mean), xytext=(-22, 0), textcoords="offset points", ha="right", va="center", fontsize=7, fontweight="bold")
    ax.annotate(f"{production_mean:.2f}", (1, production_mean), xytext=(22, 0), textcoords="offset points", ha="left", va="center", fontsize=7, fontweight="bold")
    ax.set_xticks([0, 1], [CONFIG_LABELS["no_rag"], CONFIG_LABELS["hybrid_grading"]])
    ax.set_xlim(-0.35, 1.35)
    ax.set_yticks([0, 0.25, 0.5, 0.75, 1])
    ax.set_ylim(-0.08, 1.08)
    ax.set_ylabel("Exactitud de la respuesta")
    ax.grid(axis="y", color="#EEEEEE")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.1), frameon=False)
    style_axes(ax)
    ax.spines["bottom"].set_visible(False)
    save(fig, output_dir, "02c_exactitud_slope.png")


def plot_latency_boxplot(records: list[dict], output_dir: Path) -> None:
    data = [
        [r["latency_ms"] / 1000 for r in records if r["config"] == config and not r.get("error")]
        for config in CONFIGS
    ]
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 7 * CM))
    boxes = ax.boxplot(
        data, orientation="horizontal", patch_artist=True, widths=0.55,
        medianprops={"color": "#333333", "linewidth": 1.2},
        flierprops={"marker": "o", "markersize": 2.5, "markerfacecolor": "#757575", "markeredgecolor": "none"},
        whiskerprops={"linewidth": 0.8}, capprops={"linewidth": 0.8},
    )
    for patch, config in zip(boxes["boxes"], CONFIGS):
        patch.set_facecolor(CONFIG_COLORS[config])
        patch.set_edgecolor("#333333")
        patch.set_linewidth(0.8)
    for median_line, config in zip(boxes["medians"], CONFIGS):
        if config in ("hybrid", "hybrid_grading"):
            median_line.set_color("white")
    for index, values in enumerate(data, start=1):
        ax.annotate(
            f"mediana {statistics.median(values):.1f} s", (1.01, index), xycoords=("axes fraction", "data"),
            va="center", fontsize=7, color="#555555",
        )
    ax.set_yticks(range(1, len(CONFIGS) + 1), [CONFIG_LABELS[config] for config in CONFIGS])
    ax.set_xlabel("Latencia por consulta (s)")
    ax.set_xlim(left=0)
    ax.grid(axis="x", color="#EEEEEE")
    style_axes(ax)
    save(fig, output_dir, "07_latencia_boxplot.png")


def plot_latency_ecdf(records: list[dict], output_dir: Path) -> None:
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 8 * CM))
    for config in CONFIGS:
        values = sorted(r["latency_ms"] / 1000 for r in records if r["config"] == config and not r.get("error"))
        share = [100 * (index + 1) / len(values) for index in range(len(values))]
        ax.step(values, share, where="post", color=CONFIG_COLORS[config], linewidth=1.6, label=CONFIG_LABELS[config])
        median = statistics.median(values)
        ax.scatter(median, 50, s=22, color=CONFIG_COLORS[config], edgecolor="#333333", linewidth=0.5, zorder=3)
    ax.axhline(50, color="#9E9E9E", linewidth=0.8, linestyle="--", zorder=1)
    ax.annotate("mediana", (1.0, 50), xycoords=("axes fraction", "data"), xytext=(-2, 3), textcoords="offset points", ha="right", fontsize=7, color="#757575")
    ax.set_xlim(left=0)
    ax.set_ylim(0, 102)
    ax.set_yticks([0, 25, 50, 75, 100])
    ax.set_xlabel("Latencia por consulta (s)")
    ax.set_ylabel("Consultas resueltas (%)")
    ax.grid(color="#EEEEEE")
    ax.legend(ncol=4, loc="upper center", bbox_to_anchor=(0.5, -0.18), frameon=False)
    style_axes(ax)
    save(fig, output_dir, "07b_latencia_acumulada.png")


def plot_latency_percentiles(records: list[dict], output_dir: Path) -> None:
    stats = {"p50": "Mediana (p50)", "p95": "p95", "max": "Máximo"}
    shades = ["#9ECAE1", "#4A90C2", "#08306B"]
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 8 * CM))
    width = 0.26
    for config_index, config in enumerate(CONFIGS):
        values = [r["latency_ms"] / 1000 for r in records if r["config"] == config and not r.get("error")]
        cuts = statistics.quantiles(values, n=100, method="inclusive")
        heights = [statistics.median(values), cuts[94], max(values)]
        positions = [config_index + (offset - 1) * width for offset in range(len(stats))]
        for position, height, shade in zip(positions, heights, shades):
            ax.bar(position, height, width * 0.92, color=shade)
            ax.annotate(f"{height:.1f}", (position, height), xytext=(0, 2), textcoords="offset points", ha="center", va="bottom", fontsize=6)
    for (label, shade) in zip(stats.values(), shades):
        ax.bar(0, 0, color=shade, label=label)
    ax.set_xticks(range(len(CONFIGS)), [CONFIG_LABELS[config] for config in CONFIGS])
    ax.set_ylabel("Latencia por consulta (s)")
    ax.set_ylim(0, None)
    ax.margins(y=0.1)
    ax.grid(axis="y", color="#EEEEEE")
    ax.legend(ncol=3, loc="upper center", bbox_to_anchor=(0.5, -0.12), frameon=False)
    style_axes(ax)
    save(fig, output_dir, "07c_latencia_percentiles.png")


def plot_cost_benefit(records: list[dict], by_config: dict, scores: dict, output_dir: Path) -> None:
    def median_latency(config: str) -> float:
        return statistics.median(r["latency_ms"] for r in records if r["config"] == config and is_in_scope(r) and not r.get("error")) / 1000

    base_latency = median_latency("no_rag")
    base_accuracy = mean(metric_values(by_config, scores, "no_rag", "answer_accuracy"))
    if base_accuracy is None:
        return
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 8 * CM))
    ax.axhline(0, color="#9E9E9E", linewidth=0.8, linestyle="--", zorder=1)
    for config in CONFIGS[1:]:
        accuracy = mean(metric_values(by_config, scores, config, "answer_accuracy"))
        if accuracy is None:
            continue
        extra_latency = median_latency(config) - base_latency
        gain = accuracy - base_accuracy
        ax.scatter(extra_latency, gain, s=70, color=CONFIG_COLORS[config], edgecolor="#333333", linewidth=0.5, zorder=3)
        ax.annotate(
            f"{CONFIG_LABELS[config]}\n+{extra_latency:.1f} s · {gain:+.2f}", (extra_latency, gain),
            xytext=COST_LABEL_OFFSETS[config][:2], textcoords="offset points", fontsize=7,
            ha=COST_LABEL_OFFSETS[config][2], va=COST_LABEL_OFFSETS[config][3],
        )
    ax.set_xlabel(f"Latencia extra frente a {CONFIG_LABELS['no_rag']} (s, mediana)")
    ax.set_ylabel(f"Ganancia de exactitud\nfrente a {CONFIG_LABELS['no_rag']}")
    ax.set_xlim(0, None)
    ax.margins(x=0.3, y=0.25)
    ax.grid(color="#EEEEEE")
    style_axes(ax)
    save(fig, output_dir, "03b_costo_beneficio.png")


def bootstrap_mean_ci(diffs: list[float], resamples: int = 10000, seed: int = 0) -> tuple[float, float]:
    rng = random.Random(seed)
    size = len(diffs)
    means = sorted(statistics.fmean(rng.choices(diffs, k=size)) for _ in range(resamples))
    return means[int(0.025 * resamples)], means[int(0.975 * resamples) - 1]


def plot_grading_difference_ci(by_config: dict, scores: dict, output_dir: Path) -> None:
    rows = []
    for metric in RAGAS_METRICS:
        before = metric_values(by_config, scores, "hybrid", metric)
        after = metric_values(by_config, scores, "hybrid_grading", metric)
        diffs = [after[qid] - before[qid] for qid in sorted(before.keys() & after.keys())]
        if diffs:
            low, high = bootstrap_mean_ci(diffs)
            rows.append((RAGAS_METRICS[metric].replace("\n", " "), statistics.fmean(diffs), low, high, len(diffs)))
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 7 * CM))
    positions = list(range(len(rows)))[::-1]
    for y, (_, delta, low, high, _) in zip(positions, rows):
        significant = low > 0 or high < 0
        color = IMPROVE_COLOR if low > 0 else WORSE_COLOR if high < 0 else "#757575"
        ax.plot([low, high], [y, y], color=color, linewidth=1.8, solid_capstyle="round", zorder=2)
        ax.scatter(delta, y, s=34 if significant else 28, color=color, edgecolor="white", linewidth=0.6, zorder=3)
        ax.annotate(f"{delta:+.3f}", (high, y), xytext=(6, 0), textcoords="offset points", va="center", fontsize=7)
    ax.axvline(0, color="#333333", linewidth=0.8, zorder=1)
    ax.set_yticks(positions, [f"{row[0]} (n = {row[4]})" for row in rows], fontsize=7)
    ax.set_xlabel(f"Diferencia media por pregunta: {CONFIG_LABELS['hybrid_grading']} − {CONFIG_LABELS['hybrid']}")
    ax.margins(x=0.12)
    ax.grid(axis="x", color="#EEEEEE")
    style_axes(ax)
    ax.spines["left"].set_visible(False)
    save(fig, output_dir, "12_diferencia_grading_ic.png")


def plot_grading_paired(by_config: dict, scores: dict, output_dir: Path) -> None:
    panels = {"answer_accuracy": "Exactitud de la respuesta", "context_precision": "Precisión del contexto"}
    fig, axes = plt.subplots(1, len(panels), figsize=(FIG_WIDTH, 8.5 * CM), sharey=True)
    ticks = [0, 0.25, 0.5, 0.75, 1]
    runs = run_count(by_config)
    for ax, (metric, title) in zip(axes, panels.items()):
        before = metric_values(by_config, scores, "hybrid", metric)
        after = metric_values(by_config, scores, "hybrid_grading", metric)
        pairs = Counter((before[qid], after[qid]) for qid in before.keys() & after.keys())
        ax.plot([-0.1, 1.1], [-0.1, 1.1], linestyle="--", color="#9E9E9E", linewidth=0.8, zorder=1)
        for (x, y), count in pairs.items():
            color = IMPROVE_COLOR if y > x else WORSE_COLOR if y < x else "#9E9E9E"
            ax.scatter(x, y, s=40 + count * 30 / runs, color=color, alpha=0.85, edgecolor="white", linewidth=0.5, zorder=2)
            ax.annotate(str(count), (x, y), ha="center", va="center", color="white", fontsize=6, fontweight="bold", zorder=3)
        ax.set_title(title, fontsize=8)
        ax.set_xticks(ticks)
        ax.set_yticks(ticks)
        ax.set_xlim(-0.12, 1.12)
        ax.set_ylim(-0.12, 1.12)
        ax.set_xlabel(CONFIG_LABELS["hybrid"])
        ax.set_aspect("equal")
        ax.grid(color="#EEEEEE")
        style_axes(ax)
    axes[0].set_ylabel(CONFIG_LABELS["hybrid_grading"])
    save(fig, output_dir, "13_hibrida_vs_grading_pareado.png")


def plot_faithfulness_vs_accuracy(by_config: dict, scores: dict, output_dir: Path) -> None:
    config = "hybrid_grading"
    faithfulness = metric_values(by_config, scores, config, "faithfulness")
    accuracy = metric_values(by_config, scores, config, "answer_accuracy")
    question_ids = sorted(faithfulness.keys() & accuracy.keys())
    jitter = random.Random(0)
    fig, ax = plt.subplots(figsize=(12 * CM, 11 * CM))
    ax.axvspan(-0.08, 0.5, ymin=0, ymax=0.5, color="#F5F5F5", zorder=0)
    ax.axhline(0.5, color="#9E9E9E", linewidth=0.8, linestyle="--", zorder=1)
    ax.axvline(0.5, color="#9E9E9E", linewidth=0.8, linestyle="--", zorder=1)
    quadrants = {
        (True, True): ("Fiel y correcta", (1.06, 1.1), "right"),
        (False, True): ("Correcta pero\nno sustentada", (-0.06, 1.1), "left"),
        (True, False): ("Fiel pero incorrecta\n(contexto insuficiente)", (1.06, -0.1), "right"),
        (False, False): ("Ni fiel ni correcta", (-0.06, -0.1), "left"),
    }
    counts = Counter((faithfulness[qid] >= 0.5, accuracy[qid] >= 0.5) for qid in question_ids)
    for key, (label, (x, y), ha) in quadrants.items():
        ax.annotate(f"{label}\nn = {counts.get(key, 0)}", (x, y), ha=ha, va="center", fontsize=7, color="#555555")
    xs = [faithfulness[qid] for qid in question_ids]
    ys = [accuracy[qid] + jitter.uniform(-0.04, 0.04) for qid in question_ids]
    ax.scatter(xs, ys, s=18, color=CONFIG_COLORS[config], edgecolor="white", linewidth=0.4, alpha=0.9, zorder=2)
    ticks = [0, 0.25, 0.5, 0.75, 1]
    ax.set_xticks(ticks)
    ax.set_yticks(ticks)
    ax.set_xlim(-0.08, 1.08)
    ax.set_ylim(-0.2, 1.2)
    ax.set_xlabel("Fidelidad")
    ax.set_ylabel("Exactitud de la respuesta")
    ax.grid(color="#EEEEEE", zorder=0)
    style_axes(ax)
    save(fig, output_dir, "08_fidelidad_vs_exactitud.png")


def plot_faithfulness_vs_accuracy_by_config(by_config: dict, scores: dict, output_dir: Path) -> None:
    configs = CONFIGS[1:]
    fig, axes = plt.subplots(1, len(configs), figsize=(FIG_WIDTH, 6.5 * CM), sharex=True, sharey=True)
    ticks = [0, 0.25, 0.5, 0.75, 1]
    for ax, config in zip(axes, configs):
        faithfulness = metric_values(by_config, scores, config, "faithfulness")
        accuracy = metric_values(by_config, scores, config, "answer_accuracy")
        question_ids = sorted(faithfulness.keys() & accuracy.keys())
        jitter = random.Random(0)
        xs = [faithfulness[qid] + jitter.uniform(-0.025, 0.025) for qid in question_ids]
        ys = [accuracy[qid] + jitter.uniform(-0.025, 0.025) for qid in question_ids]
        ax.scatter(xs, ys, s=14, color=CONFIG_COLORS[config], edgecolor="white", linewidth=0.4, alpha=0.9, zorder=2)
        ax.set_title(f"{CONFIG_LABELS[config]} (n = {len(question_ids)})", fontsize=8)
        ax.set_xticks(ticks)
        ax.set_yticks(ticks)
        ax.set_xlim(-0.08, 1.08)
        ax.set_ylim(-0.08, 1.08)
        ax.set_xlabel("Fidelidad")
        ax.grid(color="#EEEEEE", zorder=0)
        style_axes(ax)
    axes[0].set_ylabel("Exactitud de la respuesta")
    save(fig, output_dir, "08b_fidelidad_vs_exactitud_por_config.png")


def plot_radar(by_config: dict, scores: dict, output_dir: Path) -> None:
    metrics = list(RAGAS_METRICS)
    angles = [2 * math.pi * index / len(metrics) for index in range(len(metrics))]
    fig, ax = plt.subplots(figsize=(11 * CM, 11 * CM), subplot_kw={"projection": "polar"})
    for config in CONFIGS:
        values = [mean(metric_values(by_config, scores, config, metric)) for metric in metrics]
        available = [(angle, value) for angle, value in zip(angles, values) if value is not None]
        if len(available) == len(metrics):
            ax.plot(angles + angles[:1], values + values[:1], color=CONFIG_COLORS[config], linewidth=1.6, label=CONFIG_LABELS[config], zorder=3)
            ax.fill(angles, values, color=CONFIG_COLORS[config], alpha=0.06)
        else:
            ax.scatter(
                [angle for angle, _ in available], [value for _, value in available], s=36, marker="D",
                color=CONFIG_COLORS[config], edgecolor="#333333", linewidth=0.5,
                label=f"{CONFIG_LABELS[config]} (solo métricas aplicables)", zorder=4,
            )
    ax.set_xticks(angles, [RAGAS_METRICS[metric].replace("\n", " ") for metric in metrics], fontsize=7)
    ax.set_ylim(0, 1)
    ax.set_yticks([0.25, 0.5, 0.75, 1], ["0,25", "0,5", "0,75", "1"], fontsize=6, color="#757575")
    ax.set_rlabel_position(54)
    ax.grid(color="#E0E0E0")
    ax.spines["polar"].set_color("#E0E0E0")
    ax.tick_params(axis="x", pad=8)
    ax.legend(ncol=2, loc="upper center", bbox_to_anchor=(0.5, -0.1), frameon=False, fontsize=7)
    save(fig, output_dir, "11_radar_configuraciones.png")


def plot_accuracy_distribution(by_config: dict, scores: dict, output_dir: Path) -> None:
    levels = [0.0, 0.25, 0.5, 0.75, 1.0]
    colors = ["#440154", "#3B528B", "#21918C", "#5EC962", "#FDE725"]
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 7 * CM))
    positions = list(range(len(CONFIGS)))[::-1]
    lefts = [0.0] * len(CONFIGS)
    distributions = []
    for config in CONFIGS:
        values = list(metric_values(by_config, scores, config, "answer_accuracy").values())
        distributions.append([100 * sum(abs(v - level) < TIE_TOLERANCE for v in values) / len(values) for level in levels])
    for level_index, (level, color) in enumerate(zip(levels, colors)):
        widths = [distribution[level_index] for distribution in distributions]
        ax.barh(positions, widths, left=lefts, color=color, height=0.6, label=f"{level:g}".replace(".", ","))
        for y, left, width in zip(positions, lefts, widths):
            if width >= 5:
                text_color = "white" if level_index <= 2 else "#333333"
                ax.annotate(f"{width:.0f} %", (left + width / 2, y), ha="center", va="center", fontsize=7, color=text_color)
        lefts = [left + width for left, width in zip(lefts, widths)]
    ax.set_yticks(positions, [CONFIG_LABELS[config] for config in CONFIGS])
    ax.set_xlim(0, 100)
    ax.set_xlabel("Respuestas (%)")
    ax.legend(title="Exactitud", ncol=5, loc="upper center", bbox_to_anchor=(0.5, -0.22), frameon=False, title_fontsize=7)
    style_axes(ax)
    ax.spines["left"].set_visible(False)
    save(fig, output_dir, "09_distribucion_exactitud.png")


def plot_hit_curve(by_config: dict, output_dir: Path) -> None:
    max_k = 8
    fig, ax = plt.subplots(figsize=(FIG_WIDTH, 8 * CM))
    for config in CONFIGS[1:]:
        candidates = [r for r in by_config.get(config, {}).values() if is_in_scope(r) and has_reference_chunks(r)]
        ranks = [first_relevant_rank(r) for r in candidates]
        curve = [100 * sum(1 for rank in ranks if rank and rank <= k) / len(ranks) for k in range(1, max_k + 1)]
        ax.plot(range(1, max_k + 1), curve, marker="o", markersize=3.5, linewidth=1.6, color=CONFIG_COLORS[config], label=CONFIG_LABELS[config])
        ax.annotate(
            f"{curve[-1]:.0f} %", (max_k, curve[-1]), xytext=(6, HIT_LABEL_OFFSETS[config]),
            textcoords="offset points", va="center", fontsize=7, color=CONFIG_COLORS[config],
        )
    ax.set_xticks(range(1, max_k + 1))
    ax.set_xlim(0.7, max_k + 0.7)
    ax.set_ylim(0, 105)
    ax.set_xlabel("k (posición en el ranking)")
    ax.set_ylabel("Preguntas con el fragmento\ncorrecto en el top-k (%)")
    ax.grid(color="#EEEEEE")
    ax.legend(ncol=3, loc="upper center", bbox_to_anchor=(0.5, -0.18), frameon=False)
    style_axes(ax)
    save(fig, output_dir, "10_curva_hit_k.png")


def write_captions(records: list[dict], by_config: dict, output_dir: Path) -> None:
    production = by_config.get("hybrid_grading", {}).values()
    counts = {
        "n_in_scope": len({r["id"] for r in production if is_in_scope(r)}),
        "n_single": len({r["id"] for r in production if r["question_type"] == "single_hop"}),
        "n_multi": len({r["id"] for r in production if r["question_type"] == "multi_hop"}),
        "pipeline_runs": len({r["run"] for r in records}),
    }
    lines = ["# Leyendas sugeridas", ""]
    lines += [f"- `{name}`: {caption.format(**counts)}" for name, caption in CAPTIONS.items()]
    (output_dir / "leyendas.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera las figuras de la evaluacion a partir de los resultados")
    parser.add_argument("--results-dir", required=True, help="Carpeta generada por run_pipeline")
    parser.add_argument("--runs", nargs="+", type=int, default=[1], help="Corridas juzgadas por RAGAS que se grafican")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    results_dir = Path(args.results_dir).resolve()
    records = load_records(results_dir)
    scores = load_scores(results_dir / "ragas" / "scores.jsonl")
    by_config = judged_records(records, set(args.runs))
    output_dir = results_dir / "figuras"
    output_dir.mkdir(exist_ok=True)
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8, "axes.titlesize": 9})

    plot_ragas_metrics(by_config, scores, output_dir)
    plot_accuracy_per_question(by_config, scores, output_dir)
    plot_accuracy_points(by_config, scores, output_dir)
    plot_quality_vs_latency(records, by_config, scores, output_dir)
    plot_hops(by_config, scores, output_dir)
    plot_general_knowledge(records, output_dir)
    plot_pairwise(by_config, scores, output_dir)
    plot_pairwise_diverging(by_config, scores, output_dir)
    plot_metrics_heatmap(by_config, scores, output_dir)
    plot_accuracy_slope(by_config, scores, output_dir)
    plot_latency_boxplot(records, output_dir)
    plot_latency_ecdf(records, output_dir)
    plot_latency_percentiles(records, output_dir)
    plot_cost_benefit(records, by_config, scores, output_dir)
    plot_grading_difference_ci(by_config, scores, output_dir)
    plot_grading_paired(by_config, scores, output_dir)
    plot_faithfulness_vs_accuracy(by_config, scores, output_dir)
    plot_faithfulness_vs_accuracy_by_config(by_config, scores, output_dir)
    plot_radar(by_config, scores, output_dir)
    plot_accuracy_distribution(by_config, scores, output_dir)
    plot_hit_curve(by_config, output_dir)
    write_captions(records, by_config, output_dir)
    print(f"Leyendas en {output_dir / 'leyendas.md'}")


if __name__ == "__main__":
    main()
