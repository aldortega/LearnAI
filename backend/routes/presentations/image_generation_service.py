import asyncio
import base64
from io import BytesIO
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from google import genai
from google.genai import types
from pydantic import BaseModel
from supabase import create_client

from ...config import settings
from ...gemini import get_gemini_primary_api_key
from ...schemas.presentations import (
    PresentationDetailLevel,
    PresentationSlideOut,
    PresentationSourceRef,
)
from ..rag import create_llm, retrieve_context
from .constants import MAX_SLIDES, PresentationImagePayloadLLM
from .normalization import (
    compact_context,
    coerce_text,
    normalize_slide_subtitle,
    normalize_slide_title,
    source_to_ref,
)
from .prompts import build_presentation_image_outline_prompt


class PresentationImageGenerationResult(BaseModel):
    title: str
    summary: str
    slides: list[PresentationSlideOut]
    sources: list[PresentationSourceRef]


async def generate_image_presentation_payload(
    notebook_title: str,
    topic: str,
    detail_level: PresentationDetailLevel,
    notebook_object_id: ObjectId,
    owner_id: ObjectId,
    user: dict,
) -> PresentationImageGenerationResult:
    context_lines, sources, _, _ = await retrieve_context(
        f"Informacion para presentacion visual sobre {topic}",
        notebook_object_id,
        user,
    )
    context_text = compact_context(context_lines)
    system_message, user_message = build_presentation_image_outline_prompt(
        notebook_title=notebook_title,
        topic=topic,
        detail_level=detail_level,
        context_text=context_text,
    )

    llm = create_llm()
    structured_llm = llm.with_structured_output(
        schema=PresentationImagePayloadLLM.model_json_schema(),
        method="json_schema",
    )
    payload = await asyncio.to_thread(
        structured_llm.invoke, [system_message, user_message]
    )
    payload_data = (
        payload.model_dump()
        if isinstance(payload, BaseModel)
        else payload
        if isinstance(payload, dict)
        else PresentationImagePayloadLLM.model_validate(payload).model_dump()
    )

    title = coerce_text(payload_data.get("title")).strip()
    summary = coerce_text(payload_data.get("summary")).strip()
    raw_slides = payload_data.get("slides")

    if not title or not summary or not isinstance(raw_slides, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo generar la presentacion visual",
        )

    bucket = _get_public_bucket_or_raise()
    public_base_url = _build_public_bucket_base_url(bucket)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")

    slides: list[PresentationSlideOut] = []
    for index, raw_slide in enumerate(raw_slides, start=1):
        if not isinstance(raw_slide, dict):
            continue
        slide_title = normalize_slide_title(coerce_text(raw_slide.get("title")))
        slide_subtitle = normalize_slide_subtitle(
            coerce_text(raw_slide.get("subtitle"))
        )
        image_prompt = coerce_text(raw_slide.get("image_prompt")).strip()
        if not slide_title or not image_prompt:
            continue

        image_bytes = await generate_slide_image_bytes(
            slide_title=slide_title,
            slide_subtitle=slide_subtitle or None,
            image_prompt=image_prompt,
            topic=topic,
        )
        image_path = f"presentations/{owner_id}/{notebook_object_id}/{timestamp}/slide-{index}.webp"
        await asyncio.to_thread(upload_public_image, bucket, image_path, image_bytes)

        slides.append(
            PresentationSlideOut(
                index=index,
                format="image",
                title=slide_title,
                subtitle=slide_subtitle or None,
                content_markdown=None,
                image_path=image_path,
                image_url=f"{public_base_url}/{image_path}",
                image_prompt=image_prompt,
            )
        )
        if len(slides) >= MAX_SLIDES:
            break

    if not slides:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudieron generar imagenes para la presentacion",
        )

    return PresentationImageGenerationResult(
        title=title,
        summary=summary,
        slides=slides,
        sources=[source_to_ref(source) for source in sources],
    )


async def generate_slide_image_bytes(
    slide_title: str,
    slide_subtitle: str | None,
    image_prompt: str,
    topic: str,
) -> bytes:
    primary_api_key = get_gemini_primary_api_key()
    if not primary_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini no configurado: falta GEMINI_API_KEY principal",
        )

    prompt = _build_slide_image_prompt(
        slide_title=slide_title,
        slide_subtitle=slide_subtitle,
        image_prompt=image_prompt,
        topic=topic,
    )

    try:
        return await asyncio.to_thread(
            _call_image_generation_sdk, primary_api_key, prompt
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo generar imagen de slide con la API key principal: {exc}",
        ) from exc


