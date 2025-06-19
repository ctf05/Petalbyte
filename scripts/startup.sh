#!/bin/bash
# scripts/startup.sh

set -e

echo "Starting Btrfs Backup Manager..."

# Initialize settings if not exists
if [ ! -f /app/data/settings.json ]; then
    echo "Creating default settings..."
    python /app/backend/app/init_settings.py
fi

# Start Tailscale daemon if needed
if [ -z "$(pidof tailscaled)" ]; then
    echo "Starting Tailscale daemon..."
    tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &
    sleep 2
fi

# Serve frontend static files
echo "Starting frontend server..."
cd /app/frontend/dist && python -m http.server 3000 &

# Start FastAPI backend
echo "Starting backend API..."
cd /app/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Keep container running
wait