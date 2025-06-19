# backend/app/api/monitoring.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import Optional, List
import psutil

from ..database import get_db, BackupHistory, SystemMetric
from ..models import StorageStats
from ..config import get_settings

router = APIRouter()

@router.get("/metrics")
async def get_system_metrics(
        period: str = Query("1h", regex="^(1h|6h|24h|7d|30d)$"),
        db: AsyncSession = Depends(get_db)
):
    """Get system metrics for the specified period"""
    # Calculate time range
    now = datetime.utcnow()
    if period == "1h":
        start_time = now - timedelta(hours=1)
    elif period == "6h":
        start_time = now - timedelta(hours=6)
    elif period == "24h":
        start_time = now - timedelta(days=1)
    elif period == "7d":
        start_time = now - timedelta(days=7)
    else:  # 30d
        start_time = now - timedelta(days=30)

    # Get current metrics
    current_metrics = {
        "timestamp": now,
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory": {
            "percent": psutil.virtual_memory().percent,
            "used": psutil.virtual_memory().used,
            "total": psutil.virtual_memory().total
        },
        "disk": {
            "percent": psutil.disk_usage("/").percent,
            "used": psutil.disk_usage("/").used,
            "total": psutil.disk_usage("/").total
        },
        "network": {
            "bytes_sent": psutil.net_io_counters().bytes_sent,
            "bytes_recv": psutil.net_io_counters().bytes_recv
        }
    }

    # Get historical metrics from database
    query = select(SystemMetric).where(
        SystemMetric.timestamp >= start_time
    ).order_by(SystemMetric.timestamp)

    result = await db.execute(query)
    historical = result.scalars().all()

    # Format historical data
    history = {
        "cpu": [],
        "memory": [],
        "disk": [],
        "bandwidth": []
    }

    for metric in historical:
        data_point = {
            "timestamp": metric.timestamp,
            "value": metric.value
        }

        if metric.metric_type == "cpu":
            history["cpu"].append(data_point)
        elif metric.metric_type == "memory":
            history["memory"].append(data_point)
        elif metric.metric_type == "disk":
            history["disk"].append(data_point)
        elif metric.metric_type == "bandwidth":
            history["bandwidth"].append(data_point)

    return {
        "current": current_metrics,
        "history": history,
        "period": period
    }

@router.get("/storage", response_model=StorageStats)
async def get_storage_statistics(
        db: AsyncSession = Depends(get_db)
):
    """Get backup storage statistics"""
    settings = get_settings()

    # Get total size and count
    total_query = select(
        func.count(BackupHistory.id),
        func.sum(BackupHistory.size_bytes)
    ).where(BackupHistory.status == "success")

    result = await db.execute(total_query)
    total_count, total_size = result.one()

    if total_size is None:
        total_size = 0

    # Get counts by type
    type_query = select(
        BackupHistory.backup_type,
        func.count(BackupHistory.id)
    ).where(
        BackupHistory.status == "success"
    ).group_by(BackupHistory.backup_type)

    result = await db.execute(type_query)
    type_counts = {row[0]: row[1] for row in result.all()}

    # Get stats by month
    month_query = select(
        func.strftime("%Y%m", BackupHistory.timestamp).label("month"),
        func.count(BackupHistory.id),
        func.sum(BackupHistory.size_bytes)
    ).where(
        BackupHistory.status == "success"
    ).group_by("month").order_by("month")

    result = await db.execute(month_query)
    by_month = {}

    for row in result.all():
        month, count, size = row
        by_month[month] = {
            "count": count,
            "size": size or 0
        }

    # Get stats by subvolume
    subvol_query = select(
        BackupHistory.subvolume,
        func.count(BackupHistory.id),
        func.sum(BackupHistory.size_bytes)
    ).where(
        BackupHistory.status == "success",
        BackupHistory.subvolume.is_not(None)
    ).group_by(BackupHistory.subvolume)

    result = await db.execute(subvol_query)
    by_subvolume = {}

    for row in result.all():
        subvol, count, size = row
        by_subvolume[subvol] = {
            "count": count,
            "size": size or 0
        }

    return StorageStats(
        total_size=total_size,
        total_backups=total_count or 0,
        full_backups=type_counts.get("full", 0),
        incremental_backups=type_counts.get("incremental", 0),
        by_month=by_month,
        by_subvolume=by_subvolume
    )

@router.get("/bandwidth")
async def get_bandwidth_usage(
        period: str = Query("24h", regex="^(1h|24h|7d)$")
):
    """Get bandwidth usage statistics"""
    # This would track actual backup transfer speeds
    # For now, return sample data
    return {
        "period": period,
        "average_speed_mbps": 45.2,
        "peak_speed_mbps": 112.5,
        "total_transferred_gb": 128.3
    }

@router.post("/record-metric")
async def record_metric(
        metric_type: str,
        value: float,
        db: AsyncSession = Depends(get_db)
):
    """Record a system metric (internal use)"""
    metric = SystemMetric(
        metric_type=metric_type,
        value=value,
        timestamp=datetime.utcnow()
    )

    db.add(metric)
    await db.commit()

    return {"success": True}