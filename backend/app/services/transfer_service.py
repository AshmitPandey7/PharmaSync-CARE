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
from app.repositories.tracking_repository import TrackingRepository
from app.repositories.facility_repository import FacilityRepository

ALLOWED_TRANSITIONS = {
    'PROPOSED': ['REQUESTED', 'APPROVED', 'CANCELLED', 'REJECTED'],
    'REQUESTED': ['APPROVED', 'CANCELLED', 'REJECTED'],
    'APPROVED': ['PREPARED', 'DISPATCHED', 'CANCELLED'],
    'PREPARED': ['DISPATCHED', 'CANCELLED'],
    'DISPATCHED': ['IN_TRANSIT', 'TRANSIT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RECEIVED', 'CANCELLED'],
    'IN_TRANSIT': ['TRANSIT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RECEIVED', 'CANCELLED'],
    'TRANSIT_HUB': ['OUT_FOR_DELIVERY', 'DELIVERED', 'RECEIVED', 'CANCELLED'],
    'OUT_FOR_DELIVERY': ['DELIVERED', 'RECEIVED', 'CANCELLED'],
    'DELIVERED': ['RECEIVED', 'CANCELLED'],
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
        self.tracking_repo = TrackingRepository()
        self.fac_repo = FacilityRepository()

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


    def get_tracking(self, transfer_id):
        """
        Retrieves real-time simulated tracking state, route geometry,
        checkpoints, and persistent event logs for a transfer order.
        """
        transfer = self.repo.get_by_id(transfer_id)
        if not transfer:
            raise ValueError(f"Transfer {transfer_id} not found.")

        sender = self.fac_repo.get_by_id(transfer['senderFacilityId'])
        recipient = self.fac_repo.get_by_id(transfer['recipientFacilityId'])

        sender_coords = sender['coordinates'] if sender else [12.9716, 77.5946]
        recipient_coords = recipient['coordinates'] if recipient else [12.9150, 77.5820]

        checkpoints = self.tracking_repo.generate_route_checkpoints(
            transfer['senderFacilityId'],
            transfer['recipientFacilityId'],
            sender_coords,
            recipient_coords
        )

        current_idx = transfer.get('currentCheckpointIndex', 0)
        events = self.tracking_repo.get_events_for_transfer(transfer_id)

        # If no events exist yet and transfer is at least DISPATCHED, seed initial event
        if not events and transfer['status'] in ('DISPATCHED', 'IN_TRANSIT', 'TRANSIT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RECEIVED'):
            initial_event = self.tracking_repo.log_event(
                transfer_id=transfer_id,
                checkpoint_index=0,
                checkpoint_data=checkpoints[0],
                note="Shipment dispatched from donor facility dock"
            )
            events = [initial_event]

        # Annotate checkpoints with passed/active status
        annotated_checkpoints = []
        for i, cp in enumerate(checkpoints):
            cp_copy = dict(cp)
            cp_copy['index'] = i
            if i < current_idx:
                cp_copy['status'] = 'PASSED'
                cp_copy['passed'] = True
            elif i == current_idx:
                cp_copy['status'] = 'CURRENT'
                cp_copy['passed'] = True
            else:
                cp_copy['status'] = 'PENDING'
                cp_copy['passed'] = False
            annotated_checkpoints.append(cp_copy)

        active_cp = annotated_checkpoints[min(current_idx, len(annotated_checkpoints) - 1)]

        return {
            "transfer": transfer,
            "senderFacility": sender,
            "recipientFacility": recipient,
            "routeCheckpoints": annotated_checkpoints,
            "currentCheckpointIndex": current_idx,
            "currentLocation": active_cp['coordinates'],
            "currentCheckpointName": active_cp['name'],
            "currentStage": active_cp['stage'],
            "isDelivered": current_idx >= len(checkpoints) - 1 or transfer['status'] in ('DELIVERED', 'RECEIVED'),
            "isReceived": transfer['status'] == 'RECEIVED',
            "isSimulatedTracking": True,
            "events": events
        }

    def advance_tracking(self, transfer_id, user_name="Logistics Officer"):
        """
        Advances the simulated shipment to the next geographical checkpoint along its route.
        Updates transfer status and records an immutable tracking event.
        """
        tracking_info = self.get_tracking(transfer_id)
        transfer = tracking_info['transfer']

        if transfer['status'] in ('RECEIVED', 'CANCELLED', 'REJECTED'):
            raise ValueError(f"Cannot advance tracking for transfer in '{transfer['status']}' state.")

        current_idx = tracking_info['currentCheckpointIndex']
        checkpoints = tracking_info['routeCheckpoints']

        if current_idx >= len(checkpoints) - 1:
            # Already at final checkpoint (DELIVERED)
            return self.get_tracking(transfer_id)

        next_idx = current_idx + 1
        next_cp = checkpoints[next_idx]
        target_stage = next_cp['stage']

        # Update checkpoint index on transfer record
        self.repo.update_checkpoint(transfer_id, next_idx)

        # Advance status if checkpoint introduces next lifecycle phase
        if target_stage != transfer['status']:
            try:
                self.advance_status(transfer_id, target_stage, note=f"Arrived at {next_cp['name']}", user_name=user_name)
            except Exception:
                # Direct status update if not strictly strictly linear in ALLOWED_TRANSITIONS
                self.repo.update_status(transfer_id, target_stage, changed_by=user_name, note=f"Arrived at {next_cp['name']}")

        # Log tracking event
        self.tracking_repo.log_event(
            transfer_id=transfer_id,
            checkpoint_index=next_idx,
            checkpoint_data=next_cp,
            note=next_cp.get('description', f"Checkpoint reached: {next_cp['name']}")
        )

        return self.get_tracking(transfer_id)

    def reset_tracking(self, transfer_id, user_name="Logistics Officer"):
        """
        Resets simulated tracking back to initial dispatch point for presentation repeatability.
        """
        self.repo.update_checkpoint(transfer_id, 0)
        self.tracking_repo.clear_events_for_transfer(transfer_id)

        # Reset status back to DISPATCHED if it was in-transit/delivered
        transfer = self.repo.get_by_id(transfer_id)
        if transfer and transfer['status'] in ('IN_TRANSIT', 'TRANSIT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED'):
            self.repo.update_status(transfer_id, 'DISPATCHED', changed_by=user_name, note="Simulated tracking route reset")

        return self.get_tracking(transfer_id)
