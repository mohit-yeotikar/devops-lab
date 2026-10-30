#!/usr/bin/env bash
# load.sh - a little normal traffic: read notes and add notes.
URL=${URL:-http://localhost:8086}
COUNT=${COUNT:-30}
ok=0; bad=0
for i in $(seq 1 "$COUNT"); do
  if [ $((i % 3)) -eq 0 ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -X POST \
      -H 'Content-Type: application/json' -d "{\"text\":\"note $i\"}" "$URL/notes" || true)
  else
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$URL/notes" || true)
  fi
  case "$code" in 200|201) ok=$((ok+1));; *) bad=$((bad+1));; esac
done
echo "load.sh: $ok ok, $bad failed (of $COUNT requests)"
