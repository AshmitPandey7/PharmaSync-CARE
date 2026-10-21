"""
PharmaSync CARE — Smart Algorithmic Matching Service
Identifies and ranks compatible surplus donors for clinical shortages,
calculating distance, safety buffer feasibility, and multi-donor options.
"""

from datetime import datetime, date
from app.repositories.shortage_repository import ShortageRepository
from app.repositories.inventory_repository import InventoryRepository
from app.repositories.facility_repository import FacilityRepository
from app.utils.geo import calculate_distance_km


class MatchingService:
    def __init__(self, config=None):
        self.shortage_repo = ShortageRepository()
        self.inv_repo = InventoryRepository()
        self.fac_repo = FacilityRepository()
        self.min_shelf_life_days = getattr(config, 'MIN_SHELF_LIFE_DAYS', 45) if config else 45
        self.local_radius_km = getattr(config, 'LOCAL_RADIUS_KM', 15.0) if config else 15.0
        self.regional_radius_km = getattr(config, 'REGIONAL_RADIUS_KM', 60.0) if config else 60.0

    def find_candidates(self, shortage_id):
        """
        Matches an open shortage ticket against all network inventory batches.
        Returns shortage details, ranked eligible donors, and explainability reasons.
        """
        shortage = self.shortage_repo.get_by_id(shortage_id)
        if not shortage:
            raise ValueError(f"Shortage ticket {shortage_id} not found.")

        recipient_facility = self.fac_repo.get_by_id(shortage['facilityId'])
        recipient_coords = recipient_facility['coordinates'] if recipient_facility else [12.9716, 77.5946]

        batches = self.inv_repo.get_all()
        facilities = {f['id']: f for f in self.fac_repo.get_all()}
        today = date.today()

        candidates = []

        for b in batches:
            # Exclude donor being the recipient facility itself
            if b['facilityId'] == shortage['facilityId']:
                continue

            donor_fac = facilities.get(b['facilityId'])
            if not donor_fac:
                continue

            # Expiry calculation
            exp_date = datetime.strptime(b['expiryDate'], "%Y-%m-%d").date()
            days_to_expiry = max(0, (exp_date - today).days)

            # Medicine formulation compatibility check
            med_match = (
                b['medicineName'].lower() in shortage['medicineName'].lower() or
                shortage['medicineName'].lower() in b['medicineName'].lower() or
                b['genericName'].lower() in (shortage.get('genericName') or '').lower() or
                (shortage.get('genericName') or '').lower() in b['genericName'].lower()
            )

            # Check strength compatibility if available
            strength_compatible = True
            if b['strength'] and shortage['strength']:
                b_str = b['strength'].lower().replace(' ', '')
                s_str = shortage['strength'].lower().replace(' ', '')
                if b_str not in s_str and s_str not in b_str:
                    strength_compatible = False

            if not med_match or not strength_compatible:
                continue

            # Geographic distance calculation using Haversine
            donor_coords = donor_fac['coordinates']
            distance_km = calculate_distance_km(donor_coords, recipient_coords)

            # Feasibility checks
            meets_shelf_life = days_to_expiry >= self.min_shelf_life_days
            cold_chain_needed = b['coldChainRequired']
            cold_chain_feasible = (not cold_chain_needed) or (donor_fac['coldChainCertified'] and recipient_facility.get('coldChainCertified', False))
            eligible_surplus = min(b['eligibleSurplusQuantity'], b['availableQuantity'])

            is_eligible = True
            reasons = []
            rejection_reasons = []
            score = 0

            # 1. Shelf-life check
            if not meets_shelf_life:
                is_eligible = False
                rejection_reasons.append(
                    f"Ineligible: Remaining shelf life ({days_to_expiry}d) is below the minimum safety policy threshold ({self.min_shelf_life_days}d)."
                )
            else:
                score += 40
                reasons.append(f"Shelf life verified: {days_to_expiry} days remaining (buffer satisfied).")

            # 2. Cold-chain check
            if cold_chain_needed and not cold_chain_feasible:
                is_eligible = False
                rejection_reasons.append(
                    "Ineligible: Cold-chain route (2-8°C) cannot be guaranteed between these facilities."
                )
            elif cold_chain_needed:
                score += 15
                reasons.append("Cold-chain logistics certified at both ends.")

            # 3. Surplus check
            if eligible_surplus <= 0:
                is_eligible = False
                rejection_reasons.append(
                    "Ineligible: Zero surplus available without encroaching on local clinical safety reserve."
                )
            else:
                fulfill_pct = min(100, round((eligible_surplus / max(1, shortage['unmetQuantity'])) * 100))
                volume_pts = min(30, round((eligible_surplus / max(1, shortage['unmetQuantity'])) * 30))
                score += volume_pts
                reasons.append(f"Available surplus: {eligible_surplus} units (can fulfill {fulfill_pct}% of demand).")

            # 4. Proximity / Transport Tier
            if distance_km < self.local_radius_km:
                score += 15
                reasons.append(f"Transit zone: Local tier ({distance_km} km, transit under 2h).")
            elif distance_km < self.regional_radius_km:
                score += 10
                reasons.append(f"Transit zone: Regional tier ({distance_km} km).")
            else:
                score += 5
                reasons.append(f"Transit zone: Extended tier ({distance_km} km).")

            final_score = min(100, score) if is_eligible else 0

            candidates.append({
                "batchId": b['id'],
                "batchNumber": b['batchNumber'],
                "medicineName": b['medicineName'],
                "strength": b['strength'],
                "dosageForm": b['dosageForm'],
                "donorFacilityId": donor_fac['id'],
                "donorFacilityName": donor_fac['name'],
                "donorType": donor_fac['type'],
                "availableSurplus": eligible_surplus,
                "daysToExpiry": days_to_expiry,
                "expiryDate": b['expiryDate'],
                "distanceKm": distance_km,
                "coldChainRequired": cold_chain_needed,
                "matchScore": final_score,
                "isEligible": is_eligible,
                "reasons": reasons if is_eligible else rejection_reasons
            })

        # Sort by matchScore descending
        candidates.sort(key=lambda c: (c['isEligible'], c['matchScore']), reverse=True)

        return {
            "shortage": shortage,
            "candidates": candidates
        }
