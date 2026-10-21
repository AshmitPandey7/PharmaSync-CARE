"""
Test shortage ticket declaration, validation, and listing.
"""

from datetime import date, timedelta


def test_list_shortages(client):
    res = client.get('/api/shortages')
    assert res.status_code == 200
    shortages = res.get_json()['data']
    assert len(shortages) >= 3
    assert any(s['id'] == 'SHT-201' for s in shortages)


def test_filter_shortages_by_urgency(client):
    res = client.get('/api/shortages?urgency=EMERGENCY')
    assert res.status_code == 200
    shortages = res.get_json()['data']
    assert all(s['urgency'] == 'EMERGENCY' for s in shortages)


def test_create_shortage_ticket(client):
    req_date = (date.today() + timedelta(days=7)).isoformat()
    payload = {
        "facilityId": "FAC-003",
        "medicineName": "Doxycycline Hyclate",
        "strength": "100mg Capsules",
        "dosageForm": "Oral Solid",
        "requiredQuantity": 250,
        "urgency": "HIGH",
        "requiredByDate": req_date,
        "reason": "Outbreak of scrub typhus in district."
    }
    res = client.post('/api/shortages', json=payload)
    assert res.status_code == 201
    created = res.get_json()['data']
    assert created['medicineName'] == "Doxycycline Hyclate"
    assert created['requiredQuantity'] == 250
    assert created['unmetQuantity'] == 250
    assert created['status'] == "OPEN"


def test_reject_shortage_past_deadline(client):
    past_date = (date.today() - timedelta(days=2)).isoformat()
    payload = {
        "facilityId": "FAC-003",
        "medicineName": "Salbutamol Inhaler",
        "strength": "100mcg",
        "requiredQuantity": 50,
        "requiredByDate": past_date
    }
    res = client.post('/api/shortages', json=payload)
    assert res.status_code == 400


def test_get_shortage_detail(client):
    res = client.get('/api/shortages/SHT-201')
    assert res.status_code == 200
    s = res.get_json()['data']
    assert s['id'] == 'SHT-201'
    assert s['medicineName'] == 'Ceftriaxone Injection'
    assert s['facilityId'] == 'FAC-003'


def test_get_missing_shortage(client):
    res = client.get('/api/shortages/SHT-NONEXISTENT')
    assert res.status_code == 404
    err = res.get_json()
    assert err['success'] is False
    assert err['error']['code'] == 'SHORTAGE_NOT_FOUND'


def test_update_shortage_ticket(client):
    res = client.patch('/api/shortages/SHT-201', json={"urgency": "HIGH", "reason": "Surge stabilizes"})
    assert res.status_code == 200
    updated = res.get_json()['data']
    assert updated['urgency'] == "HIGH"
    assert updated['reason'] == "Surge stabilizes"


def test_create_shortage_validation_error(client):
    res = client.post('/api/shortages', json={"facilityId": "FAC-001"})
    assert res.status_code == 422
    err = res.get_json()
    assert err['success'] is False
    assert err['error']['code'] == 'VALIDATION_ERROR'


def test_shortages_pagination(client):
    res = client.get('/api/shortages?page=1&per_page=2')
    assert res.status_code == 200
    body = res.get_json()
    assert len(body['data']) == 2
    assert body['meta']['page'] == 1
    assert body['meta']['per_page'] == 2
    assert body['meta']['total'] >= 3
