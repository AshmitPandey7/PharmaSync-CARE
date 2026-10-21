"""
PharmaSync CARE — Users and Authentication Routes
"""

from flask import Blueprint, request
from app.services.auth_service import AuthService
from app.utils.response import success_response, error_response

auth_bp = Blueprint('auth', __name__)
auth_service = AuthService()


@auth_bp.route('/users', methods=['GET'])
def list_users():
    try:
        users = auth_service.get_users()
        return success_response(data=users)
    except Exception as e:
        return error_response(code="USERS_FETCH_ERROR", message=str(e), status_code=500)


@auth_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get('username')
    password = data.get('password')
    ip_addr = request.remote_addr or '127.0.0.1'

    try:
        result = auth_service.login(username, password, ip_address=ip_addr)
        return success_response(data=result)
    except ValueError as e:
        return error_response(code="INVALID_CREDENTIALS", message=str(e), status_code=401)
    except Exception as e:
        return error_response(code="LOGIN_ERROR", message=str(e), status_code=500)
