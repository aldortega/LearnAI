from __future__ import annotations

import json
import logging
import math
import time
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Callable, TypeVar

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from pydantic import SecretStr
from redis import Redis

from .config import settings

logger = logging.getLogger(__name__)

FAILOVER_REASON_QUOTA = "quota_exhausted"
FAILOVER_REASON_AUTH = "invalid_credentials"

T = TypeVar("T")


def _parse_gemini_api_keys(raw_value: str | None) -> list[str]:
    if raw_value is None:
        return []
    normalized_raw = raw_value.strip()
    if not normalized_raw:
        return []
    if normalized_raw.startswith("["):
        try:
            parsed = json.loads(normalized_raw)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    return [item.strip() for item in normalized_raw.split(",") if item.strip()]


def get_gemini_primary_api_key() -> str:
    return (settings.gemini_api_key or "").strip()


def get_gemini_api_keys() -> list[str]:
    ordered_keys: list[str] = []
    seen: set[str] = set()

    primary_key = get_gemini_primary_api_key()

    for key in _parse_gemini_api_keys(settings.gemini_api_keys):
        normalized_key = key.strip()
        if normalized_key == primary_key:
            continue
        if normalized_key and normalized_key not in seen:
            ordered_keys.append(normalized_key)
            seen.add(normalized_key)

    return ordered_keys


def has_gemini_api_keys() -> bool:
    return bool(get_gemini_api_keys())


def _state_prefix() -> str:
    prefix = (settings.gemini_failover_redis_prefix or "").strip()
    return prefix or "learnai:gemini:failover"


def _active_index_key() -> str:
    return f"{_state_prefix()}:active_index"


def _disabled_key() -> str:
    return f"{_state_prefix()}:disabled"


def _lock_key() -> str:
    return f"{_state_prefix()}:lock"


@lru_cache(maxsize=1)
def _build_redis_client() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def _get_redis_client() -> Redis | None:
    try:
        return _build_redis_client()
    except Exception as exc:
        logger.warning(
            "No se pudo inicializar Redis para failover de Gemini",
            extra={"error": str(exc)},
        )
        return None


def _safe_read_active_index(total: int) -> int | None:
    if total <= 0:
        return None
    client = _get_redis_client()
    if client is None:
        return None
    try:
        raw_value = client.get(_active_index_key())
    except Exception as exc:
        logger.warning(
            "No se pudo leer active_index de Gemini en Redis", extra={"error": str(exc)}
        )
        return None
    if raw_value is None:
        return None
    try:
        active_index = int(raw_value)
    except (TypeError, ValueError):
        return None
    if 0 <= active_index < total:
        return active_index
    return None


def _safe_set_active_index(index: int) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        client.set(_active_index_key(), str(index))
    except Exception as exc:
        logger.warning(
            "No se pudo guardar active_index de Gemini en Redis",
            extra={"error": str(exc)},
        )


def _safe_read_disabled_indices(total: int) -> set[int]:
    client = _get_redis_client()
    if client is None:
        return set()
    try:
        disabled_fields = client.hkeys(_disabled_key())
    except Exception as exc:
        logger.warning(
            "No se pudo leer keys deshabilitadas de Gemini en Redis",
            extra={"error": str(exc)},
        )
        return set()

    disabled_indices: set[int] = set()
    for field in disabled_fields:
        try:
            parsed_index = int(field)
        except (TypeError, ValueError):
            continue
        if 0 <= parsed_index < total:
            disabled_indices.add(parsed_index)
    return disabled_indices


def _safe_mutate_failover_state(mutator: Callable[[Redis], None]) -> None:
    client = _get_redis_client()
    if client is None:
        return

    lock_seconds = max(1, int(settings.gemini_failover_lock_seconds))
    last_lock_error: Exception | None = None
    for _ in range(2):
        lock = client.lock(_lock_key(), timeout=lock_seconds, blocking_timeout=1)
        acquired = False
        try:
            acquired = bool(lock.acquire(blocking=True))
            if acquired:
                mutator(client)
                return
        except Exception as exc:
            last_lock_error = exc
        finally:
            if acquired:
                try:
                    lock.release()
                except Exception:
                    pass
        time.sleep(0.05)

    if last_lock_error is not None:
        logger.warning(
            "No se pudo adquirir lock de failover Gemini en Redis",
            extra={"error": str(last_lock_error)},
        )
    try:
        mutator(client)
    except Exception as exc:
        logger.warning(
            "No se pudo mutar estado de failover Gemini en Redis",
            extra={"error": str(exc)},
        )


