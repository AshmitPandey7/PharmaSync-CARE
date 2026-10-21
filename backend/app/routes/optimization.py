"""
PharmaSync CARE — Multi-Objective Optimization Routes
"""

from flask import Blueprint, request
from app.services.optimization_service import OptimizationService
from app.utils.response import success_response, error_response

optimization_bp = Blueprint('optimization', __name__)
opt_service = OptimizationService()


@optimization_bp.route('/optimization/runs', methods=['GET'])
def list_optimization_runs():
    try:
        runs = opt_service.get_runs()
        return success_response(data=runs, meta={"total": len(runs)})
    except Exception as e:
        return error_response(code="OPTIMIZATION_FETCH_ERROR", message=str(e), status_code=500)


@optimization_bp.route('/optimization/runs/<id>', methods=['GET'])
def get_optimization_run(id):
    run = opt_service.get_run(id)
    if not run:
        return error_response(code="RUN_NOT_FOUND", message=f"Optimization run '{id}' not found.", status_code=404)
    return success_response(data=run)


@optimization_bp.route('/optimization/runs', methods=['POST'])
def run_optimization():
    data = request.get_json(silent=True) or {}
    try:
        run = opt_service.run_optimization(data)
        return success_response(data=run, status_code=201)
    except Exception as e:
        return error_response(code="OPTIMIZATION_EXEC_ERROR", message=str(e), status_code=400)


@optimization_bp.route('/optimization/counterfactuals', methods=['POST'])
def run_counterfactual():
    data = request.get_json(silent=True) or {}
    try:
        result = opt_service.counterfactual_analysis(data)
        return success_response(data=result)
    except Exception as e:
        return error_response(code="COUNTERFACTUAL_ERROR", message=str(e), status_code=400)
