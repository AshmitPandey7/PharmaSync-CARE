"""
PharmaSync CARE — Shortage Request Routes
"""

from flask import Blueprint, request
from app.services.shortage_service import ShortageService
from app.utils.response import success_response, error_response
from app.utils.validators import validate_required_fields

shortages_bp = Blueprint('shortages', __name__)
shortage_service = ShortageService()


@shortages_bp.route('/shortages', methods=['GET'])
def list_shortages():
    urgency = request.args.get('urgency')
    status = request.args.get('status')
    facility_id = request.args.get('facilityId')
    search = request.args.get('search')
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', type=int) or request.args.get('limit', type=int)

    try:
        shortages = shortage_service.get_shortages(
            urgency=urgency,
            status=status,
            facility_id=facility_id,
            search=search
        )
        total = len(shortages)

        if page is not None and per_page is not None and page > 0 and per_page > 0:
            start = (page - 1) * per_page
            end = start + per_page
            paginated = shortages[start:end]
            meta = {"total": total, "page": page, "per_page": per_page}
            return success_response(data=paginated, meta=meta)

        return success_response(data=shortages, meta={"total": total})
    except Exception as e:
        return error_response(code="SHORTAGES_FETCH_ERROR", message=str(e), status_code=500)


@shortages_bp.route('/shortages/<id>', methods=['GET'])
def get_shortage(id):
    s = shortage_service.get_shortage(id)
    if not s:
        return error_response(code="SHORTAGE_NOT_FOUND", message=f"Shortage ticket '{id}' not found.", status_code=404)
    return success_response(data=s)


@shortages_bp.route('/shortages', methods=['POST'])
def create_shortage():
    data = request.get_json(silent=True) or {}
    required = ['facilityId', 'medicineName', 'strength', 'requiredQuantity', 'requiredByDate']
    is_valid, errors = validate_required_fields(data, required)
    if not is_valid:
        return error_response(code="VALIDATION_ERROR", message="Invalid shortage declaration payload.", details=errors, status_code=422)

    user_id = request.headers.get('X-User-Id', 'Clinical Officer')
    try:
        shortage = shortage_service.create_shortage(data, user_name=user_id)
        return success_response(data=shortage, status_code=201)
    except Exception as e:
        return error_response(code="SHORTAGE_CREATION_ERROR", message=str(e), status_code=400)


@shortages_bp.route('/shortages/<id>', methods=['PATCH', 'PUT'])
def update_shortage(id):
    data = request.get_json(silent=True) or {}
    user_id = request.headers.get('X-User-Id', 'Clinical Officer')
    try:
        shortage = shortage_service.update_shortage(id, data, user_name=user_id)
        if not shortage:
            return error_response(code="SHORTAGE_NOT_FOUND", message=f"Shortage ticket '{id}' not found.", status_code=404)
        return success_response(data=shortage)
    except Exception as e:
        return error_response(code="SHORTAGE_UPDATE_ERROR", message=str(e), status_code=400)


@shortages_bp.route('/shortages/<id>', methods=['DELETE'])
def delete_shortage(id):
    user_id = request.headers.get('X-User-Id', 'Clinical Officer')
    try:
        deleted = shortage_service.delete_shortage(id, user_name=user_id)
        if not deleted:
            return error_response(code="SHORTAGE_NOT_FOUND", message=f"Shortage ticket '{id}' not found.", status_code=404)
        return success_response(data={"id": id, "deleted": True, "message": f"Shortage ticket '{id}' deleted successfully."})
    except Exception as e:
        return error_response(code="SHORTAGE_DELETE_ERROR", message=str(e), status_code=500)
