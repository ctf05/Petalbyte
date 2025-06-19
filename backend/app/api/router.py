# backend/app/api/router.py
from fastapi import APIRouter
from .backup import router as backup_router
from .status import router as status_router
from .settings import router as settings_router
from .restore import router as restore_router
from .monitoring import router as monitoring_router
from .dependencies import router as dependencies_router
from .setup import router as setup_router

# Create main API router
router = APIRouter()

# Include sub-routers
router.include_router(status_router, prefix="/status", tags=["status"])
router.include_router(backup_router, prefix="/backup", tags=["backup"])
router.include_router(settings_router, prefix="/settings", tags=["settings"])
router.include_router(restore_router, prefix="/restore", tags=["restore"])
router.include_router(monitoring_router, prefix="/monitoring", tags=["monitoring"])
router.include_router(dependencies_router, prefix="/dependencies", tags=["dependencies"])
router.include_router(setup_router, prefix="/setup", tags=["setup"])