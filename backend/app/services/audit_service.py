"""
PharmaSync CARE — Audit Service
Provides high-level audit logging queries.
"""

from app.repositories.audit_repository import AuditRepository


class AuditService:
    def __init__(self):
        self.repo = AuditRepository()

    def get_logs(self, limit=100):
        return self.repo.get_all(limit)

    def log(self, action, entity, user_name, role, details, ip_address='127.0.0.1'):
        return self.repo.log(action, entity, user_name, role, details, ip_address)
