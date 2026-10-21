"""
PharmaSync CARE — Smart Matching Routes
"""

from flask import Blueprint, request
from app.services.matching_service import MatchingService
from app.utils.response import success_response, error_response

matching_bp = Blueprint('matching', __name__)
matching_service = MatchingService()


@matching_bp.route('/matching/candidates', methods=['POST'])
@matching_bp.route('/matching/recommendations', methods=['POST'])
def find_matching_candidates():
    data = request.get_json(silent=True) or {}
    shortage_id = data.get('shortageId')
    if not shortage_id:
        return error_response(code="VALIDATION_ERROR", message="Field 'shortageId' is required.", status_code=422)

    try:
        results = matching_service.find_candidates(shortage_id)
        return success_response(data=results)
    except ValueError as e:
        return error_response(code="MATCHING_ERROR", message=str(e), status_code=404)
    except Exception as e:
        return error_response(code="MATCHING_SERVER_ERROR", message=str(e), status_code=500)
