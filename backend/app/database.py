# backend/app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, DateTime, Float, JSON, Boolean, Text
from datetime import datetime
import os

# Database URL
DATABASE_URL = "sqlite+aiosqlite:////app/data/backup_manager.db"

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True
)

# Create session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()

# Database models
class BackupHistory(Base):
    __tablename__ = "backup_history"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    backup_type = Column(String(50), nullable=False)  # full, incremental
    status = Column(String(50), nullable=False)  # success, failed, partial
    size_bytes = Column(Integer)
    duration_seconds = Column(Integer)
    error_message = Column(Text)
    subvolume = Column(String(100))
    snapshot_path = Column(String(500))
    remote_path = Column(String(500))
    metadata = Column(JSON)

class SentSnapshot(Base):
    __tablename__ = "sent_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_path = Column(String(500), nullable=False, unique=True)
    remote_path = Column(String(500), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    size_bytes = Column(Integer)
    checksum = Column(String(64))
    backup_type = Column(String(50))
    parent_snapshot = Column(String(500))

class SystemMetric(Base):
    __tablename__ = "system_metrics"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    metric_type = Column(String(50), nullable=False)  # cpu, memory, disk, bandwidth
    value = Column(Float, nullable=False)
    unit = Column(String(20))
    metadata = Column(JSON)

class DependencyStatus(Base):
    __tablename__ = "dependency_status"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    status = Column(String(50), nullable=False)  # ok, warning, error
    last_check = Column(DateTime, default=datetime.utcnow)
    message = Column(Text)
    can_fix = Column(Boolean, default=False)
    metadata = Column(JSON)

# Database initialization
async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Dependency for getting database session
async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()