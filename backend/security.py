import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext

from .config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    secret = settings.session_secret.encode("utf-8")
    digest = hmac.new(secret, token.encode("utf-8"), hashlib.sha256).hexdigest()
    return digest


def session_expiry(remember_me: bool) -> datetime:
    now = datetime.now(timezone.utc)
    if remember_me:
        return now + timedelta(days=settings.session_remember_days)
    return now + timedelta(hours=settings.session_short_hours)
