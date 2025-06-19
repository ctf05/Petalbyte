# backend/app/utils/logging.py
import logging
import sys
from pathlib import Path
from datetime import datetime

def setup_logging():
    """Configure logging for Petalbyte"""

    # Create logs directory
    log_dir = Path("/app/data/logs")
    log_dir.mkdir(parents=True, exist_ok=True)

    # Log file with date
    log_file = log_dir / f"petalbyte_{datetime.now().strftime('%Y%m%d')}.log"

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Console handler with color
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)

    # File handler
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)

    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)

    # Add handlers
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

    # Log startup
    logger = logging.getLogger(__name__)
    logger.info("=" * 50)
    logger.info("Petalbyte Backup Manager Starting")
    logger.info("=" * 50)