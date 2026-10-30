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
  NS=shopnotes-imagepull
  echo "Checking image-pull-backoff (k8s) ..."
  if kubectl -n "$NS" rollout status deploy/shopnotes-app --timeout=60s >/dev/null 2>&1; then
    pass "deployment shopnotes-app is rolled out"
  else
    fail "deployment shopnotes-app is not ready"
  fi
  img=$(kubectl -n "$NS" get deploy shopnotes-app -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)
  [ "$img" = "shopnotes-app:1.4.2" ] && pass "deployment uses shopnotes-app:1.4.2" || fail "deployment uses '$img' (want shopnotes-app:1.4.2)"
  kubectl -n "$NS" port-forward svc/shopnotes-app 18084:5000 >/dev/null 2>&1 &
  PF=$!; sleep 3
  code=$(http_code http://localhost:18084/health)
  kill "$PF" 2>/dev/null
  [ "$code" = "200" ] && pass "GET /health is 200" || fail "GET /health is $code (want 200)"
  finish
fi

URL=http://localhost:8084
echo "Checking image-pull-backoff (compose) ..."

cid=$(docker compose ps -q app 2>/dev/null)
if [ -z "$cid" ]; then
  fail "app container does not exist (did 'docker compose up -d' work?)"
else
  img=$(docker inspect -f '{{.Config.Image}}' "$cid")
  status=$(docker inspect -f '{{.State.Status}}' "$cid")
  [ "$img" = "shopnotes-app:1.4.2" ] && pass "app runs image shopnotes-app:1.4.2" || fail "app runs image '$img' (want shopnotes-app:1.4.2)"
  [ "$status" = "running" ] && pass "app container is running" || fail "app container is $status"
fi

code=$(http_code "$URL/health")
[ "$code" = "200" ] && pass "GET /health is 200" || fail "GET /health is $code (want 200)"

finish
