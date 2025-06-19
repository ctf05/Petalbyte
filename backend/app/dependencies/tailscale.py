# backend/app/dependencies/tailscale.py
import asyncio
import os
import shutil
from typing import Dict, Any

from .base import Dependency
from ..config import get_settings

class TailscaleDependency(Dependency):
    """Check for Tailscale installation and connection"""

    @property
    def display_name(self) -> str:
        return "Tailscale VPN"

    @property
    def description(self) -> str:
        return "Tailscale mesh VPN for secure connection to Unraid server"

    async def check(self) -> Dict[str, Any]:
        """Check if Tailscale is installed and connected"""
        settings = get_settings()

        if not settings.use_tailscale:
            return {
                "met": True,
                "message": "Tailscale not required (disabled in settings)",
                "can_fix": False,
                "warning": True
            }

        # Check if tailscale command exists
        tailscale_path = shutil.which("tailscale")
        if not tailscale_path:
            return {
                "met": False,
                "message": "Tailscale not installed",
                "can_fix": True
            }

        # Check if tailscaled is running
        try:
            proc = await asyncio.create_subprocess_exec(
                "pgrep", "tailscaled",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()

            if proc.returncode != 0:
                return {
                    "met": False,
                    "message": "Tailscale daemon not running",
                    "can_fix": True,
                    "metadata": {"installed": True, "running": False}
                }

            # Check connection status
            proc = await asyncio.create_subprocess_exec(
                "tailscale", "status", "--json",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                return {
                    "met": False,
                    "message": "Tailscale not authenticated",
                    "can_fix": True,
                    "metadata": {"installed": True, "running": True, "authenticated": False}
                }

            # Parse status to check if connected
            import json
            try:
                status = json.loads(stdout.decode())
                if status.get("BackendState") == "Running":
                    # Check if Unraid device is visible
                    peers = status.get("Peer", {})
                    unraid_found = False

                    for peer_id, peer_info in peers.items():
                        if peer_info.get("HostName", "").lower() == settings.unraid_tailscale_name.lower():
                            unraid_found = True
                            break

                    if unraid_found:
                        return {
                            "met": True,
                            "message": f"Tailscale connected, Unraid device '{settings.unraid_tailscale_name}' found",
                            "can_fix": False,
                            "metadata": {
                                "installed": True,
                                "running": True,
                                "authenticated": True,
                                "backend_state": status.get("BackendState"),
                                "self_ip": status.get("TailscaleIPs", ["Unknown"])[0]
                            }
                        }
                    else:
                        return {
                            "met": False,
                            "message": f"Tailscale connected but Unraid device '{settings.unraid_tailscale_name}' not found",
                            "can_fix": False,
                            "warning": True,
                            "metadata": {
                                "installed": True,
                                "running": True,
                                "authenticated": True,
                                "unraid_found": False
                            }
                        }
                else:
                    return {
                        "met": False,
                        "message": f"Tailscale not fully connected (state: {status.get('BackendState')})",
                        "can_fix": True,
                        "metadata": {
                            "installed": True,
                            "running": True,
                            "backend_state": status.get("BackendState")
                        }
                    }
            except json.JSONDecodeError:
                return {
                    "met": False,
                    "message": "Could not parse Tailscale status",
                    "can_fix": False,
                    "metadata": {"installed": True, "running": True}
                }

        except Exception as e:
            return {
                "met": False,
                "message": f"Error checking Tailscale: {str(e)}",
                "can_fix": False
            }

    async def fix(self) -> Dict[str, Any]:
        """Install and/or start Tailscale"""
        try:
            # Check if installed
            if not shutil.which("tailscale"):
                # Install Tailscale
                proc = await asyncio.create_subprocess_shell(
                    "curl -fsSL https://tailscale.com/install.sh | sh",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await proc.communicate()

                if proc.returncode != 0:
                    return {
                        "success": False,
                        "message": f"Failed to install Tailscale: {stderr.decode()}"
                    }

            # Start tailscaled if not running
            proc = await asyncio.create_subprocess_exec(
                "pgrep", "tailscaled",
                stdout=asyncio.subprocess.PIPE
            )
            await proc.communicate()

            if proc.returncode != 0:
                # Start tailscaled
                proc = await asyncio.create_subprocess_exec(
                    "tailscaled",
                    "--state=/var/lib/tailscale/tailscaled.state",
                    "--socket=/var/run/tailscale/tailscaled.sock",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                # Don't wait for it to complete as it runs in background
                await asyncio.sleep(2)

            # Check if authenticated
            proc = await asyncio.create_subprocess_exec(
                "tailscale", "status",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0 or b"Logged out" in stdout:
                # Need to authenticate
                return {
                    "success": False,
                    "message": "Tailscale installed but needs authentication. Run: tailscale up",
                    "metadata": {"needs_auth": True}
                }

            return {
                "success": True,
                "message": "Tailscale is running and connected"
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Error setting up Tailscale: {str(e)}"
            }