from fastapi import APIRouter

from .router_generation import router as generation_router
from .router_levels import router as levels_router

router = APIRouter(prefix="/notebooks", tags=["quiz"])
router.include_router(generation_router)
router.include_router(levels_router)
