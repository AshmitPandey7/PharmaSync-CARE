"""
PharmaSync CARE — Digital Twin Simulation Routes
"""

from flask import Blueprint, request
from app.services.simulation_service import SimulationService
from app.utils.response import success_response, error_response

simulations_bp = Blueprint('simulations', __name__)
sim_service = SimulationService()


@simulations_bp.route('/simulations', methods=['GET'])
def list_simulations():
    try:
        sims = sim_service.get_simulations()
        return success_response(data=sims, meta={"total": len(sims)})
    except Exception as e:
        return error_response(code="SIMULATION_FETCH_ERROR", message=str(e), status_code=500)


@simulations_bp.route('/simulations/<id>', methods=['GET'])
def get_simulation(id):
    sim = sim_service.get_simulation(id)
    if not sim:
        return error_response(code="SIMULATION_NOT_FOUND", message=f"Simulation run '{id}' not found.", status_code=404)
    return success_response(data=sim)


@simulations_bp.route('/simulations', methods=['POST'])
def run_simulation():
    data = request.get_json(silent=True) or {}
    try:
        sim = sim_service.run_simulation(data)
        return success_response(data=sim, status_code=201)
    except Exception as e:
        return error_response(code="SIMULATION_EXECUTION_ERROR", message=str(e), status_code=400)
