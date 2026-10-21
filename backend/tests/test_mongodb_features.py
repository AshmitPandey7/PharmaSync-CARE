"""
PharmaSync CARE — MongoDB Specific Feature Tests
Tests ObjectId validation, duplicate key prevention, atomic reservation safety,
and simulation sandbox isolation.
"""

import pytest
from bson import ObjectId
from datetime import date, timedelta
from app.database import get_db, serialize_doc, build_id_query
from app.repositories.inventory_repository import InventoryRepository
from app.repositories.facility_repository import FacilityRepository


def test_object_id_validation_and_query_builder():
    """Verifies build_id_query handles both string codes and BSON ObjectIds."""
    # Standard string ID
    q_str = build_id_query("FAC-001")
    assert q_str == {"id": "FAC-001"}

    # Valid 24-character hex ObjectId
    valid_oid = str(ObjectId())
    q_oid = build_id_query(valid_oid)
    assert "$or" in q_oid
    assert {"id": valid_oid} in q_oid["$or"]
    assert {"_id": ObjectId(valid_oid)} in q_oid["$or"]

    # None / Empty identifier
    assert build_id_query(None) == {"_id": None}


def test_doc_serializer_converts_bson_types():
    """Verifies serialize_doc safely serializes BSON types to JSON primitives."""
    oid = ObjectId()
    doc = {
        "_id": oid,
        "name": "Sample Hospital",
        "createdAt": date.today(),
        "sub": {"nestedOid": ObjectId()}
    }
    serialized = serialize_doc(doc)
    assert isinstance(serialized["_id"], str)
    assert serialized["id"] == str(oid)
    assert isinstance(serialized["createdAt"], str)
    assert isinstance(serialized["sub"]["nestedOid"], str)


def test_duplicate_facility_code_prevention(client):
    """Verifies that inserting a facility with an existing ID or license fails."""
    payload = {
        "id": "FAC-001",  # Pre-existing code in synthetic seed
        "name": "Duplicate Central Hospital",
        "type": "Hospital Pharmacy",
        "address": "123 Test Street",
        "licenseNumber": "KA-UNIQUE-NEW-LICENSE",
        "contactPerson": "Test Person",
        "phone": "+91 99999 88888"
    }
    res = client.post('/api/facilities', json=payload)
    # Route validator or repository catches duplicate ID and rejects with 400 or 422
    assert res.status_code in (400, 422)
    err = res.get_json()
    assert err['success'] is False


def test_atomic_conditional_reservation_prevents_over_draw():
    """
    Verifies that reservation strictly enforces availableQuantity >= requested.
    Attempting to reserve more than available stock MUST fail atomically.
    """
    repo = InventoryRepository()
    batch = repo.get_by_id("BAT-102")
    assert batch is not None

    avail = batch['availableQuantity']
    reserved_before = batch['reservedQuantity']

    # 1. Attempt to over-reserve (avail + 10 units)
    over_qty = avail + 10
    success = repo.reserve_stock("BAT-102", over_qty)
    assert success is False, "Over-reservation must return False"

    # Verify inventory was NOT mutated
    batch_after = repo.get_by_id("BAT-102")
    assert batch_after['availableQuantity'] == avail
    assert batch_after['reservedQuantity'] == reserved_before

    # 2. Legitimate reservation of 10 units
    success_legit = repo.reserve_stock("BAT-102", 10)
    assert success_legit is True

    batch_reserved = repo.get_by_id("BAT-102")
    assert batch_reserved['availableQuantity'] == avail - 10
    assert batch_reserved['reservedQuantity'] == reserved_before + 10

    # 3. Clean up by releasing reservation
    repo.release_stock("BAT-102", 10)
    batch_reverted = repo.get_by_id("BAT-102")
    assert batch_reverted['availableQuantity'] == avail
    assert batch_reverted['reservedQuantity'] == reserved_before


