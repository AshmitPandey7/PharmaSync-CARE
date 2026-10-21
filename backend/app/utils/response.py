"""
PharmaSync CARE — Standardized Response Builders
Conforms to unified API Contract envelope:
{
  "status": "success",
  "success": true,
  "data": ...,
  "meta": ...
}
"""

from flask import jsonify


def success_response(data=None, meta=None, status_code=200):
    """
    Constructs a consistent successful API response envelope.
    """
    payload = {
        "status": "success",
        "success": True,
        "data": data if data is not None else {}
    }
    if meta is not None:
        payload["meta"] = meta
    return jsonify(payload), status_code


def error_response(code="BAD_REQUEST", message="An error occurred", details=None, status_code=400):
    """
    Constructs a consistent error API response envelope.
    """
    error_obj = {
        "code": code,
        "message": message
    }
    if details:
        error_obj["details"] = details

    payload = {
        "status": "error",
        "success": False,
        "code": status_code,
        "message": message,
        "error": error_obj
    }
    return jsonify(payload), status_code
