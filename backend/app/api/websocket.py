# backend/app/api/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import asyncio
import logging

from ..models import LogEntry, BackupProgress
from ..core.backup_engine import BackupEngine
from ..config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    """Manages WebSocket connections for Petalbyte"""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.log_connections: List[WebSocket] = []
        self.progress_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, connection_type: str):
        await websocket.accept()

        if connection_type == "logs":
            self.log_connections.append(websocket)
        elif connection_type == "progress":
            self.progress_connections.append(websocket)

        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected: {connection_type}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.log_connections:
            self.log_connections.remove(websocket)
        if websocket in self.progress_connections:
            self.progress_connections.remove(websocket)

        logger.info("WebSocket disconnected")

    async def send_log(self, log_entry: LogEntry):
        """Send log entry to all log connections"""
        message = json.dumps(log_entry.dict())

        for connection in self.log_connections[:]:
            try:
                await connection.send_text(message)
            except:
                self.disconnect(connection)

    async def send_progress(self, progress: BackupProgress):
        """Send progress update to all progress connections"""
        message = json.dumps(progress.dict())

        for connection in self.progress_connections[:]:
            try:
                await connection.send_text(message)
            except:
                self.disconnect(connection)

    async def broadcast(self, message: str):
        """Broadcast message to all connections"""
        for connection in self.active_connections[:]:
            try:
                await connection.send_text(message)
            except:
                self.disconnect(connection)

# Global connection manager
manager = ConnectionManager()

# Logging handler that sends to WebSocket
class WebSocketLogHandler(logging.Handler):
    """Custom log handler that sends logs via WebSocket"""

    def emit(self, record):
        log_entry = LogEntry(
            timestamp=datetime.fromtimestamp(record.created),
            level=record.levelname,
            message=record.getMessage(),
            source=record.name
        )

        # Run in event loop
        asyncio.create_task(manager.send_log(log_entry))

# Add WebSocket log handler
ws_handler = WebSocketLogHandler()
ws_handler.setLevel(logging.INFO)
logging.getLogger().addHandler(ws_handler)

# Progress callback for backup engine
async def backup_progress_callback(progress: BackupProgress):
    """Callback to send backup progress via WebSocket"""
    await manager.send_progress(progress)

@router.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint for real-time logs"""
    await manager.connect(websocket, "logs")

    try:
        # Send initial message
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "Connected to Petalbyte log stream"
        }))

        # Keep connection alive
        while True:
            # Wait for client messages (ping/pong)
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0
                )

                # Echo back any ping messages
                if data == "ping":
                    await websocket.send_text("pong")

            except asyncio.TimeoutError:
                # Send periodic ping to keep connection alive
                try:
                    await websocket.send_text("ping")
                except:
                    break

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@router.websocket("/ws/progress")
async def websocket_progress(websocket: WebSocket):
    """WebSocket endpoint for backup progress updates"""
    await manager.connect(websocket, "progress")

    # Get backup engine and add callback
    settings = get_settings()
    backup_engine = BackupEngine(settings)
    backup_engine.add_progress_callback(backup_progress_callback)

    try:
        # Send initial status
        if backup_engine.current_backup:
            await manager.send_progress(backup_engine.current_backup)
        else:
            await websocket.send_text(json.dumps({
                "type": "status",
                "message": "No backup in progress"
            }))

        # Keep connection alive
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0
                )

                if data == "ping":
                    await websocket.send_text("pong")

            except asyncio.TimeoutError:
                try:
                    await websocket.send_text("ping")
                except:
                    break

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
    finally:
        # Remove callback
        backup_engine.remove_progress_callback(backup_progress_callback)

@router.websocket("/ws")
async def websocket_general(websocket: WebSocket):
    """General WebSocket endpoint for all updates"""
    await manager.connect(websocket, "general")

    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "Connected to Petalbyte WebSocket",
            "version": "1.0.0"
        }))

        while True:
            try:
                data = await websocket.receive_text()

                # Handle different message types
                message = json.loads(data)

                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif message.get("type") == "subscribe":
                    # Handle subscription requests
                    topics = message.get("topics", [])
                    if "logs" in topics:
                        manager.log_connections.append(websocket)
                    if "progress" in topics:
                        manager.progress_connections.append(websocket)

                    await websocket.send_text(json.dumps({
                        "type": "subscribed",
                        "topics": topics
                    }))

            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "ping"}))
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON"
                }))

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)