# backend/app/models.py
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

class BackupType(str, Enum):
    FULL = "full"
    INCREMENTAL = "incremental"

class BackupStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"
    CANCELLED = "cancelled"

class DependencyStatus(str, Enum):
    OK = "ok"
    WARNING = "warning"
    ERROR = "error"
    CHECKING = "checking"

# Request/Response models
class SetupConfig(BaseModel):
    """Configuration for Pop!_OS setup script"""
    root_device: str = Field(..., pattern="^/dev/[a-zA-Z0-9/]+$")
    boot_device: str = Field(..., pattern="^/dev/[a-zA-Z0-9/]+$")
    username: str = Field(..., min_length=1, max_length=32)
    compression: str = Field(default="zstd:1", pattern="^(zstd:[1-3]|lzo|zlib|none)$")

class BackupRequest(BaseModel):
    backup_type: Optional[BackupType] = None
    force_full: bool = False
    subvolumes: Optional[List[str]] = None

class BackupProgress(BaseModel):
    current_step: str
    total_steps: int
    current_step_num: int
    percentage: float
    current_file: Optional[str] = None
    speed_mbps: Optional[float] = None
    eta_seconds: Optional[int] = None
    log_messages: List[str] = []

class BackupResult(BaseModel):
    backup_id: int
    status: BackupStatus
    backup_type: BackupType
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    size_bytes: Optional[int] = None
    error_message: Optional[str] = None
    subvolumes: Dict[str, Dict[str, Any]] = {}

class DependencyInfo(BaseModel):
    name: str
    display_name: str
    description: str
    status: DependencyStatus
    message: str
    can_fix: bool
    last_check: Optional[datetime] = None
    metadata: Dict[str, Any] = {}

class SettingsUpdate(BaseModel):
    months_to_keep: Optional[int] = Field(None, ge=1, le=24)
    daily_incremental_days: Optional[int] = Field(None, ge=1, le=365)
    local_snapshot_days: Optional[int] = Field(None, ge=1, le=30)
    unraid_tailscale_name: Optional[str] = None
    unraid_user: Optional[str] = None
    unraid_base_path: Optional[str] = None
    unraid_ssh_port: Optional[int] = Field(None, ge=1, le=65535)
    use_tailscale: Optional[bool] = None
    backup_schedule_enabled: Optional[bool] = None
    backup_schedule_time: Optional[str] = None
    backup_schedule_days: Optional[List[str]] = None
    notifications_enabled: Optional[bool] = None
    notification_email: Optional[str] = None
    notification_webhook: Optional[str] = None
    client_name: Optional[str] = None

class SystemStatus(BaseModel):
    status: str  # healthy, degraded, error
    backup_running: bool
    last_backup: Optional[BackupResult] = None
    next_scheduled: Optional[datetime] = None
    dependencies: List[DependencyInfo] = []
    disk_space: Dict[str, Any] = {}
    system_metrics: Dict[str, Any] = {}

class BackupHistoryItem(BaseModel):
    id: int
    timestamp: datetime
    backup_type: BackupType
    status: BackupStatus
    size_bytes: Optional[int] = None
    duration_seconds: Optional[int] = None
    error_message: Optional[str] = None
    subvolume: Optional[str] = None

    class Config:
        from_attributes = True

class StorageStats(BaseModel):
    total_size: int
    total_backups: int
    full_backups: int
    incremental_backups: int
    by_month: Dict[str, Dict[str, Any]]
    by_subvolume: Dict[str, Dict[str, Any]]

class RestoreRequest(BaseModel):
    backup_date: str  # YYYYMMDD format
    backup_type: BackupType
    subvolumes: List[str]
    target_path: Optional[str] = None
    verify_only: bool = False

class LogEntry(BaseModel):
    timestamp: datetime
    level: str  # INFO, WARNING, ERROR, DEBUG
    message: str
    source: Optional[str] = None
    metadata: Dict[str, Any] = {}