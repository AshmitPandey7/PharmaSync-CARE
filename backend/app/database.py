"""
PharmaSync CARE — MongoDB Atlas Database Connection & Lifecycle Manager
Uses PyMongo with connection pooling, strict timeouts, and graceful in-memory
mongomock testing fallback. Never leaks connection credentials or secrets.
"""

import os
from contextlib import contextmanager
from datetime import datetime, date, timezone
from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, ConfigurationError

try:
    import mongomock
    MONGOMOCK_AVAILABLE = True
except ImportError:
    MONGOMOCK_AVAILABLE = False


def serialize_doc(doc):
    """
    Recursively converts BSON ObjectId, datetime, and date objects into
    JSON-serializable strings. Preserves the root 'id' attribute.
    """
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        res = {}
        for k, v in doc.items():
            if k == '_id':
                res['_id'] = str(v)
                if 'id' not in doc:
                    res['id'] = str(v)
            elif isinstance(v, ObjectId):
                res[k] = str(v)
            elif isinstance(v, (datetime, date)):
                res[k] = v.isoformat()
            elif isinstance(v, dict):
                res[k] = serialize_doc(v)
            elif isinstance(v, list):
                res[k] = [serialize_doc(x) for x in v]
            else:
                res[k] = v
        return res
    return doc


def build_id_query(identifier):
    """
    Builds a flexible query filter matching either a synthetic string code
    (e.g., 'FAC-001') or a standard 24-character BSON ObjectId.
    """
    if not identifier:
        return {"_id": None}
    
    id_str = str(identifier).strip()
    queries = [{"id": id_str}]
    
    if ObjectId.is_valid(id_str):
        queries.append({"_id": ObjectId(id_str)})
        
    return {"$or": queries} if len(queries) > 1 else queries[0]


class MongoDatabaseManager:
    """Singleton MongoDB connection and lifecycle manager."""

    _instance = None

    def __init__(self, config=None):
        if config is None:
            from app.config import Config
            config = Config
        self.config = config
        self.client = None
        self.db = None
        self.is_mock = False
        self.db_name = getattr(config, 'MONGODB_DATABASE', 'pharmasync_care')
        self.init_connection()

    @classmethod
    def get_instance(cls, config=None):
        if cls._instance is None:
            cls._instance = cls(config)
        elif config is not None and getattr(config, 'TESTING', False) != getattr(cls._instance.config, 'TESTING', False):
            cls.reset_instance()
            cls._instance = cls(config)
        return cls._instance

    @classmethod
    def reset_instance(cls):
        """Used in test teardowns to force a fresh connection instance."""
        if cls._instance and cls._instance.client:
            try:
                cls._instance.client.close()
            except Exception:
                pass
        cls._instance = None

    def init_connection(self):
        """Initializes PyMongo MongoClient or falls back to mongomock."""
        is_testing = getattr(self.config, 'TESTING', False)
        uri = getattr(self.config, 'MONGODB_URI', '')
        timeout_ms = getattr(self.config, 'MONGODB_TIMEOUT_MS', 3000)

        # If running in unit/integration test mode and no explicit test URI is provided
        if is_testing and not uri:
            self._init_mock_db()
            return

        if uri:
            try:
                # Sanitize log output (never print credentials)
                print("[Database] Connecting to MongoDB Atlas cluster...")
                self.client = MongoClient(
                    uri,
                    serverSelectionTimeoutMS=timeout_ms,
                    connectTimeoutMS=timeout_ms,
                    socketTimeoutMS=5000,
                    maxPoolSize=50,
                    minPoolSize=5
                )
                # Verify connectivity with an actual ping
                self.client.admin.command('ping')
                self.db = self.client[self.db_name]
                self.is_mock = False
                print(f"[Database] Successfully connected to MongoDB Atlas (Database: {self.db_name}).")
                return
            except (ConnectionFailure, ServerSelectionTimeoutError, ConfigurationError, Exception) as e:
                print(f"[Database] Atlas connectivity failed or timed out: {type(e).__name__}. Falling back to in-memory test database.")

        self._init_mock_db()

    def _init_mock_db(self):
        """Initializes an in-memory database using mongomock with synthetic seed records."""
        if not MONGOMOCK_AVAILABLE:
            raise RuntimeError("Neither MongoDB Atlas nor mongomock is available.")

        self.is_mock = True
        self.client = mongomock.MongoClient()
        self.db = self.client[self.db_name]
        print(f"[Database] In-memory database initialized for offline development/testing ({self.db_name}).")

        # Automatically populate seed records in memory
        try:
            from scripts.seed_data import seed_database
            seed_database(self.db)
        except Exception as e:
            print(f"[Database] Notice: Initial seed data population deferred ({e}).")

    def ping(self):
        """
        Executes a ping command to verify database liveliness.
        Returns True if reachable; raises an exception if unreachable.
        """
        if self.is_mock:
            # Liveliness check for mock mode
            return True
        if not self.client:
            raise ConnectionError("MongoDB client is not initialized.")
        self.client.admin.command('ping')
        return True

    def supports_transactions(self):
        """Checks if the connected cluster supports multi-document transactions."""
        if self.is_mock or not self.client:
            return False
        try:
            hello = self.client.admin.command('hello')
            return bool(hello.get('setName') or hello.get('msg') == 'isdbgrid')
        except Exception:
            return False

    @contextmanager
    def transaction(self):
        """
        Context manager for atomic multi-document operations.
        Yields a session if the deployment supports transactions; otherwise yields None.
        """
        if self.supports_transactions():
            with self.client.start_session() as session:
                with session.start_transaction():
                    yield session
        else:
            yield None


def get_db(config=None):
    """Convenience getter for the MongoDatabaseManager singleton."""
    return MongoDatabaseManager.get_instance(config)


def init_db(config=None):
    """Initializes and returns the MongoDatabaseManager singleton."""
    return MongoDatabaseManager.get_instance(config)
