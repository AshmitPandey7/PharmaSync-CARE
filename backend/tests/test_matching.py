"""
Test smart donor matching algorithm, distance calculation, and safety exclusions.
"""


def test_smart_matching_candidates(client):
    res = client.post('/api/matching/candidates', json={"shortageId": "SHT-201"})
    assert res.status_code == 200
    data = res.get_json()['data']
    assert 'shortage' in data
    assert 'candidates' in data
    assert data['shortage']['id'] == 'SHT-201'

    candidates = data['candidates']
    assert len(candidates) > 0
    top = candidates[0]
    assert 'donorFacilityName' in top
    assert 'matchScore' in top
    assert 'distanceKm' in top
    assert 'isEligible' in top
    assert 'reasons' in top
    assert isinstance(top['reasons'], list)
    assert len(top['reasons']) > 0


def test_matching_excludes_self_donor(client):
    # Recipient of SHT-201 is FAC-003. Candidate donor cannot be FAC-003.
    res = client.post('/api/matching/candidates', json={"shortageId": "SHT-201"})
    assert res.status_code == 200
    candidates = res.get_json()['data']['candidates']
    assert all(c['donorFacilityId'] != 'FAC-003' for c in candidates)


def test_matching_nonexistent_shortage(client):
    res = client.post('/api/matching/candidates', json={"shortageId": "SHT-99999"})
    assert res.status_code == 404
