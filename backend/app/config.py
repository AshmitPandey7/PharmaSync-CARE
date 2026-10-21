"""
PharmaSync CARE — Backend Configuration Loader
Loads environment variables safely for Flask and MongoDB Atlas.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Locate project base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent

# Load .env file from backend or root directory
dotenv_path = BACKEND_DIR / '.env'
if not dotenv_path.exists():
    dotenv_path = BASE_DIR / '.env'

load_dotenv(dotenv_path=dotenv_path)


class Config:
    """Base application configuration."""

    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-dev-secret-key-pharmasync-2026')
    DEBUG = os.getenv('FLASK_DEBUG', '1') in ('1', 'true', 'True')
    PORT = int(os.getenv('PORT', 5000))
    HOST = os.getenv('HOST', '127.0.0.1')

    # CORS origins list
    cors_raw = os.getenv(
        'CORS_ORIGINS',
        'http://127.0.0.1:8000,http://localhost:8000,http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:5500,http://localhost:5500'
    )
    CORS_ORIGINS = [origin.strip() for origin in cors_raw.split(',') if origin.strip()]

    # MongoDB Atlas configuration
    MONGODB_URI = os.getenv('MONGODB_URI', '').strip()
    MONGODB_DATABASE = os.getenv('MONGODB_DATABASE', 'pharmasync_care').strip()
    MONGODB_TIMEOUT_MS = int(os.getenv('MONGODB_TIMEOUT_MS', 3000))

    # Healthcare safety policy constants
    MIN_SHELF_LIFE_DAYS = int(os.getenv('MIN_SHELF_LIFE_DAYS', 45))
    SAFETY_STOCK_BUFFER_PCT = float(os.getenv('SAFETY_STOCK_BUFFER_PCT', 0.20))
    LOCAL_RADIUS_KM = float(os.getenv('LOCAL_RADIUS_KM', 15.0))
    REGIONAL_RADIUS_KM = float(os.getenv('REGIONAL_RADIUS_KM', 60.0))


class TestConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = False
    MONGODB_DATABASE = 'pharmasync_care_test'
