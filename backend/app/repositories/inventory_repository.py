"""
PharmaSync CARE — Inventory Batch Repository (MongoDB)
Manages medicine batches, stock levels, safety buffers, and atomic reservation locks.
Guarantees availableQuantity cannot become negative through atomic conditional updates.
"""

from datetime import datetime, date, timedelta, timezone
from app.repositories.base_repository import BaseRepository


class InventoryRepository(BaseRepository):

    def __init__(self):
        super().__init__('inventory_batches')

    def _format_batch(self, doc):
        if not doc:
            return None

        # Expiry date string
        exp_val = doc.get('expiryDate')
        if isinstance(exp_val, (datetime, date)):
            exp_str = exp_val.isoformat().split('T')[0]
        else:
            exp_str = str(exp_val).split('T')[0].split(' ')[0] if exp_val else ''

        total = int(doc.get('totalQuantity', 0))
        reserved = int(doc.get('reservedQuantity', 0))
        available = int(doc.get('availableQuantity', max(0, total - reserved)))
        exp_demand = int(doc.get('expectedMonthlyDemand', 50))
        safety_stock = int(doc.get('safetyStockThreshold', 20))

        # Dynamic surplus calculation
        eligible_surplus = max(0, available - (exp_demand + safety_stock))

        return {
            "id": doc.get('id') or str(doc.get('_id')),
            "batchNumber": doc.get('batchNumber', ''),
            "medicineId": doc.get('medicineId'),
            "medicineName": doc.get('medicineName', ''),
            "genericName": doc.get('genericName', doc.get('medicineName', '')),
            "strength": doc.get('strength', ''),
            "dosageForm": doc.get('dosageForm', 'Injectable'),
            "category": doc.get('category', 'General'),
            "facilityId": doc.get('facilityId', ''),
            "facilityName": doc.get('facilityName', ''),
            "totalQuantity": total,
            "reservedQuantity": reserved,
            "availableQuantity": available,
            "eligibleSurplusQuantity": eligible_surplus,
            "expectedMonthlyDemand": exp_demand,
            "safetyStockThreshold": safety_stock,
            "expiryDate": exp_str,
            "unitPrice": float(doc.get('unitPrice', 10.0)),
            "coldChainRequired": bool(doc.get('coldChainRequired', False)),
            "status": doc.get('status', 'ADEQUATE'),
            "createdAt": doc.get('createdAt', datetime.now(timezone.utc)).isoformat() if isinstance(doc.get('createdAt'), datetime) else str(doc.get('createdAt', '')),
            "updatedAt": doc.get('updatedAt', datetime.now(timezone.utc)).isoformat() if isinstance(doc.get('updatedAt'), datetime) else str(doc.get('updatedAt', ''))
        }

    def get_all(self, facility_id=None, category=None, search=None, expiry_status=None):
        query = {}

        if facility_id and facility_id != 'ALL':
            query['facilityId'] = facility_id

        if category and category != 'ALL':
            query['category'] = category

        if search:
            regex = {'$regex': search, '$options': 'i'}
            query['$or'] = [
                {'medicineName': regex},
                {'genericName': regex},
                {'batchNumber': regex},
                {'id': regex}
            ]

        today_str = date.today().isoformat()
        if expiry_status == 'SOON':
            cutoff = (date.today() + timedelta(days=45)).isoformat()
            query['expiryDate'] = {'$lte': cutoff, '$gte': today_str}
        elif expiry_status == 'SAFE':
            cutoff = (date.today() + timedelta(days=45)).isoformat()
            query['expiryDate'] = {'$gt': cutoff}
        elif expiry_status == 'EXPIRED':
            query['expiryDate'] = {'$lt': today_str}

        cursor = self.collection.find(query).sort([('expiryDate', 1), ('medicineName', 1)])
        return [self._format_batch(doc) for doc in cursor]

    def get_by_id(self, batch_id):
        doc = self.collection.find_one(self.id_query(batch_id))
        return self._format_batch(doc)

    def create(self, data):
        doc = dict(data)
        now = datetime.now(timezone.utc)
        doc['createdAt'] = now
        doc['updatedAt'] = now

        total = int(doc.get('totalQuantity', 0))
        reserved = int(doc.get('reservedQuantity', 0))
        available = total - reserved
        if available < 0:
            raise ValueError("Available quantity cannot be negative.")

        doc['totalQuantity'] = total
        doc['reservedQuantity'] = reserved
        doc['availableQuantity'] = available

        exp_demand = int(doc.get('expectedMonthlyDemand', 50))
        safety_stock = int(doc.get('safetyStockThreshold', 20))
        doc['expectedMonthlyDemand'] = exp_demand
        doc['safetyStockThreshold'] = safety_stock
        doc['eligibleSurplusQuantity'] = max(0, available - (exp_demand + safety_stock))
        doc['unitPrice'] = float(doc.get('unitPrice', 10.0))
        doc['coldChainRequired'] = bool(doc.get('coldChainRequired', False))

        # Check unique constraint on id
        existing = self.collection.find_one({"id": doc['id']})
        if existing:
            raise ValueError(f"Inventory batch with code '{doc['id']}' already exists.")

        self.collection.insert_one(doc)
        return self.get_by_id(doc['id'])

    def update(self, batch_id, updates):
        allowed = [
            'totalQuantity', 'availableQuantity', 'reservedQuantity',
            'expectedMonthlyDemand', 'safetyStockThreshold', 'expiryDate',
            'unitPrice', 'status', 'coldChainRequired'
        ]
        set_dict = {}
        for key in allowed:
            if key in updates:
                set_dict[key] = updates[key]

        if 'totalQuantity' in set_dict:
            set_dict['totalQuantity'] = int(set_dict['totalQuantity'])
        if 'availableQuantity' in set_dict:
            set_dict['availableQuantity'] = int(set_dict['availableQuantity'])
        if 'reservedQuantity' in set_dict:
            set_dict['reservedQuantity'] = int(set_dict['reservedQuantity'])
        if 'unitPrice' in set_dict:
            set_dict['unitPrice'] = float(set_dict['unitPrice'])
        if 'coldChainRequired' in set_dict:
            set_dict['coldChainRequired'] = bool(set_dict['coldChainRequired'])

        if not set_dict:
            return self.get_by_id(batch_id)

        set_dict['updatedAt'] = datetime.now(timezone.utc)
        self.collection.update_one(self.id_query(batch_id), {'$set': set_dict})
        return self.get_by_id(batch_id)

    def reserve_stock(self, batch_id, quantity):
        """
        Atomically reserves stock from a batch using conditional update.
        Prevents concurrent over-allocation by requiring availableQuantity >= quantity.
        """
        qty = int(quantity)
        if qty <= 0:
            return True

        query = self.id_query(batch_id)
        # Ensure availableQuantity >= requested quantity
        query["availableQuantity"] = {"$gte": qty}

        update_op = {
            "$inc": {
                "reservedQuantity": qty,
                "availableQuantity": -qty
            },
            "$set": {
                "updatedAt": datetime.now(timezone.utc)
            }
        }

        res = self.collection.update_one(query, update_op)
        if res.matched_count == 0 or res.modified_count == 0:
            return False

        # Recalculate eligibleSurplusQuantity
        batch = self.get_by_id(batch_id)
        if batch:
            surplus = max(0, batch['availableQuantity'] - (batch['expectedMonthlyDemand'] + batch['safetyStockThreshold']))
            self.collection.update_one(self.id_query(batch_id), {"$set": {"eligibleSurplusQuantity": surplus}})

        return True

    def release_stock(self, batch_id, quantity):
        """
        Atomically releases reserved stock back into available surplus.
        Used on transfer cancellation or rejection.
        """
        qty = int(quantity)
        if qty <= 0:
            return True

        update_op = {
            "$inc": {
                "reservedQuantity": -qty,
                "availableQuantity": qty
            },
            "$set": {
                "updatedAt": datetime.now(timezone.utc)
            }
        }

        self.collection.update_one(self.id_query(batch_id), update_op)

        # Recalculate surplus
        batch = self.get_by_id(batch_id)
        if batch:
            surplus = max(0, batch['availableQuantity'] - (batch['expectedMonthlyDemand'] + batch['safetyStockThreshold']))
            self.collection.update_one(self.id_query(batch_id), {"$set": {"eligibleSurplusQuantity": surplus}})

        return True

    def release_reservation(self, batch_id, quantity):
        """Alias for release_stock for compatibility."""
        return self.release_stock(batch_id, quantity)

    def delete(self, batch_id):
        res = self.collection.delete_one(self.id_query(batch_id))
        return res.deleted_count > 0
