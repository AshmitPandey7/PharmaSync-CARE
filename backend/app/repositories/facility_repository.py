"""
PharmaSync CARE — Facility Repository (MongoDB)
Handles database operations for healthcare institutions, pharmacies, and hubs.
"""

from datetime import datetime, timezone
from bson import ObjectId
from app.repositories.base_repository import BaseRepository
from app.utils.geo import calculate_distance_km


class FacilityRepository(BaseRepository):

    def __init__(self):
        super().__init__('facilities')

    def _format_facility(self, doc, reference_coords=None):
        if not doc:
            return None

        # Coordinates [lat, lng]
        coords = doc.get('coordinates', [12.9716, 77.5946])
        if not isinstance(coords, list) or len(coords) < 2:
            coords = [12.9716, 77.5946]
        else:
            coords = [float(coords[0]), float(coords[1])]

        ref = reference_coords or [12.9716, 77.5946]
        distance_km = calculate_distance_km(ref, coords)

        return {
            "id": doc.get('id') or str(doc.get('_id')),
            "name": doc.get('name', ''),
            "type": doc.get('type', 'Hospital Pharmacy'),
            "typeBadge": doc.get('typeBadge', 'hospital'),
            "address": doc.get('address', ''),
            "coordinates": coords,
            "distanceKm": distance_km,
            "coldChainCertified": bool(doc.get('coldChainCertified', False)),
            "licenseNumber": doc.get('licenseNumber', ''),
            "bedCapacity": int(doc.get('bedCapacity', 0)),
            "contactPerson": doc.get('contactPerson', ''),
            "phone": doc.get('phone', ''),
            "status": doc.get('status', 'ACTIVE'),
            "createdAt": doc.get('createdAt', datetime.now(timezone.utc)).isoformat() if isinstance(doc.get('createdAt'), datetime) else str(doc.get('createdAt', '')),
            "updatedAt": doc.get('updatedAt', datetime.now(timezone.utc)).isoformat() if isinstance(doc.get('updatedAt'), datetime) else str(doc.get('updatedAt', ''))
        }

    def get_all(self, facility_type=None, cold_chain=None, search=None, reference_coords=None):
        query = {}

        if facility_type and facility_type != 'ALL':
            query['type'] = facility_type

        if cold_chain is not None:
            query['coldChainCertified'] = bool(cold_chain)

        if search:
            regex = {'$regex': search, '$options': 'i'}
            query['$or'] = [
                {'name': regex},
                {'address': regex},
                {'licenseNumber': regex},
                {'id': regex}
            ]

        cursor = self.collection.find(query).sort('name', 1)
        return [self._format_facility(doc, reference_coords) for doc in cursor]

    def get_by_id(self, facility_id, reference_coords=None):
        doc = self.collection.find_one(self.id_query(facility_id))
        return self._format_facility(doc, reference_coords)

    def create(self, facility_data):
        doc = dict(facility_data)
        now = datetime.now(timezone.utc)
        doc['createdAt'] = now
        doc['updatedAt'] = now

        # Ensure coordinates are stored properly
        coords = doc.get('coordinates', [12.9716, 77.5946])
        doc['coordinates'] = [float(coords[0]), float(coords[1])]
        doc['location'] = {
            "type": "Point",
            "coordinates": [float(coords[1]), float(coords[0])]
        }
        doc['coldChainCertified'] = bool(doc.get('coldChainCertified', False))
        doc['bedCapacity'] = int(doc.get('bedCapacity', 0))

        # Check unique constraints before inserting
        existing = self.collection.find_one({
            "$or": [
                {"id": doc['id']},
                {"licenseNumber": doc['licenseNumber']}
            ]
        })
        if existing:
            raise ValueError(f"Facility with code '{doc['id']}' or license '{doc['licenseNumber']}' already exists.")

        self.collection.insert_one(doc)
        return self.get_by_id(doc['id'])

    def update(self, facility_id, updates):
        allowed = [
            'name', 'type', 'typeBadge', 'address', 'coordinates',
            'coldChainCertified', 'bedCapacity', 'contactPerson',
            'phone', 'status'
        ]
        set_dict = {}
        for key in allowed:
            if key in updates:
                set_dict[key] = updates[key]

        if 'coordinates' in set_dict:
            coords = set_dict['coordinates']
            set_dict['coordinates'] = [float(coords[0]), float(coords[1])]
            set_dict['location'] = {
                "type": "Point",
                "coordinates": [float(coords[1]), float(coords[0])]
            }

        if 'coldChainCertified' in set_dict:
            set_dict['coldChainCertified'] = bool(set_dict['coldChainCertified'])

        if 'bedCapacity' in set_dict:
            set_dict['bedCapacity'] = int(set_dict['bedCapacity'])

        if not set_dict:
            return self.get_by_id(facility_id)

        set_dict['updatedAt'] = datetime.now(timezone.utc)
        self.collection.update_one(self.id_query(facility_id), {'$set': set_dict})
        return self.get_by_id(facility_id)

    def delete(self, facility_id):
        res = self.collection.delete_one(self.id_query(facility_id))
        return res.deleted_count > 0
