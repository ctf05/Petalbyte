# backend/app/api/status.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import psutil
from datetime import datetime

from ..database import get_db, BackupHistory
from ..models import SystemStatus, BackupStatus, BackupType
from ..dependencies import get_all_dependencies
from ..core.scheduler import BackupScheduler
from ..config import get_settings

router = APIRouter()

# Global scheduler instance (shared with main.py)
scheduler: BackupScheduler = None

def set_scheduler(sched: BackupScheduler):
    global scheduler
    scheduler = sched

@router.get("", response_model=SystemStatus)
async def get_system_status(db: AsyncSession = Depends(get_db)):
    """Get overall system status for Petalbyte"""
    settings = get_settings()

    # Check if backup is currently running
    backup_running = False  # TODO: Get from backup engine

    # Get last backup
    last_backup_query = select(BackupHistory).order_by(BackupHistory.timestamp.desc()).limit(1)
    result = await db.execute(last_backup_query)
    last_backup_row = result.scalar_one_or_none()

    last_backup = None
    if last_backup_row:
        last_backup = {
            "backup_id": last_backup_row.id,
            "status": last_backup_row.status,
            "backup_type": last_backup_row.backup_type,
            "start_time": last_backup_row.timestamp,
            "duration_seconds": last_backup_row.duration_seconds,
            "size_bytes": last_backup_row.size_bytes,
            "error_message": last_backup_row.error_message
        }

    # Get next scheduled backup
    next_scheduled = None
    if scheduler:
        next_run = scheduler.get_next_run_time()
        if next_run:
            next_scheduled = next_run

    # Check dependencies
    dependencies = []
    all_deps_ok = True

    for dep in get_all_dependencies():
        info = await dep.get_info()
        dependencies.append(info)
        if info.status != "ok":
            all_deps_ok = False

    # Get disk space info
    snapshot_path = settings.snapshot_dir
    try:
        stat = psutil.disk_usage(snapshot_path)
        disk_space = {
            "total": stat.total,
            "used": stat.used,
            "free": stat.free,
            "percent": stat.percent
        }
    except:
        disk_space = {
            "total": 0,
            "used": 0,
            "free": 0,
            "percent": 0
        }

    # Get system metrics
    system_metrics = {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": psutil.virtual_memory().percent,
        "load_average": psutil.getloadavg(),
        "uptime": datetime.now().timestamp() - psutil.boot_time()
    }

    # Determine overall status
    if not all_deps_ok:
        status = "error"
    elif backup_running:
        status = "busy"
    elif last_backup and last_backup["status"] == "failed":
        status = "degraded"
    else:
        status = "healthy"

    return SystemStatus(
        status=status,
        backup_running=backup_running,
        last_backup=last_backup,
        next_scheduled=next_scheduled,
        dependencies=dependencies,
        disk_space=disk_space,
        system_metrics=system_metrics
    )

@router.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "ok",
        "service": "Petalbyte Backup Manager",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/version")
async def get_version():
    """Get application version information"""
    return {
        "name": "Petalbyte",
        "version": "1.0.0",
        "description": "Btrfs Backup Manager for Unraid",
        "api_version": "v1"
    }