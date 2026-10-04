import json
from unittest.mock import patch

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import PyMongoError

import lambda_function


def event(method, path, body=None, notice_id=None):
    payload = {
        "requestContext": {"http": {"method": method}},
        "rawPath": path,
    }

    if body is not None:
        payload["body"] = body if isinstance(body, str) else json.dumps(body)

    if notice_id is not None:
        payload["pathParameters"] = {"id": notice_id}

    return payload


def body(result):
    return json.loads(result["body"]) if result["body"] else None


def test_health():
    result = lambda_function.lambda_handler(event("GET", "/health"), None)
    assert result["statusCode"] == 200
    assert body(result) == {"status": "ok"}


@patch("lambda_function.list_notices")
def test_get_notices(mock_list):
    mock_list.return_value = [{"_id": "1", "title": "Hello", "content": "World"}]
    result = lambda_function.lambda_handler(event("GET", "/notices"), None)
    assert result["statusCode"] == 200
    assert len(body(result)) == 1


@patch("lambda_function.get_notice")
def test_get_notice_not_found(mock_get):
    mock_get.return_value = None
    notice_id = str(ObjectId())
    result = lambda_function.lambda_handler(
        event("GET", f"/notices/{notice_id}", notice_id=notice_id), None
    )
    assert result["statusCode"] == 404


@patch("lambda_function.create_notice")
def test_create_notice(mock_create):
    created = {"_id": str(ObjectId()), "title": "AWS", "content": "Lambda"}
    mock_create.return_value = created
    result = lambda_function.lambda_handler(
        event("POST", "/notices", {"title": "AWS", "content": "Lambda"}), None
    )
    assert result["statusCode"] == 201
    assert body(result)["title"] == "AWS"


@patch("lambda_function.create_notice")
def test_create_notice_accepts_pinned_true(mock_create):
    created = {
        "_id": str(ObjectId()),
        "title": "AWS",
        "content": "Lambda",
        "pinned": True,
    }
    mock_create.return_value = created
    result = lambda_function.lambda_handler(
        event(
            "POST",
            "/notices",
            {"title": "AWS", "content": "Lambda", "pinned": True},
        ),
        None,
    )

    assert result["statusCode"] == 201
    assert body(result)["pinned"] is True
    mock_create.assert_called_once_with(
        {"title": "AWS", "content": "Lambda", "pinned": True}
    )


def test_create_notice_rejects_pinned_string():
    result = lambda_function.lambda_handler(
        event(
            "POST",
            "/notices",
            {"title": "AWS", "content": "Lambda", "pinned": "true"},
        ),
        None,
    )

    assert result["statusCode"] == 400
    assert body(result)["details"]["pinned"] == "pinned must be a boolean"


def test_create_notice_rejects_malformed_json():
    result = lambda_function.lambda_handler(
        event("POST", "/notices", "{broken"), None
    )
    assert result["statusCode"] == 400


def test_create_notice_requires_fields():
    result = lambda_function.lambda_handler(
        event("POST", "/notices", {"title": "Only title"}), None
    )
    assert result["statusCode"] == 400
    assert "content" in body(result)["details"]


@patch("lambda_function.update_notice")
def test_update_notice(mock_update):
    notice_id = str(ObjectId())
    mock_update.return_value = {
        "_id": notice_id,
        "title": "Updated",
        "content": "Content",
    }
    result = lambda_function.lambda_handler(
        event(
            "PUT",
            f"/notices/{notice_id}",
            {"title": "Updated"},
            notice_id=notice_id,
        ),
        None,
    )
    assert result["statusCode"] == 200


@patch("lambda_function.update_notice")
def test_update_notice_can_pin(mock_update):
    notice_id = str(ObjectId())
    mock_update.return_value = {
        "_id": notice_id,
        "title": "Updated",
        "content": "Content",
        "pinned": True,
    }
    result = lambda_function.lambda_handler(
        event(
            "PUT",
            f"/notices/{notice_id}",
            {"pinned": True},
            notice_id=notice_id,
        ),
        None,
    )

    assert result["statusCode"] == 200
    assert body(result)["pinned"] is True
    mock_update.assert_called_once_with(notice_id, {"pinned": True})


@patch("lambda_function.delete_notice")
def test_delete_notice(mock_delete):
    notice_id = str(ObjectId())
    mock_delete.return_value = True
    result = lambda_function.lambda_handler(
        event("DELETE", f"/notices/{notice_id}", notice_id=notice_id), None
    )
    assert result["statusCode"] == 200


@patch("lambda_function.get_notice")
def test_invalid_object_id_returns_400(mock_get):
    mock_get.side_effect = InvalidId("bad id")
    result = lambda_function.lambda_handler(
        event("GET", "/notices/not-an-id", notice_id="not-an-id"), None
    )
    assert result["statusCode"] == 400


@patch("lambda_function.list_notices")
def test_database_failure_is_sanitized(mock_list):
    mock_list.side_effect = PyMongoError("mongodb://secret-host")
    result = lambda_function.lambda_handler(event("GET", "/notices"), None)
    assert result["statusCode"] == 500
    assert body(result) == {"error": "Database operation failed"}
    assert "secret-host" not in result["body"]
