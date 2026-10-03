#!/usr/bin/env bash
# Live checks against the deployed NoticeBoard HTTP API.
# Usage: API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com bash scripts/aws_backend_smoke_test.sh
set -euo pipefail

if [[ -z "${API_BASE_URL:-}" ]]; then
  echo "API_BASE_URL is required." >&2
  exit 1
fi

BASE_URL="${API_BASE_URL%/}"
TMP_DIR="$(mktemp -d)"
BODY="$TMP_DIR/body.json"
trap 'rm -rf "$TMP_DIR"' EXIT

if command -v python >/dev/null 2>&1; then
  PYTHON=(python)
elif command -v py >/dev/null 2>&1; then
  PYTHON=(py -3)
elif command -v python3 >/dev/null 2>&1; then
  PYTHON=(python3)
else
  echo "Python is required to parse JSON responses." >&2
  exit 1
fi

fail() {
  echo "FAIL: $*" >&2
  if [[ -f "$BODY" ]]; then
    echo "Response body:" >&2
    cat "$BODY" >&2 || true
    echo >&2
  fi
  exit 1
}

json_field() {
  local file="$1"
  local field="$2"
  "${PYTHON[@]}" -c 'import json,sys; data=json.load(sys.stdin); value=data[sys.argv[1]]; print("" if value is None else value)' "$field" < "$file"
}

request() {
  local method="$1"
  local path="$2"
  local data="${3-}"
  local code=""
  local curl_status=0

  if [[ -n "$data" ]]; then
    set +e
    code="$(curl -sS -o "$BODY" -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -H "Origin: http://localhost:5173" \
      --data-binary "$data" \
      "$BASE_URL$path")"
    curl_status=$?
    set -e
  else
    set +e
    code="$(curl -sS -o "$BODY" -w "%{http_code}" -X "$method" \
      -H "Origin: http://localhost:5173" \
      "$BASE_URL$path")"
    curl_status=$?
    set -e
  fi

  if [[ $curl_status -ne 0 ]]; then
    fail "$method $path could not reach $BASE_URL (curl exit $curl_status)"
  fi

  printf '%s' "$code"
}

expect_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    fail "$label expected HTTP $expected but got $actual"
  fi
  echo "PASS: $label ($actual)"
}

echo "1. GET /health"
code="$(request GET /health)"
expect_status "$code" 200 "GET /health"
if [[ "$(json_field "$BODY" status)" != "ok" ]]; then
  fail "GET /health status was not ok"
fi

echo "2. GET /notices"
code="$(request GET /notices)"
expect_status "$code" 200 "GET /notices"
"${PYTHON[@]}" -c 'import json,sys; data=json.load(sys.stdin); assert isinstance(data, list)' < "$BODY"

echo "3. POST /notices"
create_body='{"title":"AWS Tier 1 verification","content":"Created through API Gateway and Lambda","cohort":"Full-Stack AWS 28-Sep-2026","dueDate":"2026-10-05"}'
code="$(request POST /notices "$create_body")"
expect_status "$code" 201 "POST /notices"
notice_id="$(json_field "$BODY" _id)"
if [[ ! "$notice_id" =~ ^[a-fA-F0-9]{24}$ ]]; then
  fail "POST /notices did not return a Mongo ObjectId"
fi
echo "Created notice $notice_id"

echo "4. GET /notices/{id}"
code="$(request GET "/notices/$notice_id")"
expect_status "$code" 200 "GET /notices/{id}"
if [[ "$(json_field "$BODY" title)" != "AWS Tier 1 verification" ]]; then
  fail "created title was not persisted"
fi
if [[ "$(json_field "$BODY" content)" != "Created through API Gateway and Lambda" ]]; then
  fail "created content was not persisted"
fi
if [[ "$(json_field "$BODY" cohort)" != "Full-Stack AWS 28-Sep-2026" ]]; then
  fail "created cohort was not persisted"
fi
if [[ "$(json_field "$BODY" dueDate)" != "2026-10-05" ]]; then
  fail "created dueDate was not persisted"
fi

echo "5. PUT /notices/{id}"
code="$(request PUT "/notices/$notice_id" '{"title":"AWS Tier 1 verification updated"}')"
expect_status "$code" 200 "PUT /notices/{id}"

echo "6. GET /notices/{id} after update"
code="$(request GET "/notices/$notice_id")"
expect_status "$code" 200 "GET /notices/{id} after update"
if [[ "$(json_field "$BODY" title)" != "AWS Tier 1 verification updated" ]]; then
  fail "updated title did not persist"
fi

echo "7. GET /notices/not-an-id"
code="$(request GET /notices/not-an-id)"
expect_status "$code" 400 "GET invalid ObjectId"

echo "8. GET missing but valid ObjectId"
code="$(request GET /notices/000000000000000000000000)"
expect_status "$code" 404 "GET missing notice"

echo "9. POST malformed JSON"
code="$(request POST /notices '{broken')"
expect_status "$code" 400 "POST malformed JSON"

echo "10. DELETE /notices/{id}"
code="$(request DELETE "/notices/$notice_id")"
expect_status "$code" 200 "DELETE /notices/{id}"

echo "11. GET deleted notice"
code="$(request GET "/notices/$notice_id")"
expect_status "$code" 404 "GET deleted notice"

echo "AWS smoke test passed."
