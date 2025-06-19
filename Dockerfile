# Dockerfile
FROM python:3.11-slim-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    btrfs-progs \
    openssh-client \
    gnupg \
    curl \
    wget \
    git \
    sudo \
    netcat-openbsd \
    lsof \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install Tailscale
RUN curl -fsSL https://tailscale.com/install.sh | sh

# Create app directory
WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy frontend and build
COPY frontend/package*.json frontend/
WORKDIR /app/frontend
RUN npm ci

COPY frontend/ .
RUN npm run build

# Copy backend code
WORKDIR /app
COPY backend/ backend/

# Copy startup script
COPY scripts/startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

# Create necessary directories
RUN mkdir -p /app/data /var/lib/btrfs-backup /.snapshots

# Expose ports
EXPOSE 8000 3000

# Set environment variables
ENV PYTHONPATH=/app/backend
ENV NODE_ENV=production

# Run startup script
CMD ["/app/startup.sh"]