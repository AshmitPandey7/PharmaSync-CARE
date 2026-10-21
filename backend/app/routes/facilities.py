"""
PharmaSync CARE — Facility Directory Routes
"""

from flask import Blueprint, request
from app.services.facility_service import FacilityService
from app.utils.response import success_response, error_response
from app.utils.validators import validate_required_fields

facilities_bp = Blueprint('facilities', __name__)
facility_service = FacilityService()


@facilities_bp.route('/facilities', methods=['GET'])
def list_facilities():
    fac_type = request.args.get('type')
    cold_chain_raw = request.args.get('cold_chain') or request.args.get('coldChain')
    search = request.args.get('search')
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', type=int) or request.args.get('limit', type=int)

    cold_chain = None
    if cold_chain_raw is not None:
        cold_chain = cold_chain_raw.lower() in ('true', '1', 'yes')

    try:
        facilities = facility_service.get_facilities(
            facility_type=fac_type,
            cold_chain=cold_chain,
            search=search
        )
        total = len(facilities)

        if page is not None and per_page is not None and page > 0 and per_page > 0:
            start = (page - 1) * per_page
            end = start + per_page
            paginated = facilities[start:end]
            meta = {"total": total, "page": page, "per_page": per_page}
            return success_response(data=paginated, meta=meta)

        return success_response(data=facilities, meta={"total": total})
    except Exception as e:
        return error_response(code="FACILITIES_FETCH_ERROR", message=str(e), status_code=500)


@facilities_bp.route('/facilities/<id>', methods=['GET'])
def get_facility(id):
    fac = facility_service.get_facility(id)
    if not fac:
        return error_response(code="FACILITY_NOT_FOUND", message=f"Facility '{id}' not found.", status_code=404)
    return success_response(data=fac)


@facilities_bp.route('/facilities', methods=['POST'])
def create_facility():
    data = request.get_json(silent=True) or {}
    required = ['name', 'type', 'address', 'licenseNumber', 'contactPerson', 'phone']
    is_valid, errors = validate_required_fields(data, required)
    if not is_valid:
        return error_response(code="VALIDATION_ERROR", message="Invalid facility payload.", details=errors, status_code=422)

    user_id = request.headers.get('X-User-Id', 'Administrator')
    try:
        fac = facility_service.create_facility(data, user_name=user_id)
        return success_response(data=fac, status_code=201)
    except Exception as e:
        return error_response(code="FACILITY_CREATION_ERROR", message=str(e), status_code=400)


@facilities_bp.route('/facilities/<id>', methods=['PATCH', 'PUT'])
def update_facility(id):
    data = request.get_json(silent=True) or {}
    user_id = request.headers.get('X-User-Id', 'Administrator')
    try:
        fac = facility_service.update_facility(id, data, user_name=user_id)
        if not fac:
            return error_response(code="FACILITY_NOT_FOUND", message=f"Facility '{id}' not found.", status_code=404)
        return success_response(data=fac)
    except Exception as e:
        return error_response(code="FACILITY_UPDATE_ERROR", message=str(e), status_code=400)


@facilities_bp.route('/network/donors', methods=['GET'])
def list_donor_facilities():
    """Returns potential donor nodes having surplus stock capability."""
    try:
        facilities = facility_service.get_facilities()
        return success_response(data=facilities)
    except Exception as e:
        return error_response(code="NETWORK_FETCH_ERROR", message=str(e), status_code=500)
