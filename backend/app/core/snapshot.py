# backend/app/core/snapshot.py
import asyncio
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import logging

from ..config import Settings

logger = logging.getLogger(__name__)

@dataclass
class Snapshot:
    """Represents a Btrfs snapshot"""
    subvolume: str
    path: str
    timestamp: str
    mount_point: str

class SnapshotManager:
    """Manages Btrfs snapshot operations"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.subvolumes = [
            ("@", settings.host_root),
            ("@home", settings.host_home)
        ]

    async def create_snapshots(self) -> List[Snapshot]:
        """Create snapshots of all configured subvolumes"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshots = []

        for subvol_name, mount_point in self.subvolumes:
            snapshot = await self._create_snapshot(subvol_name, mount_point, timestamp)
            if snapshot:
                snapshots.append(snapshot)
            else:
                # If one fails, clean up any created snapshots
                for s in snapshots:
                    await self._delete_snapshot(s.path)
                raise Exception(f"Failed to create snapshot for {subvol_name}")

        return snapshots

    async def _create_snapshot(self, subvol_name: str, mount_point: str,
                               timestamp: str) -> Optional[Snapshot]:
        """Create a single snapshot"""
        snapshot_path = f"{self.settings.snapshot_dir}/{subvol_name}_{timestamp}"

        try:
            # Create read-only snapshot
            proc = await asyncio.create_subprocess_exec(
                "btrfs", "subvolume", "snapshot", "-r",
                mount_point, snapshot_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                logger.error(f"Failed to create snapshot: {stderr.decode()}")
                return None

            logger.info(f"Created snapshot: {snapshot_path}")

            return Snapshot(
                subvolume=subvol_name,
                path=snapshot_path,
                timestamp=timestamp,
                mount_point=mount_point
            )

        except Exception as e:
            logger.error(f"Exception creating snapshot: {e}")
            return None

    async def find_parent_snapshot(self, subvolume: str) -> Optional[str]:
        """Find the most recent successfully sent snapshot for incremental backup"""
        snapshot_dir = Path(self.settings.snapshot_dir)

        # List all snapshots for this subvolume
        snapshots = []
        for entry in snapshot_dir.iterdir():
            if entry.is_dir() and entry.name.startswith(f"{subvolume}_"):
                snapshots.append(entry)

        # Sort by timestamp (newest first)
        snapshots.sort(key=lambda x: x.name, reverse=True)

        # Find the most recent one that was successfully sent
        from ..database import async_session

        async with async_session() as session:
            for snapshot in snapshots:
                result = await session.execute(
                    "SELECT id FROM sent_snapshots WHERE snapshot_path = ?",
                    (str(snapshot),)
                )
                if result.scalar():
                    return str(snapshot)

        return None

    async def list_snapshots(self) -> List[Dict[str, Any]]:
        """List all local snapshots"""
        snapshot_dir = Path(self.settings.snapshot_dir)
        snapshots = []

        if not snapshot_dir.exists():
            return snapshots

        for entry in snapshot_dir.iterdir():
            if entry.is_dir() and entry.name.count("_") >= 2:
                # Parse snapshot name
                parts = entry.name.split("_")
                if len(parts) >= 3:
                    subvol = parts[0]
                    timestamp = f"{parts[1]}_{parts[2]}"

                    # Get size
                    size = await self._get_snapshot_size(str(entry))

                    snapshots.append({
                        "subvolume": subvol,
                        "path": str(entry),
                        "timestamp": timestamp,
                        "size": size,
                        "created": entry.stat().st_ctime
                    })

        return sorted(snapshots, key=lambda x: x["created"], reverse=True)

    async def _get_snapshot_size(self, snapshot_path: str) -> int:
        """Get the size of a snapshot"""
        try:
            proc = await asyncio.create_subprocess_exec(
                "du", "-sb", snapshot_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, _ = await proc.communicate()

            if proc.returncode == 0:
                size_str = stdout.decode().split("\t")[0]
                return int(size_str)
        except:
            pass

        return 0

    async def _delete_snapshot(self, snapshot_path: str) -> bool:
        """Delete a snapshot"""
        try:
            proc = await asyncio.create_subprocess_exec(
                "btrfs", "subvolume", "delete", snapshot_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            _, stderr = await proc.communicate()

            if proc.returncode != 0:
                logger.error(f"Failed to delete snapshot: {stderr.decode()}")
                return False

            logger.info(f"Deleted snapshot: {snapshot_path}")
            return True

        except Exception as e:
            logger.error(f"Exception deleting snapshot: {e}")
            return False

    async def cleanup_old_snapshots(self, days: int) -> int:
        """Delete snapshots older than specified days"""
        snapshot_dir = Path(self.settings.snapshot_dir)
        deleted_count = 0

        if not snapshot_dir.exists():
            return 0

        cutoff_time = datetime.now().timestamp() - (days * 86400)

        for entry in snapshot_dir.iterdir():
            if entry.is_dir() and entry.name.count("_") >= 2:
                if entry.stat().st_ctime < cutoff_time:
                    # Check if it was sent successfully
                    from ..database import async_session

                    async with async_session() as session:
                        result = await session.execute(
                            "SELECT id FROM sent_snapshots WHERE snapshot_path = ?",
                            (str(entry),)
                        )

                        if result.scalar():
                            # Was sent, safe to delete
                            if await self._delete_snapshot(str(entry)):
                                deleted_count += 1
                        else:
                            # Not sent, keep it longer (double retention)
                            double_cutoff = datetime.now().timestamp() - (days * 2 * 86400)
                            if entry.stat().st_ctime < double_cutoff:
                                logger.warning(f"Deleting unsent snapshot: {entry}")
                                if await self._delete_snapshot(str(entry)):
                                    deleted_count += 1

        return deleted_count