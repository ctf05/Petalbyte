# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from .api import router as api_router
from .api.websocket import router as websocket_router
from .database import init_db
from .config import get_settings
from .core.scheduler import BackupScheduler
from .utils.logging import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = BackupScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    logger.info("Starting Btrfs Backup Manager...")

    # Initialize database
    await init_db()

    # Load settings
    settings = get_settings()

    # Start scheduler
    await scheduler.start()

    yield

    # Cleanup
    logger.info("Shutting down...")
    await scheduler.stop()

# Create FastAPI app
app = FastAPI(
    title="Btrfs Backup Manager",
    description="Web-based backup management system for Btrfs snapshots to Unraid",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")
app.include_router(websocket_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# Serve static files in production
if os.path.exists("/app/frontend/dist"):
    app.mount("/", StaticFiles(directory="/app/frontend/dist", html=True), name="static")