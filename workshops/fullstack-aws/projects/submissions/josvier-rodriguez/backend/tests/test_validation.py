import base64
import json

from app.validation import parse_json_body, validate_notice_payload


def test_parse_json_body_accepts_object():
    payload, error = parse_json_body(
        {"body": json.dumps({"title": "Hello", "content": "World"})}
    )
    assert error is None
    assert payload["title"] == "Hello"


def test_parse_json_body_rejects_array():
    payload, error = parse_json_body({"body": "[]"})
    assert payload == {}
    assert error == "JSON body must be an object"


def test_parse_json_body_supports_base64():
    encoded = base64.b64encode(
        json.dumps({"title": "Hello", "content": "World"}).encode("utf-8")
    ).decode("utf-8")

    payload, error = parse_json_body(
        {"body": encoded, "isBase64Encoded": True}
    )

    assert error is None
    assert payload["content"] == "World"


def test_create_requires_title_and_content():
    errors = validate_notice_payload({}, partial=False)
    assert "title" in errors
    assert "content" in errors


def test_partial_update_requires_a_field():
    errors = validate_notice_payload({}, partial=True)
    assert errors["body"] == "At least one field is required"


def test_due_date_must_be_iso_date():
    errors = validate_notice_payload(
        {"title": "Hello", "content": "World", "dueDate": "tomorrow"},
        partial=False,
    )
    assert "dueDate" in errors


def test_unknown_fields_are_rejected():
    errors = validate_notice_payload(
        {"title": "Hello", "content": "World", "admin": True},
        partial=False,
    )
    assert "fields" in errors


def test_pinned_accepts_only_boolean_values():
    valid = validate_notice_payload(
        {"title": "Hello", "content": "World", "pinned": True},
        partial=False,
    )
    invalid = validate_notice_payload(
        {"title": "Hello", "content": "World", "pinned": "true"},
        partial=False,
    )

    assert "pinned" not in valid
    assert invalid["pinned"] == "pinned must be a boolean"
