# backend/app/core/cleanup.py
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging

from ..config import Settings
from .ssh_manager import SSHManager
from ..database import async_session, SentSnapshot

logger = logging.getLogger(__name__)

class CleanupManager:
    """Manages cleanup of old backups and failed uploads"""

    def __init__(self, settings: Settings, ssh_manager: SSHManager):
        self.settings = settings
        self.ssh_manager = ssh_manager

    async def cleanup_failed_uploads(self) -> Dict[str, Any]:
        """Clean up failed upload files on Unraid"""
        logger.info("Cleaning up failed uploads on Unraid")

        try:
            # Get list of all files on Unraid
            unraid_host = await self._get_unraid_host()
            base_path = f"{self.settings.unraid_base_path}/{self.settings.client_name}"

            # Find all backup files
            find_result = await self.ssh_manager.execute_command(
                unraid_host,
                f"find '{base_path}' -name '*.btrfs.gpg' -type f 2>/dev/null || true"
            )

            if not find_result["success"]:
                return {
                    "success": False,
                    "error": "Failed to list remote files"
                }

            remote_files = find_result["stdout"].strip().split("\n")
            remote_files = [f for f in remote_files if f]  # Remove empty strings

            # Get list of successfully sent files from database
            async with async_session() as session:
                result = await session.execute(
                    "SELECT remote_path FROM sent_snapshots"
                )
                sent_files = {row[0] for row in result.fetchall()}

            # Find files that are not in our sent database
            orphaned_files = []
            for remote_file in remote_files:
                if remote_file not in sent_files:
                    orphaned_files.append(remote_file)

            # Delete orphaned files
            deleted_count = 0
            for orphan in orphaned_files:
                # Check file age (don't delete very recent files)
                age_result = await self.ssh_manager.execute_command(
                    unraid_host,
                    f"stat -c %Y '{orphan}'"
                )

                if age_result["success"]:
                    try:
                        file_time = int(age_result["stdout"].strip())
                        file_age_hours = (datetime.now().timestamp() - file_time) / 3600

                        # Only delete if older than 1 hour
                        if file_age_hours > 1:
                            delete_result = await self.ssh_manager.delete_remote_file(
                                unraid_host, orphan
                            )
                            if delete_result["success"]:
                                logger.info(f"Deleted orphaned file: {orphan}")
                                deleted_count += 1
                    except:
                        pass

            return {
                "success": True,
                "orphaned_files": len(orphaned_files),
                "deleted_files": deleted_count
            }

        except Exception as e:
            logger.error(f"Failed to cleanup failed uploads: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def cleanup_old_monthly_backups(self) -> Dict[str, Any]:
        """Clean up monthly backups older than retention period"""
        logger.info(f"Cleaning up monthly backups, keeping last {self.settings.months_to_keep} months")

        try:
            unraid_host = await self._get_unraid_host()
            base_path = f"{self.settings.unraid_base_path}/{self.settings.client_name}"

            # List all month directories
            list_result = await self.ssh_manager.execute_command(
                unraid_host,
                f"ls -1 '{base_path}' | grep -E '^[0-9]{{6}}$' | sort -r || true"
            )

            if not list_result["success"]:
                return {
                    "success": False,
                    "error": "Failed to list month directories"
                }

            months = list_result["stdout"].strip().split("\n")
            months = [m for m in months if m]  # Remove empty strings

            # Delete months beyond retention
            deleted_months = []
            if len(months) > self.settings.months_to_keep:
                for month in months[self.settings.months_to_keep:]:
                    month_path = f"{base_path}/{month}"

                    # Remove from database first
                    async with async_session() as session:
                        await session.execute(
                            "DELETE FROM sent_snapshots WHERE remote_path LIKE ?",
                            (f"{month_path}%",)
                        )
                        await session.commit()

                    # Delete directory
                    delete_result = await self.ssh_manager.execute_command(
                        unraid_host,
                        f"rm -rf '{month_path}'"
                    )

                    if delete_result["success"]:
                        logger.info(f"Deleted old monthly backup: {month}")
                        deleted_months.append(month)

            return {
                "success": True,
                "total_months": len(months),
                "deleted_months": deleted_months
            }

        except Exception as e:
            logger.error(f"Failed to cleanup monthly backups: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def cleanup_old_incremental_backups(self) -> Dict[str, Any]:
        """Clean up incremental backups older than retention period"""
        logger.info(f"Cleaning up incremental backups older than {self.settings.daily_incremental_days} days")

        try:
            unraid_host = await self._get_unraid_host()
            current_month = datetime.now().strftime("%Y%m")
            incremental_path = f"{self.settings.unraid_base_path}/{self.settings.client_name}/{current_month}/incremental"

            # Delete old incremental files
            delete_result = await self.ssh_manager.execute_command(
                unraid_host,
                f"find '{incremental_path}' -name '*.btrfs.gpg' -mtime +{self.settings.daily_incremental_days} -delete 2>/dev/null || true"
            )

            # Clean up database entries
            cutoff_date = datetime.now() - timedelta(days=self.settings.daily_incremental_days)

            async with async_session() as session:
                await session.execute(
                    """DELETE FROM sent_snapshots 
                       WHERE backup_type = 'incremental' 
                       AND sent_at < ?""",
                    (cutoff_date,)
                )
                await session.commit()

            return {
                "success": delete_result["success"],
                "message": "Cleaned up old incremental backups"
            }

        except Exception as e:
            logger.error(f"Failed to cleanup incremental backups: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def cleanup_local_snapshots(self) -> Dict[str, Any]:
        """Clean up local snapshots older than retention period"""
        from .snapshot import SnapshotManager

        snapshot_manager = SnapshotManager(self.settings)
        deleted_count = await snapshot_manager.cleanup_old_snapshots(
            self.settings.local_snapshot_days
        )

        return {
            "success": True,
            "deleted_snapshots": deleted_count
        }

    async def _get_unraid_host(self) -> str:
        """Get Unraid host IP"""
        if not self.settings.use_tailscale:
            return self.settings.unraid_tailscale_name

        # Get from Tailscale
        proc = await asyncio.create_subprocess_exec(
            "tailscale", "status", "--json",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()

        if proc.returncode == 0:
            import json
            status = json.loads(stdout.decode())
            peers = status.get("Peer", {})

            for peer_id, peer_info in peers.items():
                if peer_info.get("HostName", "").lower() == self.settings.unraid_tailscale_name.lower():
                    return peer_info.get("TailscaleIPs", [self.settings.unraid_tailscale_name])[0]

        return self.settings.unraid_tailscale_name