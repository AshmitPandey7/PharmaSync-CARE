"""
PharmaSync CARE — Shortage Ticket Repository (MongoDB)
Handles healthcare facility medicine shortages and fulfillment updates.
"""

from datetime import datetime, date, timezone
from app.repositories.base_repository import BaseRepository

URGENCY_ORDER = {
    'EMERGENCY': 1,
    'CRITICAL': 1,
    'HIGH': 2,
    'MEDIUM': 3,
    'LOW': 4
}


class ShortageRepository(BaseRepository):

    def __init__(self):
        super().__init__('shortage_tickets')

    def _format_shortage(self, doc):
        if not doc:
            return None

        req_date = doc.get('requestedDate')
        req_str = req_date.isoformat().split('T')[0] if isinstance(req_date, (datetime, date)) else str(req_date or '').split('T')[0]

        req_by_date = doc.get('requiredByDate')
        req_by_str = req_by_date.isoformat().split('T')[0] if isinstance(req_by_date, (datetime, date)) else str(req_by_date or '').split('T')[0]

        req_qty = int(doc.get('requiredQuantity', 0))
        ful_qty = int(doc.get('fulfilledQuantity', 0))
        unmet_qty = int(doc.get('unmetQuantity', max(0, req_qty - ful_qty)))

        return {
            "id": doc.get('id') or str(doc.get('_id')),
            "facilityId": doc.get('facilityId', ''),
            "facilityName": doc.get('facilityName', ''),
            "medicineId": doc.get('medicineId'),
            "medicineName": doc.get('medicineName', ''),
            "genericName": doc.get('genericName', doc.get('medicineName', '')),
            "strength": doc.get('strength', ''),
            "dosageForm": doc.get('dosageForm', 'Injectable'),
            "requiredQuantity": req_qty,
            "fulfilledQuantity": ful_qty,
            "unmetQuantity": unmet_qty,
            "urgency": doc.get('urgency', 'MEDIUM'),
            "requestedDate": req_str,
            "requiredByDate": req_by_str,
            "reason": doc.get('reason', ''),
            "status": doc.get('status', 'OPEN'),
            "potentialMatchesCount": int(doc.get('potentialMatchesCount', 1)),
            "createdAt": doc.get('createdAt', datetime.now(timezone.utc)).isoformat() if isinstance(doc.get('createdAt'), datetime) else str(doc.get('createdAt', '')),
            "updatedAt": doc.get('updatedAt', datetime.now(timezone.utc)).isoformat() if isinstance(doc.get('updatedAt'), datetime) else str(doc.get('updatedAt', ''))
        }

    def get_all(self, urgency=None, status=None, facility_id=None, search=None):
        query = {}

        if urgency and urgency != 'ALL':
            query['urgency'] = urgency

        if status and status != 'ALL':
            query['status'] = status

        if facility_id and facility_id != 'ALL':
            query['facilityId'] = facility_id

        if search:
            regex = {'$regex': search, '$options': 'i'}
            query['$or'] = [
                {'medicineName': regex},
                {'genericName': regex},
                {'facilityName': regex},
                {'id': regex}
            ]

        docs = list(self.collection.find(query))

        # Sort by urgency priority then requiredByDate
        def sort_key(doc):
            urg = URGENCY_ORDER.get(str(doc.get('urgency', 'MEDIUM')).upper(), 3)
            req_by = str(doc.get('requiredByDate', '9999-12-31'))
            return (urg, req_by)

        docs.sort(key=sort_key)
        return [self._format_shortage(doc) for doc in docs]

    def get_by_id(self, shortage_id):
        doc = self.collection.find_one(self.id_query(shortage_id))
        return self._format_shortage(doc)

    def create(self, data):
        doc = dict(data)
        now = datetime.now(timezone.utc)
        doc['createdAt'] = now
        doc['updatedAt'] = now

        req_qty = int(doc.get('requiredQuantity', 0))
        doc['requiredQuantity'] = req_qty
        doc['fulfilledQuantity'] = int(doc.get('fulfilledQuantity', 0))
        doc['unmetQuantity'] = max(0, req_qty - doc['fulfilledQuantity'])
        doc['potentialMatchesCount'] = int(doc.get('potentialMatchesCount', 1))

        # Check unique constraint
        existing = self.collection.find_one({"id": doc['id']})
        if existing:
            raise ValueError(f"Shortage ticket with code '{doc['id']}' already exists.")

        self.collection.insert_one(doc)
        return self.get_by_id(doc['id'])

    def update(self, shortage_id, updates):
        allowed = [
            'status', 'fulfilledQuantity', 'unmetQuantity',
            'requiredQuantity', 'urgency', 'requiredByDate', 'reason'
        ]
        set_dict = {}
        for key in allowed:
            if key in updates:
                set_dict[key] = updates[key]

        if 'requiredQuantity' in set_dict:
            set_dict['requiredQuantity'] = int(set_dict['requiredQuantity'])
        if 'fulfilledQuantity' in set_dict:
            set_dict['fulfilledQuantity'] = int(set_dict['fulfilledQuantity'])
        if 'unmetQuantity' in set_dict:
            set_dict['unmetQuantity'] = int(set_dict['unmetQuantity'])

        if not set_dict:
            return self.get_by_id(shortage_id)

        set_dict['updatedAt'] = datetime.now(timezone.utc)
        self.collection.update_one(self.id_query(shortage_id), {'$set': set_dict})
        return self.get_by_id(shortage_id)

    def delete(self, shortage_id):
        res = self.collection.delete_one(self.id_query(shortage_id))
        return res.deleted_count > 0

    def update_fulfillment(self, shortage_id, delta_quantity):
        """Updates fulfilled and unmet quantities when a transfer is created or cancelled."""
        ticket = self.get_by_id(shortage_id)
        if not ticket:
            return None
        delta = int(delta_quantity)
        new_fulfilled = max(0, ticket['fulfilledQuantity'] + delta)
        new_unmet = max(0, ticket['requiredQuantity'] - new_fulfilled)
        new_status = 'RESOLVED' if new_unmet == 0 else ('MATCHED' if new_fulfilled > 0 else 'OPEN')
        return self.update(shortage_id, {
            'fulfilledQuantity': new_fulfilled,
            'unmetQuantity': new_unmet,
            'status': new_status
        })
