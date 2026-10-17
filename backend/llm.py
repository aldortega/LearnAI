from __future__ import annotations

from typing import Protocol

from fastapi import HTTPException, status

from .config import LLMProvider, settings
from .gemini import create_chat_model_with_fallback, has_gemini_api_keys
from .openai_llm import (
    create_openai_chat_model,
    ensure_openai_configured,
    openai_accepts_temperature,
)

RAG_TEMPERATURE = 0.2
GRADING_TEMPERATURE = 0.0
NOTEBOOK_TEMPERATURE = 0.7
GEMINI_EMBEDDINGS_NOT_CONFIGURED_DETAIL = "Gemini no configurado"
TRANSIENT_LLM_STATUS_CODES = (
    status.HTTP_429_TOO_MANY_REQUESTS,
    status.HTTP_503_SERVICE_UNAVAILABLE,
)


class ChatModel(Protocol):
    def invoke(self, *args, **kwargs): ...

    def stream(self, *args, **kwargs): ...

    def astream(self, *args, **kwargs): ...

    def with_structured_output(self, *args, **kwargs): ...


def get_chat_model_name(provider: LLMProvider, model_name: str | None = None) -> str:
    if model_name:
        return model_name
    if provider == "openai":
        return settings.openai_chat_model
    return settings.gemini_chat_model


def is_temperature_omitted(provider: LLMProvider, model_name: str | None = None) -> bool:
    if provider != "openai":
        return False
    return not openai_accepts_temperature(get_chat_model_name(provider, model_name))


def ensure_provider_configured(provider: LLMProvider) -> None:
    if provider == "openai":
        ensure_openai_configured()
        if not has_gemini_api_keys():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=GEMINI_EMBEDDINGS_NOT_CONFIGURED_DETAIL,
            )


def is_transient_llm_error(provider: LLMProvider, exc: HTTPException) -> bool:
    return provider == "openai" and exc.status_code in TRANSIENT_LLM_STATUS_CODES


def create_chat_model(
    provider: LLMProvider,
    temperature: float,
    model_name: str | None = None,
) -> ChatModel:
    resolved_model = get_chat_model_name(provider, model_name)
    if provider == "openai":
        return create_openai_chat_model(resolved_model, temperature)
    return create_chat_model_with_fallback(
        model_name=resolved_model, temperature=temperature
    )
