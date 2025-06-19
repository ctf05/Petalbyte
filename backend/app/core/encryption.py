# backend/app/core/encryption.py
import os
import secrets
from pathlib import Path
import logging

from ..config import Settings

logger = logging.getLogger(__name__)

class EncryptionManager:
    """Manages encryption operations for backups"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.key_path = Path(settings.encryption_key_path)

    def ensure_encryption_key(self) -> bool:
        """Ensure encryption key exists and is valid"""
        if not self.key_path.exists():
            logger.info("Encryption key not found, generating new key")
            return self.generate_key()

        # Check key validity
        try:
            key = self.key_path.read_text().strip()
            if len(key) < 32:
                logger.warning("Encryption key too short, regenerating")
                return self.generate_key()
            return True
        except Exception as e:
            logger.error(f"Error reading encryption key: {e}")
            return False

    def generate_key(self) -> bool:
        """Generate a new encryption key"""
        try:
            # Create directory if needed
            self.key_path.parent.mkdir(parents=True, exist_ok=True)

            # Backup existing key if present
            if self.key_path.exists():
                backup_path = self.key_path.with_suffix(".key.backup")
                self.key_path.rename(backup_path)
                logger.info(f"Backed up existing key to {backup_path}")

            # Generate new key
            key = secrets.token_urlsafe(32)
            self.key_path.write_text(key)

            # Set secure permissions
            os.chmod(self.key_path, 0o600)

            logger.info("Generated new encryption key")
            return True

        except Exception as e:
            logger.error(f"Failed to generate encryption key: {e}")
            return False

    def get_key_info(self) -> dict:
        """Get information about the encryption key"""
        if not self.key_path.exists():
            return {
                "exists": False,
                "path": str(self.key_path)
            }

        try:
            stat = self.key_path.stat()
            key = self.key_path.read_text().strip()

            return {
                "exists": True,
                "path": str(self.key_path),
                "length": len(key),
                "permissions": oct(stat.st_mode)[-3:],
                "modified": stat.st_mtime
            }
        except Exception as e:
            return {
                "exists": True,
                "path": str(self.key_path),
                "error": str(e)
            }