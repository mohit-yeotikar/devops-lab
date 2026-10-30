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

HOST=localhost
PORT=8447
echo "Checking expired-tls-cert ..."

served=$(echo | openssl s_client -connect "$HOST:$PORT" -servername "$HOST" 2>/dev/null | openssl x509 2>/dev/null)
if [ -z "$served" ]; then
  fail "could not read the certificate from https://$HOST:$PORT (is nginx running?)"
else
  if echo "$served" | openssl x509 -noout -checkend $((30*24*3600)) >/dev/null 2>&1; then
    pass "served certificate is valid for 30+ more days ($(echo "$served" | openssl x509 -noout -enddate))"
  else
    fail "served certificate expires in less than 30 days or is expired ($(echo "$served" | openssl x509 -noout -enddate))"
  fi
fi

# Real verification (no -k): date, name and trust are all checked.
code=$(http_code --cacert certs/shopnotes.crt "https://$HOST:$PORT/health")
[ "$code" = "200" ] && pass "HTTPS /health with certificate check is 200" || fail "HTTPS /health with certificate check is $code (want 200; run curl -v to see why)"

finish
