"""
PharmaSync CARE — Inventory & Rescue Surveillance Routes
"""

from flask import Blueprint, request
from app.services.inventory_service import InventoryService
from app.utils.response import success_response, error_response
from app.utils.validators import validate_required_fields

inventory_bp = Blueprint('inventory', __name__)
inv_service = InventoryService()


@inventory_bp.route('/inventory', methods=['GET'])
def list_inventory():
    facility_id = request.args.get('facilityId')
    category = request.args.get('category')
    search = request.args.get('search')
    expiry_status = request.args.get('expiryStatus')
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', type=int) or request.args.get('limit', type=int)

    try:
        batches = inv_service.get_inventory(
            facility_id=facility_id,
            category=category,
            search=search,
            expiry_status=expiry_status
        )
        total = len(batches)

        if page is not None and per_page is not None and page > 0 and per_page > 0:
            start = (page - 1) * per_page
            end = start + per_page
            paginated = batches[start:end]
            meta = {"total": total, "page": page, "per_page": per_page}
            return success_response(data=paginated, meta=meta)

        return success_response(data=batches, meta={"total": total})
    except Exception as e:
        return error_response(code="INVENTORY_FETCH_ERROR", message=str(e), status_code=500)


@inventory_bp.route('/inventory/<id>', methods=['GET'])
def get_batch(id):
    batch = inv_service.get_batch(id)
    if not batch:
        return error_response(code="BATCH_NOT_FOUND", message=f"Batch '{id}' not found.", status_code=404)
    return success_response(data=batch)


@inventory_bp.route('/inventory', methods=['POST'])
def add_batch():
    data = request.get_json(silent=True) or {}
    required = ['medicineName', 'batchNumber', 'facilityId', 'strength', 'totalQuantity', 'expiryDate']
    is_valid, errors = validate_required_fields(data, required)
    if not is_valid:
        return error_response(code="VALIDATION_ERROR", message="Invalid inventory batch payload.", details=errors, status_code=422)

    user_id = request.headers.get('X-User-Id', 'Pharmacist')
    try:
        batch = inv_service.add_batch(data, user_name=user_id)
        return success_response(data=batch, status_code=201)
    except Exception as e:
        return error_response(code="INVENTORY_ADD_ERROR", message=str(e), status_code=400)


@inventory_bp.route('/inventory/<id>', methods=['PUT', 'PATCH'])
def update_batch(id):
    data = request.get_json(silent=True) or {}
    user_id = request.headers.get('X-User-Id', 'Pharmacist')
    try:
        batch = inv_service.update_batch(id, data, user_name=user_id)
        return success_response(data=batch)
    except Exception as e:
        return error_response(code="INVENTORY_UPDATE_ERROR", message=str(e), status_code=400)


# ----------------------------------------------------------------------------
# Rescue Centre / Surplus Surveillance Endpoints
# ----------------------------------------------------------------------------
@inventory_bp.route('/rescue/candidates', methods=['GET'])
@inventory_bp.route('/rescue-centre/risks', methods=['GET'])
@inventory_bp.route('/rescue-centre/surplus', methods=['GET'])
def get_rescue_candidates():
    try:
        candidates = inv_service.get_rescue_candidates()
        return success_response(data=candidates, meta={"total": len(candidates)})
    except Exception as e:
        return error_response(code="RESCUE_EVALUATION_ERROR", message=str(e), status_code=500)
