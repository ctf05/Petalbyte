# backend/app/core/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging
from typing import Optional

from ..config import get_settings
from .backup_engine import BackupEngine

logger = logging.getLogger(__name__)

class BackupScheduler:
    """Manages scheduled backup operations for Petalbyte"""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.backup_engine: Optional[BackupEngine] = None
        self.job_id = "scheduled_backup"

    async def start(self):
        """Start the scheduler"""
        settings = get_settings()

        if not settings.backup_schedule_enabled:
            logger.info("Backup scheduling is disabled")
            return

        # Initialize backup engine
        self.backup_engine = BackupEngine(settings)

        # Parse schedule time
        hour, minute = map(int, settings.backup_schedule_time.split(":"))

        # Create cron trigger for selected days
        days_map = {
            "mon": "mon",
            "tue": "tue",
            "wed": "wed",
            "thu": "thu",
            "fri": "fri",
            "sat": "sat",
            "sun": "sun"
        }

        selected_days = ",".join(
            days_map[day] for day in settings.backup_schedule_days
            if day in days_map
        )

        if not selected_days:
            logger.warning("No backup days selected, scheduling disabled")
            return

        # Schedule the job
        self.scheduler.add_job(
            self._run_scheduled_backup,
            CronTrigger(
                day_of_week=selected_days,
                hour=hour,
                minute=minute
            ),
            id=self.job_id,
            name="Petalbyte Scheduled Backup",
            replace_existing=True
        )

        self.scheduler.start()
        logger.info(
            f"Backup scheduler started: {settings.backup_schedule_time} "
            f"on {', '.join(settings.backup_schedule_days)}"
        )

    async def stop(self):
        """Stop the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Backup scheduler stopped")

    async def _run_scheduled_backup(self):
        """Execute a scheduled backup"""
        logger.info("Starting scheduled backup")

        try:
            if self.backup_engine:
                result = await self.backup_engine.perform_backup()

                if result.status == "success":
                    logger.info("Scheduled backup completed successfully")
                else:
                    logger.error(f"Scheduled backup failed: {result.error_message}")
        except Exception as e:
            logger.error(f"Error in scheduled backup: {e}")

    def get_next_run_time(self) -> Optional[datetime]:
        """Get the next scheduled backup time"""
        job = self.scheduler.get_job(self.job_id)
        if job:
            return job.next_run_time
        return None

    def pause_schedule(self):
        """Pause scheduled backups"""
        if self.scheduler.running:
            job = self.scheduler.get_job(self.job_id)
            if job:
                job.pause()
                logger.info("Backup schedule paused")

    def resume_schedule(self):
        """Resume scheduled backups"""
        if self.scheduler.running:
            job = self.scheduler.get_job(self.job_id)
            if job:
                job.resume()
                logger.info("Backup schedule resumed")

    async def reload_schedule(self):
        """Reload schedule from updated settings"""
        await self.stop()
        await self.start()