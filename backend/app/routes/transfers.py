"""
PharmaSync CARE — Transfer Manifest & Custody Tracking Routes
"""

from flask import Blueprint, request
from app.services.transfer_service import TransferService
from app.utils.response import success_response, error_response
from app.utils.validators import validate_required_fields

transfers_bp = Blueprint('transfers', __name__)
transfer_service = TransferService()


@transfers_bp.route('/transfers', methods=['GET'])
def list_transfers():
    status = request.args.get('status')
    facility_id = request.args.get('facilityId')
    search = request.args.get('search')

    try:
        transfers = transfer_service.get_transfers(
            status=status,
            facility_id=facility_id,
            search=search
        )
        return success_response(data=transfers, meta={"total": len(transfers)})
    except Exception as e:
        return error_response(code="TRANSFERS_FETCH_ERROR", message=str(e), status_code=500)


@transfers_bp.route('/transfers/<id>', methods=['GET'])
def get_transfer(id):
    trf = transfer_service.get_transfer(id)
    if not trf:
        return error_response(code="TRANSFER_NOT_FOUND", message=f"Transfer '{id}' not found.", status_code=404)
    return success_response(data=trf)


@transfers_bp.route('/transfers', methods=['POST'])
def create_transfer():
    data = request.get_json(silent=True) or {}
    required = ['senderFacilityId', 'recipientFacilityId', 'batchId', 'medicineName', 'quantity']
    is_valid, errors = validate_required_fields(data, required)
    if not is_valid:
        return error_response(code="VALIDATION_ERROR", message="Invalid transfer payload.", details=errors, status_code=422)

    user_id = request.headers.get('X-User-Id', 'Pharmacist')
    try:
        transfer = transfer_service.create_transfer(data, user_name=user_id)
        return success_response(data=transfer, status_code=201)
    except ValueError as e:
        return error_response(code="TRANSFER_VALIDATION_ERROR", message=str(e), status_code=400)
    except Exception as e:
        return error_response(code="TRANSFER_CREATION_ERROR", message=str(e), status_code=500)


@transfers_bp.route('/transfers/<id>/status', methods=['PUT', 'POST'])
def update_transfer_status(id):
    data = request.get_json(silent=True) or {}
    new_status = data.get('status')
    note = data.get('note', '')
    if not new_status:
        return error_response(code="VALIDATION_ERROR", message="Field 'status' is required.", status_code=422)

    user_id = request.headers.get('X-User-Id', 'Pharmacist')
    try:
        updated = transfer_service.advance_status(id, new_status, note=note, user_name=user_id)
        return success_response(data=updated)
    except ValueError as e:
        return error_response(code="LIFECYCLE_ERROR", message=str(e), status_code=400)
    except Exception as e:
        return error_response(code="TRANSFER_UPDATE_ERROR", message=str(e), status_code=500)


@transfers_bp.route('/transfers/<id>/approve', methods=['POST'])
def approve_transfer(id):
    data = request.get_json(silent=True) or {}
    user_id = request.headers.get('X-User-Id', 'Chief Pharmacist')
    try:
        updated = transfer_service.advance_status(id, 'APPROVED', note=data.get('note', 'Approved'), user_name=user_id)
        return success_response(data=updated)
    except Exception as e:
        return error_response(code="APPROVE_ERROR", message=str(e), status_code=400)


@transfers_bp.route('/transfers/<id>/dispatch', methods=['POST'])
def dispatch_transfer(id):
    data = request.get_json(silent=True) or {}
    user_id = request.headers.get('X-User-Id', 'Lead Pharmacist')
    try:
        updated = transfer_service.advance_status(id, 'DISPATCHED', note=data.get('note', 'Dispatched'), user_name=user_id)
        return success_response(data=updated)
    except Exception as e:
        return error_response(code="DISPATCH_ERROR", message=str(e), status_code=400)


@transfers_bp.route('/transfers/<id>/receive', methods=['POST'])
def receive_transfer(id):
    data = request.get_json(silent=True) or {}
    user_id = request.headers.get('X-User-Id', 'Receiving Pharmacist')
    try:
        updated = transfer_service.advance_status(id, 'RECEIVED', note=data.get('note', 'Received and inspected'), user_name=user_id)
        return success_response(data=updated)
    except Exception as e:
        return error_response(code="RECEIVE_ERROR", message=str(e), status_code=400)


@transfers_bp.route('/transfers/<id>/cancel', methods=['POST'])
def cancel_transfer(id):
    data = request.get_json(silent=True) or {}
    user_id = request.headers.get('X-User-Id', 'Pharmacist')
    try:
        updated = transfer_service.advance_status(id, 'CANCELLED', note=data.get('note', 'Cancelled'), user_name=user_id)
        return success_response(data=updated)
    except Exception as e:
        return error_response(code="CANCEL_ERROR", message=str(e), status_code=400)


@transfers_bp.route('/transfers/<id>', methods=['DELETE'])
def delete_transfer(id):
    data = request.get_json(silent=True) or {}
    user_id = request.headers.get('X-User-Id', 'Pharmacist')
    try:
        updated = transfer_service.advance_status(id, 'CANCELLED', note=data.get('note', 'Order deleted by operator'), user_name=user_id)
        return success_response(data={"id": id, "cancelled": True, "message": f"Transfer '{id}' cancelled and reserved stock released."})
    except Exception as e:
        return error_response(code="CANCEL_ERROR", message=str(e), status_code=400)
