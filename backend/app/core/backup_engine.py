# backend/app/core/backup_engine.py
import asyncio
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

from ..config import Settings
from ..models import BackupType, BackupStatus, BackupResult, BackupProgress
from ..database import async_session, BackupHistory, SentSnapshot
from .ssh_manager import SSHManager
from .snapshot import SnapshotManager
from .encryption import EncryptionManager
from .verification import VerificationManager
from .cleanup import CleanupManager

logger = logging.getLogger(__name__)

class BackupEngine:
    """Main backup orchestration engine"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.ssh_manager = SSHManager(settings)
        self.snapshot_manager = SnapshotManager(settings)
        self.encryption_manager = EncryptionManager(settings)
        self.verification = VerificationManager(settings, self.ssh_manager)
        self.cleanup_manager = CleanupManager(settings, self.ssh_manager)

        self.current_backup: Optional[BackupProgress] = None
        self.cancel_requested = False
        self.progress_callbacks = []

    def add_progress_callback(self, callback):
        """Add a callback for progress updates"""
        self.progress_callbacks.append(callback)

    def remove_progress_callback(self, callback):
        """Remove a progress callback"""
        if callback in self.progress_callbacks:
            self.progress_callbacks.remove(callback)

    async def _update_progress(self, step: str, step_num: int, total_steps: int,
                               percentage: float, **kwargs):
        """Update progress and notify callbacks"""
        self.current_backup = BackupProgress(
            current_step=step,
            total_steps=total_steps,
            current_step_num=step_num,
            percentage=percentage,
            **kwargs
        )

        for callback in self.progress_callbacks:
            await callback(self.current_backup)

    async def perform_backup(self, backup_type: Optional[BackupType] = None,
                             force_full: bool = False) -> BackupResult:
        """Perform a complete backup operation"""
        start_time = datetime.utcnow()
        self.cancel_requested = False

        # Initialize result
        result = BackupResult(
            backup_id=0,  # Will be set after DB insert
            status=BackupStatus.RUNNING,
            backup_type=BackupType.FULL,
            start_time=start_time
        )

        try:
            # Step 1: Pre-backup cleanup of failed uploads
            await self._update_progress("Cleaning up failed uploads", 1, 7, 10)
            await self.cleanup_manager.cleanup_failed_uploads()

            if self.cancel_requested:
                raise Exception("Backup cancelled by user")

            # Step 2: Determine backup type
            await self._update_progress("Determining backup type", 2, 7, 20)
            if backup_type is None:
                backup_type = await self._determine_backup_type(force_full)
            result.backup_type = backup_type

            # Step 3: Create snapshots
            await self._update_progress("Creating snapshots", 3, 7, 30)
            snapshots = await self.snapshot_manager.create_snapshots()

            if self.cancel_requested:
                raise Exception("Backup cancelled by user")

            # Step 4: Get Unraid connection info
            await self._update_progress("Connecting to Unraid", 4, 7, 40)
            unraid_host = await self._get_unraid_host()

            # Step 5: Backup each snapshot
            total_size = 0
            subvolume_results = {}

            for i, snapshot in enumerate(snapshots):
                if self.cancel_requested:
                    raise Exception("Backup cancelled by user")

                progress = 50 + (i * 30 / len(snapshots))
                await self._update_progress(
                    f"Backing up {snapshot.subvolume}", 5, 7, progress,
                    current_file=snapshot.subvolume
                )

                # Perform individual backup
                backup_result = await self._backup_snapshot(
                    snapshot, backup_type, unraid_host
                )

                subvolume_results[snapshot.subvolume] = backup_result
                if backup_result["success"]:
                    total_size += backup_result.get("size", 0)
                else:
                    result.status = BackupStatus.PARTIAL

            # Step 6: Verify backups
            await self._update_progress("Verifying backups", 6, 7, 85)
            verification_results = await self.verification.verify_backups(
                list(subvolume_results.values())
            )

            # Step 7: Cleanup old backups
            await self._update_progress("Cleaning up old backups", 7, 7, 95)
            if backup_type == BackupType.FULL and datetime.now().day == 1:
                await self.cleanup_manager.cleanup_old_monthly_backups()
            await self.cleanup_manager.cleanup_old_incremental_backups()
            await self.cleanup_manager.cleanup_local_snapshots()

            # Finalize result
            result.end_time = datetime.utcnow()
            result.duration_seconds = int((result.end_time - result.start_time).total_seconds())
            result.size_bytes = total_size
            result.subvolumes = subvolume_results

            # Determine final status
            if all(r["success"] for r in subvolume_results.values()):
                result.status = BackupStatus.SUCCESS
            elif any(r["success"] for r in subvolume_results.values()):
                result.status = BackupStatus.PARTIAL
            else:
                result.status = BackupStatus.FAILED

            await self._update_progress("Backup complete", 7, 7, 100)

        except Exception as e:
            logger.error(f"Backup failed: {e}")
            result.status = BackupStatus.FAILED
            result.error_message = str(e)
            result.end_time = datetime.utcnow()
            result.duration_seconds = int((result.end_time - result.start_time).total_seconds())

        finally:
            # Save to database
            await self._save_backup_history(result)
            self.current_backup = None

        return result

    async def _determine_backup_type(self, force_full: bool) -> BackupType:
        """Determine whether to do full or incremental backup"""
        if force_full or datetime.now().day == 1:
            return BackupType.FULL

        # Check if we have any successful sent snapshots
        async with async_session() as session:
            result = await session.execute(
                "SELECT COUNT(*) FROM sent_snapshots"
            )
            count = result.scalar()

        return BackupType.INCREMENTAL if count > 0 else BackupType.FULL

    async def _get_unraid_host(self) -> str:
        """Get Unraid host IP from Tailscale"""
        if not self.settings.use_tailscale:
            return self.settings.unraid_tailscale_name

        proc = await asyncio.create_subprocess_exec(
            "tailscale", "status", "--json",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()

        if proc.returncode == 0:
            status = json.loads(stdout.decode())
            peers = status.get("Peer", {})

            for peer_id, peer_info in peers.items():
                if peer_info.get("HostName", "").lower() == self.settings.unraid_tailscale_name.lower():
                    return peer_info.get("TailscaleIPs", [self.settings.unraid_tailscale_name])[0]

        return self.settings.unraid_tailscale_name

    async def _backup_snapshot(self, snapshot, backup_type: BackupType,
                               unraid_host: str) -> Dict[str, Any]:
        """Backup a single snapshot"""
        try:
            # Determine if we need full or incremental
            if backup_type == BackupType.FULL:
                return await self._perform_full_backup(snapshot, unraid_host)
            else:
                # Check for parent snapshot
                parent = await self.snapshot_manager.find_parent_snapshot(snapshot.subvolume)
                if parent and await self._is_snapshot_sent(parent):
                    return await self._perform_incremental_backup(
                        snapshot, parent, unraid_host
                    )
                else:
                    logger.info(f"No sent parent found for {snapshot.subvolume}, doing full backup")
                    return await self._perform_full_backup(snapshot, unraid_host)

        except Exception as e:
            logger.error(f"Backup failed for {snapshot.subvolume}: {e}")
            return {
                "success": False,
                "error": str(e),
                "snapshot": snapshot.path,
                "subvolume": snapshot.subvolume
            }

    async def _perform_full_backup(self, snapshot, unraid_host: str) -> Dict[str, Any]:
        """Perform a full backup of a snapshot"""
        # Generate paths
        date_str = datetime.now().strftime("%Y%m%d")
        month_str = datetime.now().strftime("%Y%m")
        remote_dir = f"{self.settings.unraid_base_path}/{self.settings.client_name}/{month_str}/full"
        remote_file = f"{remote_dir}/{snapshot.subvolume}_{date_str}_full.btrfs.gpg"

        # Create remote directory
        await self.ssh_manager.create_remote_directory(unraid_host, remote_dir)

        # Send snapshot
        result = await self._send_snapshot(snapshot.path, remote_file, unraid_host)

        if result["success"]:
            # Record as sent
            await self._record_sent_snapshot(
                snapshot.path, remote_file, result["size"],
                BackupType.FULL, None
            )

        return {
            **result,
            "backup_type": "full",
            "remote_path": remote_file,
            "subvolume": snapshot.subvolume
        }

    async def _perform_incremental_backup(self, snapshot, parent_snapshot,
                                          unraid_host: str) -> Dict[str, Any]:
        """Perform an incremental backup"""
        # Generate paths
        date_str = datetime.now().strftime("%Y%m%d")
        month_str = datetime.now().strftime("%Y%m")
        remote_dir = f"{self.settings.unraid_base_path}/{self.settings.client_name}/{month_str}/incremental"
        remote_file = f"{remote_dir}/{snapshot.subvolume}_{date_str}_incremental.btrfs.gpg"

        # Create remote directory
        await self.ssh_manager.create_remote_directory(unraid_host, remote_dir)

        # Send incremental
        result = await self._send_incremental_snapshot(
            snapshot.path, parent_snapshot, remote_file, unraid_host
        )

        if result["success"]:
            # Record as sent
            await self._record_sent_snapshot(
                snapshot.path, remote_file, result["size"],
                BackupType.INCREMENTAL, parent_snapshot
            )

        return {
            **result,
            "backup_type": "incremental",
            "remote_path": remote_file,
            "subvolume": snapshot.subvolume,
            "parent": parent_snapshot
        }

    async def _send_snapshot(self, snapshot_path: str, remote_file: str,
                             unraid_host: str) -> Dict[str, Any]:
        """Send a full snapshot to Unraid"""
        temp_file = f"/tmp/backup_{os.getpid()}.tmp"

        try:
            # Create backup pipeline: btrfs send | gzip | gpg > temp_file
            proc = await asyncio.create_subprocess_shell(
                f"btrfs send '{snapshot_path}' | gzip -c | "
                f"gpg --symmetric --cipher-algo AES256 --batch "
                f"--passphrase-file '{self.settings.encryption_key_path}' > '{temp_file}'",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            _, stderr = await proc.communicate()

            if proc.returncode != 0:
                raise Exception(f"Backup pipeline failed: {stderr.decode()}")

            # Get file size
            file_size = os.path.getsize(temp_file)

            # Transfer to Unraid
            transfer_result = await self._transfer_with_progress(
                temp_file, remote_file, unraid_host
            )

            if transfer_result["success"]:
                # Verify
                verify_result = await self.verification.verify_remote_file(
                    unraid_host, remote_file, file_size
                )

                return {
                    "success": verify_result["matches"],
                    "size": file_size,
                    "verified": verify_result["matches"]
                }
            else:
                return transfer_result

        finally:
            # Cleanup temp file
            if os.path.exists(temp_file):
                os.unlink(temp_file)

    async def _send_incremental_snapshot(self, snapshot_path: str, parent_path: str,
                                         remote_file: str, unraid_host: str) -> Dict[str, Any]:
        """Send an incremental snapshot to Unraid"""
        temp_file = f"/tmp/backup_inc_{os.getpid()}.tmp"

        try:
            # Create incremental backup pipeline
            proc = await asyncio.create_subprocess_shell(
                f"btrfs send -p '{parent_path}' '{snapshot_path}' | gzip -c | "
                f"gpg --symmetric --cipher-algo AES256 --batch "
                f"--passphrase-file '{self.settings.encryption_key_path}' > '{temp_file}'",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            _, stderr = await proc.communicate()

            if proc.returncode != 0:
                raise Exception(f"Incremental backup pipeline failed: {stderr.decode()}")

            # Get file size
            file_size = os.path.getsize(temp_file)

            # Transfer to Unraid
            transfer_result = await self._transfer_with_progress(
                temp_file, remote_file, unraid_host
            )

            if transfer_result["success"]:
                # Verify
                verify_result = await self.verification.verify_remote_file(
                    unraid_host, remote_file, file_size
                )

                return {
                    "success": verify_result["matches"],
                    "size": file_size,
                    "verified": verify_result["matches"]
                }
            else:
                return transfer_result

        finally:
            # Cleanup temp file
            if os.path.exists(temp_file):
                os.unlink(temp_file)

    async def _transfer_with_progress(self, local_file: str, remote_file: str,
                                      unraid_host: str) -> Dict[str, Any]:
        """Transfer file with progress updates"""
        file_size = os.path.getsize(local_file)

        async def progress_handler(transferred, total):
            percentage = (transferred / total * 100) if total > 0 else 0
            speed_mbps = 0  # Calculate based on time

            await self._update_progress(
                f"Transferring to Unraid",
                5, 7,
                50 + (percentage * 0.3),
                current_file=os.path.basename(remote_file),
                speed_mbps=speed_mbps
            )

        # Use SSH to transfer file
        proc = await asyncio.create_subprocess_shell(
            f"cat '{local_file}' | ssh -i /root/.ssh/unraid_backup "
            f"{self.settings.unraid_user}@{unraid_host} "
            f"'cat > \"{remote_file}\"'",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            return {
                "success": False,
                "error": f"Transfer failed: {stderr.decode()}"
            }

        return {"success": True}

    async def _is_snapshot_sent(self, snapshot_path: str) -> bool:
        """Check if snapshot was successfully sent"""
        async with async_session() as session:
            result = await session.execute(
                "SELECT id FROM sent_snapshots WHERE snapshot_path = ?",
                (snapshot_path,)
            )
            return result.scalar() is not None

    async def _record_sent_snapshot(self, snapshot_path: str, remote_path: str,
                                    size: int, backup_type: BackupType,
                                    parent_snapshot: Optional[str]):
        """Record snapshot as successfully sent"""
        async with async_session() as session:
            sent = SentSnapshot(
                snapshot_path=snapshot_path,
                remote_path=remote_path,
                sent_at=datetime.utcnow(),
                size_bytes=size,
                backup_type=backup_type.value,
                parent_snapshot=parent_snapshot
            )
            session.add(sent)
            await session.commit()

    async def _save_backup_history(self, result: BackupResult):
        """Save backup result to database"""
        async with async_session() as session:
            history = BackupHistory(
                timestamp=result.start_time,
                backup_type=result.backup_type.value,
                status=result.status.value,
                size_bytes=result.size_bytes,
                duration_seconds=result.duration_seconds,
                error_message=result.error_message,
                extra_metadata={"subvolumes": result.subvolumes}
            )
            session.add(history)
            await session.commit()

            result.backup_id = history.id

    async def cancel_backup(self):
        """Cancel the current backup operation"""
        self.cancel_requested = True
        logger.info("Backup cancellation requested")