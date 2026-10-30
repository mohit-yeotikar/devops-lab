#!/usr/bin/env bash
# load.sh - small traffic like the mobile app: it adds "_=<number>" to every URL so phones do not cache.
URL=${URL:-http://localhost:8085}
COUNT=${COUNT:-300}
ok=0; bad=0
for i in $(seq 1 "$COUNT"); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$URL/notes?page=1&_=$i" || true)
  if [ "$code" = "200" ]; then ok=$((ok+1)); else bad=$((bad+1)); fi
done
echo "load.sh: $ok ok, $bad failed (of $COUNT requests)"
