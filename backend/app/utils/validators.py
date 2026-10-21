"""
PharmaSync CARE — Request Validation Utilities
Validates required fields, data types, date formats, and numeric boundaries.
"""

from datetime import datetime


def validate_required_fields(data, required_fields):
    """
    Validates presence of required fields in dictionary.
    Returns (is_valid, missing_or_invalid_fields).
    """
    if not isinstance(data, dict):
        return False, ["Request body must be a valid JSON object"]

    errors = {}
    for field in required_fields:
        val = data.get(field)
        if val is None or (isinstance(val, str) and not val.strip()):
            errors[field] = f"Field '{field}' is required and cannot be empty."

    if errors:
        return False, errors
    return True, {}


def validate_date(date_str, field_name="date"):
    """
    Validates ISO date format YYYY-MM-DD.
    """
    if not date_str:
        return False, f"Field '{field_name}' must be provided."
    try:
        parsed = datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
        return True, parsed
    except ValueError:
        return False, f"Field '{field_name}' must be a valid date in YYYY-MM-DD format."


def validate_positive_int(val, field_name="quantity", allow_zero=False):
    """
    Validates non-negative integer.
    """
    try:
        num = int(val)
        if allow_zero and num < 0:
            return False, f"Field '{field_name}' must be non-negative (>= 0)."
        if not allow_zero and num <= 0:
            return False, f"Field '{field_name}' must be a positive integer (> 0)."
        return True, num
    except (TypeError, ValueError):
        return False, f"Field '{field_name}' must be a valid integer."
