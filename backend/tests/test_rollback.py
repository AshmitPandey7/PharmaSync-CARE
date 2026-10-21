"""
PharmaSync CARE — MongoDB Transaction & Rollback Safety Tests
Verifies that database modifications are rolled back or aborted when an operation fails mid-transaction.
"""

import pytest
from app.database import get_db
from app.repositories.inventory_repository import InventoryRepository


def test_transaction_rollback_on_failure(app):
    """
    Verifies that multi-document transactions (when supported) roll back aborted writes,
    and that atomic conditional stock reservations fail cleanly without partial state.
    """
    db_mgr = get_db()
    db = db_mgr.db

    initial_audit_count = db.audit_events.count_documents({})

    # If transactions are supported (replica set deployment), test session rollback
    if db_mgr.supports_transactions():
        with pytest.raises(RuntimeError):
            with db_mgr.transaction() as session:
                db.audit_events.insert_one(
                    {
                        "id": "LOG-ROLLBACK-TEST",
                        "action": "TEST_ACTION",
                        "entity": "TEST-ENTITY",
                        "user": "Tester",
                        "details": "Testing rollback"
                    },
                    session=session
                )
                raise RuntimeError("Forced crash to trigger transaction rollback")

        post_count = db.audit_events.count_documents({})
        assert post_count == initial_audit_count
        assert db.audit_events.find_one({"id": "LOG-ROLLBACK-TEST"}) is None
    else:
        # Standalone / mock fallback: verify atomic stock reservations never leave partial state
        repo = InventoryRepository()
        batch = repo.get_by_id("BAT-101")
        avail_before = batch['availableQuantity']

        # Attempt impossible reservation
        res = repo.reserve_stock("BAT-101", avail_before + 9999)
        assert res is False

        # Verify no modification occurred
        batch_after = repo.get_by_id("BAT-101")
        assert batch_after['availableQuantity'] == avail_before
