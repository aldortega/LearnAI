import asyncio
import base64
from io import BytesIO

from fastapi import HTTPException, status
from google import genai
from google.genai import types
from supabase import create_client

from ...config import settings
from ...gemini import get_gemini_primary_api_key
from .normalization import coerce_text


async def generate_slide_image_bytes(
    slide_title: str,
    slide_subtitle: str | None,
    image_prompt: str,
    topic: str,
    style_guide: str,
    labels: list[str],
    reference_image: bytes | None = None,
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
        style_guide=style_guide,
        labels=labels,
        has_reference=reference_image is not None,
    )

    try:
        return await asyncio.to_thread(
            _call_image_generation_sdk, primary_api_key, prompt, reference_image
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


def delete_public_images(bucket: str, image_paths: list[str]) -> None:
    if not image_paths:
        return
    supabase_client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
    supabase_client.storage.from_(bucket).remove(image_paths)


def _build_slide_image_prompt(
    slide_title: str,
    slide_subtitle: str | None,
    image_prompt: str,
    topic: str,
    style_guide: str,
    labels: list[str],
    has_reference: bool,
) -> str:
    subtitle_line = f"Contexto secundario: {slide_subtitle}\n" if slide_subtitle else ""
    labels_block = (
        "Textos que deben aparecer escritos en la imagen, exactamente asi y sin "
        "agregar otros textos:\n"
        + "\n".join(f"- {label}" for label in labels)
        + "\n"
        if labels
        else "No escribas texto en la imagen.\n"
    )
    reference_line = (
        "Se adjunta la imagen de la primera slide como referencia de estilo: "
        "mantene exactamente la misma paleta, tipografia y tratamiento grafico, "
        "pero con una escena distinta.\n"
        if has_reference
        else ""
    )
    return (
        "Genera una imagen horizontal 16:9 (1920x1080) para una diapositiva visual. "
        "Composicion limpia, profesional y academica "
        "No dejes bordes negros ni marcos.\n\n"
        f"Estilo visual global (obligatorio e identico en todas las slides): {style_guide}\n"
        f"{reference_line}\n"
        f"Tema general: {topic}\n"
        f"Concepto clave de la escena: {slide_title}\n"
        f"{subtitle_line}"
        f"Instruccion visual: {image_prompt}\n"
        f"{labels_block}"
        "Resultado esperado: una imagen con explicacion visual, referida al tema.\n"
    )


def _call_image_generation_sdk(
    api_key: str, prompt: str, reference_image: bytes | None = None
) -> bytes:
    client = genai.Client(api_key=api_key)
    last_error: Exception | None = None

    for model_name in _image_model_candidates():
        try:
            response = _generate_image_response(
                client=client,
                model_name=model_name,
                prompt=prompt,
                use_image_config=True,
                reference_image=reference_image,
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
                        reference_image=reference_image,
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
    reference_image: bytes | None = None,
):
    contents: list[object] = [prompt]
    if reference_image:
        contents.append(
            types.Part.from_bytes(data=reference_image, mime_type="image/webp")
        )
    config = types.GenerateContentConfig(response_modalities=["IMAGE"])
    if use_image_config:
        config = types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio="16:9"),
        )

    return client.models.generate_content(
        model=model_name,
        contents=contents,
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


def build_public_bucket_base_url(bucket: str) -> str:
    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supabase no esta configurado",
        )
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}"


def get_public_bucket_or_raise() -> str:
    bucket = coerce_text(settings.supabase_storage_bucket).strip()
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bucket de Supabase no configurado",
        )
    return bucket
