"""
PharmaSync CARE — Health Check Route
Verifies server operation and MongoDB Atlas connectivity via a live ping.
Never exposes credentials or internal connection strings.
"""

from datetime import datetime, timezone
from flask import Blueprint
from app.database import get_db
from app.utils.response import success_response, error_response

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def check_health():
    db = get_db()
    
    try:
        # Actually verify database connectivity via ping command
        db.ping()
        db_status = "CONNECTED"
        engine_name = "MongoDB Atlas" if not db.is_mock else "MongoDB In-Memory (Test/Fallback)"
    except Exception:
        # Report unavailable database without leaking internal connection details or credentials
        return error_response(
            code="DATABASE_UNAVAILABLE",
            message="Database connectivity check failed. Could not communicate with MongoDB Atlas cluster.",
            details={"database": "Database connection unreachable or timed out."},
            status_code=503
        )

    return success_response(data={
        "status": "OK",
        "mode": "LIVE_DATABASE",
        "database": db_status,
        "engine": engine_name,
        "cluster": "Connected" if not db.is_mock else "In-Memory Simulation",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
