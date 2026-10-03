import os
from functools import lru_cache

from pymongo import MongoClient


@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    mongo_uri = os.environ.get("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI environment variable is required")

    return MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=5000,
    )


def get_database():
    database_name = os.environ.get("MONGO_DB_NAME", "noticeboard_db")
    return get_client()[database_name]


def get_notices_collection():
    return get_database()["notices"]
