# Drill: db-connection-pool-exhausted

## The alert

> **[P1] ShopNotes works after a deploy, then fails after a few minutes.**
> `GET /notes` and `/health` return `500` / `503`. A restart of the app "fixes" it for a short time.
> The database runs on a small plan (`max_connections=10`).

## Start the drill

```bash
docker compose up -d --build
curl -i http://localhost:8086/health      # 200 at first
./load.sh                                 # 30 normal requests
curl -i http://localhost:8086/health      # now it fails
```

## Your job

1. Find out why the app stops working after some requests.
2. Fix the real cause. Raising `max_connections` or restarting the app are NOT fixes (check.sh checks this).
3. Write the root cause in the DevOps Lab app.

## What "fixed" means

- After running `./load.sh` two times, `/health` still returns `200`.
- The app keeps only a few database connections open.
- Postgres still has `max_connections=10`.

## Check your fix

```bash
./check.sh        # it runs load.sh for you
```

## Hints (use only if stuck)

- `docker compose logs app | tail -20`
- `docker compose exec postgres psql -U shopnotes -c "select count(*), state from pg_stat_activity group by state;"` (run it early, before all slots are used)
- Read `app/app.py`: where is a connection opened, and where is it closed?

> Hinglish: Har request nayi DB connection khol rahi hai aur band nahi kar rahi, toh 10 ke baad DB bolega "bas, aur jagah nahi".

## Clean up

```bash
docker compose down -v
```
