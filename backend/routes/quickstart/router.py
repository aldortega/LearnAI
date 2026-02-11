from fastapi import APIRouter

from .router_generation import router as generation_router
from .router_topics import router as topics_router

router = APIRouter(prefix="/notebooks", tags=["quickstart"])
router.include_router(generation_router)
router.include_router(topics_router)
