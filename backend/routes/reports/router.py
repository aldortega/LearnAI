from fastapi import APIRouter

from .router_generation import router as generation_router
from .router_reports import router as reports_router

router = APIRouter(prefix="/notebooks", tags=["reports"])
router.include_router(generation_router)
router.include_router(reports_router)
