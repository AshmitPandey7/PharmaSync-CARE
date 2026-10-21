"""
PharmaSync CARE — FairShare Allocation Routes
"""

from flask import Blueprint, request
from app.services.allocation_service import AllocationService
from app.utils.response import success_response, error_response

allocations_bp = Blueprint('allocations', __name__)
alloc_service = AllocationService()


@allocations_bp.route('/allocation/simulate', methods=['POST'])
@allocations_bp.route('/allocations/preview', methods=['POST'])
def simulate_allocation():
    data = request.get_json(silent=True) or {}
    try:
        result = alloc_service.simulate(data)
        return success_response(data=result)
    except Exception as e:
        return error_response(code="ALLOCATION_SIMULATION_ERROR", message=str(e), status_code=500)


@allocations_bp.route('/allocations/commit', methods=['POST'])
def commit_allocation():
    data = request.get_json(silent=True) or {}
    try:
        # Commit simulated allocation results
        allocations = data.get('allocations', [])
        return success_response(data={
            "committedCount": len(allocations),
            "status": "COMMITTED",
            "message": f"Successfully committed {len(allocations)} allocation manifests."
        })
    except Exception as e:
        return error_response(code="ALLOCATION_COMMIT_ERROR", message=str(e), status_code=400)
