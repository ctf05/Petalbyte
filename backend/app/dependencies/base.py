# backend/app/dependencies/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime
import logging

from ..models import DependencyInfo, DependencyStatus
from ..database import async_session, DependencyStatus as DBDependencyStatus

logger = logging.getLogger(__name__)

class Dependency(ABC):
    """Base class for all system dependencies"""

    def __init__(self):
        self.name = self.__class__.__name__.replace("Dependency", "").lower()
        self.logger = logging.getLogger(f"{__name__}.{self.name}")

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name for the dependency"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what this dependency provides"""
        pass

    @abstractmethod
    async def check(self) -> Dict[str, Any]:
        """
        Check if dependency is met
        Returns: Dict with at least 'met' (bool) and 'message' (str)
        """
        pass

    @abstractmethod
    async def fix(self) -> Dict[str, Any]:
        """
        Attempt to fix the dependency
        Returns: Dict with 'success' (bool) and 'message' (str)
        """
        pass

    async def get_info(self) -> DependencyInfo:
        """Get full dependency information"""
        try:
            # Check current status
            check_result = await self.check()

            # Determine status
            if check_result.get("met", False):
                status = DependencyStatus.OK
            elif check_result.get("warning", False):
                status = DependencyStatus.WARNING
            else:
                status = DependencyStatus.ERROR

            # Create info object
            info = DependencyInfo(
                name=self.name,
                display_name=self.display_name,
                description=self.description,
                status=status,
                message=check_result.get("message", "Unknown status"),
                can_fix=check_result.get("can_fix", False),
                last_check=datetime.utcnow(),
                metadata=check_result.get("metadata", {})
            )

            # Save to database
            await self._save_status(info)

            return info

        except Exception as e:
            self.logger.error(f"Error checking dependency: {e}")
            return DependencyInfo(
                name=self.name,
                display_name=self.display_name,
                description=self.description,
                status=DependencyStatus.ERROR,
                message=f"Error checking dependency: {str(e)}",
                can_fix=False,
                last_check=datetime.utcnow()
            )

    async def _save_status(self, info: DependencyInfo):
        """Save dependency status to database"""
        try:
            async with async_session() as session:
                # Check if exists
                result = await session.execute(
                    f"SELECT * FROM dependency_status WHERE name = ?",
                    (self.name,)
                )
                existing = result.fetchone()

                if existing:
                    # Update
                    await session.execute(
                        """UPDATE dependency_status
                           SET status = ?, message = ?, last_check = ?, can_fix = ?, extra_metadata = ?
                           WHERE name = ?""",
                        (info.status, info.message, info.last_check,
                         info.can_fix, info.metadata, self.name)
                    )
                else:
                    # Insert
                    await session.execute(
                        """INSERT INTO dependency_status
                               (name, status, message, last_check, can_fix, extra_metadata)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (self.name, info.status, info.message, info.last_check,
                         info.can_fix, info.metadata)
                    )

                await session.commit()
        except Exception as e:
            self.logger.error(f"Failed to save dependency status: {e}")