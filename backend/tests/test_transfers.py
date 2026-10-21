"""
Test transfer lifecycle progression, reservation atomicity, and cancellation release.
"""


def test_list_transfers(client):
    res = client.get('/api/transfers')
    assert res.status_code == 200
    transfers = res.get_json()['data']
    assert len(transfers) >= 4
    first = transfers[0]
    assert 'transferCode' in first
    assert 'status' in first
    assert 'lifecycleIndex' in first
    assert 'statusHistory' in first


def test_create_transfer_and_reserve_stock(client):
    # Fetch batch BAT-102 baseline
    b_before = client.get('/api/inventory/BAT-102').get_json()['data']
    avail_before = b_before['availableQuantity']
    res_before = b_before['reservedQuantity']

    qty = 50
    payload = {
        "senderFacilityId": "FAC-001",
        "recipientFacilityId": "FAC-003",
        "batchId": "BAT-102",
        "medicineName": "Amoxicillin + Clavulanate",
        "strength": "625mg Tablets",
        "quantity": qty,
        "urgency": "HIGH",
        "notes": "Pytest reservation lock test"
    }
    res = client.post('/api/transfers', json=payload)
    assert res.status_code == 201
    trf = res.get_json()['data']
    assert trf['quantity'] == qty
    assert trf['status'] == 'REQUESTED'

    # Verify inventory was reserved atomically
    b_after = client.get('/api/inventory/BAT-102').get_json()['data']
    assert b_after['reservedQuantity'] == res_before + qty
    assert b_after['availableQuantity'] == avail_before - qty

    # Now cancel the transfer and verify reservation is released safely
    trf_id = trf['id']
    cancel_res = client.post(f'/api/transfers/{trf_id}/cancel', json={"note": "Test cancellation release"})
    assert cancel_res.status_code == 200
    assert cancel_res.get_json()['data']['status'] == 'CANCELLED'

    # Check that stock was released back
    b_released = client.get('/api/inventory/BAT-102').get_json()['data']
    assert b_released['reservedQuantity'] == res_before
    assert b_released['availableQuantity'] == avail_before


def test_prevent_over_allocation(client):
    # Attempt to transfer 999999 units (exceeding stock)
    payload = {
        "senderFacilityId": "FAC-001",
        "recipientFacilityId": "FAC-003",
        "batchId": "BAT-102",
        "medicineName": "Amoxicillin + Clavulanate",
        "quantity": 999999
    }
    res = client.post('/api/transfers', json=payload)
    assert res.status_code == 400
    assert "insufficient" in res.get_json()['message'].lower()


def test_valid_lifecycle_progression(client):
    # 1. Create transfer
    payload = {
        "senderFacilityId": "FAC-001",
        "recipientFacilityId": "FAC-002",
        "batchId": "BAT-102",
        "medicineName": "Amoxicillin + Clavulanate",
        "strength": "625mg Tablets",
        "quantity": 10,
        "urgency": "ROUTINE"
    }
    trf = client.post('/api/transfers', json=payload).get_json()['data']
    trf_id = trf['id']
    assert trf['status'] == 'REQUESTED'

    # 2. Advance to APPROVED
    res_appr = client.post(f'/api/transfers/{trf_id}/approve', json={"note": "Approved by Dr. Nair"})
    assert res_appr.status_code == 200, f"Approve failed with {res_appr.status_code}: {res_appr.get_json()}"
    appr = res_appr.get_json()['data']
    assert appr['status'] == 'APPROVED'
    assert appr['lifecycleIndex'] == 2

    # 3. Advance to DISPATCHED
    res_disp = client.post(f'/api/transfers/{trf_id}/dispatch', json={"note": "Loaded onto refrigerated van"})
    assert res_disp.status_code == 200, f"Dispatch failed with {res_disp.status_code}: {res_disp.get_json()}"
    disp = res_disp.get_json()['data']
    assert disp['status'] == 'DISPATCHED'
    assert disp['lifecycleIndex'] == 3

    # 4. Advance to RECEIVED
    res_recv = client.post(f'/api/transfers/{trf_id}/receive', json={"note": "Received by Venkat"})
    assert res_recv.status_code == 200, f"Receive failed with {res_recv.status_code}: {res_recv.get_json()}"
    recv = res_recv.get_json()['data']
    assert recv['status'] == 'RECEIVED'
    assert recv['lifecycleIndex'] == 4

    # 5. Check status history log count
    assert len(recv['statusHistory']) >= 4


def test_reject_invalid_lifecycle_jump(client):
    # Create transfer (starts at REQUESTED)
    payload = {
        "senderFacilityId": "FAC-001",
        "recipientFacilityId": "FAC-002",
        "batchId": "BAT-102",
        "medicineName": "Amoxicillin + Clavulanate",
        "strength": "625mg Tablets",
        "quantity": 5
    }
    trf = client.post('/api/transfers', json=payload).get_json()['data']
    trf_id = trf['id']

    # Attempt to jump straight to RECEIVED without approving or dispatching
    jump_res = client.post(f'/api/transfers/{trf_id}/receive', json={"note": "Illegal jump"})
    assert jump_res.status_code == 400
    assert "invalid" in jump_res.get_json()['message'].lower()