def _get_available_indices(total: int, excluded: set[int] | None = None) -> list[int]:
    disabled_indices = _safe_read_disabled_indices(total)
    excluded_indices = excluded or set()
    return [
        index
        for index in range(total)
        if index not in disabled_indices and index not in excluded_indices
    ]


def _rotation_mode() -> str:
    raw_mode = (settings.gemini_rotation_mode or "failover").strip().lower()
    if raw_mode == "per_call":
        return "per_call"
    return "failover"


def _safe_parse_index(raw_value: str | None, total: int) -> int | None:
    if raw_value is None:
        return None
    try:
        parsed_index = int(raw_value)
    except (TypeError, ValueError):
        return None
    if 0 <= parsed_index < total:
        return parsed_index
    return None


def _next_available_index(available_indices: list[int], selected_index: int) -> int:
    if not available_indices:
        return selected_index
    if selected_index not in available_indices:
        return available_indices[0]
    selected_position = available_indices.index(selected_index)
    next_position = (selected_position + 1) % len(available_indices)
    return available_indices[next_position]


def _select_per_call_index(total: int, available_indices: list[int]) -> int:
    selected_index = available_indices[0]
    next_active_index = available_indices[0]

    def mutator(client: Redis) -> None:
        nonlocal selected_index, next_active_index
        active_index = _safe_parse_index(client.get(_active_index_key()), total)
        if active_index in available_indices:
            selected_index = active_index
        else:
            selected_index = available_indices[0]
        next_active_index = _next_available_index(available_indices, selected_index)
        client.set(_active_index_key(), str(next_active_index))

    _safe_mutate_failover_state(mutator)
    logger.info(
        "Gemini key seleccionada en round-robin",
        extra={
            "key_index": selected_index,
            "next_active_index": next_active_index,
            "total_keys": total,
        },
    )
    return selected_index


def _ordered_candidate_indices(total: int, tried: set[int]) -> list[int]:
    available_indices = _get_available_indices(total, excluded=tried)
    if not available_indices:
        return []

    if _rotation_mode() == "per_call" and not tried:
        selected_index = _select_per_call_index(total, available_indices)
        return [selected_index] + [
            index for index in available_indices if index != selected_index
        ]

    active_index = _safe_read_active_index(total)
    if active_index in available_indices:
        return [active_index] + [
            index for index in available_indices if index != active_index
        ]

    selected_index = available_indices[0]
    _safe_set_active_index(selected_index)
    logger.info(
        "Gemini key activa seleccionada",
        extra={"key_index": selected_index, "total_keys": total},
    )
    return available_indices


def _status_code_from_exc(exc: Exception) -> int | None:
    status_code = getattr(exc, "status_code", None)
    if isinstance(status_code, int):
        return status_code
    if isinstance(status_code, str):
        try:
            return int(status_code)
        except ValueError:
            return None
    return None


def _is_quota_error(exc: Exception) -> bool:
    status_code = _status_code_from_exc(exc)
    if status_code == 429:
        return True
    message = str(exc).upper()
    if "RESOURCE_EXHAUSTED" in message:
        return True
    if "429" in message and "QUOTA" in message:
        return True
    return False


def _is_auth_error(exc: Exception) -> bool:
    status_code = _status_code_from_exc(exc)
    if status_code in {401, 403}:
        return True
    message = str(exc).upper()
    auth_tokens = (
        "API_KEY_INVALID",
        "INVALID API KEY",
        "UNAUTHENTICATED",
        "PERMISSION_DENIED",
    )
    return any(token in message for token in auth_tokens)


def _classify_failover_reason(exc: Exception) -> str | None:
    if _is_quota_error(exc):
        return FAILOVER_REASON_QUOTA
    if _is_auth_error(exc):
        return FAILOVER_REASON_AUTH
    return None


def _extract_error_code(exc: Exception) -> str | None:
    status_code = _status_code_from_exc(exc)
    if status_code is not None:
        return str(status_code)
    message = str(exc).upper()
    if "RESOURCE_EXHAUSTED" in message:
        return "RESOURCE_EXHAUSTED"
    if "PERMISSION_DENIED" in message:
        return "PERMISSION_DENIED"
    if "UNAUTHENTICATED" in message:
        return "UNAUTHENTICATED"
    return None


