# backend/app/dependencies/__init__.py
from typing import List, Type
from .base import Dependency
from .system import BtrfsProgsDependency, SSHClientDependency, GnuPGDependency
from .tailscale import TailscaleDependency
from .directories import SnapshotDirectoryDependency, DataDirectoryDependency, HostMountsDependency
from .ssh import SSHKeyDependency, SSHConfigDependency
from .encryption import EncryptionKeyDependency
from .unraid import UnraidConnectivityDependency, UnraidBackupShareDependency

# List of all dependencies in order of checking
ALL_DEPENDENCIES: List[Type[Dependency]] = [
    # System dependencies
    BtrfsProgsDependency,
    SSHClientDependency,
    GnuPGDependency,

    # Directory dependencies
    DataDirectoryDependency,
    SnapshotDirectoryDependency,
    HostMountsDependency,

    # Configuration dependencies
    EncryptionKeyDependency,
    SSHKeyDependency,
    SSHConfigDependency,

    # Network dependencies
    TailscaleDependency,
    UnraidConnectivityDependency,
    UnraidBackupShareDependency,
]

def get_all_dependencies() -> List[Dependency]:
    """Get instances of all dependencies"""
    return [dep() for dep in ALL_DEPENDENCIES]

def get_dependency_by_name(name: str) -> Dependency:
    """Get a specific dependency by name"""
    for dep_class in ALL_DEPENDENCIES:
        dep = dep_class()
        if dep.name == name:
            return dep
    raise ValueError(f"Dependency '{name}' not found")