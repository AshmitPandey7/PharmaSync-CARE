"""
PharmaSync CARE — Audit Logs Routes
"""

from flask import Blueprint, request
from app.services.audit_service import AuditService
from app.utils.response import success_response, error_response

audit_bp = Blueprint('audit', __name__)
audit_service = AuditService()


@audit_bp.route('/audit-logs', methods=['GET'])
def get_audit_logs():
    limit = int(request.args.get('limit', 100))
    try:
        logs = audit_service.get_logs(limit)
        return success_response(data=logs, meta={"total": len(logs)})
    except Exception as e:
        return error_response(code="AUDIT_FETCH_ERROR", message=str(e), status_code=500)