def _disable_index_and_rotate(
    total: int,
    failed_index: int,
    reason: str,
    error_code: str | None,
) -> None:
    if total <= 0:
        return

    record = {
        "reason": reason,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    if error_code:
        record["error_code"] = error_code

    next_active_index: int | None = None

    def mutator(client: Redis) -> None:
        nonlocal next_active_index

        client.hset(_disabled_key(), str(failed_index), json.dumps(record))
        disabled_fields = client.hkeys(_disabled_key())
        disabled_indices: set[int] = set()
        for field in disabled_fields:
            try:
                parsed_index = int(field)
            except (TypeError, ValueError):
                continue
            if 0 <= parsed_index < total:
                disabled_indices.add(parsed_index)

        available_indices = [
            index for index in range(total) if index not in disabled_indices
        ]
        if available_indices:
            next_active_index = available_indices[0]
            client.set(_active_index_key(), str(next_active_index))
        else:
            client.delete(_active_index_key())

    _safe_mutate_failover_state(mutator)

    logger.warning(
        "Gemini key deshabilitada",
        extra={
            "key_index": failed_index,
            "reason": reason,
            "error_code": error_code,
            "next_active_index": next_active_index,
            "total_keys": total,
        },
    )


def _run_sync_with_failover(
    api_keys: list[str],
    operation: str,
    call_for_key: Callable[[str], T],
) -> T:
    total = len(api_keys)
    if total <= 0:
        raise RuntimeError("Gemini no configurado")

    tried_indices: set[int] = set()
    last_exc: Exception | None = None

    while True:
        candidate_indices = _ordered_candidate_indices(total, tried_indices)
        if not candidate_indices:
            break
        key_index = candidate_indices[0]
        tried_indices.add(key_index)
        api_key = api_keys[key_index]

        try:
            return call_for_key(api_key)
        except Exception as exc:
            reason = _classify_failover_reason(exc)
            if reason is None:
                raise
            _disable_index_and_rotate(
                total, key_index, reason, _extract_error_code(exc)
            )
            logger.warning(
                "Gemini failover rotate",
                extra={
                    "operation": operation,
                    "key_index": key_index,
                    "reason": reason,
                    "tried": len(tried_indices),
                    "total_keys": total,
                },
            )
            last_exc = exc
            continue

    if last_exc is not None:
        raise last_exc
    raise RuntimeError("No hay API keys Gemini disponibles")


class GeminiStructuredOutputWithFallback:
    def __init__(
        self,
        model_name: str,
        temperature: float,
        api_keys: list[str],
        structured_args: tuple[Any, ...],
        structured_kwargs: dict[str, Any],
    ) -> None:
        self._model_name = model_name
        self._temperature = temperature
        self._api_keys = api_keys
        self._structured_args = structured_args
        self._structured_kwargs = structured_kwargs

    def _build_structured(self, api_key: str):
        model = ChatGoogleGenerativeAI(
            model=self._model_name,
            api_key=SecretStr(api_key),
            temperature=self._temperature,
        )
        return model.with_structured_output(
            *self._structured_args, **self._structured_kwargs
        )

    def invoke(self, *args: Any, **kwargs: Any):
        return _run_sync_with_failover(
            self._api_keys,
            operation="structured_invoke",
            call_for_key=lambda api_key: self._build_structured(api_key).invoke(
                *args, **kwargs
            ),
        )


class GeminiChatWithFallback:
    def __init__(
        self,
        model_name: str,
        temperature: float,
        api_keys: list[str],
    ) -> None:
        self._model_name = model_name
        self._temperature = temperature
        self._api_keys = api_keys

    def _build_model(self, api_key: str) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model=self._model_name,
            api_key=SecretStr(api_key),
            temperature=self._temperature,
        )

    def invoke(self, *args: Any, **kwargs: Any):
        return _run_sync_with_failover(
            self._api_keys,
            operation="invoke",
            call_for_key=lambda api_key: self._build_model(api_key).invoke(
                *args, **kwargs
            ),
        )

    def stream(self, *args: Any, **kwargs: Any):
        total = len(self._api_keys)
        if total <= 0:
            raise RuntimeError("Gemini no configurado")

        tried_indices: set[int] = set()
        last_exc: Exception | None = None

        while True:
            candidate_indices = _ordered_candidate_indices(total, tried_indices)
            if not candidate_indices:
                break
            key_index = candidate_indices[0]
            tried_indices.add(key_index)
            api_key = self._api_keys[key_index]
            yielded_any = False

            try:
                model = self._build_model(api_key)
                for chunk in model.stream(*args, **kwargs):
                    yielded_any = True
                    yield chunk
                return
            except Exception as exc:
                reason = _classify_failover_reason(exc)
                if reason is None:
                    raise
                _disable_index_and_rotate(
                    total, key_index, reason, _extract_error_code(exc)
                )
                logger.warning(
                    "Gemini failover rotate",
                    extra={
                        "operation": "stream",
                        "key_index": key_index,
                        "reason": reason,
                        "tried": len(tried_indices),
                        "total_keys": total,
                        "yielded_any": yielded_any,
                    },
                )
                last_exc = exc
                if yielded_any:
                    raise
                continue

        if last_exc is not None:
            raise last_exc
        raise RuntimeError("No hay API keys Gemini disponibles")

    async def astream(self, *args: Any, **kwargs: Any):
        total = len(self._api_keys)
        if total <= 0:
            raise RuntimeError("Gemini no configurado")

        tried_indices: set[int] = set()
        last_exc: Exception | None = None

        while True:
            candidate_indices = _ordered_candidate_indices(total, tried_indices)
            if not candidate_indices:
                break
            key_index = candidate_indices[0]
            tried_indices.add(key_index)
            api_key = self._api_keys[key_index]
            yielded_any = False

            try:
                model = self._build_model(api_key)
                async for chunk in model.astream(*args, **kwargs):
                    yielded_any = True
                    yield chunk
                return
            except Exception as exc:
                reason = _classify_failover_reason(exc)
                if reason is None:
                    raise
                _disable_index_and_rotate(
                    total, key_index, reason, _extract_error_code(exc)
                )
                logger.warning(
                    "Gemini failover rotate",
                    extra={
                        "operation": "astream",
                        "key_index": key_index,
                        "reason": reason,
                        "tried": len(tried_indices),
                        "total_keys": total,
                        "yielded_any": yielded_any,
                    },
                )
                last_exc = exc
                if yielded_any:
                    raise
                continue

        if last_exc is not None:
            raise last_exc
        raise RuntimeError("No hay API keys Gemini disponibles")

    def with_structured_output(self, *args: Any, **kwargs: Any):
        return GeminiStructuredOutputWithFallback(
            model_name=self._model_name,
            temperature=self._temperature,
            api_keys=self._api_keys,
            structured_args=args,
            structured_kwargs=kwargs,
        )


