# backend/app/dependencies/unraid.py
import asyncio
from typing import Dict, Any
from pathlib import Path

from .base import Dependency
from ..config import get_settings
from ..core.ssh_manager import SSHManager

class UnraidConnectivityDependency(Dependency):
    """Check connectivity to Unraid server"""

    @property
    def display_name(self) -> str:
        return "Unraid Connectivity"

    @property
    def description(self) -> str:
        return "SSH connection to Unraid server for backup storage"

    async def check(self) -> Dict[str, Any]:
        """Check if we can connect to Unraid"""
        settings = get_settings()

        if not settings.unraid_tailscale_name:
            return {
                "met": False,
                "message": "Unraid Tailscale name not configured",
                "can_fix": False,
                "metadata": {"config_required": True}
            }

        # Try to get Tailscale IP
        if settings.use_tailscale:
            try:
                proc = await asyncio.create_subprocess_exec(
                    "tailscale", "status", "--json",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()

                if proc.returncode == 0:
                    import json
                    status = json.loads(stdout.decode())
                    peers = status.get("Peer", {})

                    unraid_ip = None
                    for peer_id, peer_info in peers.items():
                        if peer_info.get("HostName", "").lower() == settings.unraid_tailscale_name.lower():
                            unraid_ip = peer_info.get("TailscaleIPs", [None])[0]
                            break

                    if not unraid_ip:
                        return {
                            "met": False,
                            "message": f"Unraid device '{settings.unraid_tailscale_name}' not found in Tailscale network",
                            "can_fix": False
                        }
                else:
                    unraid_ip = settings.unraid_tailscale_name  # Fallback to hostname
            except Exception:
                unraid_ip = settings.unraid_tailscale_name
        else:
            unraid_ip = settings.unraid_tailscale_name

        # Test SSH connection
        try:
            ssh_manager = SSHManager(settings)
            result = await ssh_manager.test_connection(unraid_ip)

            if result["success"]:
                return {
                    "met": True,
                    "message": f"Connected to Unraid at {unraid_ip}",
                    "can_fix": False,
                    "metadata": {
                        "host": unraid_ip,
                        "port": settings.unraid_ssh_port,
                        "user": settings.unraid_user
                    }
                }
            else:
                return {
                    "met": False,
                    "message": f"Cannot connect to Unraid: {result['error']}",
                    "can_fix": False,
                    "metadata": {"error": result["error"]}
                }

        except Exception as e:
            return {
                "met": False,
                "message": f"Connection test failed: {str(e)}",
                "can_fix": False
            }

    async def fix(self) -> Dict[str, Any]:
        """Cannot automatically fix connectivity issues"""
        return {
            "success": False,
            "message": "Please ensure Unraid is accessible and SSH key is authorized"
        }

class UnraidBackupShareDependency(Dependency):
    """Check if backup share exists on Unraid"""

    @property
    def display_name(self) -> str:
        return "Unraid Backup Share"

    @property
    def description(self) -> str:
        return "Backup storage location on Unraid server"

    async def check(self) -> Dict[str, Any]:
        """Check if backup path exists on Unraid"""
        settings = get_settings()

        # First check connectivity
        conn_dep = UnraidConnectivityDependency()
        conn_result = await conn_dep.check()

        if not conn_result["met"]:
            return {
                "met": False,
                "message": "Cannot check backup share: Unraid not connected",
                "can_fix": False,
                "metadata": {"requires": "unraid_connectivity"}
            }

        # Check if backup path exists
        try:
            ssh_manager = SSHManager(settings)
            unraid_ip = conn_result["metadata"]["host"]

            # Test if directory exists
            result = await ssh_manager.execute_command(
                unraid_ip,
                f"test -d '{settings.unraid_base_path}' && echo 'EXISTS' || echo 'NOT_EXISTS'"
            )

            if result["success"] and "EXISTS" in result["stdout"]:
                # Check if writable
                test_file = f"{settings.unraid_base_path}/.write_test"
                write_result = await ssh_manager.execute_command(
                    unraid_ip,
                    f"touch '{test_file}' && rm '{test_file}' && echo 'WRITABLE' || echo 'NOT_WRITABLE'"
                )

                if write_result["success"] and "WRITABLE" in write_result["stdout"]:
                    return {
                        "met": True,
                        "message": f"Backup share is ready at {settings.unraid_base_path}",
                        "can_fix": False,
                        "metadata": {"path": settings.unraid_base_path}
                    }
                else:
                    return {
                        "met": False,
                        "message": f"Backup share exists but is not writable",
                        "can_fix": False
                    }
            else:
                return {
                    "met": False,
                    "message": f"Backup share does not exist: {settings.unraid_base_path}",
                    "can_fix": True
                }

        except Exception as e:
            return {
                "met": False,
                "message": f"Failed to check backup share: {str(e)}",
                "can_fix": False
            }

    async def fix(self) -> Dict[str, Any]:
        """Create backup directory on Unraid"""
        settings = get_settings()

        try:
            # Get connection info
            conn_dep = UnraidConnectivityDependency()
            conn_result = await conn_dep.check()

            if not conn_result["met"]:
                return {
                    "success": False,
                    "message": "Cannot create backup share: Unraid not connected"
                }

            ssh_manager = SSHManager(settings)
            unraid_ip = conn_result["metadata"]["host"]

            # Create directory
            result = await ssh_manager.execute_command(
                unraid_ip,
                f"mkdir -p '{settings.unraid_base_path}'"
            )

            if result["success"]:
                return {
                    "success": True,
                    "message": f"Created backup directory: {settings.unraid_base_path}"
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to create directory: {result.get('error', 'Unknown error')}"
                }

        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to create backup share: {str(e)}"
            }