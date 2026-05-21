from pathlib import Path
from typing import Literal, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "learnai"
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection_name: str = "rag_chunks"
    qdrant_vector_size: int = 768
    qdrant_distance: str = "Cosine"
    redis_url: str = "redis://localhost:6379/0"
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_storage_bucket: str = "documents"
    llama_cloud_api_key: Optional[str] = None
    llamaparse_language: str = "es"
    gemini_api_key: Optional[str] = None
    gemini_api_keys: Optional[str] = None
    gemini_rotation_mode: Literal["failover", "per_call"] = "failover"
    gemini_chat_model: str = "gemini-3.1-flash-lite-preview"
    gemini_image_model: str = "gemini-3.1-flash-image-preview"
    gemini_tts_model: str = "gemini-3.1-flash-tts-preview"
    gemini_failover_redis_prefix: str = "learnai:gemini:failover"
    gemini_failover_lock_seconds: int = 3
    rag_top_k: int = 8
    rag_min_score: float = 0.65
    rag_fetch_k_multiplier: int = 4
    rag_fetch_k_max: int = 40
    rag_max_chunks_per_document: int = 2
    rag_lexical_weight: float = 0.2
    chunk_size: int = 1000
    chunk_overlap: int = 150
    section_max_tokens: int = 320
    section_min_tokens: int = 80
    section_fallback_chunk_tokens: int = 220
    section_fallback_overlap_tokens: int = 40
    session_secret: str = ""
    frontend_origin: str = "http://localhost:5173"
    session_cookie_name: str = "session"
    session_short_hours: int = 12
    session_remember_days: int = 7
    google_client_id: Optional[str] = None
    resend_api_key: Optional[str] = None
    from_email: str = "onboarding@resend.dev"
    frontend_url: str = "http://localhost:5173"
    password_reset_token_hours: int = 1
    presentation_job_timeout_seconds: int = 900
    audio_job_timeout_seconds: int = 1500

    @field_validator("session_secret")
    @classmethod
    def validate_session_secret(cls, value: str) -> str:
        if not value:
            raise ValueError("SESSION_SECRET es obligatorio")
        return value

    class Config:
        env_file = Path(__file__).resolve().parent / ".env"
        case_sensitive = False


settings = Settings()  # type: ignore[call-arg]
