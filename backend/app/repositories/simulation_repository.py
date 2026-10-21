"""
PharmaSync CARE — Simulation Repository (MongoDB)
Stores and retrieves sandboxed Digital Twin runs and performance metrics.
Completely isolated from active operational inventory.
"""

from datetime import datetime, timezone
from app.repositories.base_repository import BaseRepository


class SimulationRepository(BaseRepository):

    def __init__(self):
        super().__init__('simulation_runs')

    def _format_sim(self, doc):
        if not doc:
            return None
        return {
            "simulationId": doc.get('id') or str(doc.get('_id')),
            "scenarioName": doc.get('scenarioName', 'Standard Projection'),
            "demandMultiplier": float(doc.get('demandMultiplier', 1.0)),
            "delayHours": int(doc.get('delayHours', 0)),
            "safetyMarginPct": int(doc.get('safetyMarginPct', 20)),
            "expiryClusterDays": int(doc.get('expiryClusterDays', 30)),
            "isSandboxed": True,
            "metrics": doc.get('metrics', {
                "simulatedDemand": 0,
                "unmanagedStockouts": 0,
                "suppliedViaNetwork": 0,
                "resilienceFulfillmentPct": 100,
                "isolatedServiceLevelPct": 85
            }),
            "createdAt": doc.get('createdAt', datetime.now(timezone.utc)).isoformat() if isinstance(doc.get('createdAt'), datetime) else str(doc.get('createdAt', ''))
        }

    def get_all(self):
        cursor = self.collection.find().sort('createdAt', -1)
        return [self._format_sim(doc) for doc in cursor]

    def get_by_id(self, sim_id):
        doc = self.collection.find_one(self.id_query(sim_id))
        return self._format_sim(doc)

    def create(self, data):
        doc = dict(data)
        now = datetime.now(timezone.utc)
        doc['createdAt'] = now
        doc['updatedAt'] = now
        doc['isSandboxed'] = True

        metrics = {
            "simulatedDemand": int(data.get('simulatedDemand', 0)),
            "unmanagedStockouts": int(data.get('unmanagedStockouts', 0)),
            "suppliedViaNetwork": int(data.get('suppliedViaNetwork', 0)),
            "resilienceFulfillmentPct": int(data.get('resilienceFulfillmentPct', 100)),
            "isolatedServiceLevelPct": int(data.get('isolatedServiceLevelPct', 85)),
            **data.get('extraMetrics', {})
        }
        doc['metrics'] = metrics

        self.collection.insert_one(doc)
        return self.get_by_id(doc['id'])
