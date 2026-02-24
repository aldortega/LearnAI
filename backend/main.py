from contextlib import asynccontextmanager

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import ensure_indexes
from .qdrant import ensure_qdrant_collection
from .routes.auth import router as auth_router
from .routes.collaboration import router as collaboration_router
from .routes.documents import router as documents_router
from .routes.flashcards import router as flashcards_router
from .routes.mindmap import router as mindmap_router
from .routes.notebooks import router as notebooks_router
from .routes.notifications import router as notifications_router
from .routes.quickstart import router as quickstart_router
from .routes.rag import router as rag_router
from .routes.presentations import router as presentations_router
from .routes.reports import router as reports_router
from .routes.quiz import router as quiz_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    await ensure_qdrant_collection()
    yield


logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth_router)
app.include_router(notebooks_router)
app.include_router(collaboration_router)
app.include_router(notifications_router)
app.include_router(documents_router)
app.include_router(rag_router)
app.include_router(quiz_router)
app.include_router(quickstart_router)
app.include_router(reports_router)
app.include_router(presentations_router)
app.include_router(mindmap_router)
app.include_router(flashcards_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
