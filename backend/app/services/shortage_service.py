"""
PharmaSync CARE — Shortage Ticket Service
Handles shortage ticket declarations, clinical urgency validations, and status tracking.
"""

import uuid
from datetime import datetime, date
from app.repositories.shortage_repository import ShortageRepository
from app.repositories.facility_repository import FacilityRepository
from app.repositories.audit_repository import AuditRepository


class ShortageService:
    def __init__(self):
        self.repo = ShortageRepository()
        self.fac_repo = FacilityRepository()
        self.audit = AuditRepository()

    def get_shortages(self, urgency=None, status=None, facility_id=None, search=None):
        return self.repo.get_all(urgency, status, facility_id, search)

    def get_shortage(self, shortage_id):
        return self.repo.get_by_id(shortage_id)

    def create_shortage(self, data, user_name="Clinical Officer"):
        # Validation
        if not data.get('facilityId') or not data.get('medicineName') or not data.get('strength'):
            raise ValueError("Facility ID, medicine name, and strength are required.")

        req_qty = int(data.get('requiredQuantity', 0))
        if req_qty <= 0:
            raise ValueError("Required quantity must be a positive integer.")

        req_by_str = data.get('requiredByDate')
        if not req_by_str:
            raise ValueError("Required by date must be provided.")

        req_by_date = datetime.strptime(str(req_by_str).strip(), "%Y-%m-%d").date()
        if req_by_date < date.today():
            raise ValueError("Required by date cannot be in the past.")

        urgency = str(data.get('urgency', 'ROUTINE')).upper()
        if urgency not in ('EMERGENCY', 'HIGH', 'ROUTINE'):
            urgency = 'ROUTINE'
        data['urgency'] = urgency

        if not data.get('id'):
            data['id'] = f"SHT-{str(uuid.uuid4())[:8].upper()}"

        shortage = self.repo.create(data)

        self.audit.log(
            action="SHORTAGE_CREATED",
            entity=shortage['id'],
            user_name=user_name,
            role="Clinical Officer",
            details=f"Declared {urgency} shortage of {shortage['medicineName']} ({req_qty} units) for facility {shortage['facilityId']}"
        )
        return shortage

    def update_shortage(self, shortage_id, updates, user_name="Clinical Officer"):
        shortage = self.repo.get_by_id(shortage_id)
        if not shortage:
            return None

        # Validate updates if quantities modified
        if 'requiredQuantity' in updates:
            req_qty = int(updates['requiredQuantity'])
            if req_qty <= 0:
                raise ValueError("Required quantity must be a positive integer.")
            fulfilled = int(updates.get('fulfilledQuantity', shortage['fulfilledQuantity']))
            updates['unmetQuantity'] = max(0, req_qty - fulfilled)

        if 'urgency' in updates:
            urg = str(updates['urgency']).upper()
            if urg not in ('EMERGENCY', 'HIGH', 'ROUTINE'):
                raise ValueError("Urgency must be one of EMERGENCY, HIGH, ROUTINE.")
            updates['urgency'] = urg

        if 'status' in updates:
            stat = str(updates['status']).upper()
            if stat not in ('OPEN', 'PARTIALLY_MATCHED', 'FULFILLED', 'CANCELLED'):
                raise ValueError("Status must be one of OPEN, PARTIALLY_MATCHED, FULFILLED, CANCELLED.")
            updates['status'] = stat

        updated = self.repo.update(shortage_id, updates)
        self.audit.log(
            action="SHORTAGE_UPDATED",
            entity=shortage_id,
            user_name=user_name,
            role="Clinical Officer",
            details=f"Updated shortage ticket {shortage_id}: {', '.join(f'{k}={v}' for k, v in updates.items())}"
        )
        return updated
