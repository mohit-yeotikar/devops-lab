# Drill: memory-leak-oom

## The alert

> **[P2] ShopNotes app restarts many times a day.** Users see short `502` errors.
> The container has a 64 MB memory limit. Restarts happen more when traffic is high.
> Last week a "speed up GET /notes" change was released.

## Start the drill

```bash
docker compose up -d --build
docker stats --no-stream            # app memory before
./load.sh                           # 300 normal requests
docker compose ps                   # look at the app status
```

## Your job

1. Find out why the app container dies under load.
2. Fix it. Raising the 64 MB limit is NOT a fix (check.sh checks this).
3. Write the root cause in the DevOps Lab app.

## What "fixed" means

- After `./load.sh` the app is still running, with no new restarts and no OOM kill.
- `curl http://localhost:8085/health` returns `200`.
- `mem_limit` is still `64m`.

## Check your fix

```bash
./check.sh        # it runs load.sh for you
```

## Hints (use only if stuck)

- `docker inspect -f '{{.State.OOMKilled}} {{.RestartCount}}' $(docker compose ps -q app)`
- Watch `docker stats` in a second terminal while `./load.sh` runs.
- Read `app/app.py`: what grows on every request and never gets smaller?

## Clean up

```bash
docker compose down -v
```
