"""
PharmaSync CARE — Transfer Manifest Repository (MongoDB)
Manages transfer orders, 5-stage custody lifecycle, and embedded history audit records.
"""

from datetime import datetime, timezone
from app.repositories.base_repository import BaseRepository

LIFECYCLE_MAP = {
    'PROPOSED': 0,
    'REQUESTED': 1,
    'APPROVED': 2,
    'PREPARED': 2,
    'DISPATCHED': 3,
    'IN_TRANSIT': 3,
    'TRANSIT_HUB': 3,
    'OUT_FOR_DELIVERY': 3,
    'DELIVERED': 3,
    'RECEIVED': 4,
    'CANCELLED': -1,
    'REJECTED': -1
}


class TransferRepository(BaseRepository):

    def __init__(self):
        super().__init__('transfers')

    def _format_transfer(self, doc):
        if not doc:
            return None

        def fmt_dt(val):
            if val is None:
                return None
            if isinstance(val, datetime):
                return val.strftime('%Y-%m-%d %H:%M')
            return str(val).replace('T', ' ')[:16]

        hist = doc.get('statusHistory', [])
        formatted_hist = []
        for h in hist:
            ts = h.get('timestamp')
            formatted_hist.append({
                "status": h.get('status', ''),
                "timestamp": fmt_dt(ts),
                "by": h.get('by') or h.get('updatedBy', 'System'),
                "note": h.get('note', '')
            })

        status = doc.get('status', 'REQUESTED')
        return {
            "id": doc.get('id') or str(doc.get('_id')),
            "transferCode": doc.get('transferCode') or doc.get('id', ''),
            "shortageId": doc.get('shortageId'),
            "senderFacilityId": doc.get('senderFacilityId', ''),
            "senderFacilityName": doc.get('senderFacilityName', ''),
            "recipientFacilityId": doc.get('recipientFacilityId', ''),
            "recipientFacilityName": doc.get('recipientFacilityName', ''),
            "batchId": doc.get('batchId', ''),
            "batchNumber": doc.get('batchNumber', ''),
            "medicineName": doc.get('medicineName', ''),
            "strength": doc.get('strength', ''),
            "quantity": int(doc.get('quantity', 0)),
            "urgency": doc.get('urgency', 'ROUTINE'),
            "status": status,
            "lifecycleIndex": int(doc.get('lifecycleIndex', LIFECYCLE_MAP.get(status, 0))),
            "carrierName": doc.get('carrierName', 'Pending Assignment'),
            "temperatureLog": doc.get('temperatureLog', 'Ambient / Standard Cold'),
            "currentCheckpointIndex": int(doc.get('currentCheckpointIndex', 0)),
            "isSimulatedTracking": bool(doc.get('isSimulatedTracking', True)),
            "notes": doc.get('notes', ''),
            "requestedDate": fmt_dt(doc.get('requestedDate')),
            "approvedDate": fmt_dt(doc.get('approvedDate')),
            "dispatchedDate": fmt_dt(doc.get('dispatchedDate')),
            "receivedDate": fmt_dt(doc.get('receivedDate')),
            "cancelledDate": fmt_dt(doc.get('cancelledDate')),
            "statusHistory": formatted_hist
        }

    def get_all(self, status=None, facility_id=None, search=None):
        query = {}
        if status and status != 'ALL':
            query['status'] = status

        if facility_id and facility_id != 'ALL':
            query['$or'] = [
                {'senderFacilityId': facility_id},
                {'recipientFacilityId': facility_id}
            ]

        if search:
            regex = {'$regex': search, '$options': 'i'}
            search_clause = [
                {'transferCode': regex},
                {'id': regex},
                {'medicineName': regex},
                {'senderFacilityName': regex},
                {'recipientFacilityName': regex}
            ]
            if '$or' in query:
                query = {'$and': [{'$or': query['$or']}, {'$or': search_clause}]}
            else:
                query['$or'] = search_clause

        cursor = self.collection.find(query).sort('createdAt', -1)
        return [self._format_transfer(doc) for doc in cursor]

    def get_by_id(self, transfer_id):
        doc = self.collection.find_one(self.id_query(transfer_id))
        return self._format_transfer(doc)

    def get_history(self, transfer_id):
        transfer = self.get_by_id(transfer_id)
        return transfer.get('statusHistory', []) if transfer else []

    def create(self, data):
        doc = dict(data)
        now = datetime.now(timezone.utc)
        doc['createdAt'] = now
        doc['updatedAt'] = now

        status = doc.get('status', 'REQUESTED')
        doc['status'] = status
        doc['lifecycleIndex'] = LIFECYCLE_MAP.get(status, 1)
        doc['quantity'] = int(doc.get('quantity', 0))

        if 'requestedDate' not in doc:
            doc['requestedDate'] = now

        initial_history = {
            "status": status,
            "timestamp": now,
            "by": doc.get('changedBy', 'System'),
            "note": doc.get('notes', 'Transfer order created')
        }
        doc['statusHistory'] = [initial_history]

        # Check unique constraint
        existing = self.collection.find_one({"id": doc['id']})
        if existing:
            raise ValueError(f"Transfer manifest with code '{doc['id']}' already exists.")

        self.collection.insert_one(doc)
        return self.get_by_id(doc['id'])

    def add_history(self, transfer_id, status, changed_by, note=""):
        now = datetime.now(timezone.utc)
        self.collection.update_one(
            self.id_query(transfer_id),
            {
                "$push": {
                    "statusHistory": {
                        "status": status,
                        "timestamp": now,
                        "by": changed_by,
                        "note": note
                    }
                },
                "$set": {"updatedAt": now}
            }
        )

    def update_status(self, transfer_id, new_status, changed_by="Pharmacist", note=""):
        lifecycle_idx = LIFECYCLE_MAP.get(new_status, 1)
        now = datetime.now(timezone.utc)

        update_fields = {
            "status": new_status,
            "lifecycleIndex": lifecycle_idx,
            "updatedAt": now
        }

        if new_status == 'REQUESTED':
            update_fields['requestedDate'] = now
        elif new_status == 'APPROVED':
            update_fields['approvedDate'] = now
        elif new_status == 'DISPATCHED':
            update_fields['dispatchedDate'] = now
        elif new_status == 'RECEIVED':
            update_fields['receivedDate'] = now
        elif new_status in ('CANCELLED', 'REJECTED'):
            update_fields['cancelledDate'] = now

        self.collection.update_one(
            self.id_query(transfer_id),
            {
                "$set": update_fields,
                "$push": {
                    "statusHistory": {
                        "status": new_status,
                        "timestamp": now,
                        "by": changed_by,
                        "note": note
                    }
                }
            }
        )

        return self.get_by_id(transfer_id)

    def update_checkpoint(self, transfer_id, checkpoint_index):
        now = datetime.now(timezone.utc)
        self.collection.update_one(
            self.id_query(transfer_id),
            {
                "$set": {
                    "currentCheckpointIndex": checkpoint_index,
                    "updatedAt": now
                }
            }
        )
        return self.get_by_id(transfer_id)
