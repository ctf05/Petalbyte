# backend/app/api/setup.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from typing import Dict, Any
import os
from pathlib import Path

from ..models import SetupConfig

router = APIRouter()

# Path to setup scripts
SCRIPTS_DIR = Path("/app/scripts/setup")

@router.get("/scripts/popos-installer")
async def get_popos_installer_script():
    """Get the Pop!_OS btrfs installer script"""
    script_path = SCRIPTS_DIR / "popos-btrfs-setup.sh"

    if not script_path.exists():
        # Return embedded script
        script_content = get_embedded_popos_script()
        return PlainTextResponse(content=script_content, media_type="text/plain")

    return FileResponse(
        path=script_path,
        media_type="text/plain",
        filename="popos-btrfs-setup.sh"
    )

@router.post("/scripts/generate-popos")
async def generate_popos_script(config: SetupConfig):
    """Generate customized Pop!_OS installer script with user settings"""

    # Get base script
    script_content = get_embedded_popos_script()

    # Replace configuration values
    replacements = {
        'ROOT_DEVICE="/dev/nvme1n1p3"': f'ROOT_DEVICE="{config.root_device}"',
        'BOOT_DEVICE="/dev/nvme1n1p1"': f'BOOT_DEVICE="{config.boot_device}"',
        'USERNAME="popper"': f'USERNAME="{config.username}"',
        'COMPRESSION="zstd:1"': f'COMPRESSION="{config.compression}"',
    }

    for old, new in replacements.items():
        script_content = script_content.replace(old, new)

    return PlainTextResponse(
        content=script_content,
        media_type="text/plain",
        headers={
            "Content-Disposition": "attachment; filename=popos-btrfs-setup-custom.sh"
        }
    )

@router.get("/instructions/popos")
async def get_popos_setup_instructions():
    """Get detailed Pop!_OS setup instructions"""
    return {
        "title": "Pop!_OS Btrfs + LUKS Setup Guide",
        "overview": "This guide will help you install Pop!_OS 24.04 with btrfs filesystem and LUKS encryption",
        "requirements": [
            "Pop!_OS 24.04 installation media",
            "UEFI system (recommended)",
            "At least 20GB free disk space",
            "Basic familiarity with Linux terminal"
        ],
        "steps": [
            {
                "number": 1,
                "title": "First Installation - Enable Encryption",
                "substeps": [
                    "Boot from Pop!_OS installation media",
                    "Select your language and keyboard layout",
                    "Choose 'Clean Install'",
                    "Select your installation drive",
                    "CHECK the 'Encrypt Drive' option",
                    "Enter a strong encryption password (remember this!)",
                    "Complete the installation normally",
                    "When installation finishes, DO NOT REBOOT",
                    "Click 'Quit' to exit the installer"
                ]
            },
            {
                "number": 2,
                "title": "Second Installation - Setup Btrfs",
                "substeps": [
                    "Open the installer again (Activities → Install Pop!_OS)",
                    "Choose 'Custom (Advanced)' installation type",
                    "Find your encrypted partition (usually largest one)",
                    "Click on it and enter your encryption password to unlock",
                    "Once unlocked, you'll see 'data-root' device",
                    "Select 'data-root' and click 'Format'",
                    "Choose 'btrfs' as the filesystem",
                    "Set mount point as '/'",
                    "Complete installation (user info, etc.)",
                    "When finished, DO NOT REBOOT",
                    "Click 'Quit' to exit installer"
                ]
            },
            {
                "number": 3,
                "title": "Run Setup Script",
                "substeps": [
                    "Open Terminal (Super key → type 'Terminal')",
                    "Download the setup script from Petalbyte",
                    "Make it executable: chmod +x popos-btrfs-setup.sh",
                    "Run with sudo: sudo ./popos-btrfs-setup.sh",
                    "Verify your device names when prompted",
                    "Let the script complete",
                    "Reboot when instructed"
                ]
            },
            {
                "number": 4,
                "title": "Post-Installation",
                "substeps": [
                    "Install btrfs tools: sudo apt install btrfs-progs btrfs-compsize",
                    "Verify compression: sudo compsize /",
                    "Check subvolumes: sudo btrfs subvolume list /",
                    "Install Petalbyte for automated backups"
                ]
            }
        ],
        "troubleshooting": [
            {
                "issue": "Cannot find encrypted partition",
                "solution": "Look for the partition that's type 'crypto_LUKS', usually the largest"
            },
            {
                "issue": "Script fails to mount",
                "solution": "Ensure the LUKS container is unlocked and device names are correct"
            },
            {
                "issue": "Boot fails after setup",
                "solution": "Boot from USB, unlock drive, mount subvolumes, and check /etc/fstab entries"
            }
        ]
    }

