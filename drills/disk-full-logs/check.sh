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

URL=http://localhost:8082
echo "Checking disk-full-logs ..."

code=$(http_code "$URL/health")
[ "$code" = "200" ] && pass "GET /health is 200" || fail "GET /health is $code (want 200)"

code=$(http_code -X POST -H 'Content-Type: application/json' -d '{"text":"check.sh"}' "$URL/notes")
[ "$code" = "201" ] && pass "POST /notes is 201" || fail "POST /notes is $code (want 201)"

use=$(docker compose exec -T app df -P /var/log/shopnotes 2>/dev/null | awk 'NR==2 {gsub("%","",$5); print $5}')
if [ -n "$use" ] && [ "$use" -lt 80 ]; then pass "log volume is ${use}% full"; else fail "log volume is ${use:-?}% full (want < 80%)"; fi

level=$(docker compose exec -T log-agent printenv LOG_LEVEL 2>/dev/null | tr -d '\r')
if [ "$level" = "debug" ]; then fail "log-agent still runs with LOG_LEVEL=debug (it will fill the volume again)"; else pass "log-agent is not in debug mode"; fi

finish
