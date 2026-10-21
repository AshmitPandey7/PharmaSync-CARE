"""
PharmaSync CARE — Authentication Service
Session verification, demo credentials, and password validation.
"""

import uuid
from app.repositories.user_repository import UserRepository
from app.repositories.audit_repository import AuditRepository


class AuthService:
    def __init__(self):
        self.user_repo = UserRepository()
        self.audit = AuditRepository()

    def get_users(self):
        return self.user_repo.get_all()

    def login(self, username, password, ip_address="127.0.0.1"):
        if not username or not password:
            raise ValueError("Username and password must be provided.")

        user = self.user_repo.verify_password(username, password)
        if not user:
            raise ValueError("Invalid username or password.")

        token = f"ps_token_{str(uuid.uuid4()).replace('-', '')[:24]}"

        self.audit.log(
            action="USER_LOGIN",
            entity=user['username'],
            user_name=user['name'],
            role=user['role'],
            details=f"User {user['username']} signed in successfully",
            ip_address=ip_address
        )

        return {
            "token": token,
            "user": user
        }
