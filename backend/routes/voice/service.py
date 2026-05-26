from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from google import genai
from google.genai import types as genai_types

from ...config import settings
from ...gemini import get_gemini_primary_api_key


TOOL_NAME_RETRIEVE_CONTEXT = "retrieve_context"


def build_system_instruction(notebook_title: str | None) -> str:
    title = (notebook_title or "este notebook").strip() or "este notebook"
    return (
        "Eres un tutor conversacional de la plataforma LearnAI. "
        f"El usuario te habla por voz mientras estudia '{title}'. "
        "Responde siempre en espanol con tono natural, calido y conciso, como en una llamada. "
        "Cuando el usuario pregunte algo cuyo conocimiento dependa de las fuentes del notebook "
        f"(contenido, datos, definiciones, ejemplos), DEBES invocar la funcion '{TOOL_NAME_RETRIEVE_CONTEXT}' "
        "con una consulta breve antes de responder. "
        "Si la funcion no devuelve fragmentos relevantes, indica claramente que no encontraste informacion "
        "en las fuentes y ofrece responder con conocimiento general si el usuario lo desea. "
        "No inventes contenido del notebook. Mantente al tema del estudio."
    )


def build_tool_schema() -> dict[str, Any]:
    return {
        "name": TOOL_NAME_RETRIEVE_CONTEXT,
        "description": (
            "Recupera fragmentos relevantes de las fuentes del notebook del usuario "
            "mediante busqueda semantica. Usalo antes de responder cualquier pregunta "
            "que dependa del contenido especifico del notebook."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Consulta breve en espanol que describe lo que el usuario quiere saber.",
                }
            },
            "required": ["query"],
        },
    }


def _build_live_constraints() -> genai_types.LiveConnectConstraints:
    return genai_types.LiveConnectConstraints(
        model=settings.gemini_live_model,
        config=genai_types.LiveConnectConfig(
            response_modalities=[genai_types.Modality.AUDIO],
        ),
    )


async def create_ephemeral_token() -> str:
    api_key = get_gemini_primary_api_key()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini no configurado",
        )

    now = datetime.now(timezone.utc)
    expire_time = now + timedelta(minutes=settings.gemini_live_token_ttl_minutes)
    new_session_expire_time = now + timedelta(
        seconds=settings.gemini_live_session_start_ttl_seconds
    )

    def _create() -> Any:
        client = genai.Client(
            api_key=api_key,
            http_options={"api_version": "v1alpha"},
        )
        return client.auth_tokens.create(
            config=genai_types.CreateAuthTokenConfig(
                uses=1,
                expire_time=expire_time,
                new_session_expire_time=new_session_expire_time,
                live_connect_constraints=_build_live_constraints(),
                lock_additional_fields=[],
            )
        )

    try:
        token = await asyncio.to_thread(_create)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo crear token de voz: {exc}",
        ) from exc

    name = getattr(token, "name", None)
    if not name:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Token de voz invalido",
        )
    return name
