"""
Test multi-objective strategy optimization and counterfactual sensitivity analysis.
"""


def test_multi_objective_optimization_run(client):
    payload = {
        "weights": {
            "wastePrevention": 0.85,
            "distanceMinimization": 0.40,
            "speedFulfillment": 0.70
        }
    }
    res = client.post('/api/optimization/runs', json=payload)
    assert res.status_code == 201
    run = res.get_json()['data']

    assert 'runId' in run
    assert 'objectiveScores' in run
    assert 'wastePreventionScore' in run['objectiveScores']
    assert 'transportEfficiencyScore' in run['objectiveScores']
    assert 'speedScore' in run['objectiveScores']
    assert 'tradeoffSummary' in run


def test_counterfactual_sensitivity_analysis(client):
    # Case 1: Adequate stock and valid shelf-life -> Feasible
    case_normal = {
        "transferId": "TRF-501",
        "donorAvailableStock": 550,
        "localMonthlyDemand": 200,
        "remainingShelfLifeDays": 50,
        "transitDistanceKm": 13.5
    }
    res1 = client.post('/api/optimization/counterfactuals', json=case_normal)
    assert res1.status_code == 200
    outcome1 = res1.get_json()['data']['outcome']
    assert outcome1['isFeasible'] is True

    # Case 2: Shelf-life perturbed below 15-day safety floor -> Blocked
    case_imminent_expiry = {
        "transferId": "TRF-501",
        "donorAvailableStock": 550,
        "localMonthlyDemand": 200,
        "remainingShelfLifeDays": 10,
        "transitDistanceKm": 13.5
    }
    res2 = client.post('/api/optimization/counterfactuals', json=case_imminent_expiry)
    assert res2.status_code == 200
    outcome2 = res2.get_json()['data']['outcome']
    assert outcome2['isFeasible'] is False
    assert "BLOCK" in outcome2['recommendation']
