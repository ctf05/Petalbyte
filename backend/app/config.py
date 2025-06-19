# backend/app/config.py
from pydantic_settings import BaseSettings
from pydantic import Field, validator
from typing import Optional
import json
import os

class Settings(BaseSettings):
    """Application settings with validation"""

    # Application settings
    app_name: str = "Btrfs Backup Manager"
    api_port: int = 8000
    secret_key: str = Field(default_factory=lambda: os.urandom(32).hex())
    client_name: str = Field(default="petalbyte-client")

    # Backup settings
    months_to_keep: int = Field(default=2, ge=1, le=24)
    daily_incremental_days: int = Field(default=31, ge=1, le=365)
    local_snapshot_days: int = Field(default=3, ge=1, le=30)

    # Unraid settings
    unraid_tailscale_name: str = ""
    unraid_user: str = "root"
    unraid_base_path: str = "/mnt/user/backups"
    unraid_ssh_port: int = Field(default=22, ge=1, le=65535)

    # Paths
    snapshot_dir: str = "/.snapshots"
    encryption_key_path: str = "/app/data/backup-encryption.key"
    sent_snapshots_db: str = "/app/data/sent_snapshots.db"
    settings_file_path: str = "/app/data/settings.json"

    # Tailscale
    use_tailscale: bool = True
    tailscale_timeout: int = 30

    # Scheduling
    backup_schedule_enabled: bool = True
    backup_schedule_time: str = "02:00"  # 24-hour format
    backup_schedule_days: list[str] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

    # Notifications
    notifications_enabled: bool = False
    notification_email: Optional[str] = None
    notification_webhook: Optional[str] = None

    # Host paths (for Docker)
    host_root: str = Field(default="/host", env="HOST_ROOT")
    host_home: str = Field(default="/host-home", env="HOST_HOME")

    class Config:
        env_file = "/app/data/.env"
        env_file_encoding = "utf-8"
        protected_namespaces = ('model_',)

    @validator("backup_schedule_time")
    def validate_time_format(cls, v):
        """Validate 24-hour time format"""
        try:
            hours, minutes = map(int, v.split(":"))
            if not (0 <= hours <= 23 and 0 <= minutes <= 59):
                raise ValueError
        except:
            raise ValueError("Time must be in HH:MM format")
        return v

    def save(self):
        """Save settings to file"""
        settings_dict = self.dict(exclude={"secret_key"})
        with open(self.settings_file_path, "w") as f:
            json.dump(settings_dict, f, indent=2)

    @classmethod
    def load(cls):
        """Load settings from file or create default"""
        settings_file = "/app/data/settings.json"
        if os.path.exists(settings_file):
            with open(settings_file, "r") as f:
                data = json.load(f)
            # Handle old field name for compatibility
            if "settings_file" in data:
                data["settings_file_path"] = data.pop("settings_file")
            return cls(**data)
        else:
            # Create default settings
            settings = cls()
            settings.save()
            return settings

# Global settings instance
_settings = None

def get_settings() -> Settings:
    """Get or create settings instance"""
    global _settings
    if _settings is None:
        _settings = Settings.load()
    return _settings

def reload_settings():
    """Reload settings from file"""
    global _settings
    _settings = Settings.load()
    return _settings