from fastapi import APIRouter

from .router_audio import router as audio_router
from .router_generation import router as generation_router

router = APIRouter(prefix="/notebooks", tags=["audio"])
router.include_router(generation_router)
router.include_router(audio_router)
