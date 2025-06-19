# backend/app/core/ssh_manager.py
import asyncio
import asyncssh
from typing import Dict, Any, Optional
from pathlib import Path
import logging

from ..config import Settings

logger = logging.getLogger(__name__)

class SSHManager:
    """Manages SSH connections and operations"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.private_key_path = "/root/.ssh/unraid_backup"

    async def test_connection(self, host: str) -> Dict[str, Any]:
        """Test SSH connection to host"""
        try:
            async with asyncssh.connect(
                    host,
                    port=self.settings.unraid_ssh_port,
                    username=self.settings.unraid_user,
                    client_keys=[self.private_key_path],
                    known_hosts=None
            ) as conn:
                result = await conn.run("echo 'Connection successful'")
                return {
                    "success": True,
                    "message": result.stdout.strip()
                }
        except asyncssh.PermissionDenied:
            return {
                "success": False,
                "error": "Permission denied - check SSH key authorization"
            }
        except asyncssh.ConnectionLost:
            return {
                "success": False,
                "error": "Connection lost"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def execute_command(self, host: str, command: str) -> Dict[str, Any]:
        """Execute a command on remote host"""
        try:
            async with asyncssh.connect(
                    host,
                    port=self.settings.unraid_ssh_port,
                    username=self.settings.unraid_user,
                    client_keys=[self.private_key_path],
                    known_hosts=None
            ) as conn:
                result = await conn.run(command)
                return {
                    "success": result.exit_status == 0,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_status": result.exit_status
                }
        except Exception as e:
            logger.error(f"SSH command failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def transfer_file(self, host: str, local_path: str, remote_path: str,
                            progress_callback=None) -> Dict[str, Any]:
        """Transfer file to remote host with progress tracking"""
        try:
            async with asyncssh.connect(
                    host,
                    port=self.settings.unraid_ssh_port,
                    username=self.settings.unraid_user,
                    client_keys=[self.private_key_path],
                    known_hosts=None
            ) as conn:
                async with conn.start_sftp_client() as sftp:
                    # Get file size for progress
                    file_size = Path(local_path).stat().st_size
                    transferred = 0

                    async def progress_handler(bytes_so_far, total_bytes):
                        nonlocal transferred
                        transferred = bytes_so_far
                        if progress_callback:
                            await progress_callback(bytes_so_far, total_bytes)

                    await sftp.put(
                        local_path,
                        remote_path,
                        progress_handler=progress_handler if progress_callback else None
                    )

                    return {
                        "success": True,
                        "bytes_transferred": file_size
                    }

        except Exception as e:
            logger.error(f"File transfer failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def create_remote_directory(self, host: str, path: str) -> Dict[str, Any]:
        """Create directory on remote host"""
        return await self.execute_command(host, f"mkdir -p '{path}'")

    async def check_remote_file(self, host: str, path: str) -> Dict[str, Any]:
        """Check if file exists on remote host and get its size"""
        result = await self.execute_command(
            host,
            f"if [ -f '{path}' ]; then stat -c '%s' '{path}'; else echo 'NOT_FOUND'; fi"
        )

        if result["success"]:
            output = result["stdout"].strip()
            if output == "NOT_FOUND":
                return {"exists": False}
            else:
                try:
                    size = int(output)
                    return {"exists": True, "size": size}
                except ValueError:
                    return {"exists": False, "error": "Invalid size returned"}
        else:
            return {"exists": False, "error": result.get("error", "Command failed")}

    async def delete_remote_file(self, host: str, path: str) -> Dict[str, Any]:
        """Delete file on remote host"""
        return await self.execute_command(host, f"rm -f '{path}'")