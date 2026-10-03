from typing import Any

from bson.errors import InvalidId
from pymongo.errors import PyMongoError

from app.notices import (
    create_notice,
    delete_notice,
    get_notice,
    list_notices,
    update_notice,
)
from app.responses import response
from app.validation import parse_json_body, validate_notice_payload


def _method(event: dict[str, Any]) -> str:
    return (
        event.get("requestContext", {})
        .get("http", {})
        .get("method", event.get("httpMethod", ""))
        .upper()
    )


def _path(event: dict[str, Any]) -> str:
    return event.get("rawPath") or event.get("path") or "/"


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    del context

    method = _method(event)
    path = _path(event)
    path_parameters = event.get("pathParameters") or {}
    notice_id = path_parameters.get("id")

    if method == "OPTIONS":
        return response(204, None)

    if method == "GET" and path == "/health":
        return response(200, {"status": "ok"})

    try:
        if method == "GET" and path == "/notices":
            return response(200, list_notices())

        if method == "GET" and notice_id:
            notice = get_notice(notice_id)
            if notice is None:
                return response(404, {"error": "Notice not found"})
            return response(200, notice)

        if method == "POST" and path == "/notices":
            body, parse_error = parse_json_body(event)
            if parse_error:
                return response(400, {"error": parse_error})

            errors = validate_notice_payload(body, partial=False)
            if errors:
                return response(400, {"error": "Validation failed", "details": errors})

            return response(201, create_notice(body))

        if method == "PUT" and notice_id:
            body, parse_error = parse_json_body(event)
            if parse_error:
                return response(400, {"error": parse_error})

            errors = validate_notice_payload(body, partial=True)
            if errors:
                return response(400, {"error": "Validation failed", "details": errors})

            notice = update_notice(notice_id, body)
            if notice is None:
                return response(404, {"error": "Notice not found"})
            return response(200, notice)

        if method == "DELETE" and notice_id:
            deleted = delete_notice(notice_id)
            if not deleted:
                return response(404, {"error": "Notice not found"})
            return response(200, {"message": "Notice deleted successfully"})

        return response(404, {"error": "Route not found"})

    except InvalidId:
        return response(400, {"error": "Invalid notice id"})
    except PyMongoError:
        return response(500, {"error": "Database operation failed"})
    except Exception:
        return response(500, {"error": "Internal server error"})
