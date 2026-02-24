from fastapi import APIRouter

from .router_generation import router as generation_router
from .router_presentations import router as presentations_router

router = APIRouter(prefix="/notebooks", tags=["presentations"])
router.include_router(generation_router)
router.include_router(presentations_router)
