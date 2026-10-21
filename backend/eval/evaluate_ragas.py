# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "ragas==0.4.3",
#     "langchain-community<0.4",
#     "google-genai",
#     "openai",
# ]
# ///
import argparse
import asyncio
import json
import math
import os
import statistics
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path
from typing import Any

from google import genai
from openai import AsyncOpenAI
from ragas.embeddings import GoogleEmbeddings
from ragas.llms import llm_factory
from ragas.metrics import collections

GEMINI_OPENAI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
DEFAULT_JUDGE_MODEL = "gemini-3.8-flash"
EMBEDDING_MODEL = "gemini-embedding-001"
JUDGE_MAX_TOKENS = 8192
LLM_METRICS = (
    "faithfulness",
    "answer_relevancy",
    "context_precision",
    "context_recall",
    "answer_accuracy",
)
CONTEXT_METRICS = {"faithfulness", "context_precision", "context_recall"}
DETERMINISTIC_METRICS = ("hit", "reciprocal_rank", "used_general_knowledge", "latency_ms")
GROUPS = ("in_scope", "single_hop", "multi_hop", "out_of_scope")

MetricFn = Callable[[dict[str, Any]], Awaitable[Any]]


def load_records(results_dir: Path, configs: set[str] | None, runs: set[int] | None) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in sorted(results_dir.glob("*_run*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            record = json.loads(line)
            if configs and record["config"] not in configs:
                continue
            if runs and record["run"] not in runs:
                continue
            records.append(record)
    if not records:
        raise SystemExit(f"No hay resultados en {results_dir}")
    return records


def record_key(record: dict[str, Any]) -> str:
    return f"{record['config']}|{record['run']}|{record['id']}"


def deterministic_scores(record: dict[str, Any]) -> dict[str, float]:
    scores = {
        "used_general_knowledge": float(record["used_general_knowledge"]),
        "latency_ms": float(record["latency_ms"]),
    }
    reference_ids = {f"{chunk['document_id']}:{chunk['chunk_id']}" for chunk in record.get("reference_chunks", [])}
    if reference_ids and record["config"] != "no_rag":
        retrieved_ids = [f"{source['document_id']}:{source['chunk_id']}" for source in record["sources"]]
        rank = next((index + 1 for index, chunk in enumerate(retrieved_ids) if chunk in reference_ids), None)
        scores["hit"] = 1.0 if rank else 0.0
        scores["reciprocal_rank"] = 1.0 / rank if rank else 0.0
    return scores


def build_metrics(judge_model: str, api_key: str) -> dict[str, MetricFn]:
    llm = llm_factory(
        judge_model,
        provider="openai",
        client=AsyncOpenAI(api_key=api_key, base_url=GEMINI_OPENAI_URL, max_retries=6),
        temperature=0.0,
        max_tokens=JUDGE_MAX_TOKENS,
    )
    embeddings = GoogleEmbeddings(client=genai.Client(api_key=api_key), model=EMBEDDING_MODEL)
    faithfulness = collections.Faithfulness(llm=llm)
    answer_relevancy = collections.AnswerRelevancy(llm=llm, embeddings=embeddings)
    context_precision = collections.ContextPrecisionWithReference(llm=llm)
    context_recall = collections.ContextRecall(llm=llm)
    answer_accuracy = collections.AnswerAccuracy(llm=llm)
    return {
        "faithfulness": lambda r: faithfulness.ascore(
            user_input=r["user_input"], response=r["response"], retrieved_contexts=r["retrieved_contexts"]
        ),
        "answer_relevancy": lambda r: answer_relevancy.ascore(user_input=r["user_input"], response=r["response"]),
        "context_precision": lambda r: context_precision.ascore(
            user_input=r["user_input"], reference=r["reference"], retrieved_contexts=r["retrieved_contexts"]
        ),
        "context_recall": lambda r: context_recall.ascore(
            user_input=r["user_input"], retrieved_contexts=r["retrieved_contexts"], reference=r["reference"]
        ),
        "answer_accuracy": lambda r: answer_accuracy.ascore(
            user_input=r["user_input"], response=r["response"], reference=r["reference"]
        ),
    }


def applicable_metrics(record: dict[str, Any]) -> list[str]:
    if record.get("error") or not record["response"] or record["question_type"] == "out_of_scope":
        return []
    if not record.get("reference"):
        return ["faithfulness", "answer_relevancy"] if record["retrieved_contexts"] else ["answer_relevancy"]
    if not record["retrieved_contexts"]:
        return [name for name in LLM_METRICS if name not in CONTEXT_METRICS]
    return list(LLM_METRICS)


def load_done(scores_path: Path) -> set[str]:
    if not scores_path.exists():
        return set()
    done: set[str] = set()
    for line in scores_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            entry = json.loads(line)
            if entry.get("value") is not None:
                done.add(f"{entry['key']}|{entry['metric']}")
    return done


async def score_records(
    records: list[dict[str, Any]], metrics: dict[str, MetricFn], scores_path: Path, concurrency: int
) -> None:
    done = load_done(scores_path)
    tasks = [
        (record, metric)
        for record in records
        for metric in applicable_metrics(record)
        if f"{record_key(record)}|{metric}" not in done
    ]
    print(f"{len(done)} puntajes ya calculados, {len(tasks)} pendientes", flush=True)
    semaphore = asyncio.Semaphore(concurrency)
    lock = asyncio.Lock()
    completed = 0

    async def run(record: dict[str, Any], metric: str) -> None:
        nonlocal completed
        async with semaphore:
            entry: dict[str, Any] = {"key": record_key(record), "metric": metric}
            try:
                result = await metrics[metric](record)
                entry["value"] = float(result.value)
            except Exception as exc:
                entry["value"] = None
                entry["error"] = f"{type(exc).__name__}: {exc}"[:500]
        async with lock:
            with scores_path.open("a", encoding="utf-8") as output:
                output.write(json.dumps(entry, ensure_ascii=False) + "\n")
            completed += 1
            if completed % 25 == 0 or completed == len(tasks):
                print(f"{completed}/{len(tasks)} puntajes", flush=True)

    await asyncio.gather(*(run(record, metric) for record, metric in tasks))


def mean_or_nan(values: list[float]) -> float:
    clean = [value for value in values if value is not None and not math.isnan(value)]
    return statistics.fmean(clean) if clean else float("nan")


def summarize(records: list[dict[str, Any]], scores_path: Path) -> list[dict[str, Any]]:
    llm_scores: dict[str, dict[str, float]] = {}
    failed: set[tuple[str, str]] = set()
    for line in scores_path.read_text(encoding="utf-8").splitlines() if scores_path.exists() else []:
        entry = json.loads(line)
        if entry.get("value") is None:
            failed.add((entry["key"], entry["metric"]))
            continue
        llm_scores.setdefault(entry["key"], {})[entry["metric"]] = entry["value"]
    errors = sum(1 for key, metric in failed if metric not in llm_scores.get(key, {}))
    if errors:
        print(f"Aviso: {errors} puntajes fallaron y se excluyen del resumen")

    per_run: dict[tuple[str, str, int], dict[str, list[float]]] = {}
    for record in records:
        scores = {**deterministic_scores(record), **llm_scores.get(record_key(record), {})}
        groups = [record["question_type"]]
        if record["question_type"] != "out_of_scope":
            groups.append("in_scope")
        for group in groups:
            bucket = per_run.setdefault((record["config"], group, record["run"]), {})
            for metric, value in scores.items():
                bucket.setdefault(metric, []).append(value)

    rows: list[dict[str, Any]] = []
    for config in sorted({key[0] for key in per_run}):
        for group in GROUPS:
            runs = sorted(run for (cfg, grp, run) in per_run if cfg == config and grp == group)
            if not runs:
                continue
            row: dict[str, Any] = {"config": config, "group": group, "runs": len(runs)}
            row["n"] = len(per_run[(config, group, runs[0])]["latency_ms"])
            for metric in (*LLM_METRICS, *DETERMINISTIC_METRICS):
                run_means = [mean_or_nan(per_run[(config, group, run)].get(metric, [])) for run in runs]
                valid = [value for value in run_means if not math.isnan(value)]
                row[f"{metric}_mean"] = statistics.fmean(valid) if valid else None
                row[f"{metric}_std"] = statistics.stdev(valid) if len(valid) > 1 else 0.0 if valid else None
            rows.append(row)
    return rows


def format_cell(row: dict[str, Any], metric: str) -> str:
    mean = row.get(f"{metric}_mean")
    if mean is None:
        return "—"
    if metric == "latency_ms":
        return f"{mean / 1000:.1f} ± {row[f'{metric}_std'] / 1000:.1f} s"
    return f"{mean:.3f} ± {row[f'{metric}_std']:.3f}"


def write_outputs(rows: list[dict[str, Any]], output_dir: Path) -> None:
    columns = list(rows[0].keys())
    lines = [",".join(columns)]
    lines += [",".join("" if row.get(column) is None else str(row.get(column)) for column in columns) for row in rows]
    (output_dir / "summary.csv").write_text("\n".join(lines) + "\n", encoding="utf-8")

    metrics = (*LLM_METRICS, *DETERMINISTIC_METRICS)
    markdown = ["| Configuración | Grupo | n | " + " | ".join(metrics) + " |", "|" + "---|" * (len(metrics) + 3)]
    markdown += [
        f"| {row['config']} | {row['group']} | {row['n']} | " + " | ".join(format_cell(row, m) for m in metrics) + " |"
        for row in rows
    ]
    (output_dir / "summary.md").write_text("\n".join(markdown) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Calcula metricas RAGAS y de recuperacion sobre resultados del runner")
    parser.add_argument("--results-dir", required=True, help="Carpeta generada por run_pipeline")
    parser.add_argument("--configs", nargs="+", default=None)
    parser.add_argument("--runs", nargs="+", type=int, default=None)
    parser.add_argument("--judge-model", default=None, help="Por defecto, el judge_model del manifest")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--limit", type=int, default=None, help="Evalua solo las primeras N preguntas (prueba)")
    parser.add_argument("--summary-only", action="store_true", help="No llama al juez; solo resume lo calculado")
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    results_dir = Path(args.results_dir).resolve()
    manifest = json.loads((results_dir / "manifest.json").read_text(encoding="utf-8"))
    judge_model = args.judge_model or manifest.get("judge_model") or DEFAULT_JUDGE_MODEL
    records = load_records(results_dir, set(args.configs) if args.configs else None, set(args.runs) if args.runs else None)
    if args.limit:
        selected_ids = sorted({record["id"] for record in records})[: args.limit]
        records = [record for record in records if record["id"] in selected_ids]
    output_dir = results_dir / "ragas"
    output_dir.mkdir(exist_ok=True)
    scores_path = output_dir / "scores.jsonl"

    if not args.summary_only:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise SystemExit("Falta GEMINI_API_KEY en el entorno")
        metrics = build_metrics(judge_model, api_key)
        await score_records(records, metrics, scores_path, args.concurrency)
        (output_dir / "manifest.json").write_text(
            json.dumps(
                {
                    "judge_model": judge_model,
                    "judge_temperature": 0.0,
                    "judge_max_tokens": JUDGE_MAX_TOKENS,
                    "embedding_model": EMBEDDING_MODEL,
                    "ragas_version": version("ragas"),
                    "metrics": list(LLM_METRICS),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    rows = summarize(records, scores_path)
    write_outputs(rows, output_dir)
    print(f"Resumen en {output_dir / 'summary.md'}")


if __name__ == "__main__":
    asyncio.run(main())
