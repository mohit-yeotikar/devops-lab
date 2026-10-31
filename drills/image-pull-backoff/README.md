# Drill: image-pull-backoff

## The alert

> **[P1] Release 1.4.2 deploy failed. ShopNotes is not running.**
> The deploy pipeline says the app could not start. The code for 1.4.2 is in `./app`.

## Start the drill (Docker Compose)

```bash
docker compose up -d
```

The command fails. Read the error message carefully.

## Start the drill (Kubernetes with k3d, optional)

```bash
k3d cluster create devops-lab                  # only once
kubectl apply -f k8s.yaml
kubectl -n shopnotes-imagepull get pods -w     # the app pod shows ErrImagePull / ImagePullBackOff
```

## Your job

1. Find out why the app never starts.
2. Make release 1.4.2 run (compose, and k8s if you started it). Do not change the app code.
3. Write the root cause in the DevOps Lab app.

## What "fixed" means

- `docker compose up -d` works and the app runs the image `shopnotes-app:1.4.2`.
- `curl http://localhost:8084/health` returns `200`.
- k8s: the `shopnotes-app` pod is `Running` and `1/1 Ready`.

## Check your fix

```bash
./check.sh          # compose
./check.sh k8s      # k8s variant
```

## Hints (use only if stuck)

- `docker images | grep shopnotes`
- `kubectl -n shopnotes-imagepull describe pod -l app=shopnotes-app` - read the Events.
- Where should this image come from?

## Clean up

```bash
docker compose down -v
kubectl delete -f k8s.yaml        # if you used k8s
```
