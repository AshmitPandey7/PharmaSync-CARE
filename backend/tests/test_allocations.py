"""
Test FairShare proportional allocation simulation, FCFS comparison, and constraints.
"""


def test_fairshare_simulation(client):
    payload = {
        "totalAvailableUnits": 200,
        "urgencyWeight": 0.45,
        "vulnerabilityWeight": 0.35,
        "demandWeight": 0.20,
        "requests": [
            {"facilityId": "FAC-001", "facilityName": "Apex Central Hospital", "requested": 120, "urgency": "EMERGENCY", "vulnerabilityScore": 0.8},
            {"facilityId": "FAC-003", "facilityName": "Green Valley Health Centre", "requested": 90, "urgency": "EMERGENCY", "vulnerabilityScore": 0.95},
            {"facilityId": "FAC-005", "facilityName": "St. Jude Charitable Dispensary", "requested": 80, "urgency": "HIGH", "vulnerabilityScore": 0.85}
        ]
    }
    res = client.post('/api/allocation/simulate', json=payload)
    assert res.status_code == 200
    data = res.get_json()['data']

    assert data['totalAvailableSupply'] == 200
    assert data['totalDemand'] == 290
    assert data['deficit'] == 90

    # Verify no over-allocation constraint
    fair_results = data['comparison']['fairShare']
    fcfs_results = data['comparison']['fcfs']

    assert sum(r['allocated'] for r in fair_results) <= 200
    assert sum(r['allocated'] for r in fcfs_results) <= 200

    # In FCFS, 3rd facility is starved (only gets remaining: 200 - 120 - 80 = 0)
    assert fcfs_results[2]['allocated'] == 0

    # In FairShare, 3rd facility receives non-zero allocation due to equity balancing!
    assert fair_results[2]['allocated'] > 0


def test_allocation_commit(client):
    payload = {
        "allocations": [
            {"facilityId": "FAC-001", "allocated": 85},
            {"facilityId": "FAC-003", "allocated": 70},
            {"facilityId": "FAC-005", "allocated": 45}
        ]
    }
    res = client.post('/api/allocations/commit', json=payload)
    assert res.status_code == 200
    assert res.get_json()['data']['status'] == 'COMMITTED'
