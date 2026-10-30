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

URL=http://localhost:8081
echo "Checking nginx-502-upstream ..."

code=$(http_code "$URL/health")
[ "$code" = "200" ] && pass "GET /health through Nginx is 200" || fail "GET /health through Nginx is $code (want 200)"

code=$(http_code -X POST -H 'Content-Type: application/json' -d '{"text":"check.sh"}' "$URL/notes")
[ "$code" = "201" ] && pass "POST /notes is 201" || fail "POST /notes is $code (want 201)"

finish
