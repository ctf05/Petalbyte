# backend/app/dependencies/directories.py
import os
import asyncio
from typing import Dict, Any
from pathlib import Path

from .base import Dependency
from ..config import get_settings

class SnapshotDirectoryDependency(Dependency):
    """Check for snapshot directory existence and permissions"""

    @property
    def display_name(self) -> str:
        return "Snapshot Directory"

    @property
    def description(self) -> str:
        return "Local directory for storing Btrfs snapshots"

    async def check(self) -> Dict[str, Any]:
        """Check if snapshot directory exists and is writable"""
        settings = get_settings()
        snapshot_dir = Path(settings.snapshot_dir)

        if not snapshot_dir.exists():
            return {
                "met": False,
                "message": f"Snapshot directory '{snapshot_dir}' does not exist",
                "can_fix": True
            }

        if not snapshot_dir.is_dir():
            return {
                "met": False,
                "message": f"'{snapshot_dir}' exists but is not a directory",
                "can_fix": False
            }

        # Check if writable
        test_file = snapshot_dir / ".write_test"
        try:
            test_file.touch()
            test_file.unlink()

            # Check if it's a btrfs filesystem
            proc = await asyncio.create_subprocess_exec(
                "stat", "-f", "-c", "%T", str(snapshot_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            fs_type = stdout.decode().strip()

            return {
                "met": True,
                "message": f"Snapshot directory is ready (filesystem: {fs_type})",
                "can_fix": False,
                "metadata": {
                    "path": str(snapshot_dir),
                    "filesystem": fs_type,
                    "is_btrfs": fs_type == "btrfs"
                }
            }
        except Exception as e:
            return {
                "met": False,
                "message": f"Snapshot directory is not writable: {str(e)}",
                "can_fix": True
            }

    async def fix(self) -> Dict[str, Any]:
        """Create snapshot directory"""
        settings = get_settings()
        snapshot_dir = Path(settings.snapshot_dir)

        try:
            snapshot_dir.mkdir(parents=True, exist_ok=True)

            # Set permissions
            os.chmod(snapshot_dir, 0o755)

            return {
                "success": True,
                "message": f"Created snapshot directory: {snapshot_dir}"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to create directory: {str(e)}"
            }

class DataDirectoryDependency(Dependency):
    """Check for data directory for settings and database"""

    @property
    def display_name(self) -> str:
        return "Data Directory"

    @property
    def description(self) -> str:
        return "Application data directory for settings and database"

    async def check(self) -> Dict[str, Any]:
        """Check if data directory exists and is writable"""
        data_dir = Path("/app/data")

        if not data_dir.exists():
            return {
                "met": False,
                "message": "Data directory does not exist",
                "can_fix": True
            }

        # Check if writable
        test_file = data_dir / ".write_test"
        try:
            test_file.touch()
            test_file.unlink()

            # Check for important files
            settings_exists = (data_dir / "settings.json").exists()
            db_exists = (data_dir / "backup_manager.db").exists()

            return {
                "met": True,
                "message": "Data directory is ready",
                "can_fix": False,
                "metadata": {
                    "path": str(data_dir),
                    "settings_exists": settings_exists,
                    "database_exists": db_exists
                }
            }
        except Exception as e:
            return {
                "met": False,
                "message": f"Data directory is not writable: {str(e)}",
                "can_fix": True
            }

    async def fix(self) -> Dict[str, Any]:
        """Create data directory"""
        data_dir = Path("/app/data")

        try:
            data_dir.mkdir(parents=True, exist_ok=True)
            os.chmod(data_dir, 0o755)

            return {
                "success": True,
                "message": "Created data directory"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to create directory: {str(e)}"
            }

class HostMountsDependency(Dependency):
    """Check if host filesystem is properly mounted"""

    @property
    def display_name(self) -> str:
        return "Host Filesystem Mounts"

    @property
    def description(self) -> str:
        return "Access to host filesystem for creating snapshots"

    async def check(self) -> Dict[str, Any]:
        """Check if host mounts are available"""
        settings = get_settings()

        issues = []
        mounts = {
            "root": settings.host_root,
            "home": settings.host_home
        }

        for name, path in mounts.items():
            if not os.path.exists(path):
                issues.append(f"{name} mount missing: {path}")
            elif not os.path.isdir(path):
                issues.append(f"{name} mount is not a directory: {path}")
            elif name == "root" and not os.path.exists(f"{path}/etc"):
                issues.append(f"{name} mount doesn't look like a root filesystem")

        if issues:
            return {
                "met": False,
                "message": "Host filesystem not properly mounted: " + "; ".join(issues),
                "can_fix": False,
                "metadata": {"issues": issues}
            }

        return {
            "met": True,
            "message": "Host filesystem mounts are ready",
            "can_fix": False,
            "metadata": {
                "host_root": settings.host_root,
                "host_home": settings.host_home
            }
        }

    async def fix(self) -> Dict[str, Any]:
        """Cannot fix mount issues from within container"""
        return {
            "success": False,
            "message": "Host mounts must be configured in docker-compose.yml"
        }