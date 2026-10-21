"""
PharmaSync CARE — Base MongoDB Repository
Provides unified collection access, BSON serialization, and flexible identifier lookups.
"""

from bson import ObjectId
from app.database import get_db, serialize_doc, build_id_query


class BaseRepository:
    """Base class for PyMongo-backed repositories."""

    def __init__(self, collection_name=None):
        self.db_manager = get_db()
        self.db = self.db_manager.db
        self.collection_name = collection_name
        self.collection = self.db[collection_name] if collection_name else None

    def serialize(self, doc):
        """Converts BSON document into JSON-serializable structure."""
        return serialize_doc(doc)

    def id_query(self, identifier):
        """Builds flexible query matching either synthetic string id or BSON ObjectId."""
        return build_id_query(identifier)

    def is_valid_id(self, identifier):
        """Checks if identifier is non-empty string or valid ObjectId."""
        if not identifier:
            return False
        return True
