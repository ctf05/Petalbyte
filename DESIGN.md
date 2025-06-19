# Petalbyte Technical Design Document

## Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [Architecture](#architecture)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [Security Model](#security-model)
7. [Technology Stack](#technology-stack)
8. [Design Decisions](#design-decisions)
9. [Implementation Details](#implementation-details)
10. [Future Considerations](#future-considerations)

## Project Overview

### Purpose

Petalbyte is a comprehensive backup management system designed to provide enterprise-grade backup capabilities for home users and small businesses using Btrfs filesystems with Unraid as the backup destination.

### Goals

1. **Reliability**: Ensure data integrity and successful backup completion
2. **Security**: Protect data with end-to-end encryption
3. **Efficiency**: Minimize bandwidth and storage usage
4. **Usability**: Provide an intuitive interface for non-technical users
5. **Automation**: Enable set-and-forget operation

### Non-Goals

1. Not a general-purpose backup solution (Btrfs/Unraid specific)
2. Not a cloud backup service
3. Not a real-time synchronization tool
4. Not a version control system

## Problem Statement

### Current Challenges

1. **Complexity**: Existing Btrfs backup solutions require extensive command-line knowledge
2. **Integration**: No turnkey solution for Btrfs-to-Unraid backups
3. **Security**: Many solutions lack proper encryption or secure transport
4. **Monitoring**: Limited visibility into backup status and health
5. **Recovery**: Complex restore procedures that risk data loss

### Target Users

- **Primary**: Tech-savvy home users with Unraid NAS
- **Secondary**: Small businesses with Linux infrastructure
- **Tertiary**: System administrators seeking automated backup solutions

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT SYSTEM                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Docker Container (Privileged)            │   │
│  │                                                       │   │
│  │  ┌─────────────────┐      ┌──────────────────────┐  │   │
│  │  │   Frontend (UI)  │      │   Backend (FastAPI)  │  │   │
│  │  │                  │◄────►│                      │  │   │
│  │  │  - React 18      │ HTTP │  - Backup Engine     │  │   │
│  │  │  - Material UI   │  WS  │  - Scheduler         │  │   │
│  │  │  - Redux         │      │  - SSH Manager       │  │   │
│  │  └─────────────────┘      └──────────┬───────────┘  │   │
│  │                                       │              │   │
│  └───────────────────────────────────────┼──────────────┘   │
│                                          │                   │
│  Host System Resources                   │                   │
│  ┌─────────────────────┐                 │                   │
│  │   Btrfs Filesystem  │◄────────────────┘                   │
│  │   - / (root)        │         System Calls                │
│  │   - /home           │                                     │
│  └─────────────────────┘                                     │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Tailscale VPN / Direct SSH
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                        UNRAID SERVER                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Backup Storage Structure                 │   │
│  │                                                       │   │
│  │  /mnt/user/backups/                                  │   │
│  │  └── <client-name>/                                  │   │
│  │      ├── .verification                               │   │
│  │      ├── 202501/                                     │   │
│  │      │   ├── full/                                   │   │
│  │      │   └── incremental/                            │   │
│  │      └── 202502/                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
Backend Components
├── API Layer (FastAPI)
│   ├── RESTful endpoints
│   ├── WebSocket handlers
│   └── Request validation
├── Core Services
│   ├── Backup Engine
│   ├── Restore Engine
│   ├── Scheduler
│   └── Monitoring
├── Infrastructure
│   ├── SSH Manager
│   ├── Encryption Manager
│   ├── Verification Manager
│   └── Cleanup Manager
└── Data Layer
    ├── SQLite Database
    ├── Configuration Store
    └── Metrics Storage

Frontend Components
├── UI Framework (React)
│   ├── Page Components
│   ├── Common Components
│   └── Layout System
├── State Management (Redux)
│   ├── Backup State
│   ├── Settings State
│   └── Monitoring State
└── API Integration
    ├── REST Client
    ├── WebSocket Client
    └── Error Handling
```

## Core Components

### 1. Backup Engine

**Purpose**: Orchestrates the entire backup process

**Responsibilities**:
- Snapshot creation and management
- Backup type determination (full/incremental)
- Progress tracking and reporting
- Error handling and recovery

**Key Operations**:
```python
async def perform_backup():
    1. Pre-backup cleanup
    2. Create Btrfs snapshots
    3. Determine backup type
    4. Connect to Unraid
    5. Transfer encrypted data
    6. Verify transfer
    7. Update tracking database
    8. Cleanup old backups
```

### 2. Snapshot Manager

**Purpose**: Handles Btrfs snapshot operations

**Responsibilities**:
- Create read-only snapshots
- Track snapshot lineage
- Manage local retention
- Find parent snapshots for incrementals

### 3. SSH Manager

**Purpose**: Manages secure connections to Unraid

**Responsibilities**:
- Establish SSH connections
- Execute remote commands
- Handle file transfers
- Manage connection pooling

### 4. Encryption Manager

**Purpose**: Handles all encryption operations

**Responsibilities**:
- Generate and manage encryption keys
- Encrypt backup streams
- Verify encryption integrity
- Key rotation support

### 5. Dependency System

**Purpose**: Ensures system requirements are met

**Responsibilities**:
- Check system dependencies
- Attempt automatic fixes
- Report dependency status
- Block operations on critical failures

**Dependency Types**:
- System packages (btrfs-progs, gpg, ssh)
- Configuration (SSH keys, encryption keys)
- Connectivity (Tailscale, Unraid access)
- Storage (paths, permissions)

### 6. Scheduler

**Purpose**: Automates backup execution

**Responsibilities**:
- Cron-based scheduling
- Backup window management
- Retry logic for failures
- Schedule modification

### 7. Monitoring System

**Purpose**: Tracks system health and performance

**Responsibilities**:
- Collect system metrics
- Track backup history
- Calculate storage statistics
- Generate alerts

## Data Flow

### Backup Flow

```
1. Schedule Trigger / Manual Start
   ↓
2. Dependency Checks
   ├─ System dependencies
   ├─ Configuration validation
   └─ Connectivity verification
   ↓
3. Pre-backup Cleanup
   ├─ Remove failed uploads
   └─ Clean orphaned files
   ↓
4. Snapshot Creation
   ├─ Create @ snapshot
   └─ Create @home snapshot
   ↓
5. Backup Type Decision
   ├─ Check date (1st = full)
   └─ Check parent availability
   ↓
6. Data Processing
   ├─ Btrfs send (full or incremental)
   ├─ Gzip compression
   └─ GPG encryption
   ↓
7. Transfer to Unraid
   ├─ SSH connection via Tailscale
   ├─ Stream encrypted data
   └─ Progress tracking
   ↓
8. Verification
   ├─ Size verification
   ├─ Checksum validation
   └─ Update sent_snapshots DB
   ↓
9. Post-backup Cleanup
   ├─ Remove old local snapshots
   ├─ Clean old remote backups
   └─ Update verification file
```

### Restore Flow

```
1. Select Backup to Restore
   ↓
2. Verify Backup Integrity
   ├─ Check file existence
   └─ Validate GPG headers
   ↓
3. Download Backup
   ├─ SCP from Unraid
   └─ Progress tracking
   ↓
4. Decrypt and Decompress
   ├─ GPG decryption
   └─ Gunzip decompression
   ↓
5. Restore Snapshot
   ├─ Btrfs receive
   └─ Verify restoration
   ↓
6. Post-restore Actions
   ├─ Update permissions
   └─ Cleanup temp files
```

## Security Model

### Threat Model

1. **Network Interception**: Mitigated by SSH + Tailscale encryption
2. **Storage Compromise**: Mitigated by GPG encryption at rest
3. **Key Exposure**: Mitigated by secure key storage and permissions
4. **Unauthorized Access**: Mitigated by SSH key authentication

### Security Layers

```
1. Transport Security
   ├─ SSH protocol (encrypted channel)
   ├─ Tailscale VPN (WireGuard)
   └─ Certificate validation

2. Data Security
   ├─ GPG encryption (AES-256)
   ├─ Unique encryption keys
   └─ No plaintext storage

3. Access Control
   ├─ SSH key authentication
   ├─ No password authentication
   └─ Principle of least privilege

4. Audit Trail
   ├─ Comprehensive logging
   ├─ Backup history tracking
   └─ Failed attempt monitoring
```

### Key Management

- **Encryption Key**: Generated on first run, stored in `/app/data/backup-encryption.key`
- **SSH Keys**: Ed25519 keys in `/root/.ssh/unraid_backup`
- **Permissions**: Strict 600 permissions on all keys
- **Backup**: Users responsible for key backup

## Technology Stack

### Backend

- **Language**: Python 3.11+
- **Framework**: FastAPI (async REST API)
- **Database**: SQLite with SQLAlchemy
- **Task Scheduling**: APScheduler
- **SSH Operations**: AsyncSSH
- **Process Management**: asyncio
- **Logging**: Python logging + custom handlers

### Frontend

- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI v5
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **Charts**: Recharts
- **API Client**: Axios
- **WebSockets**: Native WebSocket API

### Infrastructure

- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Networking**: Tailscale
- **File System**: Btrfs
- **Encryption**: GnuPG
- **Compression**: Gzip

## Design Decisions

### 1. Why Docker?

**Decision**: Run entire application in privileged Docker container

**Rationale**:
- Consistent environment across systems
- Easy deployment and updates
- Dependency isolation
- Simplified installation process

**Trade-offs**:
- Requires privileged mode for Btrfs operations
- Slightly more resource overhead
- Additional abstraction layer

### 2. Why Tailscale?

**Decision**: Use Tailscale for secure connectivity

**Rationale**:
- Zero-configuration networking
- Strong encryption (WireGuard)
- NAT traversal without port forwarding
- Works with dynamic IPs

**Trade-offs**:
- Dependency on third-party service
- Requires account creation
- Additional software layer

### 3. Why Full + Incremental Strategy?

**Decision**: Monthly full backups with daily incrementals

**Rationale**:
- Balance between storage efficiency and restore complexity
- Monthly boundary simplifies retention
- Incremental chains limited to 30 days
- Predictable storage growth

**Trade-offs**:
- More complex than full-only
- Requires parent tracking
- Potential for broken chains

### 4. Why SQLite?

**Decision**: Use SQLite for local database

**Rationale**:
- Zero configuration
- Sufficient for single-node deployment
- Easy backup/restore
- Good performance for our use case

**Trade-offs**:
- Limited concurrent writes
- No network access
- Size limitations

### 5. Why WebSockets for Progress?

**Decision**: Use WebSockets for real-time updates

**Rationale**:
- True real-time progress
- Bi-directional communication
- Lower overhead than polling
- Better user experience

**Trade-offs**:
- More complex implementation
- Connection management required
- Fallback needed for proxies

## Implementation Details

### Backup Strategies

#### Full Backup
- Performed on 1st of each month
- Complete snapshot sent to Unraid
- Stored in `YYYY/MM/full/` directory
- No parent requirement

#### Incremental Backup
- Performed daily (except 1st)
- Only changes since parent sent
- Requires successful parent snapshot
- Falls back to full if no parent

### Error Handling

```python
Error Handling Hierarchy:
1. Transient Errors → Retry with backoff
2. Configuration Errors → Report to user
3. Critical Errors → Abort and alert
4. Partial Failures → Complete what's possible
```

### Performance Optimizations

1. **Streaming Operations**: No intermediate files for backups
2. **Async I/O**: Non-blocking operations throughout
3. **Connection Pooling**: Reuse SSH connections
4. **Progress Throttling**: Update UI at reasonable intervals
5. **Compression First**: Reduce data before encryption

### Monitoring and Alerting

- **Metrics Collection**: CPU, memory, disk, network
- **Health Checks**: Dependency status, connectivity
- **Alert Conditions**: Backup failures, low space, errors
- **Notification Channels**: Web UI, logs, future email/webhook

## Future Considerations

### Planned Features

1. **Multi-client Support**
    - Central management interface
    - Client grouping and policies
    - Aggregate reporting

2. **Alternative Backends**
    - S3-compatible storage
    - SFTP servers
    - Local disk targets

3. **Advanced Scheduling**
    - Bandwidth throttling
    - Backup windows
    - Priority queuing

4. **Enhanced Recovery**
    - Bare metal restore
    - Partial file recovery
    - Point-in-time browsing

### Scalability Considerations

1. **Horizontal Scaling**
    - Separate API and worker nodes
    - Redis for job queuing
    - Distributed locking

2. **Performance Improvements**
    - Parallel snapshot processing
    - Deduplication support
    - Compression algorithm selection

3. **Enterprise Features**
    - LDAP/AD integration
    - Audit compliance
    - SLA monitoring

### API Stability

- **v1 API**: Committed to stability
- **Versioning**: URL-based (/api/v1/)
- **Deprecation**: 6-month notice period
- **Documentation**: OpenAPI/Swagger spec

## Conclusion

Petalbyte represents a modern approach to backup management, combining enterprise-grade features with home-user simplicity. The architecture prioritizes security, reliability, and user experience while maintaining flexibility for future enhancements.

The design decisions reflect a balance between feature completeness and implementation complexity, ensuring the system remains maintainable and extensible for the open-source community.