from fastapi import APIRouter

from .router_explain import router as explain_router
from .router_generation import router as generation_router

router = APIRouter(prefix="/notebooks", tags=["flashcards"])
router.include_router(generation_router)
router.include_router(explain_router)
