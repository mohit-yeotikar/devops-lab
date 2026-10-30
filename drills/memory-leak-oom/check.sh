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

URL=http://localhost:8085
echo "Checking memory-leak-oom ..."

cid=$(docker compose ps -q app 2>/dev/null)
if [ -z "$cid" ]; then fail "app container is not running"; finish; fi

limit=$(docker inspect -f '{{.HostConfig.Memory}}' "$cid")
[ "$limit" = "67108864" ] && pass "memory limit is still 64 MB" || fail "memory limit is $limit bytes (must stay 64m = 67108864)"

before=$(docker inspect -f '{{.RestartCount}}' "$cid")
echo "  ...  running load.sh (300 requests)"
./load.sh
sleep 2
after=$(docker inspect -f '{{.RestartCount}}' "$cid")
oom=$(docker inspect -f '{{.State.OOMKilled}}' "$cid")
status=$(docker inspect -f '{{.State.Status}}' "$cid")

[ "$before" = "$after" ] && pass "no restarts during load" || fail "app restarted during load ($before -> $after)"
[ "$oom" = "false" ] && pass "app was not OOM-killed" || fail "app was OOM-killed"
[ "$status" = "running" ] && pass "app container is running" || fail "app container is $status"

code=$(http_code "$URL/health")
[ "$code" = "200" ] && pass "GET /health is 200" || fail "GET /health is $code (want 200)"

finish
