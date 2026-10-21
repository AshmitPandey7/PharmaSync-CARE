"""
PharmaSync CARE — Inventory Service
Implements demand-aware surplus estimation, expiry risk triage, and stock validation.
"""

import uuid
from datetime import datetime, date
from app.repositories.inventory_repository import InventoryRepository
from app.repositories.audit_repository import AuditRepository


class InventoryService:
    def __init__(self, config=None):
        self.repo = InventoryRepository()
        self.audit = AuditRepository()
        self.min_shelf_life_days = getattr(config, 'MIN_SHELF_LIFE_DAYS', 45) if config else 45
        self.safety_buffer_pct = getattr(config, 'SAFETY_STOCK_BUFFER_PCT', 0.20) if config else 0.20

    def get_inventory(self, facility_id=None, category=None, search=None, expiry_status=None):
        return self.repo.get_all(facility_id, category, search, expiry_status)

    def get_batch(self, batch_id):
        return self.repo.get_by_id(batch_id)

    def add_batch(self, data, user_name="Pharmacist"):
        # Validation
        if not data.get('medicineName') or not data.get('batchNumber') or not data.get('facilityId'):
            raise ValueError("Medicine name, batch number, and facility ID are required.")

        total_qty = int(data.get('totalQuantity', 0))
        if total_qty <= 0:
            raise ValueError("Total quantity must be greater than zero.")

        exp_str = data.get('expiryDate')
        if not exp_str:
            raise ValueError("Expiry date is required.")

        exp_date = datetime.strptime(str(exp_str).strip(), "%Y-%m-%d").date()
        today = date.today()
        if exp_date <= today:
            raise ValueError("Cannot register an already expired medicine batch into active inventory.")

        if not data.get('id'):
            data['id'] = f"BAT-{str(uuid.uuid4())[:8].upper()}"

        data['totalQuantity'] = total_qty
        data['reservedQuantity'] = int(data.get('reservedQuantity', 0))
        data['availableQuantity'] = total_qty - data['reservedQuantity']

        # Demand-aware safety stock calculation
        exp_demand = int(data.get('expectedMonthlyDemand', 50))
        safety_stock = int(data.get('safetyStockThreshold', max(20, int(exp_demand * self.safety_buffer_pct))))
        data['expectedMonthlyDemand'] = exp_demand
        data['safetyStockThreshold'] = safety_stock

        batch = self.repo.create(data)

        self.audit.log(
            action="INVENTORY_ADD",
            entity=batch['batchNumber'],
            user_name=user_name,
            role="Pharmacist",
            details=f"Added batch {batch['batchNumber']} ({batch['medicineName']}, {total_qty} units) to facility {batch['facilityId']}"
        )
        return batch

    def update_batch(self, batch_id, updates, user_name="Pharmacist"):
        batch = self.repo.get_by_id(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found.")

        # Recalculate available and surplus if totals modified
        if 'totalQuantity' in updates or 'availableQuantity' in updates:
            total = int(updates.get('totalQuantity', batch['totalQuantity']))
            if total < 0:
                raise ValueError("Total quantity must be greater than or equal to zero.")
            reserved = int(updates.get('reservedQuantity', batch['reservedQuantity']))
            if total < reserved:
                raise ValueError("Total quantity cannot be less than already reserved quantity.")
            updates['availableQuantity'] = max(0, total - reserved)

        updated_batch = self.repo.update(batch_id, updates)
        self.audit.log(
            action="INVENTORY_UPDATE",
            entity=batch['batchNumber'],
            user_name=user_name,
            role="Pharmacist",
            details=f"Updated inventory batch details for {batch['batchNumber']}"
        )
        return updated_batch

    def get_rescue_candidates(self):
        """
        Surplus Surveillance / Rescue Centre Evaluation
        Evaluates batches against clinical demand and remaining shelf-life,
        assigning transparent priority scores and redistribution recommendations.
        """
        batches = self.repo.get_all()
        today = date.today()
        candidates = []

        for b in batches:
            exp_date = datetime.strptime(b['expiryDate'], "%Y-%m-%d").date()
            days_to_expiry = max(0, (exp_date - today).days)

            available = b['availableQuantity']
            exp_demand = b['expectedMonthlyDemand']
            safety_stock = b['safetyStockThreshold']
            potential_surplus = max(0, available - (exp_demand + safety_stock))

            recommendation = 'RETAIN'
            priority_score = 0
            reasons = []

            # Clinical triage rules
            if days_to_expiry < 15:
                # Rule 1: Exclude expired or imminent expiry below transit safety buffer
                recommendation = 'BLOCK'
                reasons.append(f"Remaining shelf life ({days_to_expiry}d) is below the minimum 15-day transit & inspection safety threshold.")
                priority_score = 15
            elif potential_surplus <= 0:
                # Rule 2: Stock required locally
                recommendation = 'RETAIN'
                reasons.append(f"Available stock ({available}) is required locally to meet expected demand ({exp_demand}) + safety cushion ({safety_stock}).")
                priority_score = 20
            elif days_to_expiry <= 60 and potential_surplus > 0:
                # Rule 3: High-priority surplus ready to redistribute
                recommendation = 'TRANSFER'
                # Transparent multi-factor scoring formula:
                # Urgency: up to 45 pts
                # Volume ratio: up to 35 pts
                # Criticality/Value: 20 pts
                urgency_comp = min(45, max(0, round((60 - days_to_expiry) * 0.75)))
                surplus_comp = min(35, round((potential_surplus / max(1, b['totalQuantity'])) * 35))
                value_comp = 20 if b['unitPrice'] > 100 else 10
                priority_score = min(100, urgency_comp + surplus_comp + value_comp)

                reasons.append(f"Expires in {days_to_expiry} days. {potential_surplus} units exceed local projected demand.")
                reasons.append(f"Local safety cushion ({safety_stock} units) fully preserved.")
                if b['coldChainRequired']:
                    reasons.append("Requires verified cold-chain route (2-8°C).")
            else:
                # Rule 4: Adequate shelf life, continue scheduled monitoring
                recommendation = 'MONITOR'
                priority_score = 42
                reasons.append(f"Surplus available ({potential_surplus} units), but expiry ({days_to_expiry}d) is adequate for scheduled monitoring.")

            candidates.append({
                **b,
                "daysToExpiry": days_to_expiry,
                "potentialSurplus": potential_surplus,
                "priorityScore": priority_score,
                "recommendation": recommendation,
                "reasons": reasons
            })

        # Order by priority score descending
        candidates.sort(key=lambda c: c['priorityScore'], reverse=True)
        return candidates
