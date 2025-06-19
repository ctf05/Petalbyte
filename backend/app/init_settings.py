# backend/app/init_settings.py
"""Initialize default settings for Petalbyte"""
import os
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, '/app/backend')

from config import Settings

def main():
    """Create default settings file"""
    print("Initializing Petalbyte settings...")

    # Create data directory
    data_dir = Path("/app/data")
    data_dir.mkdir(parents=True, exist_ok=True)

    # Create default settings
    settings = Settings()

    # Set some defaults based on environment
    settings.client_name = os.environ.get("HOSTNAME", "petalbyte-client")

    # Save settings
    settings.save()

    print(f"Settings saved to: {settings.settings_file}")
    print("Petalbyte is ready for configuration!")

if __name__ == "__main__":
    main()