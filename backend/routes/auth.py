from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Response, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pymongo.errors import DuplicateKeyError

from ..config import settings
from ..db import db
from ..schemas import (
    AuthResponse,
    CompleteProfileRequest,
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    UserOut,
)
from ..security import (
    create_session_token,
    hash_password,
    hash_session_token,
    session_expiry,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def normalize_email(email: str) -> str:
    return email.strip().lower()


def user_to_out(user: dict) -> UserOut:
    birthdate = user.get("birthdate")
    if isinstance(birthdate, datetime):
        birthdate = birthdate.date()

    username = user.get("username")
    profile_complete = bool(username and birthdate)

    return UserOut(
        id=str(user["_id"]),
        name=user["name"],
        last_name=user["last_name"],
        email=user["email"],
        username=username,
        birthdate=birthdate,
        profile_complete=profile_complete,
    )


def set_session_cookie(response: Response, token: str, remember_me: bool) -> None:
    max_age = None
    if remember_me:
        max_age = settings.session_remember_days * 24 * 60 * 60
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


async def create_session(user_id: ObjectId, request: Request, response: Response, remember_me: bool) -> None:
    token = create_session_token()
    token_hash = hash_session_token(token)
    expires_at = session_expiry(remember_me)

    await db.sessions.insert_one(
        {
            "user_id": user_id,
            "token_hash": token_hash,
            "created_at": datetime.now(timezone.utc),
            "expires_at": expires_at,
            "revoked_at": None,
            "user_agent": request.headers.get("user-agent"),
            "ip": request.client.host if request.client else None,
        }
    )

    set_session_cookie(response, token, remember_me)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No session")

    token_hash = hash_session_token(token)
    now = datetime.now(timezone.utc)
    session = await db.sessions.find_one(
        {
            "token_hash": token_hash,
            "revoked_at": None,
            "expires_at": {"$gt": now},
        }
    )

    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    user = await db.users.find_one({"_id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    return user


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request, response: Response) -> AuthResponse:
    email_normalized = normalize_email(payload.email)
    existing = await db.users.find_one(
        {"$or": [{"email_normalized": email_normalized}, {"username": payload.username}]}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo o username ya existe",
        )

    user_doc = {
        "name": payload.name.strip(),
        "last_name": payload.last_name.strip(),
        "email": email_normalized,
        "email_normalized": email_normalized,
        "username": payload.username.strip(),
        "birthdate": datetime.combine(payload.birthdate, datetime.min.time(), tzinfo=timezone.utc),
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    try:
        result = await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo o username ya existe",
        ) from None

    user_doc["_id"] = result.inserted_id

    await create_session(user_doc["_id"], request, response, remember_me=False)
    return AuthResponse(user=user_to_out(user_doc))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, request: Request, response: Response) -> AuthResponse:
    email_normalized = normalize_email(payload.email)
    user = await db.users.find_one({"email_normalized": email_normalized})

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    await create_session(user["_id"], request, response, remember_me=payload.remember_me)
    return AuthResponse(user=user_to_out(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response) -> None:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        token_hash = hash_session_token(token)
        await db.sessions.update_one(
            {"token_hash": token_hash, "revoked_at": None},
            {"$set": {"revoked_at": datetime.now(timezone.utc)}},
        )

    response.delete_cookie(settings.session_cookie_name, path="/")
    return None


@router.get("/me", response_model=AuthResponse)
async def me(request: Request) -> AuthResponse:
    user = await get_current_user(request)
    return AuthResponse(user=user_to_out(user))


@router.post("/google", response_model=AuthResponse)
async def google_login(
    payload: GoogleLoginRequest, request: Request, response: Response
) -> AuthResponse:
    """Authenticate with Google ID token."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login no configurado",
        )

    try:
        idinfo = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Google inválido",
        ) from None

    email = idinfo.get("email", "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email no disponible en token",
        )

    user = await db.users.find_one({"email_normalized": email})

    if user:
        # Existing user - link Google if not already linked
        if not user.get("google_sub"):
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"google_sub": idinfo["sub"], "updated_at": datetime.now(timezone.utc)}},
            )
            user["google_sub"] = idinfo["sub"]
    else:
        # New user from Google
        given_name = idinfo.get("given_name", "")
        family_name = idinfo.get("family_name", "")
        user_doc = {
            "name": given_name,
            "last_name": family_name,
            "email": email,
            "email_normalized": email,
            "username": None,
            "birthdate": None,
            "password_hash": None,
            "google_sub": idinfo["sub"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        user = user_doc

    await create_session(user["_id"], request, response, remember_me=True)
    return AuthResponse(user=user_to_out(user))


@router.post("/complete-profile", response_model=AuthResponse)
async def complete_profile(
    payload: CompleteProfileRequest, request: Request
) -> AuthResponse:
    """Complete profile for Google users who lack username/birthdate."""
    user = await get_current_user(request)

    if user.get("username") and user.get("birthdate"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Perfil ya completo",
        )

    # Check username uniqueness
    existing = await db.users.find_one(
        {"username": payload.username, "_id": {"$ne": user["_id"]}}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El username ya existe",
        )

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "username": payload.username.strip(),
                "birthdate": datetime.combine(
                    payload.birthdate, datetime.min.time(), tzinfo=timezone.utc
                ),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    user["username"] = payload.username.strip()
    user["birthdate"] = datetime.combine(
        payload.birthdate, datetime.min.time(), tzinfo=timezone.utc
    )
    return AuthResponse(user=user_to_out(user))
