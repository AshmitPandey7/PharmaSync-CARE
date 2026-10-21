"""
PharmaSync CARE — Medicine Formulary Service
Business logic for catalog specifications and medicines lookup.
"""

import uuid
from app.repositories.medicine_repository import MedicineRepository


class MedicineService:
    def __init__(self):
        self.repo = MedicineRepository()

    def get_medicines(self, search=None, category=None):
        return self.repo.get_all(search, category)

    def get_medicine(self, med_id):
        return self.repo.get_by_id(med_id)

    def create_medicine(self, data):
        if not data.get('id'):
            data['id'] = f"MED-{str(uuid.uuid4())[:8].upper()}"
        return self.repo.create(data)

    def update_medicine(self, med_id, data):
        med = self.repo.get_by_id(med_id)
        if not med:
            return None
        return self.repo.update(med_id, data)
