# Drill: nginx-502-upstream

## The alert

> **[P1] ShopNotes is down.** Every page shows `502 Bad Gateway`.
> The team changed the Nginx config in the last deploy. Users cannot read or save notes.

## Start the drill

```bash
docker compose up -d --build
curl -i http://localhost:8081/health
```

You will see `502 Bad Gateway`.

## Your job

1. Find out why Nginx gives 502.
2. Fix it. Do not change the app code.
3. Write the root cause in the DevOps Lab app.

## What "fixed" means

- `curl http://localhost:8081/health` returns `200` and `{"status":"ok"}`.
- You can save a note: `curl -X POST -H 'Content-Type: application/json' -d '{"text":"hi"}' http://localhost:8081/notes`

## Check your fix

```bash
./check.sh
```

It prints `PASS` when the incident is fixed.

## Hints (use only if stuck)

- `docker compose ps` and `docker compose logs nginx`
- What port is the app really listening on?

> Hinglish: Bhai, 502 ka matlab Nginx zinda hai, par peeche wala app tak pahunch nahi pa raha. Logs dekho!

## Clean up

```bash
docker compose down -v
```
