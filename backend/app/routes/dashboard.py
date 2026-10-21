"""
PharmaSync CARE — Dashboard & Analytics Routes
Serves executive summaries and Chart.js aggregation endpoints.
"""

from flask import Blueprint, request
from app.services.analytics_service import AnalyticsService
from app.utils.response import success_response, error_response

dashboard_bp = Blueprint('dashboard', __name__)
analytics_service = AnalyticsService()


@dashboard_bp.route('/dashboard/summary', methods=['GET'])
def get_dashboard_summary():
    facility_id = request.args.get('facilityId')
    try:
        data = analytics_service.get_dashboard_summary(facility_id)
        return success_response(data=data)
    except Exception as e:
        return error_response(code="DASHBOARD_ERROR", message=str(e), status_code=500)


@dashboard_bp.route('/dashboard/analytics', methods=['GET'])
def get_dashboard_analytics():
    timeframe = request.args.get('timeframe', '30')
    try:
        data = analytics_service.get_analytics(timeframe)
        return success_response(data=data)
    except Exception as e:
        return error_response(code="ANALYTICS_ERROR", message=str(e), status_code=500)
