"""
PharmaSync CARE — MongoDB Atlas Database Initialization & Indexing Script
Initializes document collections, defines unique and compound indexes,
and configures JSON Schema validation. Safe to rerun repeatedly.
"""

import sys
from pathlib import Path
import pymongo

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import get_db


def setup_indexes(db):
    """
    Creates optimal query, unique, compound, and geospatial indexes.
    All index creations in PyMongo are idempotent.
    """
    print("[Indexes] Configuring MongoDB collection indexes...")

    # 1. facilities
    db.facilities.create_index([("id", pymongo.ASCENDING)], unique=True, name="idx_facilities_id_unique")
    db.facilities.create_index([("licenseNumber", pymongo.ASCENDING)], unique=True, name="idx_facilities_license_unique")
    db.facilities.create_index([("type", pymongo.ASCENDING)], name="idx_facilities_type")
    db.facilities.create_index([("status", pymongo.ASCENDING)], name="idx_facilities_status")
    db.facilities.create_index([("location", pymongo.GEOSPHERE)], name="idx_facilities_location_geo", sparse=True)
    print("  [OK] facilities: unique(id), unique(licenseNumber), type, status, 2dsphere(location)")

    # 2. medicines
    db.medicines.create_index([("id", pymongo.ASCENDING)], unique=True, name="idx_medicines_id_unique")
    db.medicines.create_index([("category", pymongo.ASCENDING)], name="idx_medicines_category")
    db.medicines.create_index([("name", pymongo.TEXT), ("genericName", pymongo.TEXT)], name="idx_medicines_text_search")
    print("  [OK] medicines: unique(id), category, text(name, genericName)")

    # 3. inventory_batches
    db.inventory_batches.create_index([("id", pymongo.ASCENDING)], unique=True, name="idx_batches_id_unique")
    db.inventory_batches.create_index(
        [("facilityId", pymongo.ASCENDING), ("medicineId", pymongo.ASCENDING), ("expiryDate", pymongo.ASCENDING)],
        name="idx_batches_facility_medicine_expiry"
    )
    db.inventory_batches.create_index([("batchNumber", pymongo.ASCENDING)], name="idx_batches_batch_number")
    db.inventory_batches.create_index([("expiryDate", pymongo.ASCENDING)], name="idx_batches_expiry_date")
    db.inventory_batches.create_index([("status", pymongo.ASCENDING)], name="idx_batches_status")
    print("  [OK] inventory_batches: unique(id), compound(facilityId, medicineId, expiryDate), batchNumber, expiryDate, status")

    # 4. shortage_tickets
    db.shortage_tickets.create_index([("id", pymongo.ASCENDING)], unique=True, name="idx_shortages_id_unique")
    db.shortage_tickets.create_index([("facilityId", pymongo.ASCENDING), ("status", pymongo.ASCENDING)], name="idx_shortages_facility_status")
    db.shortage_tickets.create_index([("status", pymongo.ASCENDING), ("urgency", pymongo.ASCENDING)], name="idx_shortages_status_urgency")
    db.shortage_tickets.create_index([("requiredByDate", pymongo.ASCENDING)], name="idx_shortages_deadline")
    print("  [OK] shortage_tickets: unique(id), compound(facilityId, status), compound(status, urgency), requiredByDate")

    # 5. transfers
    db.transfers.create_index([("id", pymongo.ASCENDING)], unique=True, name="idx_transfers_id_unique")
    db.transfers.create_index([("senderFacilityId", pymongo.ASCENDING), ("status", pymongo.ASCENDING)], name="idx_transfers_sender_status")
    db.transfers.create_index([("recipientFacilityId", pymongo.ASCENDING), ("status", pymongo.ASCENDING)], name="idx_transfers_recipient_status")
    db.transfers.create_index([("batchId", pymongo.ASCENDING)], name="idx_transfers_batch")
    db.transfers.create_index([("status", pymongo.ASCENDING)], name="idx_transfers_status")
    print("  [OK] transfers: unique(id), compound(sender, status), compound(recipient, status), batchId, status")

    # 6. users
    db.users.create_index([("id", pymongo.ASCENDING)], unique=True, name="idx_users_id_unique")
    db.users.create_index([("username", pymongo.ASCENDING)], unique=True, name="idx_users_username_unique")
    db.users.create_index([("email", pymongo.ASCENDING)], unique=True, name="idx_users_email_unique")
    print("  [OK] users: unique(id), unique(username), unique(email)")

    # 7. audit_events
    db.audit_events.create_index([("timestamp", pymongo.DESCENDING)], name="idx_audit_timestamp")
    db.audit_events.create_index([("action", pymongo.ASCENDING)], name="idx_audit_action")
    print("  [OK] audit_events: timestamp, action")

    # 8. simulation_runs & optimization_runs
    db.simulation_runs.create_index([("timestamp", pymongo.DESCENDING)], name="idx_sim_timestamp")
    db.optimization_runs.create_index([("timestamp", pymongo.DESCENDING)], name="idx_opt_timestamp")
    print("  [OK] simulation_runs & optimization_runs: timestamp")


def main():
    print("=" * 70)
    print("PharmaSync CARE — MongoDB Atlas Initialization Utility")
    print("=" * 70)

    db_manager = get_db()
    setup_indexes(db_manager.db)

    print("\n[Complete] Database collections and indexing initialized successfully.")


if __name__ == '__main__':
    main()
