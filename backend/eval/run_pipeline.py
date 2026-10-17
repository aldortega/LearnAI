import argparse
import asyncio
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import get_args

from bson import ObjectId
from bson.errors import InvalidId
from pydantic import ValidationError

from ..config import LLMProvider, settings
from ..db import db
from ..llm import (
    ensure_provider_configured,
    get_chat_model_name,
    is_temperature_omitted,
)
from ..routes.rag.service import generate_answer, retrieve_context, split_general_marker
from ..schemas.rag import RagSource
from .configs import PIPELINE_CONFIGS, PipelineConfig, apply_overrides
from .schemas import EvalQuestion, EvalRecord

RESULTS_DIR = Path(__file__).resolve().parent / "results"
EMBEDDING_MODEL = "models/gemini-embedding-001"


def load_dataset(path: Path) -> list[EvalQuestion]:
    questions: list[EvalQuestion] = []
    seen_ids: set[str] = set()
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            question = EvalQuestion.model_validate_json(line)
        except ValidationError as exc:
            raise SystemExit(f"Linea {line_number} invalida en {path}: {exc}") from exc
        if question.id in seen_ids:
            raise SystemExit(f"Id duplicado en linea {line_number}: {question.id}")
        seen_ids.add(question.id)
        questions.append(question)
    if not questions:
        raise SystemExit(f"Dataset vacio: {path}")
    return questions


def describe_error(exc: Exception) -> str:
    detail = getattr(exc, "detail", None) or str(exc)
    return f"{type(exc).__name__}: {detail}"


async def run_question(
    question: EvalQuestion,
    notebook_object_id: ObjectId,
    config: PipelineConfig,
    run_index: int,
    provider: LLMProvider,
    chat_model: str,
) -> EvalRecord:
    start = time.perf_counter()
    contexts: list[str] = []
    sources: list[RagSource] = []
    response = ""
    used_general_knowledge = False
    error: str | None = None
    try:
        if config.use_retrieval:
            contexts, sources, _, _ = await retrieve_context(
                question.question,
                notebook_object_id,
                {},
                grade=True,
                provider=provider,
                model_name=chat_model,
            )
        answer = await generate_answer(
            question.question,
            contexts,
            cite=True,
            flag_general=True,
            provider=provider,
            model_name=chat_model,
        )
        response, used_general_knowledge = split_general_marker(answer)
    except Exception as exc:
        error = describe_error(exc)
    return EvalRecord(
        id=question.id,
        config=config.name,
        run=run_index,
        question_type=question.question_type,
        user_input=question.question,
        retrieved_contexts=contexts,
        response=response.strip(),
        reference=question.reference,
        reference_contexts=question.reference_contexts,
        used_general_knowledge=used_general_knowledge,
        sources=sources,
        latency_ms=int((time.perf_counter() - start) * 1000),
        provider=provider,
        chat_model=chat_model,
        embedding_model=EMBEDDING_MODEL,
        temperature_omitted=is_temperature_omitted(provider, chat_model),
        error=error,
    )


def write_manifest(
    output_dir: Path,
    dataset_path: Path,
    notebook_id: str,
    configs: list[PipelineConfig],
    repeats: int,
    question_count: int,
    provider: LLMProvider,
    chat_model: str,
) -> None:
    manifest = {
        "dataset": str(dataset_path),
        "question_count": question_count,
        "notebook_id": notebook_id,
        "repeats": repeats,
        "provider": provider,
        "chat_model": chat_model,
        "temperature_omitted": is_temperature_omitted(provider, chat_model),
        "embedding_model": EMBEDDING_MODEL,
        "chunk_size": settings.chunk_size,
        "chunk_overlap": settings.chunk_overlap,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "configs": [
            {
                "name": config.name,
                "description": config.description,
                "use_retrieval": config.use_retrieval,
                "settings": config.resolved_overrides(),
            }
            for config in configs
        ],
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )


async def resolve_notebook(notebook_id: str) -> ObjectId:
    try:
        notebook_object_id = ObjectId(notebook_id)
    except InvalidId as exc:
        raise SystemExit(f"notebook_id invalido: {notebook_id}") from exc
    if not await db.notebooks.find_one({"_id": notebook_object_id}, {"_id": 1}):
        raise SystemExit(f"Notebook no encontrado: {notebook_id}")
    return notebook_object_id


async def run(args: argparse.Namespace) -> Path:
    dataset_path = Path(args.dataset).resolve()
    questions = load_dataset(dataset_path)
    provider: LLMProvider = args.provider or settings.llm_provider
    chat_model = get_chat_model_name(provider, args.chat_model)
    ensure_provider_configured(provider)
    notebook_object_id = await resolve_notebook(args.notebook_id)
    configs = [PIPELINE_CONFIGS[name] for name in args.configs]

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_dir = RESULTS_DIR / f"{dataset_path.stem}_{timestamp}"
    output_dir.mkdir(parents=True)
    write_manifest(
        output_dir,
        dataset_path,
        args.notebook_id,
        configs,
        args.repeats,
        len(questions),
        provider,
        chat_model,
    )

    for config in configs:
        for run_index in range(1, args.repeats + 1):
            output_path = output_dir / f"{config.name}_run{run_index}.jsonl"
            errors = 0
            with apply_overrides(config.resolved_overrides()):
                with output_path.open("w", encoding="utf-8") as output_file:
                    for position, question in enumerate(questions, 1):
                        record = await run_question(
                            question,
                            notebook_object_id,
                            config,
                            run_index,
                            provider,
                            chat_model,
                        )
                        output_file.write(record.model_dump_json() + "\n")
                        output_file.flush()
                        status_label = "ERROR" if record.error else "ok"
                        errors += int(record.error is not None)
                        print(
                            f"[{config.name} run {run_index}] "
                            f"{position}/{len(questions)} {question.id} "
                            f"{status_label} {record.latency_ms}ms",
                            flush=True,
                        )
                        if args.delay > 0:
                            await asyncio.sleep(args.delay)
            print(f"-> {output_path.name}: {errors} errores", flush=True)

    return output_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ejecuta el pipeline RAG sobre un dataset de evaluacion"
    )
    parser.add_argument("--dataset", required=True, help="Ruta al dataset JSONL")
    parser.add_argument("--notebook-id", required=True, help="Notebook con el corpus indexado")
    parser.add_argument(
        "--configs",
        nargs="+",
        choices=sorted(PIPELINE_CONFIGS),
        default=["hybrid_grading"],
    )
    parser.add_argument(
        "--provider",
        choices=get_args(LLMProvider),
        default=None,
        help="Proveedor de LLM (por defecto LLM_PROVIDER configurado)",
    )
    parser.add_argument(
        "--chat-model",
        default=None,
        help="Modelo de chat (por defecto el modelo configurado del proveedor)",
    )
    parser.add_argument("--repeats", type=int, default=1)
    parser.add_argument("--delay", type=float, default=0.0, help="Segundos entre preguntas")
    args = parser.parse_args()
    if args.repeats < 1:
        parser.error("--repeats debe ser >= 1")
    return args


def main() -> None:
    output_dir = asyncio.run(run(parse_args()))
    print(f"Resultados en {output_dir}")


if __name__ == "__main__":
    main()
