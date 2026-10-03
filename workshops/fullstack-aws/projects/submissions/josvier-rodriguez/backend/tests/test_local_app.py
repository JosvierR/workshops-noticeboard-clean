import json
from unittest.mock import patch

import pytest
from bson import ObjectId
from bson.errors import InvalidId
from fastapi.testclient import TestClient
from pymongo.errors import PyMongoError

import local_app


@pytest.fixture
def client():
    with TestClient(local_app.app) as test_client:
        yield test_client


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch("local_app.list_notices")
def test_get_notices(mock_list, client):
    mock_list.return_value = [{"_id": "1", "title": "Hello", "content": "World"}]
    response = client.get("/notices")
    assert response.status_code == 200
    assert response.json()[0]["title"] == "Hello"
    mock_list.assert_called_once_with()


@patch("local_app.get_notice")
def test_get_notice(mock_get, client):
    notice_id = str(ObjectId())
    mock_get.return_value = {"_id": notice_id, "title": "Hello", "content": "World"}
    response = client.get(f"/notices/{notice_id}")
    assert response.status_code == 200
    assert response.json()["_id"] == notice_id
    mock_get.assert_called_once_with(notice_id)


@patch("local_app.create_notice")
def test_post_notice(mock_create, client):
    created = {"_id": str(ObjectId()), "title": "AWS", "content": "Lambda"}
    mock_create.return_value = created
    response = client.post("/notices", json={"title": "AWS", "content": "Lambda"})
    assert response.status_code == 201
    assert response.json()["title"] == "AWS"
    mock_create.assert_called_once()


@patch("local_app.update_notice")
def test_put_notice(mock_update, client):
    notice_id = str(ObjectId())
    mock_update.return_value = {
        "_id": notice_id,
        "title": "Updated",
        "content": "Content",
    }
    response = client.put(f"/notices/{notice_id}", json={"title": "Updated"})
    assert response.status_code == 200
    assert response.json()["title"] == "Updated"
    mock_update.assert_called_once_with(notice_id, {"title": "Updated"})


@patch("local_app.delete_notice")
def test_delete_notice(mock_delete, client):
    notice_id = str(ObjectId())
    mock_delete.return_value = True
    response = client.delete(f"/notices/{notice_id}")
    assert response.status_code == 200
    assert response.json() == {"message": "Notice deleted successfully"}
    mock_delete.assert_called_once_with(notice_id)


@patch("local_app.get_notice")
def test_invalid_object_id_returns_400(mock_get, client):
    mock_get.side_effect = InvalidId("bad id")
    response = client.get("/notices/not-an-id")
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid notice id"}


@patch("local_app.get_notice")
def test_missing_notice_returns_404(mock_get, client):
    mock_get.return_value = None
    response = client.get(f"/notices/{ObjectId()}")
    assert response.status_code == 404
    assert response.json() == {"error": "Notice not found"}


def test_malformed_json_returns_400(client):
    response = client.post(
        "/notices",
        content=b"{broken",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "Malformed JSON body"


def test_validation_failure_returns_400(client):
    response = client.post("/notices", json={"title": "Only title"})
    assert response.status_code == 400
    body = response.json()
    assert body["error"] == "Validation failed"
    assert "content" in body["details"]


@patch("local_app.update_notice")
def test_put_missing_notice_returns_404(mock_update, client):
    mock_update.return_value = None
    response = client.put(f"/notices/{ObjectId()}", json={"title": "Updated"})
    assert response.status_code == 404
    assert response.json() == {"error": "Notice not found"}


def test_put_rejects_invalid_body(client):
    response = client.put(
        f"/notices/{ObjectId()}",
        content=b"{broken",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "Malformed JSON body"


@patch("local_app.delete_notice")
def test_delete_missing_notice_returns_404(mock_delete, client):
    mock_delete.return_value = False
    response = client.delete(f"/notices/{ObjectId()}")
    assert response.status_code == 404


@patch("local_app.list_notices")
def test_database_failure_is_sanitized(mock_list, client):
    mock_list.side_effect = PyMongoError("mongodb://secret-host")
    response = client.get("/notices")
    assert response.status_code == 500
    assert response.json() == {"error": "Database operation failed"}
    assert "secret-host" not in json.dumps(response.json())


@patch("local_app.list_notices", return_value=[])
def test_cors_allows_local_frontend(_mock_list, client):
    response = client.get(
        "/notices",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_preflight(client):
    response = client.options(
        "/notices",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]
