"""
Test health endpoint and database ping.
"""


def test_health_check(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['success'] is True
    assert data['data']['status'] == 'OK'
    assert data['data']['database'] == 'CONNECTED'
    assert 'timestamp' in data['data']


def test_root_index(client):
    res = client.get('/')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert 'PharmaSync CARE' in data['data']['application']


def test_health_database_unavailable(client, mocker):
    from app.database import get_db
    db = get_db()
    mocker.patch.object(db, 'ping', side_effect=Exception("Connection refused"))
    res = client.get('/api/health')
    assert res.status_code == 503
    data = res.get_json()
    assert data['success'] is False
    assert data['error']['code'] == 'DATABASE_UNAVAILABLE'
