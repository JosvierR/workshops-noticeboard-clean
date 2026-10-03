"""Development-only HTTP adapter for local Docker and integration tests.

Production requests stay on API Gateway and lambda_function.lambda_handler.
This module only maps HTTP calls onto the existing notice domain functions.
"""

from typing import Any

from bson.errors import InvalidId
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.notices import (
    create_notice,
    delete_notice,
    get_notice,
    list_notices,
    update_notice,
)
from app.validation import parse_json_body, validate_notice_payload

LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app = FastAPI(
    title="NoticeBoard local adapter",
    description=(
        "Development-only HTTP adapter. "
        "Production uses lambda_function.lambda_handler."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=LOCAL_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


def _json(status_code: int, payload: Any) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=payload)


@app.exception_handler(InvalidId)
async def invalid_notice_id(_request: Request, _exc: InvalidId) -> JSONResponse:
    return _json(400, {"error": "Invalid notice id"})


@app.exception_handler(PyMongoError)
async def database_error(_request: Request, _exc: PyMongoError) -> JSONResponse:
    return _json(500, {"error": "Database operation failed"})


@app.exception_handler(StarletteHTTPException)
async def http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    if exc.status_code == 404:
        return _json(404, {"error": "Route not found"})

    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return _json(exc.status_code, {"error": detail})


@app.exception_handler(Exception)
async def unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, InvalidId):
        return _json(400, {"error": "Invalid notice id"})
    if isinstance(exc, PyMongoError):
        return _json(500, {"error": "Database operation failed"})
    if isinstance(exc, StarletteHTTPException):
        return await http_error(_request, exc)
    return _json(500, {"error": "Internal server error"})


async def _payload(
    request: Request,
) -> tuple[dict[str, Any] | None, JSONResponse | None]:
    raw = await request.body()
    try:
        text = raw.decode("utf-8") if raw else ""
    except UnicodeDecodeError:
        return None, _json(400, {"error": "Malformed JSON body"})

    # Reuse the Lambda body parser so local and deployed validation stay aligned.
    parsed, error = parse_json_body({"body": text})
    if error:
        return None, _json(400, {"error": error})
    return parsed, None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/notices")
def read_notices() -> list[dict[str, Any]]:
    return list_notices()


@app.get("/notices/{notice_id}")
def read_notice(notice_id: str) -> Any:
    notice = get_notice(notice_id)
    if notice is None:
        return _json(404, {"error": "Notice not found"})
    return notice


@app.post("/notices", status_code=201)
async def post_notice(request: Request) -> JSONResponse:
    payload, error_response = await _payload(request)
    if error_response:
        return error_response

    errors = validate_notice_payload(payload or {}, partial=False)
    if errors:
        return _json(400, {"error": "Validation failed", "details": errors})

    return _json(201, create_notice(payload or {}))


@app.put("/notices/{notice_id}")
async def put_notice(notice_id: str, request: Request) -> Any:
    payload, error_response = await _payload(request)
    if error_response:
        return error_response

    errors = validate_notice_payload(payload or {}, partial=True)
    if errors:
        return _json(400, {"error": "Validation failed", "details": errors})

    notice = update_notice(notice_id, payload or {})
    if notice is None:
        return _json(404, {"error": "Notice not found"})
    return notice


@app.delete("/notices/{notice_id}")
def remove_notice(notice_id: str) -> Any:
    if not delete_notice(notice_id):
        return _json(404, {"error": "Notice not found"})
    return {"message": "Notice deleted successfully"}
