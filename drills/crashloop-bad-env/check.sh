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

if [ "${1:-}" = "k8s" ]; then
  NS=shopnotes-crashloop
  echo "Checking crashloop-bad-env (k8s) ..."
  if kubectl -n "$NS" rollout status deploy/shopnotes-app --timeout=60s >/dev/null 2>&1; then
    pass "deployment shopnotes-app is rolled out"
  else
    fail "deployment shopnotes-app is not ready"
  fi
  ready=$(kubectl -n "$NS" get pods -l app=shopnotes-app -o jsonpath='{.items[*].status.containerStatuses[0].ready}' 2>/dev/null)
  case "$ready" in *false*|"") fail "app pod is not Ready ($ready)";; *) pass "app pod is Ready";; esac
  kubectl -n "$NS" port-forward svc/shopnotes-app 18083:5000 >/dev/null 2>&1 &
  PF=$!; sleep 3
  code=$(http_code http://localhost:18083/health)
  kill "$PF" 2>/dev/null
  [ "$code" = "200" ] && pass "GET /health is 200" || fail "GET /health is $code (want 200)"
  finish
fi

URL=http://localhost:8083
echo "Checking crashloop-bad-env (compose) ..."

cid=$(docker compose ps -q app 2>/dev/null)
if [ -z "$cid" ]; then
  fail "app container is not running"
else
  before=$(docker inspect -f '{{.RestartCount}}' "$cid")
  sleep 8
  after=$(docker inspect -f '{{.RestartCount}}' "$cid")
  status=$(docker inspect -f '{{.State.Status}}' "$cid")
  if [ "$status" = "running" ] && [ "$before" = "$after" ]; then
    pass "app container is running and stable (no restarts in 8s)"
  else
    fail "app container is $status, restarts went from $before to $after"
  fi
fi

code=$(http_code "$URL/health")
[ "$code" = "200" ] && pass "GET /health is 200" || fail "GET /health is $code (want 200)"

finish
