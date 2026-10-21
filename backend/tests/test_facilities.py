"""
Test facilities listing, filtering, creation, and updating.
"""


def test_list_facilities(client):
    res = client.get('/api/facilities')
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data['success'] is True
    facilities = json_data['data']
    assert len(facilities) >= 6
    assert any(f['id'] == 'FAC-001' for f in facilities)
    assert any(f['name'] == 'Apex Central Hospital' for f in facilities)


def test_filter_facilities_by_type(client):
    res = client.get('/api/facilities?type=Hospital%20Pharmacy')
    assert res.status_code == 200
    facilities = res.get_json()['data']
    assert all(f['type'] == 'Hospital Pharmacy' for f in facilities)


def test_filter_facilities_by_cold_chain(client):
    res = client.get('/api/facilities?cold_chain=true')
    assert res.status_code == 200
    facilities = res.get_json()['data']
    assert all(f['coldChainCertified'] is True for f in facilities)


def test_create_facility(client):
    payload = {
        "name": "Test Suburban Dispensary",
        "type": "Community Pharmacy",
        "typeBadge": "community",
        "address": "99 Willow Lane",
        "coordinates": [12.9500, 77.6000],
        "coldChainCertified": False,
        "licenseNumber": "TEST-LIC-2026-001",
        "bedCapacity": 0,
        "contactPerson": "Dr. T. Smith",
        "phone": "+91 80 1111 2222"
    }
    res = client.post('/api/facilities', json=payload)
    assert res.status_code == 201
    created = res.get_json()['data']
    assert created['name'] == "Test Suburban Dispensary"
    assert created['id'].startswith("FAC-")


def test_update_facility(client):
    res = client.patch('/api/facilities/FAC-001', json={"bedCapacity": 475})
    assert res.status_code == 200
    updated = res.get_json()['data']
    assert updated['bedCapacity'] == 475


def test_get_facility_detail(client):
    res = client.get('/api/facilities/FAC-001')
    assert res.status_code == 200
    fac = res.get_json()['data']
    assert fac['id'] == 'FAC-001'
    assert fac['name'] == 'Apex Central Hospital'


def test_get_missing_facility(client):
    res = client.get('/api/facilities/FAC-NONEXISTENT')
    assert res.status_code == 404
    err = res.get_json()
    assert err['success'] is False
    assert err['error']['code'] == 'FACILITY_NOT_FOUND'


def test_create_facility_validation_error(client):
    res = client.post('/api/facilities', json={"name": "Incomplete Clinic"})
    assert res.status_code == 422
    err = res.get_json()
    assert err['success'] is False
    assert err['error']['code'] == 'VALIDATION_ERROR'


def test_facilities_pagination(client):
    res = client.get('/api/facilities?page=1&per_page=3')
    assert res.status_code == 200
    body = res.get_json()
    assert len(body['data']) == 3
    assert body['meta']['page'] == 1
    assert body['meta']['per_page'] == 3
    assert body['meta']['total'] >= 6
