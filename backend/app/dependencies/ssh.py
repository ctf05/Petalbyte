# backend/app/dependencies/ssh.py
import os
import asyncio
from typing import Dict, Any
from pathlib import Path

from .base import Dependency
from ..config import get_settings

class SSHKeyDependency(Dependency):
    """Check for SSH key pair for Unraid connection"""

    @property
    def display_name(self) -> str:
        return "SSH Keys"

    @property
    def description(self) -> str:
        return "SSH key pair for secure connection to Unraid server"

    async def check(self) -> Dict[str, Any]:
        """Check if SSH keys exist"""
        ssh_dir = Path("/root/.ssh")
        private_key = ssh_dir / "unraid_backup"
        public_key = ssh_dir / "unraid_backup.pub"

        if not ssh_dir.exists():
            return {
                "met": False,
                "message": "SSH directory does not exist",
                "can_fix": True
            }

        if not private_key.exists() or not public_key.exists():
            return {
                "met": False,
                "message": "SSH key pair not found",
                "can_fix": True,
                "metadata": {
                    "private_exists": private_key.exists(),
                    "public_exists": public_key.exists()
                }
            }

        # Check permissions
        private_perms = oct(private_key.stat().st_mode)[-3:]
        if private_perms != "600":
            return {
                "met": False,
                "message": f"SSH private key has incorrect permissions: {private_perms} (should be 600)",
                "can_fix": True
            }

        # Check if key is in authorized_keys on Unraid (this would need actual connection test)
        return {
            "met": True,
            "message": "SSH keys exist with correct permissions",
            "can_fix": False,
            "metadata": {
                "key_path": str(private_key),
                "key_type": "ed25519" if "ed25519" in public_key.read_text() else "rsa"
            }
        }

    async def fix(self) -> Dict[str, Any]:
        """Generate SSH key pair"""
        ssh_dir = Path("/root/.ssh")
        private_key = ssh_dir / "unraid_backup"
        public_key = ssh_dir / "unraid_backup.pub"

        try:
            # Create SSH directory
            ssh_dir.mkdir(parents=True, exist_ok=True)
            os.chmod(ssh_dir, 0o700)

            # Generate key pair if not exists
            if not private_key.exists():
                proc = await asyncio.create_subprocess_exec(
                    "ssh-keygen", "-t", "ed25519", "-f", str(private_key),
                    "-N", "", "-C", f"btrfs-backup@{os.uname().nodename}",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await proc.communicate()

                if proc.returncode != 0:
                    return {
                        "success": False,
                        "message": f"Failed to generate SSH keys: {stderr.decode()}"
                    }

            # Fix permissions
            os.chmod(private_key, 0o600)
            os.chmod(public_key, 0o644)

            # Read public key for display
            pub_key_content = public_key.read_text().strip()

            return {
                "success": True,
                "message": "SSH keys generated successfully",
                "metadata": {
                    "public_key": pub_key_content,
                    "instruction": "Add this public key to Unraid's /root/.ssh/authorized_keys"
                }
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to generate SSH keys: {str(e)}"
            }

class SSHConfigDependency(Dependency):
    """Check for SSH client configuration"""

    @property
    def display_name(self) -> str:
        return "SSH Configuration"

    @property
    def description(self) -> str:
        return "SSH client configuration for connection parameters"

    async def check(self) -> Dict[str, Any]:
        """Check if SSH config exists"""
        ssh_config = Path("/root/.ssh/config")

        if not ssh_config.exists():
            return {
                "met": False,
                "message": "SSH config file does not exist",
                "can_fix": True
            }

        # Check if our host entry exists
        config_content = ssh_config.read_text()
        if "Host unraid-backup" not in config_content:
            return {
                "met": False,
                "message": "SSH config missing Unraid host entry",
                "can_fix": True
            }

        return {
            "met": True,
            "message": "SSH configuration is ready",
            "can_fix": False
        }

    async def fix(self) -> Dict[str, Any]:
        """Create SSH config"""
        settings = get_settings()
        ssh_config = Path("/root/.ssh/config")

        try:
            # Create SSH directory if needed
            ssh_config.parent.mkdir(parents=True, exist_ok=True)

            # Create config entry
            config_entry = f"""
Host unraid-backup
    HostName {{unraid_host}}
    User {settings.unraid_user}
    Port {settings.unraid_ssh_port}
    IdentityFile /root/.ssh/unraid_backup
    StrictHostKeyChecking accept-new
    ServerAliveInterval 60
    ServerAliveCountMax 3
"""

            # Append to config if exists, otherwise create
            if ssh_config.exists():
                existing = ssh_config.read_text()
                if "Host unraid-backup" not in existing:
                    ssh_config.write_text(existing + "\n" + config_entry)
            else:
                ssh_config.write_text(config_entry)

            # Set permissions
            os.chmod(ssh_config, 0o600)

            return {
                "success": True,
                "message": "SSH configuration created",
                "metadata": {
                    "note": "Update {{unraid_host}} with actual Tailscale IP when available"
                }
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to create SSH config: {str(e)}"
            }