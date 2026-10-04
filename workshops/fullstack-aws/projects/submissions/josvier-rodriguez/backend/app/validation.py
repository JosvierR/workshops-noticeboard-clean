import base64
import json
from datetime import date
from typing import Any


ALLOWED_FIELDS = {"title", "content", "cohort", "dueDate", "pinned"}


def parse_json_body(event: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
    raw_body = event.get("body")

    if raw_body in (None, ""):
        return {}, "Request body is required"

    try:
        if event.get("isBase64Encoded"):
            raw_body = base64.b64decode(raw_body).decode("utf-8")

        parsed = json.loads(raw_body)
        if not isinstance(parsed, dict):
            return {}, "JSON body must be an object"

        return parsed, None
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
        return {}, "Malformed JSON body"


def _is_iso_date(value: str) -> bool:
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def validate_notice_payload(
    payload: dict[str, Any], *, partial: bool
) -> dict[str, str]:
    errors: dict[str, str] = {}

    unknown = set(payload) - ALLOWED_FIELDS
    if unknown:
        errors["fields"] = f"Unsupported fields: {', '.join(sorted(unknown))}"

    if partial and not payload:
        errors["body"] = "At least one field is required"

    for field in ("title", "content"):
        if not partial and field not in payload:
            errors[field] = f"{field} is required"
            continue

        if field in payload:
            value = payload[field]
            max_length = 120 if field == "title" else 5000
            if not isinstance(value, str) or not value.strip():
                errors[field] = f"{field} must be a non-empty string"
            elif len(value.strip()) > max_length:
                errors[field] = f"{field} must be at most {max_length} characters"

    if "cohort" in payload:
        cohort = payload["cohort"]
        if cohort is not None and (
            not isinstance(cohort, str) or len(cohort.strip()) > 120
        ):
            errors["cohort"] = "cohort must be a string up to 120 characters"

    if "dueDate" in payload:
        due_date = payload["dueDate"]
        if due_date not in (None, "") and (
            not isinstance(due_date, str) or not _is_iso_date(due_date)
        ):
            errors["dueDate"] = "dueDate must use YYYY-MM-DD format"

    if "pinned" in payload and not isinstance(payload["pinned"], bool):
        errors["pinned"] = "pinned must be a boolean"

    return errors
