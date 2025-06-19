# backend/app/dependencies/encryption.py
import os
import secrets
from typing import Dict, Any
from pathlib import Path

from .base import Dependency
from ..config import get_settings

class EncryptionKeyDependency(Dependency):
    """Check for backup encryption key"""

    @property
    def display_name(self) -> str:
        return "Encryption Key"

    @property
    def description(self) -> str:
        return "Encryption key for securing backup data"

    async def check(self) -> Dict[str, Any]:
        """Check if encryption key exists"""
        settings = get_settings()
        key_path = Path(settings.encryption_key_path)

        if not key_path.parent.exists():
            return {
                "met": False,
                "message": f"Encryption key directory does not exist",
                "can_fix": True
            }

        if not key_path.exists():
            return {
                "met": False,
                "message": "Encryption key not found",
                "can_fix": True
            }

        # Check permissions
        perms = oct(key_path.stat().st_mode)[-3:]
        if perms not in ["600", "400"]:
            return {
                "met": False,
                "message": f"Encryption key has insecure permissions: {perms}",
                "can_fix": True
            }

        # Check key validity
        try:
            key_content = key_path.read_text().strip()
            if len(key_content) < 32:
                return {
                    "met": False,
                    "message": "Encryption key is too short (minimum 32 characters)",
                    "can_fix": True
                }

            return {
                "met": True,
                "message": "Encryption key is configured",
                "can_fix": False,
                "metadata": {
                    "key_length": len(key_content),
                    "key_path": str(key_path)
                }
            }
        except Exception as e:
            return {
                "met": False,
                "message": f"Cannot read encryption key: {str(e)}",
                "can_fix": False
            }

    async def fix(self) -> Dict[str, Any]:
        """Generate encryption key"""
        settings = get_settings()
        key_path = Path(settings.encryption_key_path)

        try:
            # Create directory
            key_path.parent.mkdir(parents=True, exist_ok=True)

            # Backup existing key if present
            if key_path.exists():
                backup_path = key_path.with_suffix(".key.backup")
                key_path.rename(backup_path)

            # Generate new key
            key = secrets.token_urlsafe(32)
            key_path.write_text(key)

            # Set secure permissions
            os.chmod(key_path, 0o600)

            return {
                "success": True,
                "message": "Generated new encryption key",
                "metadata": {
                    "key_path": str(key_path),
                    "warning": "IMPORTANT: Back up this key! You cannot restore backups without it!"
                }
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to generate encryption key: {str(e)}"
            }