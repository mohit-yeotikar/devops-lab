# Drill: disk-full-logs

## The alert

> **[P1] ShopNotes returns `500 Internal Server Error` on every request.**
> The database is healthy. Nothing in the app code changed today.
> A new log agent sidecar was added in this morning's deploy.

## Start the drill

```bash
docker compose up -d --build
sleep 5
curl -i http://localhost:8082/health
```

You will see `500 Internal Server Error`.

Safety note: the log volume is a 20 MB `tmpfs` (memory). This drill never fills your real disk.

## Your job

1. Find out why every request fails with 500.
2. Fix it so it does not come back after a restart.
3. Write the root cause in the DevOps Lab app.

## What "fixed" means

- `curl http://localhost:8082/health` returns `200`.
- Saving a note works (`POST /notes` returns `201`).
- The log volume `/var/log/shopnotes` is less than 80% full.
- The thing that filled the volume will not fill it again.

## Check your fix

```bash
./check.sh
```

## Hints (use only if stuck)

- `docker compose logs app` - read the Python traceback.
- `docker compose exec app df -h /var/log/shopnotes`
- `docker compose exec app ls -lh /var/log/shopnotes`

## Clean up

```bash
docker compose down -v
```
