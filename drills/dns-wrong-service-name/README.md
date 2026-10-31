# Drill: dns-wrong-service-name

## The alert

> **[P1] ShopNotes `/health` returns `503`.** `GET /notes` returns `500`.
> The database container is up and healthy. Yesterday a "clean up docker-compose.yml" change was merged.

## Start the drill

```bash
docker compose up -d --build
sleep 5
curl -i http://localhost:8088/health
```

## Your job

1. Find out why the app cannot reach a healthy database.
2. Fix it. Do not change the app code.
3. Write the root cause in the DevOps Lab app.

## What "fixed" means

- `curl http://localhost:8088/health` returns `200` and `"db":"ok"`.
- `GET /notes` returns `200` and saving a note returns `201`.

## Check your fix

```bash
./check.sh
```

## Hints (use only if stuck)

- Read the `db` field in the `/health` answer, and `docker compose logs app`.
- `docker compose exec app python -c "import socket; print(socket.gethostbyname('postgres'))"`
- Compare the host in `DATABASE_URL` with the service names in `docker-compose.yml`.

## Clean up

```bash
docker compose down -v
```
