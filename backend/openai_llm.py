from __future__ import annotations

import copy
from contextlib import contextmanager
from typing import Any, Iterator

import openai
from fastapi import HTTPException, status
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from .config import settings

OPENAI_NOT_CONFIGURED_DETAIL = "OpenAI no configurado"
TEMPERATURE_UNSUPPORTED_PREFIXES = ("o1", "o3", "o4", "gpt-5")
TEMPERATURE_SUPPORTED_PREFIXES = ("gpt-5-chat",)
STRIPPED_SCHEMA_KEYS = ("default",)


def has_openai_api_key() -> bool:
    return bool((settings.openai_api_key or "").strip())


def openai_accepts_temperature(model_name: str) -> bool:
    normalized = model_name.strip().lower()
    if normalized.startswith(TEMPERATURE_SUPPORTED_PREFIXES):
        return True
    return not normalized.startswith(TEMPERATURE_UNSUPPORTED_PREFIXES)


def translate_openai_error(exc: Exception) -> HTTPException | None:
    if isinstance(exc, (openai.AuthenticationError, openai.PermissionDeniedError)):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Credenciales de OpenAI invalidas",
        )
    if isinstance(exc, openai.RateLimitError):
        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Cuota o limite de uso de OpenAI agotado",
        )
    if isinstance(
        exc,
        (
            openai.APIConnectionError,
            openai.APITimeoutError,
            openai.InternalServerError,
        ),
    ):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de OpenAI no disponible",
        )
    if isinstance(exc, openai.APIError):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error al consultar OpenAI",
        )
    return None


@contextmanager
def _translate_errors() -> Iterator[None]:
    try:
        yield
    except Exception as exc:
        translated = translate_openai_error(exc)
        if translated is None:
            raise
        raise translated from exc


def _make_strict(node: Any, is_name_map: bool = False) -> Any:
    if isinstance(node, list):
        return [_make_strict(item) for item in node]
    if not isinstance(node, dict):
        return node
    cleaned = {
        key: _make_strict(
            value, is_name_map=not is_name_map and key in ("properties", "$defs")
        )
        for key, value in node.items()
        if is_name_map or key not in STRIPPED_SCHEMA_KEYS
    }
    properties = cleaned.get("properties")
    if not is_name_map and isinstance(properties, dict):
        cleaned["required"] = list(properties.keys())
        cleaned["additionalProperties"] = False
    return cleaned


def _inline_root_ref(schema: dict[str, Any]) -> dict[str, Any]:
    ref = schema.get("$ref")
    if not isinstance(ref, str) or not ref.startswith("#/$defs/"):
        return schema
    target = schema.get("$defs", {}).get(ref.removeprefix("#/$defs/"))
    if not isinstance(target, dict):
        return schema
    return {**target, "$defs": schema["$defs"]}


def to_strict_json_schema(schema: dict[str, Any]) -> dict[str, Any]:
    strict_schema = _make_strict(_inline_root_ref(copy.deepcopy(schema)))
    for definition in strict_schema.get("$defs", {}).values():
        if definition.get("type") == "object" and "properties" not in definition:
            raise ValueError("Schema incompatible con modo strict de OpenAI")
    return strict_schema


class OpenAIStructuredOutput:
    def __init__(self, runnable: Any) -> None:
        self._runnable = runnable

    def invoke(self, *args: Any, **kwargs: Any):
        with _translate_errors():
            return self._runnable.invoke(*args, **kwargs)


class OpenAIChat:
    def __init__(self, model_name: str, temperature: float) -> None:
        self.model_name = model_name
        self.temperature_omitted = not openai_accepts_temperature(model_name)
        model_kwargs: dict[str, Any] = {
            "model": model_name,
            "api_key": SecretStr((settings.openai_api_key or "").strip()),
        }
        if not self.temperature_omitted:
            model_kwargs["temperature"] = temperature
        self._model = ChatOpenAI(**model_kwargs)

    def invoke(self, *args: Any, **kwargs: Any):
        with _translate_errors():
            return self._model.invoke(*args, **kwargs)

    def stream(self, *args: Any, **kwargs: Any):
        with _translate_errors():
            yield from self._model.stream(*args, **kwargs)

    async def astream(self, *args: Any, **kwargs: Any):
        with _translate_errors():
            async for chunk in self._model.astream(*args, **kwargs):
                yield chunk

    def with_structured_output(
        self, schema: dict[str, Any], **_: Any
    ) -> OpenAIStructuredOutput:
        return OpenAIStructuredOutput(
            self._model.with_structured_output(
                to_strict_json_schema(schema),
                method="json_schema",
                strict=True,
            )
        )


def ensure_openai_configured() -> None:
    if not has_openai_api_key():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=OPENAI_NOT_CONFIGURED_DETAIL,
        )


def create_openai_chat_model(model_name: str, temperature: float) -> OpenAIChat:
    ensure_openai_configured()
    return OpenAIChat(model_name=model_name, temperature=temperature)
