from fastapi import APIRouter

from .router_generation import router as generation_router

router = APIRouter(prefix="/notebooks", tags=["flashcards"])
router.include_router(generation_router)
