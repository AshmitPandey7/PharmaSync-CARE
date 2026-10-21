"""
PharmaSync CARE — Medicine Formulary Repository (MongoDB)
Handles medicine definitions and catalog specifications.
"""

from datetime import datetime, timezone
from app.repositories.base_repository import BaseRepository


class MedicineRepository(BaseRepository):

    def __init__(self):
        super().__init__('medicines')

    def _format_medicine(self, doc):
        if not doc:
            return None
        return {
            "id": doc.get('id') or str(doc.get('_id')),
            "name": doc.get('name', ''),
            "genericName": doc.get('genericName', doc.get('name', '')),
            "strength": doc.get('strength', ''),
            "dosageForm": doc.get('dosageForm', 'Injectable'),
            "category": doc.get('category', 'General'),
            "coldChainRequired": bool(doc.get('coldChainRequired', False)),
            "storageTempMin": float(doc.get('storageTempMin', 15.0)),
            "storageTempMax": float(doc.get('storageTempMax', 25.0)),
            "standardUnit": doc.get('standardUnit', 'Unit'),
            "minShelfLifeDays": int(doc.get('minShelfLifeDays', 45)),
            "createdAt": doc.get('createdAt', datetime.now(timezone.utc)).isoformat() if isinstance(doc.get('createdAt'), datetime) else str(doc.get('createdAt', '')),
            "updatedAt": doc.get('updatedAt', datetime.now(timezone.utc)).isoformat() if isinstance(doc.get('updatedAt'), datetime) else str(doc.get('updatedAt', ''))
        }

    def get_all(self, search=None, category=None):
        query = {}
        if category and category != 'ALL':
            query['category'] = category

        if search:
            regex = {'$regex': search, '$options': 'i'}
            query['$or'] = [
                {'name': regex},
                {'genericName': regex},
                {'id': regex}
            ]

        cursor = self.collection.find(query).sort('name', 1)
        return [self._format_medicine(doc) for doc in cursor]

    def get_by_id(self, med_id):
        doc = self.collection.find_one(self.id_query(med_id))
        return self._format_medicine(doc)

    def create(self, data):
        doc = dict(data)
        now = datetime.now(timezone.utc)
        doc['createdAt'] = now
        doc['updatedAt'] = now
        doc['coldChainRequired'] = bool(doc.get('coldChainRequired', False))
        doc['storageTempMin'] = float(doc.get('storageTempMin', 15.0))
        doc['storageTempMax'] = float(doc.get('storageTempMax', 25.0))
        doc['minShelfLifeDays'] = int(doc.get('minShelfLifeDays', 45))

        # Check unique constraint on id
        existing = self.collection.find_one({"id": doc['id']})
        if existing:
            raise ValueError(f"Medicine with code '{doc['id']}' already exists.")

        self.collection.insert_one(doc)
        return self.get_by_id(doc['id'])

    def update(self, med_id, updates):
        allowed = [
            'name', 'genericName', 'strength', 'dosageForm', 'category',
            'coldChainRequired', 'storageTempMin', 'storageTempMax',
            'standardUnit', 'minShelfLifeDays'
        ]
        set_dict = {}
        for key in allowed:
            if key in updates:
                set_dict[key] = updates[key]

        if 'coldChainRequired' in set_dict:
            set_dict['coldChainRequired'] = bool(set_dict['coldChainRequired'])
        if 'storageTempMin' in set_dict:
            set_dict['storageTempMin'] = float(set_dict['storageTempMin'])
        if 'storageTempMax' in set_dict:
            set_dict['storageTempMax'] = float(set_dict['storageTempMax'])
        if 'minShelfLifeDays' in set_dict:
            set_dict['minShelfLifeDays'] = int(set_dict['minShelfLifeDays'])

        if not set_dict:
            return self.get_by_id(med_id)

        set_dict['updatedAt'] = datetime.now(timezone.utc)
        self.collection.update_one(self.id_query(med_id), {'$set': set_dict})
        return self.get_by_id(med_id)

    def delete(self, med_id):
        res = self.collection.delete_one(self.id_query(med_id))
        return res.deleted_count > 0
