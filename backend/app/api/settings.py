# backend/app/api/settings.py
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional

from ..config import get_settings, reload_settings, Settings
from ..models import SettingsUpdate
from ..core.scheduler import BackupScheduler

router = APIRouter()

# Global scheduler instance
scheduler: Optional[BackupScheduler] = None

def set_scheduler(sched: BackupScheduler):
    global scheduler
    scheduler = sched

@router.get("")
async def get_current_settings():
    """Get current Petalbyte settings"""
    settings = get_settings()

    # Convert to dict and exclude sensitive fields
    settings_dict = settings.dict(exclude={"secret_key"})

    return settings_dict

@router.put("")
async def update_settings(update: SettingsUpdate):
    """Update Petalbyte settings"""
    settings = get_settings()

    # Update only provided fields
    update_data = update.dict(exclude_unset=True)

    for field, value in update_data.items():
        if hasattr(settings, field):
            setattr(settings, field, value)

    # Save to file
    try:
        settings.save()

        # Reload settings
        new_settings = reload_settings()

        # Reload scheduler if schedule settings changed
        if scheduler and any(
                field in update_data
                for field in ["backup_schedule_enabled", "backup_schedule_time", "backup_schedule_days"]
        ):
            await scheduler.reload_schedule()

        return {
            "message": "Settings updated successfully",
            "settings": new_settings.dict(exclude={"secret_key"})
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save settings: {str(e)}"
        )

@router.post("/validate")
async def validate_settings(settings_data: Dict[str, Any]):
    """Validate settings without saving"""
    try:
        # Try to create Settings object with provided data
        test_settings = Settings(**settings_data)

        # Additional validation checks
        validation_results = {
            "valid": True,
            "errors": []
        }

        # Check Unraid connectivity if provided
        if "unraid_tailscale_name" in settings_data:
            # TODO: Test connectivity
            pass

        # Check paths
        if "snapshot_dir" in settings_data:
            import os
            if not os.path.exists(settings_data["snapshot_dir"]):
                validation_results["errors"].append(
                    f"Snapshot directory does not exist: {settings_data['snapshot_dir']}"
                )

        if validation_results["errors"]:
            validation_results["valid"] = False

        return validation_results

    except Exception as e:
        return {
            "valid": False,
            "errors": [str(e)]
        }

@router.post("/reset")
async def reset_settings():
    """Reset settings to defaults"""
    try:
        # Create new default settings
        default_settings = Settings()
        default_settings.save()

        # Reload
        reload_settings()

        # Reload scheduler
        if scheduler:
            await scheduler.reload_schedule()

        return {
            "message": "Settings reset to defaults",
            "settings": default_settings.dict(exclude={"secret_key"})
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset settings: {str(e)}"
        )