def create_chat_model_with_fallback(
    model_name: str,
    temperature: float = 0.2,
) -> GeminiChatWithFallback:
    api_keys = get_gemini_api_keys()
    if not api_keys:
        raise RuntimeError("Gemini no configurado")
    return GeminiChatWithFallback(
        model_name=model_name,
        temperature=temperature,
        api_keys=api_keys,
    )


def normalize_embedding(vector: list[float]) -> list[float]:
    if not vector:
        return vector
    magnitude = math.sqrt(sum(value * value for value in vector))
    if magnitude <= 0.0:
        return vector
    return [value / magnitude for value in vector]


def normalize_embeddings(vectors: list[list[float]]) -> list[list[float]]:
    return [normalize_embedding(vector) for vector in vectors]


def embed_query_with_fallback(
    text: str,
    model_name: str,
    output_dimensionality: int,
    task_type: str | None = None,
    title: str | None = None,
) -> list[float]:
    return normalize_embedding(
        _run_sync_with_failover(
            get_gemini_api_keys(),
            operation="embed_query",
            call_for_key=lambda api_key: GoogleGenerativeAIEmbeddings(
                model=model_name,
                api_key=SecretStr(api_key),
                output_dimensionality=output_dimensionality,
            ).embed_query(
                text,
                task_type=task_type,
                title=title,
                output_dimensionality=output_dimensionality,
            ),
        )
    )


def embed_documents_with_fallback(
    texts: list[str],
    model_name: str,
    output_dimensionality: int,
    task_type: str | None = None,
    titles: list[str] | None = None,
) -> list[list[float]]:
    return normalize_embeddings(
        _run_sync_with_failover(
            get_gemini_api_keys(),
            operation="embed_documents",
            call_for_key=lambda api_key: GoogleGenerativeAIEmbeddings(
                model=model_name,
                api_key=SecretStr(api_key),
                output_dimensionality=output_dimensionality,
            ).embed_documents(
                texts,
                task_type=task_type,
                titles=titles,
                output_dimensionality=output_dimensionality,
            ),
        )
    )
