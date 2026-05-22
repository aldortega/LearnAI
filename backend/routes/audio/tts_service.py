import asyncio
import base64
import logging
import wave
from io import BytesIO

from fastapi import HTTPException, status
from google import genai
from google.genai import types
from supabase import create_client

from ...config import settings
from ...gemini import get_gemini_primary_api_key
from ...schemas.audio import AudioFormatType, AudioScriptSegment
from .constants import (
    AUDIO_VOICE_CONFIGS,
    is_multi_speaker_format,
)
from .normalization import coerce_text

logger = logging.getLogger(__name__)


TTS_SAMPLE_RATE = 24000
TTS_CHANNELS = 1
TTS_SAMPLE_WIDTH = 2  # 16-bit PCM
TTS_MAX_CHARS_PER_CHUNK = 2200
TTS_MAX_CONCURRENT_CALLS = 3


class TTSResult:
    def __init__(self, audio_bytes: bytes, audio_path: str, audio_url: str, duration_seconds: float):
        self.audio_bytes = audio_bytes
        self.audio_path = audio_path
        self.audio_url = audio_url
        self.duration_seconds = duration_seconds


def _format_script_for_tts(
    format_type: AudioFormatType,
    segments: list[AudioScriptSegment],
) -> str:
    if not is_multi_speaker_format(format_type):
        return " ".join(segment.text for segment in segments)
    lines: list[str] = []
    for segment in segments:
        lines.append(f"{segment.speaker}: {segment.text}")
    return "\n".join(lines)


def _chunk_segments(
    format_type: AudioFormatType,
    segments: list[AudioScriptSegment],
) -> list[list[AudioScriptSegment]]:
    multi_speaker = is_multi_speaker_format(format_type)
    chunks: list[list[AudioScriptSegment]] = []
    current: list[AudioScriptSegment] = []
    current_chars = 0

    for segment in segments:
        overhead = (len(segment.speaker) + 2) if multi_speaker else 1
        segment_cost = len(segment.text) + overhead

        if current and current_chars + segment_cost > TTS_MAX_CHARS_PER_CHUNK:
            chunks.append(current)
            current = []
            current_chars = 0

        current.append(segment)
        current_chars += segment_cost

    if current:
        chunks.append(current)

    return chunks


def _build_speech_config(format_type: AudioFormatType) -> types.SpeechConfig:
    voices = AUDIO_VOICE_CONFIGS[format_type]
    if is_multi_speaker_format(format_type):
        speaker_configs = [
            types.SpeakerVoiceConfig(
                speaker=speaker,
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice),
                ),
            )
            for speaker, voice in voices.items()
        ]
        return types.SpeechConfig(
            multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                speaker_voice_configs=speaker_configs,
            )
        )

    single_voice = next(iter(voices.values()))
    return types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=single_voice),
        )
    )


def _extract_pcm_from_response(response: object) -> bytes:
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        if not content:
            continue
        parts = getattr(content, "parts", None) or []
        for part in parts:
            inline_data = getattr(part, "inline_data", None)
            if not inline_data:
                continue
            data = getattr(inline_data, "data", None)
            if isinstance(data, bytes) and data:
                return data
            if isinstance(data, str) and data:
                try:
                    return base64.b64decode(data)
                except Exception as exc:
                    raise RuntimeError(
                        f"No se pudo decodificar audio base64: {exc}"
                    ) from exc
    raise RuntimeError("La respuesta de TTS no contiene audio")


def _wrap_pcm_as_wav(pcm_bytes: bytes) -> tuple[bytes, float]:
    output = BytesIO()
    with wave.open(output, "wb") as wf:
        wf.setnchannels(TTS_CHANNELS)
        wf.setsampwidth(TTS_SAMPLE_WIDTH)
        wf.setframerate(TTS_SAMPLE_RATE)
        wf.writeframes(pcm_bytes)
    audio_bytes = output.getvalue()
    duration_seconds = len(pcm_bytes) / (TTS_SAMPLE_RATE * TTS_CHANNELS * TTS_SAMPLE_WIDTH)
    return audio_bytes, duration_seconds


def _call_tts_sdk(
    api_key: str,
    script_text: str,
    format_type: AudioFormatType,
) -> bytes:
    client = genai.Client(api_key=api_key)
    model_name = coerce_text(settings.gemini_tts_model).strip() or "gemini-3.1-flash-tts-preview"

    response = client.models.generate_content(
        model=model_name,
        contents=script_text,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=_build_speech_config(format_type),
        ),
    )
    return _extract_pcm_from_response(response)


async def synthesize_script(
    format_type: AudioFormatType,
    segments: list[AudioScriptSegment],
) -> tuple[bytes, float]:
    primary_api_key = get_gemini_primary_api_key()
    if not primary_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini no configurado: falta GEMINI_API_KEY principal",
        )

    chunks = _chunk_segments(format_type, segments)
    chunk_scripts = [
        _format_script_for_tts(format_type, chunk) for chunk in chunks
    ]
    chunk_scripts = [script for script in chunk_scripts if script.strip()]
    if not chunk_scripts:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El guion del podcast esta vacio",
        )

    semaphore = asyncio.Semaphore(TTS_MAX_CONCURRENT_CALLS)

    async def _synth_one(script_text: str) -> bytes:
        async with semaphore:
            return await asyncio.to_thread(
                _call_tts_sdk, primary_api_key, script_text, format_type
            )

    try:
        pcm_chunks = await asyncio.gather(
            *(_synth_one(script) for script in chunk_scripts)
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo generar el audio del podcast: {exc}",
        ) from exc

    if any(not pcm for pcm in pcm_chunks):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El modelo TTS no devolvio audio",
        )

    pcm_bytes = b"".join(pcm_chunks)
    return _wrap_pcm_as_wav(pcm_bytes)


def _get_public_bucket_or_raise() -> str:
    bucket = coerce_text(settings.supabase_storage_bucket).strip()
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bucket de Supabase no configurado",
        )
    return bucket


def _build_public_bucket_base_url(bucket: str) -> str:
    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supabase no esta configurado",
        )
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}"


def upload_public_audio(bucket: str, audio_path: str, audio_bytes: bytes) -> None:
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
        audio_path,
        audio_bytes,
        {"content-type": "audio/wav", "upsert": "true"},
    )
    if isinstance(storage_response, dict) and storage_response.get("error"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo subir el audio a Supabase",
        )


def delete_public_audio(audio_path: str) -> None:
    if not audio_path:
        return
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return
    try:
        bucket = _get_public_bucket_or_raise()
        supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        supabase_client.storage.from_(bucket).remove([audio_path])
    except Exception as exc:
        logger.warning("No se pudo eliminar audio de Supabase: %s", exc)


def build_audio_storage_path(owner_id: str, notebook_id: str, podcast_uid: str) -> tuple[str, str, str]:
    bucket = _get_public_bucket_or_raise()
    public_base_url = _build_public_bucket_base_url(bucket)
    audio_path = f"podcasts/{owner_id}/{notebook_id}/{podcast_uid}.wav"
    audio_url = f"{public_base_url}/{audio_path}"
    return bucket, audio_path, audio_url
