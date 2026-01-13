from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import ensure_indexes
from .routes.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(auth_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
