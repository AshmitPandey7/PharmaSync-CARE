"""
Test analytics metrics and dashboard summaries against seeded database values.
"""


def test_dashboard_summary(client):
    res = client.get('/api/dashboard/summary')
    assert res.status_code == 200
    summary = res.get_json()['data']
    assert summary['totalBatches'] >= 12
    assert summary['totalAvailableUnits'] > 10000
    assert summary['openShortagesCount'] >= 3
    assert 'ongoingTransfersCount' in summary
    assert 'completedTransfersCount' in summary


def test_dashboard_summary_facility_filter(client):
    res = client.get('/api/dashboard/summary?facilityId=FAC-001')
    assert res.status_code == 200
    summary = res.get_json()['data']
    assert summary['totalBatches'] >= 5
    assert summary['totalAvailableUnits'] > 0


def test_analytics_reports(client):
    res = client.get('/api/dashboard/analytics?timeframe=30')
    assert res.status_code == 200
    analytics = res.get_json()['data']
    assert 'totalUnitsShared' in analytics
    assert 'totalRequested' in analytics
    assert 'totalFulfilled' in analytics
    assert 'fulfillmentRatePct' in analytics
    assert 'participation' in analytics
    assert len(analytics['participation']) >= 6
    assert 'monthlyTrends' in analytics
    assert len(analytics['monthlyTrends']['labels']) == 6
