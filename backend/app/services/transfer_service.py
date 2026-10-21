"""
PharmaSync CARE — Transfer Service
Transactional custody manifest management with atomic inventory reservations
and strict lifecycle progression guarantees.
"""

import uuid
from datetime import datetime, date
from app.repositories.transfer_repository import TransferRepository
from app.repositories.inventory_repository import InventoryRepository
from app.repositories.shortage_repository import ShortageRepository
from app.repositories.audit_repository import AuditRepository

ALLOWED_TRANSITIONS = {
    'PROPOSED': ['REQUESTED', 'APPROVED', 'CANCELLED', 'REJECTED'],
    'REQUESTED': ['APPROVED', 'CANCELLED', 'REJECTED'],
    'APPROVED': ['DISPATCHED', 'CANCELLED'],
    'DISPATCHED': ['RECEIVED', 'CANCELLED'],
    'RECEIVED': [],
    'CANCELLED': [],
    'REJECTED': []
}


class TransferService:
    def __init__(self):
        self.repo = TransferRepository()
        self.inv_repo = InventoryRepository()
        self.shortage_repo = ShortageRepository()
        self.audit = AuditRepository()

    def get_transfers(self, status=None, facility_id=None, search=None):
        return self.repo.get_all(status, facility_id, search)

    def get_transfer(self, transfer_id):
        return self.repo.get_by_id(transfer_id)

    def create_transfer(self, data, user_name="Pharmacist"):
        """
        Creates a new medicine transfer order.
        Transactionally reserves stock from the donor batch.
        """
        # Validate required inputs
        required = ['senderFacilityId', 'recipientFacilityId', 'batchId', 'medicineName', 'quantity']
        for field in required:
            if not data.get(field):
                raise ValueError(f"Field '{field}' is required.")

        qty = int(data['quantity'])
        if qty <= 0:
            raise ValueError("Transfer quantity must be greater than zero.")

        batch_id = data['batchId']
        batch = self.inv_repo.get_by_id(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found in inventory.")

        # Expiry safety policy check
        exp_date = datetime.strptime(batch['expiryDate'], "%Y-%m-%d").date()
        if (exp_date - date.today()).days < 15:
            raise ValueError("Cannot transfer batch: Remaining shelf life is below 15-day safety policy.")

        # Check stock availability
        if batch['availableQuantity'] < qty:
            raise ValueError(
                f"Insufficient available stock for batch {batch['batchNumber']}. "
                f"Available: {batch['availableQuantity']}, Requested: {qty}"
            )

        # Generate unique IDs
        if not data.get('id'):
            data['id'] = f"TRF-{str(uuid.uuid4())[:8].upper()}"

        if not data.get('transferCode'):
            existing = self.repo.get_all()
            codes = {t['transferCode'] for t in existing}
            idx = len(existing) + 1
            while f"TRF-2026-{idx:03d}" in codes:
                idx += 1
            data['transferCode'] = f"TRF-2026-{idx:03d}"

        # Atomically reserve stock
        self.inv_repo.reserve_stock(batch_id, qty)

        # Save transfer order
        data['status'] = data.get('status', 'REQUESTED')
        data['strength'] = data.get('strength', batch['strength'])
        transfer = self.repo.create(data)

        # Update shortage ticket if associated
        if data.get('shortageId'):
            self.shortage_repo.update_fulfillment(data['shortageId'], qty)

        # Audit event
        self.audit.log(
            action=f"TRANSFER_{transfer['status']}",
            entity=transfer['transferCode'],
            user_name=user_name,
            role="Pharmacist",
            details=f"Created transfer {transfer['transferCode']}: {qty} units of {transfer['medicineName']} reserved from batch {batch['batchNumber']}"
        )
        return transfer

    def advance_status(self, transfer_id, next_status, note="", user_name="Pharmacist"):
        """
        Validates transition and advances the transfer order to next custody stage.
        Handles inventory finalization upon RECEIPT or release upon CANCELLATION.
        """
        transfer = self.repo.get_by_id(transfer_id)
        if not transfer:
            raise ValueError(f"Transfer {transfer_id} not found.")

        current_status = transfer['status']
        next_status = next_status.upper().strip()

        # Validate transition matrix
        allowed = ALLOWED_TRANSITIONS.get(current_status, [])
        if next_status not in allowed:
            raise ValueError(
                f"Invalid lifecycle transition from '{current_status}' to '{next_status}'. "
                f"Allowed transitions: {allowed}"
            )

        batch_id = transfer['batchId']
        qty = transfer['quantity']

        # Lifecycle consequences on inventory
        if next_status in ('CANCELLED', 'REJECTED'):
            # Release reservation back to available stock
            self.inv_repo.release_reservation(batch_id, qty)

            # Revert shortage ticket fulfillment if applicable
            if transfer.get('shortageId'):
                self.shortage_repo.update_fulfillment(transfer['shortageId'], -qty)

        elif next_status == 'RECEIVED':
            # Complete custody transfer:
            # 1. Decrement donor reserved stock and total stock
            donor_batch = self.inv_repo.get_by_id(batch_id)
            if donor_batch:
                new_reserved = max(0, donor_batch['reservedQuantity'] - qty)
                new_total = max(0, donor_batch['totalQuantity'] - qty)
                self.inv_repo.update(batch_id, {
                    'reservedQuantity': new_reserved,
                    'totalQuantity': new_total
                })

            # 2. Increment stock in recipient facility
            recipient_batches = self.inv_repo.get_all(
                facility_id=transfer['recipientFacilityId'],
                search=transfer['batchNumber']
            )
            matching_recipient = next((b for b in recipient_batches if b['batchNumber'] == transfer['batchNumber']), None)

            if matching_recipient:
                new_total = matching_recipient['totalQuantity'] + qty
                new_avail = matching_recipient['availableQuantity'] + qty
                self.inv_repo.update(matching_recipient['id'], {
                    'totalQuantity': new_total,
                    'availableQuantity': new_avail
                })
            else:
                # Create corresponding batch in recipient facility
                self.inv_repo.create({
                    'id': f"BAT-{str(uuid.uuid4())[:8].upper()}",
                    'batchNumber': transfer['batchNumber'] or f"RX-{str(uuid.uuid4())[:6].upper()}",
                    'medicineName': transfer['medicineName'],
                    'genericName': donor_batch.get('genericName', transfer['medicineName']) if donor_batch else transfer['medicineName'],
                    'strength': transfer['strength'],
                    'dosageForm': donor_batch.get('dosageForm', 'Injectable') if donor_batch else 'Injectable',
                    'category': donor_batch.get('category', 'General') if donor_batch else 'General',
                    'facilityId': transfer['recipientFacilityId'],
                    'totalQuantity': qty,
                    'availableQuantity': qty,
                    'reservedQuantity': 0,
                    'expectedMonthlyDemand': 40,
                    'safetyStockThreshold': 15,
                    'expiryDate': donor_batch.get('expiryDate', '2026-12-31') if donor_batch else '2026-12-31',
                    'unitPrice': donor_batch.get('unitPrice', 10.0) if donor_batch else 10.0,
                    'coldChainRequired': donor_batch.get('coldChainRequired', False) if donor_batch else False,
                    'status': 'ADEQUATE'
                })

        updated = self.repo.update_status(transfer_id, next_status, changed_by=user_name, note=note)

        self.audit.log(
            action=f"TRANSFER_{next_status}",
            entity=transfer['transferCode'],
            user_name=user_name,
            role="Pharmacist",
            details=f"Transfer {transfer['transferCode']} status changed to {next_status}. Note: {note}"
        )
        return updated
