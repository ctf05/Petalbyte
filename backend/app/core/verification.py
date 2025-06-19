# backend/app/core/verification.py
import hashlib
from typing import Dict, Any, List
import logging

from ..config import Settings
from .ssh_manager import SSHManager

logger = logging.getLogger(__name__)

class VerificationManager:
    """Manages backup verification operations"""

    def __init__(self, settings: Settings, ssh_manager: SSHManager):
        self.settings = settings
        self.ssh_manager = ssh_manager

    async def verify_remote_file(self, host: str, remote_path: str,
                                 expected_size: int) -> Dict[str, Any]:
        """Verify a file exists on remote host with correct size"""
        result = await self.ssh_manager.check_remote_file(host, remote_path)

        if not result.get("exists", False):
            return {
                "exists": False,
                "matches": False,
                "error": "File not found on remote"
            }

        actual_size = result.get("size", 0)
        matches = actual_size == expected_size

        if not matches:
            logger.warning(
                f"Size mismatch for {remote_path}: "
                f"expected {expected_size}, got {actual_size}"
            )

        return {
            "exists": True,
            "matches": matches,
            "expected_size": expected_size,
            "actual_size": actual_size
        }

    async def verify_backups(self, backup_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Verify all backups from a backup operation"""
        verified = 0
        failed = 0
        issues = []

        for result in backup_results:
            if result.get("success") and result.get("verified"):
                verified += 1
            else:
                failed += 1
                issues.append({
                    "file": result.get("remote_path", "unknown"),
                    "error": result.get("error", "Verification failed")
                })

        return {
            "total": len(backup_results),
            "verified": verified,
            "failed": failed,
            "issues": issues,
            "all_verified": failed == 0
        }

    async def calculate_checksum(self, file_path: str) -> str:
        """Calculate SHA256 checksum of a file"""
        sha256_hash = hashlib.sha256()

        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(chunk)

            return sha256_hash.hexdigest()
        except Exception as e:
            logger.error(f"Failed to calculate checksum: {e}")
            return ""

    async def verify_backup_integrity(self, host: str, remote_path: str) -> Dict[str, Any]:
        """Verify the integrity of a backup file"""
        # Check if file exists
        exists_result = await self.ssh_manager.check_remote_file(host, remote_path)

        if not exists_result.get("exists", False):
            return {
                "valid": False,
                "error": "Backup file not found"
            }

        # Check if it's a valid GPG file
        header_check = await self.ssh_manager.execute_command(
            host,
            f"head -c 100 '{remote_path}' | file -"
        )

        if header_check["success"] and "GPG" in header_check["stdout"]:
            return {
                "valid": True,
                "size": exists_result.get("size", 0),
                "type": "GPG encrypted"
            }
        else:
            return {
                "valid": False,
                "error": "File does not appear to be GPG encrypted"
            }

    async def create_verification_file(self, host: str) -> Dict[str, Any]:
        """Create verification file on remote host"""
        import json
        from datetime import datetime

        verification_data = {
            "last_backup": {
                "timestamp": datetime.utcnow().isoformat(),
                "client": self.settings.client_name,
                "version": "1.0.0"
            }
        }

        verification_path = f"{self.settings.unraid_base_path}/{self.settings.client_name}/.verification"

        # Create JSON content
        json_content = json.dumps(verification_data, indent=2)

        # Write to remote
        result = await self.ssh_manager.execute_command(
            host,
            f"echo '{json_content}' > '{verification_path}'"
        )

        return {
            "success": result["success"],
            "path": verification_path
        }