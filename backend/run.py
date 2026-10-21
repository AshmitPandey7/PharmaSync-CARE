"""
PharmaSync CARE — Backend Server Entrypoint
Starts the Flask server with configured host, port, and debug mode.
"""

import os
import sys
from pathlib import Path

# Add backend directory to Python sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app import create_app
from app.config import Config

app = create_app(Config)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '127.0.0.1')
    debug = Config.DEBUG
    print(f"[*] Starting PharmaSync CARE Flask API on http://{host}:{port}")
    print(f"[*] API Base URL: http://{host}:{port}/api")
    print(f"[*] Health Check: http://{host}:{port}/api/health")
    app.run(host=host, port=port, debug=debug)