def test_simulation_sandbox_complete_isolation(client):
    """
    Verifies that running a Digital Twin simulation creates records in simulation_runs
    WITHOUT altering any operational inventory batches or transfer manifests.
    """
    repo_inv = InventoryRepository()
    batches_before = repo_inv.get_all()
    total_avail_before = sum(b['availableQuantity'] for b in batches_before)

    sim_payload = {
        "scenarioName": "Epidemic Surge 200%",
        "demandMultiplier": 2.0,
        "delayHours": 4,
        "safetyMarginPct": 30,
        "expiryClusterDays": 15
    }
    res = client.post('/api/simulations', json=sim_payload)
    assert res.status_code in (200, 201)
    sim_data = res.get_json()['data']
    assert sim_data['isSandboxed'] is True

    # Check operational inventory is 100% untouched
    batches_after = repo_inv.get_all()
    total_avail_after = sum(b['availableQuantity'] for b in batches_after)
    assert total_avail_after == total_avail_before
    assert len(batches_after) == len(batches_before)


def test_nonexistent_and_invalid_object_id_queries(client):
    """
    Verifies that querying nonexistent or invalid ObjectIds returns 404
    without server error crashes.
    """
    nonexistent_oid = "507f1f77bcf86cd799439011"
    
    # 1. Facilities
    res_fac = client.get(f'/api/facilities/{nonexistent_oid}')
    assert res_fac.status_code == 404
    assert res_fac.get_json()['error']['code'] == 'FACILITY_NOT_FOUND'

    # 2. Medicines
    res_med = client.get(f'/api/medicines/{nonexistent_oid}')
    assert res_med.status_code == 404
    assert res_med.get_json()['error']['code'] == 'MEDICINE_NOT_FOUND'

    # 3. Inventory
    res_inv = client.get(f'/api/inventory/{nonexistent_oid}')
    assert res_inv.status_code == 404
    assert res_inv.get_json()['error']['code'] == 'BATCH_NOT_FOUND'

    # 4. Shortages
    res_sht = client.get(f'/api/shortages/{nonexistent_oid}')
    assert res_sht.status_code == 404
    assert res_sht.get_json()['error']['code'] == 'SHORTAGE_NOT_FOUND'

    # 5. Invalid string identifier
    res_invalid = client.get('/api/facilities/invalid!@#id')
    assert res_invalid.status_code == 404


def test_duplicate_medicine_code_prevention(client):
    """Verifies that inserting a medicine with an existing ID code fails."""
    payload = {
        "id": "MED-001",  # Existing code
        "name": "Duplicate Ceftriaxone",
        "genericName": "Ceftriaxone Sodium",
        "strength": "1g Vial",
        "dosageForm": "Injectable",
        "category": "Antibiotics"
    }
    res = client.post('/api/medicines', json=payload)
    assert res.status_code in (400, 422)
    assert res.get_json()['success'] is False


def test_duplicate_inventory_batch_prevention(client):
    """Verifies that inserting an inventory batch with an existing ID code fails."""
    future_date = (date.today() + timedelta(days=90)).isoformat()
    payload = {
        "id": "BAT-101",  # Existing code
        "facilityId": "FAC-001",
        "medicineName": "Duplicate Ceftriaxone Batch",
        "batchNumber": "DUP-BATCH-001",
        "strength": "1g Vial",
        "totalQuantity": 200,
        "expiryDate": future_date
    }
    res = client.post('/api/inventory', json=payload)
    assert res.status_code in (400, 422)
    assert res.get_json()['success'] is False


def test_reject_negative_quantity_patch(client):
    """Verifies that patching a negative totalQuantity is rejected."""
    res = client.patch('/api/inventory/BAT-101', json={"totalQuantity": -100})
    assert res.status_code in (400, 422)
    assert res.get_json()['success'] is False


def test_seeded_dashboard_derived_aggregates(client):
    """Verifies that dashboard summary returns consistent aggregates derived from seeded collections."""
    res = client.get('/api/dashboard/summary')
    assert res.status_code == 200
    data = res.get_json()['data']

    assert data['totalBatches'] >= 14
    assert data['openShortagesCount'] >= 3
    assert data['totalAvailableUnits'] > 0
    assert data['surplusUnitsAvailable'] > 0
    assert 'ongoingTransfersCount' in data
    assert 'completedTransfersCount' in data
