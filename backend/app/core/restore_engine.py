# backend/app/core/restore_engine.py
import asyncio
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
import logging

from ..config import Settings
from ..models import BackupType
from .ssh_manager import SSHManager
from .verification import VerificationManager

logger = logging.getLogger(__name__)

class RestoreEngine:
    """Handles backup restoration operations for Petalbyte"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.ssh_manager = SSHManager(settings)
        self.verification = VerificationManager(settings, self.ssh_manager)
        self.is_running = False
        self.current_status = {}

    async def perform_restore(
            self,
            backup_date: str,
            backup_type: BackupType,
            subvolumes: List[str],
            target_path: Optional[str] = None,
            verify_only: bool = False
    ) -> Dict[str, Any]:
        """Perform a restore operation"""
        self.is_running = True
        self.current_status = {
            "step": "Starting restore",
            "progress": 0,
            "subvolume": None,
            "error": None
        }

        try:
            # Get Unraid host
            unraid_host = await self._get_unraid_host()

            # Determine backup paths
            month = backup_date[:6]
            backup_dir = "full" if backup_type == BackupType.FULL else "incremental"
            remote_base = f"{self.settings.unraid_base_path}/{self.settings.client_name}/{month}/{backup_dir}"

            results = {}

            for i, subvolume in enumerate(subvolumes):
                progress = (i / len(subvolumes)) * 100
                self.current_status = {
                    "step": f"Restoring {subvolume}",
                    "progress": progress,
                    "subvolume": subvolume,
                    "error": None
                }

                # Find backup file
                remote_file = f"{remote_base}/{subvolume}_{backup_date}_{backup_type.value}.btrfs.gpg"

                # Verify file exists
                check_result = await self.ssh_manager.check_remote_file(
                    unraid_host, remote_file
                )

                if not check_result.get("exists"):
                    results[subvolume] = {
                        "success": False,
                        "error": "Backup file not found"
                    }
                    continue

                if verify_only:
                    # Just verify integrity
                    verify_result = await self.verification.verify_backup_integrity(
                        unraid_host, remote_file
                    )
                    results[subvolume] = {
                        "success": verify_result["valid"],
                        "verified": True,
                        "size": verify_result.get("size", 0)
                    }
                else:
                    # Perform actual restore
                    restore_result = await self._restore_snapshot(
                        unraid_host, remote_file, subvolume, backup_date, target_path
                    )
                    results[subvolume] = restore_result

            self.current_status = {
                "step": "Restore complete",
                "progress": 100,
                "subvolume": None,
                "error": None
            }

            return {
                "success": all(r.get("success", False) for r in results.values()),
                "results": results
            }

        except Exception as e:
            logger.error(f"Restore failed: {e}")
            self.current_status["error"] = str(e)
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            self.is_running = False

    async def _restore_snapshot(
            self,
            unraid_host: str,
            remote_file: str,
            subvolume: str,
            backup_date: str,
            target_path: Optional[str]
    ) -> Dict[str, Any]:
        """Restore a single snapshot"""
        temp_dir = tempfile.mkdtemp(prefix="petalbyte_restore_")

        try:
            # Download and decrypt backup
            logger.info(f"Downloading backup: {remote_file}")

            temp_file = os.path.join(temp_dir, "backup.btrfs.gpg")

            # Use SCP to download
            download_cmd = (
                f"scp -i /root/.ssh/unraid_backup "
                f"{self.settings.unraid_user}@{unraid_host}:'{remote_file}' "
                f"'{temp_file}'"
            )

            proc = await asyncio.create_subprocess_shell(
                download_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            _, stderr = await proc.communicate()

            if proc.returncode != 0:
                raise Exception(f"Download failed: {stderr.decode()}")

            # Decrypt and decompress
            logger.info("Decrypting backup")

            decrypted_file = os.path.join(temp_dir, "backup.btrfs")

            decrypt_cmd = (
                f"gpg --decrypt --batch "
                f"--passphrase-file '{self.settings.encryption_key_path}' "
                f"'{temp_file}' | gunzip > '{decrypted_file}'"
            )

            proc = await asyncio.create_subprocess_shell(
                decrypt_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            _, stderr = await proc.communicate()

            if proc.returncode != 0:
                raise Exception(f"Decryption failed: {stderr.decode()}")

            # Restore snapshot
            logger.info(f"Restoring snapshot to {target_path or 'default location'}")

            if target_path:
                restore_path = target_path
            else:
                restore_path = f"/tmp/petalbyte_restore/{subvolume}_{backup_date}"

            # Create restore directory
            Path(restore_path).parent.mkdir(parents=True, exist_ok=True)

            # Receive snapshot
            receive_cmd = f"btrfs receive '{restore_path}' < '{decrypted_file}'"

            proc = await asyncio.create_subprocess_shell(
                receive_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                raise Exception(f"Btrfs receive failed: {stderr.decode()}")

            return {
                "success": True,
                "restored_to": restore_path,
                "size": os.path.getsize(decrypted_file)
            }

        except Exception as e:
            logger.error(f"Restore failed for {subvolume}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            # Cleanup temp directory
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)

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
            import json
            status = json.loads(stdout.decode())
            peers = status.get("Peer", {})

            for peer_id, peer_info in peers.items():
                if peer_info.get("HostName", "").lower() == self.settings.unraid_tailscale_name.lower():
                    return peer_info.get("TailscaleIPs", [self.settings.unraid_tailscale_name])[0]

        return self.settings.unraid_tailscale_name

    def get_status(self) -> Dict[str, Any]:
        """Get current restore status"""
        return {
            "running": self.is_running,
            **self.current_status
        }