from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "learnai"
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection_name: str = "rag_chunks"
    qdrant_vector_size: int = 768
    qdrant_distance: str = "Cosine"
    redis_url: str = "redis://localhost:6379/0"
    supabase_url: str = "https://jhmbkrjepagcrxqhlmow.supabase.co"
    supabase_service_role_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobWJrcmplcGFnY3J4cWhsbW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM5MjQ3NiwiZXhwIjoyMDgzOTY4NDc2fQ.Fr-RVWL9z7H19yOwg25vRI-0yW5dEstoJ-dCzN_9I2A"
    supabase_storage_bucket: str = "documents"
    gemini_api_key: str = "AIzaSyC1wH65WVkB6mQn7ooKmVoRZWWElnonXYI"
    gemini_chat_model: str = "gemini-2.5-pro"
    rag_top_k: int = 8
    rag_min_score: float = 0.65
    chunk_size: int = 1000
    chunk_overlap: int = 150
    session_secret: str = "change-me"
    frontend_origin: str = "http://localhost:5173"
    session_cookie_name: str = "session"
    session_short_hours: int = 12
    session_remember_days: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
