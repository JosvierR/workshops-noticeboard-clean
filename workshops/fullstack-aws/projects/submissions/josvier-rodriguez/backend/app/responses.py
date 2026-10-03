import json
from typing import Any


CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}


def response(status_code: int, body: Any) -> dict[str, Any]:
    payload = "" if body is None else json.dumps(body)

    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": payload,
    }
