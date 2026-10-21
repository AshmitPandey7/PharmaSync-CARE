"""
PharmaSync CARE — Facility Service
Business logic for healthcare nodes and directory lookups.
"""

import uuid
from app.repositories.facility_repository import FacilityRepository
from app.repositories.audit_repository import AuditRepository


class FacilityService:
    def __init__(self):
        self.repo = FacilityRepository()
        self.audit = AuditRepository()

    def get_facilities(self, facility_type=None, cold_chain=None, search=None, reference_coords=None):
        return self.repo.get_all(facility_type, cold_chain, search, reference_coords)

    def get_facility(self, facility_id, reference_coords=None):
        return self.repo.get_by_id(facility_id, reference_coords)

    def create_facility(self, data, user_name="Administrator"):
        if not data.get('id'):
            data['id'] = f"FAC-{str(uuid.uuid4())[:8].upper()}"
        fac = self.repo.create(data)
        self.audit.log(
            action="FACILITY_REGISTERED",
            entity=fac['id'],
            user_name=user_name,
            role="System Admin",
            details=f"Registered healthcare facility: {fac['name']} ({fac['type']})"
        )
        return fac

    def update_facility(self, facility_id, updates, user_name="Administrator"):
        fac = self.repo.update(facility_id, updates)
        self.audit.log(
            action="FACILITY_UPDATED",
            entity=facility_id,
            user_name=user_name,
            role="System Admin",
            details=f"Updated facility attributes for {facility_id}"
        )
        return fac
