# backend/app/dependencies/system.py
import asyncio
import os
import shutil
from typing import Dict, Any

from .base import Dependency

class BtrfsProgsDependency(Dependency):
    """Check for btrfs-progs installation"""

    @property
    def display_name(self) -> str:
        return "Btrfs Tools"

    @property
    def description(self) -> str:
        return "Btrfs filesystem utilities required for creating and managing snapshots"

    async def check(self) -> Dict[str, Any]:
        """Check if btrfs command is available"""
        btrfs_path = shutil.which("btrfs")

        if btrfs_path:
            # Get version
            try:
                proc = await asyncio.create_subprocess_exec(
                    "btrfs", "--version",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                version = stdout.decode().strip()

                return {
                    "met": True,
                    "message": f"Btrfs tools installed: {version}",
                    "can_fix": False,
                    "metadata": {
                        "path": btrfs_path,
                        "version": version
                    }
                }
            except Exception as e:
                return {
                    "met": True,
                    "message": f"Btrfs tools installed at {btrfs_path}",
                    "can_fix": False,
                    "metadata": {"path": btrfs_path}
                }
        else:
            return {
                "met": False,
                "message": "Btrfs tools not found. Please install btrfs-progs package.",
                "can_fix": True
            }

    async def fix(self) -> Dict[str, Any]:
        """Install btrfs-progs"""
        try:
            # Detect distribution
            if os.path.exists("/etc/debian_version"):
                cmd = ["apt-get", "update", "&&", "apt-get", "install", "-y", "btrfs-progs"]
            elif os.path.exists("/etc/redhat-release"):
                cmd = ["yum", "install", "-y", "btrfs-progs"]
            else:
                return {
                    "success": False,
                    "message": "Unsupported distribution for automatic installation"
                }

            # Run installation
            proc = await asyncio.create_subprocess_shell(
                " ".join(cmd),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode == 0:
                return {
                    "success": True,
                    "message": "Btrfs tools installed successfully"
                }
            else:
                return {
                    "success": False,
                    "message": f"Installation failed: {stderr.decode()}"
                }

        except Exception as e:
            return {
                "success": False,
                "message": f"Installation error: {str(e)}"
            }

class SSHClientDependency(Dependency):
    """Check for SSH client installation"""

    @property
    def display_name(self) -> str:
        return "SSH Client"

    @property
    def description(self) -> str:
        return "OpenSSH client for secure connections to Unraid server"

    async def check(self) -> Dict[str, Any]:
        """Check if ssh command is available"""
        ssh_path = shutil.which("ssh")

        if ssh_path:
            return {
                "met": True,
                "message": "SSH client installed",
                "can_fix": False,
                "metadata": {"path": ssh_path}
            }
        else:
            return {
                "met": False,
                "message": "SSH client not found",
                "can_fix": True
            }

    async def fix(self) -> Dict[str, Any]:
        """Install openssh-client"""
        try:
            if os.path.exists("/etc/debian_version"):
                cmd = ["apt-get", "install", "-y", "openssh-client"]
            else:
                return {
                    "success": False,
                    "message": "Unsupported distribution for automatic installation"
                }

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()

            return {
                "success": proc.returncode == 0,
                "message": "SSH client installed" if proc.returncode == 0 else "Installation failed"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Installation error: {str(e)}"
            }

class GnuPGDependency(Dependency):
    """Check for GnuPG installation"""

    @property
    def display_name(self) -> str:
        return "GnuPG Encryption"

    @property
    def description(self) -> str:
        return "GNU Privacy Guard for encrypting backup data"

    async def check(self) -> Dict[str, Any]:
        """Check if gpg command is available"""
        gpg_path = shutil.which("gpg")

        if gpg_path:
            # Get version
            try:
                proc = await asyncio.create_subprocess_exec(
                    "gpg", "--version",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                version_line = stdout.decode().split('\n')[0]

                return {
                    "met": True,
                    "message": f"GnuPG installed: {version_line}",
                    "can_fix": False,
                    "metadata": {
                        "path": gpg_path,
                        "version": version_line
                    }
                }
            except:
                return {
                    "met": True,
                    "message": "GnuPG installed",
                    "can_fix": False,
                    "metadata": {"path": gpg_path}
                }
        else:
            return {
                "met": False,
                "message": "GnuPG not found",
                "can_fix": True
            }

    async def fix(self) -> Dict[str, Any]:
        """Install gnupg"""
        try:
            cmd = ["apt-get", "install", "-y", "gnupg"]
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()

            return {
                "success": proc.returncode == 0,
                "message": "GnuPG installed" if proc.returncode == 0 else "Installation failed"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Installation error: {str(e)}"
            }