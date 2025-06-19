# Petalbyte

<p align="center">
  <img src="docs/images/petalbyte-logo.png" alt="Petalbyte Logo" width="200"/>
</p>

<p align="center">
  <strong>Enterprise-grade Btrfs backup solution for Unraid with end-to-end encryption</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/python-3.11+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/react-18+-61dafb.svg" alt="React">
  <img src="https://img.shields.io/badge/docker-ready-2496ed.svg" alt="Docker">
</p>

## Overview

Petalbyte is a comprehensive backup management system designed specifically for Btrfs filesystems on Pop!_OS (and other Linux distributions) with Unraid as the backup destination. It provides automated, encrypted, incremental backups with a modern web interface for monitoring and management.

### Why Petalbyte?

- **Btrfs Native**: Leverages Btrfs snapshots for efficient, atomic backups
- **End-to-End Encryption**: Military-grade encryption protects your data at rest and in transit
- **Incremental Forever**: After the initial full backup, only changes are transmitted
- **Zero-Touch Operation**: Set it and forget it with automated scheduling
- **Tailscale Integration**: Secure remote access without port forwarding
- **Web-Based Management**: Modern React interface for monitoring and control

## Features

### 🔒 Security First
- GPG encryption with AES-256
- SSH key-based authentication
- Tailscale mesh VPN support
- No data leaves your control

### 📦 Smart Backup Management
- Automated daily incremental backups
- Monthly full backup rotation
- Configurable retention policies
- Failed upload detection and cleanup
- Bandwidth-efficient transfers

### 🖥️ Modern Web Interface
- Real-time backup progress
- System health monitoring
- Backup history and statistics
- One-click restore operations
- Mobile-responsive design

### 🔧 Enterprise Features
- Docker containerization
- Comprehensive logging
- WebSocket real-time updates
- RESTful API
- Dependency health checks

## Quick Start

### Prerequisites

- Linux system with Btrfs root filesystem
- Docker and Docker Compose
- Unraid server with SSH access
- Tailscale account (optional but recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/petalbyte.git
cd petalbyte
```

2. Create data directory:
```bash
mkdir -p data
```

3. Start Petalbyte:
```bash
docker-compose up -d
```

4. Access the web interface:
```
http://localhost:3000
```

5. Complete the initial setup wizard

### Basic Configuration

The setup wizard will guide you through:
1. Tailscale authentication
2. Unraid connection setup
3. Backup schedule configuration
4. Encryption key generation

## System Requirements

### Client (Backup Source)
- Pop!_OS 22.04+ or Ubuntu 22.04+ (other distros supported)
- Btrfs root filesystem with @ and @home subvolumes
- Docker 20.10+
- 4GB RAM minimum
- 10GB free space for snapshots

### Server (Unraid)
- Unraid 6.9+
- SSH enabled
- Dedicated share for backups
- Storage space 2-3x your data size

## Documentation

- [Installation Guide](docs/installation.md)
- [Configuration Reference](docs/configuration.md)
- [Backup Strategy](docs/backup-strategy.md)
- [Restore Procedures](docs/restore.md)
- [API Documentation](docs/api.md)
- [Troubleshooting](docs/troubleshooting.md)

### Tutorials

1. [Setting up Pop!_OS with Btrfs + LUKS](docs/tutorials/01-installing-popos.md)
2. [Configuring Unraid for Petalbyte](docs/tutorials/02-setup-unraid.md)
3. [Using the Backup System](docs/tutorials/03-using-backup.md)
4. [Restoring from Backup](docs/tutorials/04-restoring.md)

## Architecture

Petalbyte uses a containerized architecture with clear separation of concerns:

```
┌──────────────────────────────────────────────┐
│           Docker Container                    │
│  ┌──────────────────────────────────────┐   │
│  │         Web UI (React)                │   │
│  │         Port 3000                     │   │
│  └────────────────┬─────────────────────┘   │
│                   │                          │
│  ┌────────────────▼─────────────────────┐   │
│  │         FastAPI Backend               │   │
│  │         Port 8000                     │   │
│  │  • Backup orchestration               │   │
│  │  • Dependency management              │   │
│  │  • Real-time monitoring               │   │
│  └────────────────┬─────────────────────┘   │
└───────────────────┼──────────────────────────┘
                    │ Volume Mounts
         ┌──────────▼──────────────┐
         │      Host System        │
         │  • Btrfs snapshots      │
         │  • SSH to Unraid        │
         │  • Tailscale VPN        │
         └─────────────────────────┘
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:
- Code of Conduct
- Development setup
- Submitting pull requests
- Reporting issues

## Support

- 💬 Discord: [Join our community](https://discord.gg/petalbyte) (coming soon)
- 📖 Wiki: [Documentation Wiki](https://github.com/ctf05/petalbyte/wiki) (coming soon, you can help!)
- 🐛 Issues: [GitHub Issues](https://github.com/ctf05/petalbyte/issues)

## License

Petalbyte is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- Pop!_OS team for their excellent distribution
- Unraid community for the amazing NAS platform
- Tailscale for secure, simple networking
- All our contributors and users

---

<p align="center">
  Made with ❤️ for the self-hosting community
</p>