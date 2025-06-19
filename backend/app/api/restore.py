# backend/app/api/restore.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List

from ..models import RestoreRequest, BackupType
from ..config import get_settings
from ..core.restore_engine import RestoreEngine

router = APIRouter()

# Global restore engine instance
restore_engine: Optional[RestoreEngine] = None

def get_restore_engine() -> RestoreEngine:
    global restore_engine
    if restore_engine is None:
        settings = get_settings()
        restore_engine = RestoreEngine(settings)
    return restore_engine

@router.post("/start")
async def start_restore(
        request: RestoreRequest,
        background_tasks: BackgroundTasks
):
    """Start a restore operation"""
    engine = get_restore_engine()

    # Validate request
    if not request.subvolumes:
        raise HTTPException(
            status_code=400,
            detail="No subvolumes selected for restore"
        )

    # Check if restore is already running
    if engine.is_running:
        raise HTTPException(
            status_code=409,
            detail="A restore operation is already in progress"
        )

    # Start restore in background
    async def run_restore():
        await engine.perform_restore(
            backup_date=request.backup_date,
            backup_type=request.backup_type,
            subvolumes=request.subvolumes,
            target_path=request.target_path,
            verify_only=request.verify_only
        )

    background_tasks.add_task(run_restore)

    return {
        "message": "Restore operation started",
        "backup_date": request.backup_date,
        "subvolumes": request.subvolumes
    }

@router.get("/status")
async def get_restore_status():
    """Get current restore operation status"""
    engine = get_restore_engine()

    if not engine.is_running:
        return {
            "running": False,
            "message": "No restore operation in progress"
        }

    return engine.get_status()

@router.post("/verify")
async def verify_backup(backup_date: str, backup_type: BackupType):
    """Verify backup integrity without restoring"""
    engine = get_restore_engine()
    settings = get_settings()

    try:
        # Get backup files
        month = backup_date[:6]
        backup_dir = "full" if backup_type == BackupType.FULL else "incremental"
        remote_path = f"{settings.unraid_base_path}/{settings.client_name}/{month}/{backup_dir}"

        # Get Unraid host
        unraid_host = await engine._get_unraid_host()

        # List backup files
        result = await engine.ssh_manager.execute_command(
            unraid_host,
            f"ls -1 '{remote_path}' | grep '{backup_date}' | grep '.btrfs.gpg$'"
        )

        if not result["success"]:
            raise HTTPException(
                status_code=404,
                detail=f"No backups found for date {backup_date}"
            )

        files = result["stdout"].strip().split("\n")
        files = [f for f in files if f]

        # Verify each file
        verification_results = []
        for file in files:
            file_path = f"{remote_path}/{file}"
            verify_result = await engine.verification.verify_backup_integrity(
                unraid_host, file_path
            )

            verification_results.append({
                "file": file,
                "valid": verify_result["valid"],
                "size": verify_result.get("size", 0),
                "error": verify_result.get("error")
            })

        all_valid = all(r["valid"] for r in verification_results)

        return {
            "backup_date": backup_date,
            "backup_type": backup_type,
            "all_valid": all_valid,
            "files": verification_results
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(e)}"
        )

@router.get("/available-dates")
async def get_available_restore_dates():
    """Get list of dates with available backups"""
    engine = get_restore_engine()
    settings = get_settings()

    try:
        # Get Unraid host
        unraid_host = await engine._get_unraid_host()
        base_path = f"{settings.unraid_base_path}/{settings.client_name}"

        # Get all months
        months_result = await engine.ssh_manager.execute_command(
            unraid_host,
            f"ls -1 '{base_path}' | grep -E '^[0-9]{{6}}$' | sort -r"
        )

        if not months_result["success"]:
            return {"dates": []}

        months = months_result["stdout"].strip().split("\n")
        months = [m for m in months if m]

        available_dates = []

        for month in months:
            # Check full backups
            full_result = await engine.ssh_manager.execute_command(
                unraid_host,
                f"ls -1 '{base_path}/{month}/full' 2>/dev/null | "
                f"grep -oE '[0-9]{{8}}' | sort -u"
            )

            if full_result["success"]:
                dates = full_result["stdout"].strip().split("\n")
                for date in dates:
                    if date:
                        available_dates.append({
                            "date": date,
                            "month": month,
                            "has_full": True
                        })

            # Check incremental backups
            inc_result = await engine.ssh_manager.execute_command(
                unraid_host,
                f"ls -1 '{base_path}/{month}/incremental' 2>/dev/null | "
                f"grep -oE '[0-9]{{8}}' | sort -u"
            )

            if inc_result["success"]:
                dates = inc_result["stdout"].strip().split("\n")
                for date in dates:
                    if date:
                        # Check if already in list
                        existing = next(
                            (d for d in available_dates if d["date"] == date),
                            None
                        )
                        if existing:
                            existing["has_incremental"] = True
                        else:
                            available_dates.append({
                                "date": date,
                                "month": month,
                                "has_full": False,
                                "has_incremental": True
                            })

        # Sort by date descending
        available_dates.sort(key=lambda x: x["date"], reverse=True)

        return {"dates": available_dates}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get available dates: {str(e)}"
        )