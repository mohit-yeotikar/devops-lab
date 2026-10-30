# Incident drills

Each folder is one broken environment that runs with `docker compose up -d` on a laptop.
Trainees get `drills/<name>/README.md` (the alarm message + what "fixed" means) and must NOT read
`SOLUTION.md` until they submit a root cause in the app. Layout per drill:

```
drills/<name>/
  README.md        # The alert, in simple English: what users see, what "fixed" means, how to check. Plus a Hinglish line.
  docker-compose.yml
  <files the services need>   # nginx.conf, app.py, Dockerfile, init.sql, break.sh …
  SOLUTION.md      # Root cause, the fix commands, 3 interview questions with simple-English model answers, "how I explain it" script (en + hi).
  check.sh         # exits 0 when the incident is fixed (curl / docker inspect based), prints PASS/FAIL
```
Rules: no cloud needed, no paid tools, runs in < 2 minutes, each drill has exactly one root cause,
and the break must be realistic (a thing that happens at companies).