def upload_public_image(bucket: str, image_path: str, image_bytes: bytes) -> None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supabase no esta configurado",
        )

    supabase_client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
    storage_response = supabase_client.storage.from_(bucket).upload(
        image_path,
        image_bytes,
        {"content-type": "image/webp", "upsert": "true"},
    )
    if isinstance(storage_response, dict) and storage_response.get("error"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo subir imagen de slide a Supabase",
        )


def _build_slide_image_prompt(
    slide_title: str,
    slide_subtitle: str | None,
    image_prompt: str,
    topic: str,
) -> str:
    subtitle_line = f"Contexto secundario: {slide_subtitle}\n" if slide_subtitle else ""
    return (
        "Genera una imagen horizontal 16:9 (1920x1080) para una diapositiva visual. "
        "Composicion limpia, profesional y academica "
        "No dejes bordes negros ni marcos.\n\n"
        f"Tema general: {topic}\n"
        f"Concepto clave de la escena: {slide_title}\n"
        f"{subtitle_line}"
        f"Instruccion visual: {image_prompt}\n"
        "Resultado esperado: una imagen con explicacion visual, referida al tema.\n"
    )


def _call_image_generation_sdk(api_key: str, prompt: str) -> bytes:
    client = genai.Client(api_key=api_key)
    last_error: Exception | None = None

    for model_name in _image_model_candidates():
        try:
            response = _generate_image_response(
                client=client,
                model_name=model_name,
                prompt=prompt,
                use_image_config=True,
            )
            return _extract_image_bytes_from_response(response, model_name)
        except Exception as exc:
            if _is_unsupported_image_config_error(exc):
                try:
                    response = _generate_image_response(
                        client=client,
                        model_name=model_name,
                        prompt=prompt,
                        use_image_config=False,
                    )
                    return _extract_image_bytes_from_response(response, model_name)
                except Exception as retry_exc:
                    last_error = retry_exc
                    continue
            last_error = exc
            continue

    raise RuntimeError(
        f"Fallo la generacion de imagen con los modelos configurados: {last_error}"
    )


def _image_model_candidates() -> list[str]:
    configured = coerce_text(settings.gemini_image_model).strip()
    candidates = [
        "gemini-3.1-flash-image-preview",
        configured,
        "gemini-3.1-flash-image-preview",
    ]
    seen: set[str] = set()
    ordered: list[str] = []
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        ordered.append(candidate)
    return ordered


def _coerce_image_bytes_to_webp(image_bytes: bytes, mime_type: str) -> bytes:
    if mime_type == "image/webp":
        return image_bytes

    try:
        import importlib

        pil_image_module = importlib.import_module("PIL.Image")
    except Exception as exc:
        raise RuntimeError(
            "La respuesta no vino en WEBP y falta Pillow para convertirla"
        ) from exc

    try:
        with pil_image_module.open(BytesIO(image_bytes)) as image:
            output = BytesIO()
            image.save(output, format="WEBP", quality=92, method=6)
            return output.getvalue()
    except Exception as exc:
        raise RuntimeError(f"No se pudo convertir imagen a WEBP: {exc}") from exc


def _generate_image_response(
    client: genai.Client,
    model_name: str,
    prompt: str,
    use_image_config: bool,
):
    config = types.GenerateContentConfig(response_modalities=["IMAGE"])
    if use_image_config:
        config = types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio="16:9"),
        )

    return client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=config,
    )


def _extract_image_bytes_from_response(response: object, model_name: str) -> bytes:
    parts = getattr(response, "parts", None) or []
    for part in parts:
        inline_data = getattr(part, "inline_data", None)
        if not inline_data:
            continue

        try:
            image = part.as_image()
            if image is not None:
                output = BytesIO()
                image.save(output, format="WEBP", quality=92, method=6)
                return output.getvalue()
        except Exception:
            pass

        data = getattr(inline_data, "data", None)
        mime_type = coerce_text(getattr(inline_data, "mime_type", None)).strip()
        if isinstance(data, bytes) and data:
            return _coerce_image_bytes_to_webp(data, mime_type)
        if isinstance(data, str) and data:
            try:
                return _coerce_image_bytes_to_webp(base64.b64decode(data), mime_type)
            except Exception as exc:
                raise RuntimeError(
                    f"No se pudo decodificar imagen generada: {exc}"
                ) from exc

    raise RuntimeError(f"El modelo '{model_name}' no devolvio imagen en la respuesta")


def _is_unsupported_image_config_error(exc: Exception) -> bool:
    message = coerce_text(exc).lower()
    return "image_config" in message or "output_mime_type" in message


def _build_public_bucket_base_url(bucket: str) -> str:
    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supabase no esta configurado",
        )
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}"


def _get_public_bucket_or_raise() -> str:
    bucket = coerce_text(settings.supabase_storage_bucket).strip()
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bucket de Supabase no configurado",
        )
    return bucket
