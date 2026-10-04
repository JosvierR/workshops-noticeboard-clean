from unittest.mock import MagicMock, patch

from bson import ObjectId

from app.notices import _serialize_notice, create_notice, update_notice


def test_existing_notice_without_pinned_serializes_as_false():
    serialized = _serialize_notice(
        {
            "_id": ObjectId(),
            "title": "Legacy notice",
            "content": "Created before pinning existed.",
        }
    )

    assert serialized["pinned"] is False


@patch("app.notices.get_notices_collection")
def test_create_notice_without_pinned_defaults_false(mock_collection):
    collection = MagicMock()
    collection.insert_one.return_value.inserted_id = ObjectId()
    mock_collection.return_value = collection

    created = create_notice({"title": "AWS", "content": "Lambda"})

    assert created["pinned"] is False
    inserted = collection.insert_one.call_args.args[0]
    assert inserted["pinned"] is False


@patch("app.notices.get_notices_collection")
def test_update_notice_from_unpinned_to_pinned(mock_collection):
    notice_id = ObjectId()
    collection = MagicMock()
    collection.update_one.return_value.matched_count = 1
    collection.find_one.return_value = {
        "_id": notice_id,
        "title": "AWS",
        "content": "Lambda",
        "pinned": True,
    }
    mock_collection.return_value = collection

    updated = update_notice(str(notice_id), {"pinned": True})

    changes = collection.update_one.call_args.args[1]["$set"]
    assert changes["pinned"] is True
    assert updated["pinned"] is True
