#!/usr/bin/env bash
# Prove notices live in MongoDB, not in the API process.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://localhost:8000}"
TMP_DIR="$(mktemp -d)"
BODY="$TMP_DIR/body.json"
NOTICE_ID=""

cleanup() {
  status=$?
  rm -rf "$TMP_DIR"
  if [[ -n "${NOTICE_ID:-}" ]]; then
    curl -sS -o /dev/null -X DELETE "$BASE_URL/notices/$NOTICE_ID" || true
  fi
  exit "$status"
}
trap cleanup EXIT

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

wait_for_health() {
  local i code curl_status
  for i in $(seq 1 40); do
    set +e
    code="$(curl -sS -o "$BODY" -w "%{http_code}" "$BASE_URL/health")"
    curl_status=$?
    set -e
    if [[ $curl_status -eq 0 && "$code" == "200" ]]; then
      return 0
    fi
    sleep 1
  done
  fail "backend health did not return 200"
}

expect_notice() {
  local label="$1"
  local i code curl_status title
  for i in $(seq 1 40); do
    set +e
    code="$(curl -sS -o "$BODY" -w "%{http_code}" "$BASE_URL/notices/$NOTICE_ID")"
    curl_status=$?
    set -e
    if [[ $curl_status -ne 0 || "$code" == "000" || "$code" == "500" ]]; then
      sleep 1
      continue
    fi
    if [[ "$code" == "404" ]]; then
      fail "$label: notice $NOTICE_ID was missing"
    fi
    if [[ "$code" != "200" ]]; then
      fail "$label: expected HTTP 200 but got $code"
    fi
    title="$(json_field "$BODY" title)"
    if [[ "$title" != "Persistence probe" ]]; then
      fail "$label: title was '$title'"
    fi
    echo "PASS: $label ($NOTICE_ID still present)"
    return 0
  done
  fail "$label: notice was not readable after restart"
}

echo "Creating persistence probe"
set +e
code="$(curl -sS -o "$BODY" -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  --data-binary '{"title":"Persistence probe","content":"Stored in MongoDB"}' \
  "$BASE_URL/notices")"
curl_status=$?
set -e
if [[ $curl_status -ne 0 || "$code" != "201" ]]; then
  fail "POST /notices expected 201 but got ${code:-curl:$curl_status}"
fi
NOTICE_ID="$(json_field "$BODY" _id)"
echo "Created $NOTICE_ID"

echo "Restarting backend only"
docker compose restart backend
wait_for_health
expect_notice "after backend restart"

echo "Restarting mongo and backend"
docker compose restart mongo backend
wait_for_health
expect_notice "after mongo and backend restart"

echo "Deleting persistence probe"
set +e
code="$(curl -sS -o "$BODY" -w "%{http_code}" -X DELETE "$BASE_URL/notices/$NOTICE_ID")"
curl_status=$?
set -e
if [[ $curl_status -ne 0 || "$code" != "200" ]]; then
  fail "DELETE /notices/$NOTICE_ID expected 200 but got ${code:-curl:$curl_status}"
fi
deleted_id="$NOTICE_ID"
NOTICE_ID=""

set +e
code="$(curl -sS -o "$BODY" -w "%{http_code}" "$BASE_URL/notices/$deleted_id")"
set -e
if [[ "$code" != "404" ]]; then
  fail "deleted probe still returned HTTP $code"
fi

echo "Persistence test passed."
