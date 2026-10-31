# Drill: expired-tls-cert

## The alert

> **[P1] Customers cannot open ShopNotes.** The browser shows
> "Your connection is not private" (`NET::ERR_CERT_DATE_INVALID`).
> The mobile app says "SSL handshake failed". Nobody changed any code.

## Start the drill

```bash
docker compose up -d --build
curl -v https://localhost:8447/health --cacert certs/shopnotes.crt
```

`certs/shopnotes.crt` is our own (self-signed) certificate, so we tell curl to trust it with `--cacert`.
Open https://localhost:8447/health in a browser too.

## Your job

1. Find out why HTTPS fails.
2. Fix it. `curl -k` (skip checks) is NOT a fix.
3. Write the root cause in the DevOps Lab app.

## What "fixed" means

- `curl --cacert certs/shopnotes.crt https://localhost:8447/health` returns `200`, with no `-k`.
- The certificate Nginx serves is valid for at least 30 more days, for the name `localhost`.

## Check your fix

```bash
./check.sh
```

## Hints (use only if stuck)

- `openssl x509 -in certs/shopnotes.crt -noout -dates`
- `echo | openssl s_client -connect localhost:8447 -servername localhost 2>/dev/null | openssl x509 -noout -dates`

## Clean up

```bash
docker compose down -v
```
