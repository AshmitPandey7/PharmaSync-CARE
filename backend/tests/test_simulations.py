"""
Test Digital Twin simulation sandbox and verification of data isolation.
"""


def test_run_simulation(client):
    payload = {
        "scenarioName": "Epidemic Surge Outbreak Test",
        "demandMultiplier": 2.5,
        "delayHours": 6,
        "safetyMarginPct": 20,
        "expiryClusterDays": 30
    }

    # Count inventory before running simulation
    inv_before = client.get('/api/inventory').get_json()['data']
    trf_before = client.get('/api/transfers').get_json()['data']

    res = client.post('/api/simulations', json=payload)
    assert res.status_code == 201
    sim = res.get_json()['data']

    assert sim['scenarioName'] == "Epidemic Surge Outbreak Test"
    assert sim['isSandboxed'] is True
    assert 'metrics' in sim
    assert sim['metrics']['simulatedDemand'] > 3400
    assert sim['metrics']['suppliedViaNetwork'] > 0
    assert 'timeSeries' in sim['metrics']
    assert len(sim['metrics']['timeSeries']) == 7

    # Data Isolation Guarantee: Inventory counts and real transfer records are UNCHANGED
    inv_after = client.get('/api/inventory').get_json()['data']
    trf_after = client.get('/api/transfers').get_json()['data']

    assert len(inv_before) == len(inv_after)
    assert len(trf_before) == len(trf_after)


def test_list_simulations(client):
    res = client.get('/api/simulations')
    assert res.status_code == 200
    sims = res.get_json()['data']
    assert len(sims) >= 1
