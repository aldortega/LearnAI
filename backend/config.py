from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "learnai"
    session_secret: str = "change-me"
    frontend_origin: str = "http://localhost:5173"
    session_cookie_name: str = "session"
    session_short_hours: int = 12
    session_remember_days: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
