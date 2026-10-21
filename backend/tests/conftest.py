"""
PharmaSync CARE — Test Configuration & Fixtures
Sets up isolated in-memory test database and test client.
"""

import sys
from pathlib import Path
import pytest

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app import create_app
from app.config import TestConfig


@pytest.fixture(scope="session")
def app():
    """Create Flask application configured for isolated testing."""
    test_app = create_app(TestConfig)
    return test_app


@pytest.fixture(scope="session", autouse=True)
def setup_test_db(app):
    """Initializes indexes and seeds deterministic records into the isolated test database."""
    from app.database import get_db
    from scripts.init_db import setup_indexes
    from scripts.seed_data import seed_database

    db_mgr = get_db()
    # Clean transient test records from prior runs
    db_mgr.db.facilities.delete_many({"licenseNumber": {"$regex": "^TEST-"}})
    db_mgr.db.medicines.delete_many({"code": {"$regex": "^TEST-"}})
    db_mgr.db.inventory.delete_many({"batchNumber": {"$regex": "^TEST-"}})
    db_mgr.db.shortages.delete_many({"id": {"$regex": "^SHT-TEST-"}})

    setup_indexes(db_mgr.db)
    seed_database(db_mgr.db)
    yield
    # Clean transient test records upon session completion
    db_mgr.db.facilities.delete_many({"licenseNumber": {"$regex": "^TEST-"}})
    db_mgr.db.medicines.delete_many({"code": {"$regex": "^TEST-"}})
    db_mgr.db.inventory.delete_many({"batchNumber": {"$regex": "^TEST-"}})
    db_mgr.db.shortages.delete_many({"id": {"$regex": "^SHT-TEST-"}})


@pytest.fixture(scope="function")
def client(app):
    """Provide a test client for API requests."""
    return app.test_client()
