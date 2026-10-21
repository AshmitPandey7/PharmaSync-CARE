"""
PharmaSync CARE — Optimization Repository (MongoDB)
Stores multi-objective optimization solutions and tradeoff analyses.
"""

from datetime import datetime, timezone
from app.repositories.base_repository import BaseRepository


class OptimizationRepository(BaseRepository):

    def __init__(self):
        super().__init__('optimization_runs')

    def _format_opt(self, doc):
        if not doc:
            return None
        return {
            "runId": doc.get('id') or str(doc.get('_id')),
            "weights": doc.get('weights', {
                "wastePrevention": 0.4,
                "distanceMinimization": 0.3,
                "speedFulfillment": 0.3
            }),
            "objectiveScores": doc.get('objectiveScores', {
                "wastePreventionScore": 90,
                "transportEfficiencyScore": 85,
                "speedScore": 88
            }),
            "allocations": doc.get('allocations', []),
            "tradeoffSummary": doc.get('tradeoffSummary', ''),
            "createdAt": doc.get('createdAt', datetime.now(timezone.utc)).isoformat() if isinstance(doc.get('createdAt'), datetime) else str(doc.get('createdAt', ''))
        }

    def get_all(self):
        cursor = self.collection.find().sort('createdAt', -1)
        return [self._format_opt(doc) for doc in cursor]

    def get_by_id(self, run_id):
        doc = self.collection.find_one(self.id_query(run_id))
        return self._format_opt(doc)

    def create(self, data):
        doc = dict(data)
        now = datetime.now(timezone.utc)
        doc['createdAt'] = now
        doc['updatedAt'] = now

        self.collection.insert_one(doc)
        return self.get_by_id(doc['id'])
