from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import ensure_indexes
from .qdrant import ensure_qdrant_collection
from .routes.auth import router as auth_router
from .routes.documents import router as documents_router
from .routes.notebooks import router as notebooks_router
from .routes.rag import router as rag_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    await ensure_qdrant_collection()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(auth_router)
app.include_router(notebooks_router)
app.include_router(documents_router)
app.include_router(rag_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
