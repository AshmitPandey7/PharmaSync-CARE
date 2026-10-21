"""
Test medicines listing, detail, creation, updating, filtering, and pagination.
"""


def test_list_medicines(client):
    res = client.get('/api/medicines')
    assert res.status_code == 200
    body = res.get_json()
    assert body['success'] is True
    meds = body['data']
    assert len(meds) >= 12
    assert any(m['id'] == 'MED-001' for m in meds)
    assert any(m['name'] == 'Ceftriaxone Injection' for m in meds)


def test_get_medicine_detail(client):
    res = client.get('/api/medicines/MED-001')
    assert res.status_code == 200
    med = res.get_json()['data']
    assert med['id'] == 'MED-001'
    assert med['name'] == 'Ceftriaxone Injection'
    assert med['dosageForm'] == 'Injectable'


def test_get_missing_medicine(client):
    res = client.get('/api/medicines/MED-NONEXISTENT')
    assert res.status_code == 404
    body = res.get_json()
    assert body['success'] is False
    assert body['error']['code'] == 'MEDICINE_NOT_FOUND'


def test_filter_medicines_by_category(client):
    res = client.get('/api/medicines?category=Antibiotics')
    assert res.status_code == 200
    meds = res.get_json()['data']
    assert len(meds) > 0
    assert all(m['category'] == 'Antibiotics' for m in meds)


def test_search_medicines(client):
    res = client.get('/api/medicines?search=insulin')
    assert res.status_code == 200
    meds = res.get_json()['data']
    assert len(meds) > 0
    assert any('insulin' in m['name'].lower() for m in meds)


def test_medicines_pagination(client):
    res = client.get('/api/medicines?page=1&per_page=4')
    assert res.status_code == 200
    body = res.get_json()
    assert len(body['data']) == 4
    assert body['meta']['page'] == 1
    assert body['meta']['per_page'] == 4
    assert body['meta']['total'] >= 12


def test_create_medicine_valid(client):
    payload = {
        "name": "Doxycycline Hyclate",
        "genericName": "Doxycycline",
        "strength": "100mg Capsule",
        "dosageForm": "Oral Solid",
        "category": "Antibiotics",
        "coldChainRequired": False,
        "standardUnit": "Capsule"
    }
    res = client.post('/api/medicines', json=payload)
    assert res.status_code == 201
    created = res.get_json()['data']
    assert created['name'] == "Doxycycline Hyclate"
    assert created['id'].startswith("MED-")


def test_create_medicine_invalid(client):
    res = client.post('/api/medicines', json={"name": "Incomplete"})
    assert res.status_code == 422
    err = res.get_json()
    assert err['success'] is False
    assert err['error']['code'] == 'VALIDATION_ERROR'


def test_update_medicine(client):
    res = client.patch('/api/medicines/MED-001', json={"standardUnit": "1g Vial (Vial)"})
    assert res.status_code == 200
    updated = res.get_json()['data']
    assert updated['standardUnit'] == "1g Vial (Vial)"
