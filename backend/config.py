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
    gemini_api_key: Optional[str] = None
    gemini_api_keys: Optional[str] = None
    gemini_rotation_mode: Literal["failover", "per_call"] = "failover"
    gemini_chat_model: str = "gemini-2.5-flash-lite"
    gemini_failover_redis_prefix: str = "learnai:gemini:failover"
    gemini_failover_lock_seconds: int = 3
    rag_top_k: int = 8
    rag_min_score: float = 0.65
    chunk_size: int = 1000
    chunk_overlap: int = 150
    session_secret: str = ""
    frontend_origin: str = "http://localhost:5173"
    session_cookie_name: str = "session"
    session_short_hours: int = 12
    session_remember_days: int = 7
    google_client_id: Optional[str] = None

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
