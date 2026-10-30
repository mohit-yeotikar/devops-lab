#!/usr/bin/env bash
# check.sh - prints PASS and exits 0 only when the incident is fixed.
set -u
cd "$(dirname "$0")" || exit 1
FAILED=0
pass() { echo "  ok   - $*"; }
fail() { echo "  FAIL - $*"; FAILED=1; }
http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$@" || true; }
finish() {
  if [ "$FAILED" -eq 0 ]; then echo "PASS: incident fixed"; exit 0; fi
  echo "FAIL: incident is not fixed yet"; exit 1
}

URL=http://localhost:8086
echo "Checking db-connection-pool-exhausted ..."

psql_q() { docker compose exec -T postgres psql -U shopnotes -d shopnotes -tAc "$1" 2>/dev/null | tr -d '[:space:]'; }

maxc=$(psql_q "SHOW max_connections")
[ "$maxc" = "10" ] && pass "max_connections is still 10" || fail "max_connections is '${maxc:-unknown}' (must stay 10)"

echo "  ...  running load.sh two times (60 requests)"
./load.sh
./load.sh

code=$(http_code "$URL/health")
[ "$code" = "200" ] && pass "GET /health after load is 200" || fail "GET /health after load is $code (want 200)"

code=$(http_code "$URL/notes")
[ "$code" = "200" ] && pass "GET /notes after load is 200" || fail "GET /notes after load is $code (want 200)"

conns=$(psql_q "SELECT count(*) FROM pg_stat_activity WHERE datname='shopnotes' AND pid <> pg_backend_pid()")
if [ -n "$conns" ] && [ "$conns" -le 5 ]; then pass "app holds $conns DB connections"; else fail "app holds ${conns:-?} DB connections (want 5 or less)"; fi

finish
