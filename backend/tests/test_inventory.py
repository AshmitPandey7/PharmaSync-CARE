"""
Test inventory batch management, demand-aware surplus, and rescue triage.
"""

from datetime import date, timedelta


def test_list_inventory(client):
    res = client.get('/api/inventory')
    assert res.status_code == 200
    data = res.get_json()['data']
    assert len(data) >= 12
    first = data[0]
    assert 'batchNumber' in first
    assert 'availableQuantity' in first
    assert 'eligibleSurplusQuantity' in first


def test_filter_inventory_by_facility(client):
    res = client.get('/api/inventory?facilityId=FAC-001')
    assert res.status_code == 200
    batches = res.get_json()['data']
    assert all(b['facilityId'] == 'FAC-001' for b in batches)


def test_add_inventory_batch_valid(client):
    future_date = (date.today() + timedelta(days=90)).isoformat()
    payload = {
        "facilityId": "FAC-001",
        "medicineName": "Azithromycin 250mg",
        "genericName": "Azithromycin",
        "batchNumber": "AZT-TEST-001",
        "strength": "250mg Tablets",
        "dosageForm": "Oral Solid",
        "totalQuantity": 400,
        "expectedMonthlyDemand": 100,
        "safetyStockThreshold": 30,
        "expiryDate": future_date,
        "unitPrice": 15.00
    }
    res = client.post('/api/inventory', json=payload)
    assert res.status_code == 201
    created = res.get_json()['data']
    assert created['batchNumber'] == "AZT-TEST-001"
    assert created['availableQuantity'] == 400
    # Surplus: 400 - (100 + 30) = 270
    assert created['eligibleSurplusQuantity'] == 270


def test_reject_expired_batch_registration(client):
    past_date = (date.today() - timedelta(days=10)).isoformat()
    payload = {
        "facilityId": "FAC-001",
        "medicineName": "Expired Ampicillin",
        "batchNumber": "AMP-EXPIRED",
        "strength": "500mg",
        "totalQuantity": 200,
        "expiryDate": past_date
    }
    res = client.post('/api/inventory', json=payload)
    assert res.status_code == 400
    assert "expired" in res.get_json()['message'].lower()


def test_rescue_surveillance_candidates(client):
    res = client.get('/api/rescue/candidates')
    assert res.status_code == 200
    candidates = res.get_json()['data']
    assert len(candidates) >= 12
    for c in candidates:
        assert 'priorityScore' in c
        assert 'recommendation' in c
        assert c['recommendation'] in ('TRANSFER', 'MONITOR', 'RETAIN', 'BLOCK')
        assert 'reasons' in c
        assert isinstance(c['reasons'], list)


def test_get_batch_detail(client):
    res = client.get('/api/inventory/BAT-101')
    assert res.status_code == 200
    batch = res.get_json()['data']
    assert batch['id'] == 'BAT-101'
    assert batch['batchNumber'] == 'CTX-2026-B1'


def test_get_missing_batch(client):
    res = client.get('/api/inventory/BAT-NONEXISTENT')
    assert res.status_code == 404
    err = res.get_json()
    assert err['success'] is False
    assert err['error']['code'] == 'BATCH_NOT_FOUND'


def test_update_batch_quantity(client):
    res = client.patch('/api/inventory/BAT-101', json={"totalQuantity": 700})
    assert res.status_code == 200
    batch = res.get_json()['data']
    assert batch['totalQuantity'] == 700
    # available = total - reserved (700 - 100 = 600)
    assert batch['availableQuantity'] == 600


def test_reject_negative_batch_quantity(client):
    future_date = (date.today() + timedelta(days=90)).isoformat()
    payload = {
        "facilityId": "FAC-001",
        "medicineName": "Negative Ampicillin",
        "batchNumber": "NEG-001",
        "strength": "500mg",
        "totalQuantity": -50,
        "expiryDate": future_date
    }
    res = client.post('/api/inventory', json=payload)
    assert res.status_code == 400
    assert "greater than zero" in res.get_json()['message'].lower()


def test_inventory_pagination(client):
    res = client.get('/api/inventory?page=1&per_page=5')
    assert res.status_code == 200
    body = res.get_json()
    assert len(body['data']) == 5
    assert body['meta']['page'] == 1
    assert body['meta']['per_page'] == 5
    assert body['meta']['total'] >= 12
