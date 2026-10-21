"""
PharmaSync CARE — Medicine Formulary Routes
"""

from flask import Blueprint, request
from app.services.medicine_service import MedicineService
from app.utils.response import success_response, error_response
from app.utils.validators import validate_required_fields

medicines_bp = Blueprint('medicines', __name__)
med_service = MedicineService()


@medicines_bp.route('/medicines', methods=['GET'])
def list_medicines():
    search = request.args.get('search')
    category = request.args.get('category')
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', type=int) or request.args.get('limit', type=int)

    try:
        meds = med_service.get_medicines(search=search, category=category)
        total = len(meds)

        if page is not None and per_page is not None and page > 0 and per_page > 0:
            start = (page - 1) * per_page
            end = start + per_page
            paginated = meds[start:end]
            meta = {"total": total, "page": page, "per_page": per_page}
            return success_response(data=paginated, meta=meta)

        return success_response(data=meds, meta={"total": total})
    except Exception as e:
        return error_response(code="MEDICINES_FETCH_ERROR", message=str(e), status_code=500)


@medicines_bp.route('/medicines/<id>', methods=['GET'])
def get_medicine(id):
    med = med_service.get_medicine(id)
    if not med:
        return error_response(code="MEDICINE_NOT_FOUND", message=f"Medicine '{id}' not found.", status_code=404)
    return success_response(data=med)


@medicines_bp.route('/medicines', methods=['POST'])
def create_medicine():
    data = request.get_json(silent=True) or {}
    required = ['name', 'genericName', 'strength', 'dosageForm', 'category']
    is_valid, errors = validate_required_fields(data, required)
    if not is_valid:
        return error_response(code="VALIDATION_ERROR", message="Invalid medicine payload.", details=errors, status_code=422)

    try:
        med = med_service.create_medicine(data)
        return success_response(data=med, status_code=201)
    except Exception as e:
        return error_response(code="MEDICINE_CREATION_ERROR", message=str(e), status_code=400)


@medicines_bp.route('/medicines/<id>', methods=['PATCH', 'PUT'])
def update_medicine(id):
    data = request.get_json(silent=True) or {}
    try:
        med = med_service.update_medicine(id, data)
        if not med:
            return error_response(code="MEDICINE_NOT_FOUND", message=f"Medicine '{id}' not found.", status_code=404)
        return success_response(data=med)
    except Exception as e:
        return error_response(code="MEDICINE_UPDATE_ERROR", message=str(e), status_code=400)
