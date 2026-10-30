from collections.abc import Iterator
from contextlib import contextmanager

from pydantic import BaseModel, Field

from ..config import settings

SettingValue = int | float | bool

JUDGE_MODEL = "gemini-3.8-flash"

BASE_OVERRIDES: dict[str, SettingValue] = {
    "rag_top_k": 8,
    "rag_min_score": 0.65,
    "rag_fetch_k_multiplier": 4,
    "rag_fetch_k_max": 40,
    "rag_max_chunks_per_document": 2,
    "rag_lexical_weight": 0.2,
    "rag_grading_enabled": True,
    "rag_grading_candidates": 20,
}


class PipelineConfig(BaseModel):
    name: str
    description: str
    use_retrieval: bool = True
    overrides: dict[str, SettingValue] = Field(default_factory=dict)

    def resolved_overrides(self) -> dict[str, SettingValue]:
        return {**BASE_OVERRIDES, **self.overrides}


PIPELINE_CONFIGS: dict[str, PipelineConfig] = {
    config.name: config
    for config in [
        PipelineConfig(
            name="no_rag",
            description="LLM sin recuperacion de contexto (linea base)",
            use_retrieval=False,
        ),
        PipelineConfig(
            name="vector_only",
            description="Solo busqueda vectorial, sin componente lexico ni grading",
            overrides={"rag_lexical_weight": 0.0, "rag_grading_enabled": False},
        ),
        PipelineConfig(
            name="hybrid",
            description="Busqueda hibrida (vectorial + lexica), sin grading",
            overrides={"rag_grading_enabled": False},
        ),
        PipelineConfig(
            name="hybrid_grading",
            description="Busqueda hibrida con grading LLM (configuracion de produccion)",
        ),
        PipelineConfig(
            name="hybrid_grading_k4",
            description="Configuracion de produccion con top_k=4",
            overrides={"rag_top_k": 4},
        ),
        PipelineConfig(
            name="hybrid_grading_k12",
            description="Configuracion de produccion con top_k=12",
            overrides={"rag_top_k": 12},
        ),
    ]
}


@contextmanager
def apply_overrides(overrides: dict[str, SettingValue]) -> Iterator[None]:
    previous = {key: getattr(settings, key) for key in overrides}
    for key, value in overrides.items():
        setattr(settings, key, value)
    try:
        yield
    finally:
        for key, value in previous.items():
            setattr(settings, key, value)