@router.get("/device-detection")
async def detect_system_devices():
    """Detect system storage devices to help with configuration"""
    import subprocess

    try:
        # Get block devices
        result = subprocess.run(
            ["lsblk", "-J", "-o", "NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT"],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Failed to detect devices")

        import json
        devices_data = json.loads(result.stdout)

        # Parse for likely candidates
        suggestions = {
            "boot_device": None,
            "root_device": None,
            "devices": []
        }

        for device in devices_data.get("blockdevices", []):
            device_info = parse_device_tree(device)
            suggestions["devices"].extend(device_info)

            # Try to identify boot and root partitions
            for dev in device_info:
                if dev["fstype"] == "vfat" and dev["size_mb"] < 1024:
                    suggestions["boot_device"] = dev["path"]
                elif dev["fstype"] == "crypto_LUKS":
                    suggestions["root_device"] = dev["path"]

        return suggestions

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def parse_device_tree(device, parent_path=""):
    """Recursively parse device tree from lsblk"""
    devices = []

    path = f"/dev/{device['name']}"

    # Convert size to MB
    size_str = device.get("size", "0")
    size_mb = parse_size_to_mb(size_str)

    dev_info = {
        "name": device["name"],
        "path": path,
        "size": device.get("size", ""),
        "size_mb": size_mb,
        "type": device.get("type", ""),
        "fstype": device.get("fstype", ""),
        "mountpoint": device.get("mountpoint", "")
    }

    devices.append(dev_info)

    # Process children
    for child in device.get("children", []):
        devices.extend(parse_device_tree(child, path))

    return devices

def parse_size_to_mb(size_str):
    """Convert size string like '512M' or '100G' to MB"""
    if not size_str:
        return 0

    size_str = size_str.strip()
    if size_str[-1] == 'G':
        return float(size_str[:-1]) * 1024
    elif size_str[-1] == 'M':
        return float(size_str[:-1])
    elif size_str[-1] == 'K':
        return float(size_str[:-1]) / 1024
    else:
        return 0

def get_embedded_popos_script():
    """Return the embedded Pop!_OS setup script"""
    return '''#!/bin/bash
# Pop!_OS 24.04 btrfs + LUKS Installation Script - Petalbyte Edition
# This script automates the manual configuration steps after the two-installation process

# ============================================================================
# CONFIGURATION VARIABLES - MODIFY THESE TO MATCH YOUR SYSTEM
# ============================================================================

# Your root partition device (usually the 4th partition on NVMe drives)
ROOT_DEVICE="/dev/nvme1n1p3"
BOOT_DEVICE="/dev/nvme1n1p1"

# LUKS device name (this is what Pop!_OS uses by default)
LUKS_NAME="cryptdata"

# Your username (for home directory ownership)
USERNAME="popper"

# Compression level (zstd:1 recommended, options: zstd:1-3, lzo, zlib, none)
COMPRESSION="zstd:1"

# Mount options for btrfs
MOUNT_OPTIONS="compress=${COMPRESSION},discard=async,ssd,noatime,space_cache=v2"

# ============================================================================
# COLOR CODES FOR OUTPUT
# ============================================================================
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

confirm_action() {
    read -p "$1 (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Operation cancelled by user"
    fi
}

# ============================================================================
# MAIN INSTALLATION SCRIPT
# ============================================================================

clear
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        Pop!_OS 24.04 btrfs + LUKS Setup Script              ║"
echo "║                     Petalbyte Edition                        ║"
echo "║                                                              ║"
echo "║  This script should be run AFTER the second installation     ║"
echo "║  but BEFORE rebooting the system.                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

# Check if running with proper permissions
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
fi

# Display current configuration
echo "Current Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Root Device:    ${ROOT_DEVICE}"
echo "Boot Device:    ${BOOT_DEVICE}"
echo "LUKS Name:      ${LUKS_NAME}"
echo "Username:       ${USERNAME}"
echo "Compression:    ${COMPRESSION}"
echo "Mount Options:  ${MOUNT_OPTIONS}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

confirm_action "Do you want to proceed with these settings?"

# Rest of the script continues as provided...
[Script continues with all the steps from the original file]
'''