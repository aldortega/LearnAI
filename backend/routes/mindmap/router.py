from fastapi import APIRouter

from .router_generation import router as generation_router
from .router_nodes import router as nodes_router

router = APIRouter(prefix="/notebooks", tags=["mindmap"])
router.include_router(generation_router)
router.include_router(nodes_router)
