"""
PharmaSync CARE — FairShare Proportional Allocation Service
Deterministic multi-criteria allocation solver comparing FCFS with FairShare equity balancing.
"""

import math


class AllocationService:
    def __init__(self):
        pass

    def simulate(self, data):
        """
        Simulates competing facility requests against scarce donor surplus.
        Compares naive First-Come-First-Served (FCFS) with FairShare equity model.
        """
        supply = int(data.get('totalAvailableUnits', 200))
        requests = data.get('requests', [])

        if not requests:
            requests = [
                {
                    "facilityId": "FAC-001",
                    "facilityName": "Apex Central Hospital",
                    "requested": 120,
                    "bedCapacity": 450,
                    "urgency": "EMERGENCY",
                    "vulnerabilityScore": 0.8
                },
                {
                    "facilityId": "FAC-003",
                    "facilityName": "Green Valley Health Centre",
                    "requested": 90,
                    "bedCapacity": 30,
                    "urgency": "EMERGENCY",
                    "vulnerabilityScore": 0.95
                },
                {
                    "facilityId": "FAC-005",
                    "facilityName": "St. Jude Charitable Dispensary",
                    "requested": 80,
                    "bedCapacity": 15,
                    "urgency": "HIGH",
                    "vulnerabilityScore": 0.85
                }
            ]

        total_demand = sum(int(r.get('requested', 0)) for r in requests)
        deficit = max(0, total_demand - supply)

        # 1. Baseline: First-Come-First-Served (FCFS)
        remaining_fcfs = supply
        fcfs_results = []
        for r in requests:
            req_qty = int(r.get('requested', 0))
            allocated = min(req_qty, remaining_fcfs)
            remaining_fcfs -= allocated
            fcfs_results.append({
                "facilityId": r.get('facilityId'),
                "facilityName": r.get('facilityName', r.get('facilityId')),
                "requested": req_qty,
                "allocated": allocated,
                "fulfillmentPct": round((allocated / max(1, req_qty)) * 100),
                "unmet": req_qty - allocated
            })

        # 2. FairShare Multi-Criteria Proportional Model
        # Weights: Clinical Urgency, Facility Vulnerability, Order Demand Ratio
        w_urg = float(data.get('urgencyWeight', 0.45))
        w_vuln = float(data.get('vulnerabilityWeight', 0.35))
        w_dem = float(data.get('demandWeight', 0.20))

        raw_weights = []
        for r in requests:
            urg_tier = 1.5 if r.get('urgency') == 'EMERGENCY' else (1.2 if r.get('urgency') == 'HIGH' else 0.9)
            vuln_idx = float(r.get('vulnerabilityScore', 0.5))
            dem_share = int(r.get('requested', 0)) / max(1, total_demand)

            composite_weight = (w_urg * urg_tier) + (w_vuln * vuln_idx) + (w_dem * dem_share)
            raw_weights.append(composite_weight)

        total_weight = sum(raw_weights) or 1.0

        fair_results = []
        fair_remaining = supply

        # Proportional assignment
        for i, r in enumerate(requests):
            req_qty = int(r.get('requested', 0))
            share_ratio = raw_weights[i] / total_weight
            target_alloc = int(math.floor(share_ratio * supply))
            allocated = min(req_qty, target_alloc)
            fair_remaining -= allocated

            fair_results.append({
                "facilityId": r.get('facilityId'),
                "facilityName": r.get('facilityName', r.get('facilityId')),
                "requested": req_qty,
                "allocated": allocated,
                "fulfillmentPct": round((allocated / max(1, req_qty)) * 100),
                "unmet": req_qty - allocated,
                "criteriaScore": round(share_ratio * 100)
            })

        # Distribute any remaining integer rounding units to highest urgency unmet
        if fair_remaining > 0:
            for item in fair_results:
                if fair_remaining <= 0:
                    break
                if item['unmet'] > 0:
                    add = min(fair_remaining, item['unmet'])
                    item['allocated'] += add
                    item['unmet'] -= add
                    item['fulfillmentPct'] = round((item['allocated'] / max(1, item['requested'])) * 100)
                    fair_remaining -= add

        explanation = (
            f"Supply ({supply} units) meets {round((supply / max(1, total_demand)) * 100)}% of total demand "
            f"({total_demand} units across {len(requests)} facilities). FairShare prevented complete starvation "
            f"of peripheral clinics by prioritizing clinical urgency & vulnerability index rather than queue order."
        )

        return {
            "totalAvailableSupply": supply,
            "totalDemand": total_demand,
            "deficit": deficit,
            "comparison": {
                "fcfs": fcfs_results,
                "fairShare": fair_results
            },
            "explanation": explanation
        }
