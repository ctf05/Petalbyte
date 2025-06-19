# backend/app/api/backup.py
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from ..database import get_db, BackupHistory
from ..models import (
    BackupRequest, BackupResult, BackupProgress,
    BackupHistoryItem, BackupStatus, BackupType
)
from ..config import get_settings
from ..core.backup_engine import BackupEngine

router = APIRouter()

# Global backup engine instance
backup_engine: Optional[BackupEngine] = None

def get_backup_engine() -> BackupEngine:
    global backup_engine
    if backup_engine is None:
        settings = get_settings()
        backup_engine = BackupEngine(settings)
    return backup_engine

@router.post("/start", response_model=BackupResult)
async def start_backup(
        request: BackupRequest,
        background_tasks: BackgroundTasks
):
    """Start a new backup operation"""
    engine = get_backup_engine()

    # Check if backup is already running
    if engine.current_backup is not None:
        raise HTTPException(
            status_code=409,
            detail="A backup is already in progress"
        )

    # Start backup in background
    async def run_backup():
        await engine.perform_backup(
            backup_type=request.backup_type,
            force_full=request.force_full
        )

    background_tasks.add_task(run_backup)

    # Return initial status
    return BackupResult(
        backup_id=0,
        status=BackupStatus.PENDING,
        backup_type=request.backup_type or BackupType.INCREMENTAL,
        start_time=datetime.utcnow()
    )

@router.get("/status", response_model=Optional[BackupProgress])
async def get_backup_status():
    """Get current backup progress"""
    engine = get_backup_engine()
    return engine.current_backup

@router.delete("/cancel")
async def cancel_backup():
    """Cancel the running backup"""
    engine = get_backup_engine()

    if engine.current_backup is None:
        raise HTTPException(
            status_code=404,
            detail="No backup is currently running"
        )

    await engine.cancel_backup()

    return {"message": "Backup cancellation requested"}

@router.get("/history", response_model=List[BackupHistoryItem])
async def get_backup_history(
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
        db: AsyncSession = Depends(get_db)
):
    """Get backup history"""
    query = select(BackupHistory).order_by(BackupHistory.timestamp.desc())

    if status:
        query = query.where(BackupHistory.status == status)

    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    backups = result.scalars().all()

    return [BackupHistoryItem.from_orm(backup) for backup in backups]

@router.get("/history/{backup_id}", response_model=BackupHistoryItem)
async def get_backup_details(
        backup_id: int,
        db: AsyncSession = Depends(get_db)
):
    """Get details of a specific backup"""
    query = select(BackupHistory).where(BackupHistory.id == backup_id)
    result = await db.execute(query)
    backup = result.scalar_one_or_none()

    if not backup:
        raise HTTPException(
            status_code=404,
            detail=f"Backup {backup_id} not found"
        )

    return BackupHistoryItem.from_orm(backup)

@router.get("/browse")
async def browse_backups(
        month: Optional[str] = None
):
    """Browse available backups on Unraid"""
    settings = get_settings()
    engine = get_backup_engine()

    try:
        # Get Unraid host
        unraid_host = await engine._get_unraid_host()

        # Base path
        base_path = f"{settings.unraid_base_path}/{settings.client_name}"

        if month:
            # List specific month
            month_path = f"{base_path}/{month}"

            # Get full backups
            full_result = await engine.ssh_manager.execute_command(
                unraid_host,
                f"ls -la '{month_path}/full' 2>/dev/null || echo 'EMPTY'"
            )

            # Get incremental backups
            inc_result = await engine.ssh_manager.execute_command(
                unraid_host,
                f"ls -la '{month_path}/incremental' 2>/dev/null || echo 'EMPTY'"
            )

            return {
                "month": month,
                "full_backups": _parse_ls_output(full_result.get("stdout", "")),
                "incremental_backups": _parse_ls_output(inc_result.get("stdout", ""))
            }
        else:
            # List all months
            result = await engine.ssh_manager.execute_command(
                unraid_host,
                f"ls -1 '{base_path}' | grep -E '^[0-9]{{6}}$' | sort -r"
            )

            if result["success"]:
                months = result["stdout"].strip().split("\n")
                return {
                    "months": [m for m in months if m]
                }
            else:
                return {"months": []}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to browse backups: {str(e)}"
        )

def _parse_ls_output(output: str) -> List[dict]:
    """Parse ls -la output into structured data"""
    if not output or "EMPTY" in output:
        return []

    files = []
    for line in output.strip().split("\n"):
        if line.startswith("total") or not line:
            continue

        parts = line.split(None, 8)
        if len(parts) >= 9 and parts[8].endswith(".btrfs.gpg"):
            files.append({
                "name": parts[8],
                "size": int(parts[4]),
                "modified": " ".join(parts[5:8]),
                "permissions": parts[0]
            })

    return files