from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.db import get_notices_collection


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _serialize_notice(document: dict[str, Any]) -> dict[str, Any]:
    notice = dict(document)
    notice["_id"] = str(notice["_id"])
    notice.setdefault("pinned", False)
    return notice


def _clean_payload(payload: dict[str, Any]) -> dict[str, Any]:
    cleaned: dict[str, Any] = {}

    for field in ("title", "content", "cohort", "dueDate", "pinned"):
        if field not in payload:
            continue

        value = payload[field]
        if isinstance(value, str):
            value = value.strip()

        if field in ("cohort", "dueDate") and value == "":
            value = None

        cleaned[field] = value

    return cleaned


def list_notices() -> list[dict[str, Any]]:
    collection = get_notices_collection()
    documents = collection.find().sort("createdAt", -1)
    return [_serialize_notice(document) for document in documents]


def get_notice(notice_id: str) -> dict[str, Any] | None:
    collection = get_notices_collection()
    document = collection.find_one({"_id": ObjectId(notice_id)})
    return _serialize_notice(document) if document else None


def create_notice(payload: dict[str, Any]) -> dict[str, Any]:
    collection = get_notices_collection()
    now = _now_iso()

    document = _clean_payload(payload)
    document.setdefault("pinned", False)
    document["createdAt"] = now
    document["updatedAt"] = now

    result = collection.insert_one(document)
    document["_id"] = result.inserted_id
    return _serialize_notice(document)


def update_notice(
    notice_id: str, payload: dict[str, Any]
) -> dict[str, Any] | None:
    collection = get_notices_collection()
    object_id = ObjectId(notice_id)

    changes = _clean_payload(payload)
    changes["updatedAt"] = _now_iso()

    result = collection.update_one({"_id": object_id}, {"$set": changes})
    if result.matched_count == 0:
        return None

    document = collection.find_one({"_id": object_id})
    return _serialize_notice(document) if document else None


def delete_notice(notice_id: str) -> bool:
    collection = get_notices_collection()
    result = collection.delete_one({"_id": ObjectId(notice_id)})
    return result.deleted_count == 1
