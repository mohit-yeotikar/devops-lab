# Solution: memory-leak-oom

> Do not read this before you submit your root cause.

## Root cause

`GET /notes` stores a 512 KB page in the `_page_cache` dict for every new full URL, and the key includes the `_=<number>` cache-buster, so every request adds a new entry and nothing is ever removed.
Memory grows about 0.5 MB per request until the container hits its 64 MB limit and the kernel OOM-kills it (exit code 137, `OOMKilled=true`).

Proof:

```bash
docker inspect -f 'OOMKilled={{.State.OOMKilled}} restarts={{.RestartCount}}' $(docker compose ps -q app)
docker stats --no-stream $(docker compose ps -q app)   # MEM USAGE climbs during ./load.sh
dmesg | grep -i "killed process"                         # on Linux hosts (needs sudo)
```

## Fix

Remove the unbounded cache (the query is fast; we do not need it). Replace the cached handler with the simple one:

```bash
python3 - <<'PY'
p = "app/app.py"
s = open(p).read()
start = s.index("# Response cache")
end = s.index('@app.post("/notes")')
s = s[:start] + '''@app.get("/notes")
def list_notes():
    with db() as cur:
        cur.execute("SELECT id, text FROM notes ORDER BY id")
        rows = cur.fetchall()
    return jsonify([{"id": r[0], "text": r[1]} for r in rows])


''' + s[end:]
open(p, "w").write(s)
PY
docker compose up -d --build app
./check.sh
```

If you really need a cache: give it a maximum size (for example `functools.lru_cache(maxsize=100)` or `cachetools.TTLCache`) and build the key without random query parameters.

## How to prevent it

- Every cache needs a size limit or a TTL. "Store forever" is a leak.
- Run a short load test in CI and watch memory: it must go flat, not up in a straight line.
- Alert on container restarts and on memory above 80% of the limit.

## Interview questions

**Q1. What does exit code 137 mean?**
A: 137 is 128 + 9, so the process got signal 9, SIGKILL. In containers this is most often the OOM killer, because the container used more memory than its limit. I confirm it with `docker inspect` (OOMKilled is true) or `kubectl describe pod` (reason OOMKilled).

**Q2. How do you know it is a memory leak and not just a too small limit?**
A: I watch memory over time under steady load. If it goes up and comes back down, the app just needs that memory. If it goes up and never comes down, and grows with the number of requests, it is a leak.

**Q3. Why not just increase the memory limit?**
A: With a leak, more memory only makes the crash come later; it does not stop it. It also costs money and can hurt other apps on the same node. I fix the leak first, then set the limit from real usage.

## Explain it (script)

**English:** "The app was restarting under load. docker inspect showed OOMKilled true, exit code 137. Memory went up about half a megabyte per request and never came down. The cause was a cache in GET /notes with no size limit, and the key had a random number, so every request added a new 512 KB entry. I removed the cache and redeployed. Now memory stays flat during the load test and there are no restarts."

**Hindi / Hinglish:** "Load aane pe app restart ho raha tha. docker inspect me OOMKilled true tha, exit code 137. Har request pe memory lagbhag aadha MB badh rahi thi aur kam nahi ho rahi thi. Wajah thi GET /notes ka cache jisme koi size limit nahi thi, aur key me random number tha, toh har request ek nayi 512 KB entry daal rahi thi. Maine cache hataya aur redeploy kiya. Ab load test me memory flat hai aur koi restart nahi."
