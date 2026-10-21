"""
PharmaSync CARE — Audit Event Repository (MongoDB)
Records and retrieves immutable audit logs for regulatory oversight.
"""

import uuid
from datetime import datetime, timezone
from app.repositories.base_repository import BaseRepository


class AuditRepository(BaseRepository):

    def __init__(self):
        super().__init__('audit_events')

    def get_all(self, limit=100):
        cursor = self.collection.find().sort('timestamp', -1).limit(int(limit))
        logs = []
        for doc in cursor:
            ts = doc.get('timestamp')
            ts_str = ts.strftime('%Y-%m-%d %H:%M:%S') if isinstance(ts, datetime) else str(ts)[:19]
            logs.append({
                "id": doc.get('id') or str(doc.get('_id')),
                "timestamp": ts_str,
                "user": doc.get('user_name') or doc.get('user', 'System'),
                "role": doc.get('role', 'System'),
                "action": doc.get('action', ''),
                "entity": doc.get('entity', ''),
                "details": doc.get('details', ''),
                "ipAddress": doc.get('ipAddress', '127.0.0.1')
            })
        return logs

    def log(self, action, entity, user_name="System", role="System", details="", ip_address='127.0.0.1'):
        log_id = f"LOG-{uuid.uuid4().hex[:10].upper()}"
        doc = {
            "id": log_id,
            "timestamp": datetime.now(timezone.utc),
            "user": user_name,
            "user_name": user_name,
            "role": role,
            "action": action,
            "entity": entity,
            "details": details,
            "ipAddress": ip_address
        }
        self.collection.insert_one(doc)
        return log_id
