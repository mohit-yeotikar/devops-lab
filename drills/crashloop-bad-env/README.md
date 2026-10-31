# Drill: crashloop-bad-env

## The alert

> **[P1] ShopNotes app keeps restarting.** Users get `502 Bad Gateway`.
> The on-call bot says: `shopnotes-app restarted 12 times in 5 minutes`.
> Last change: "move database settings into environment variables".

## Start the drill (Docker Compose)

```bash
docker compose up -d --build
sleep 10
docker compose ps          # the app shows "Restarting"
curl -i http://localhost:8083/health
```

## Start the drill (Kubernetes with k3d, optional)

```bash
k3d cluster create devops-lab                       # only once
docker build -t shopnotes-app:drill-crashloop ./app
k3d image import shopnotes-app:drill-crashloop -c devops-lab
kubectl apply -f k8s.yaml
kubectl -n shopnotes-crashloop get pods -w          # the app pod shows CrashLoopBackOff
```

## Your job

1. Find out why the app container dies right after it starts.
2. Fix it (compose, and k8s if you started it). Do not change the app code.
3. Write the root cause in the DevOps Lab app.

## What "fixed" means

- The app container stays `Up` (no more restarts).
- `curl http://localhost:8083/health` returns `200`.
- k8s: the `shopnotes-app` pod is `Running` and `1/1 Ready`.

## Check your fix

```bash
./check.sh          # compose
./check.sh k8s      # k8s variant
```

## Hints (use only if stuck)

- `docker compose logs app --tail 20`
- `kubectl -n shopnotes-crashloop logs deploy/shopnotes-app --previous`
- Read the value of `DATABASE_URL` letter by letter.

## Clean up

```bash
docker compose down -v
kubectl delete -f k8s.yaml        # if you used k8s
```
