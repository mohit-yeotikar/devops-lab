# Solution: crashloop-bad-env

> Do not read this before you submit your root cause.

## Root cause

`DATABASE_URL` starts with `postgressql://` (extra "s") instead of `postgresql://`, so the Postgres driver cannot read it and the app exits at startup with code 1.
The restart policy (`restart: always` in compose, the kubelet in k8s) starts it again and again, which is a CrashLoopBackOff.

Proof:

```bash
docker compose logs app --tail 5
# FATAL: cannot connect to database with DATABASE_URL: invalid dsn: missing "=" after "postgressql://..." in connection info string
docker inspect -f '{{.RestartCount}} {{.State.ExitCode}}' $(docker compose ps -aq app)
```

## Fix

Docker Compose:

```bash
sed -i 's#postgressql://#postgresql://#' docker-compose.yml
docker compose up -d app          # compose sees the changed env and recreates the container
./check.sh
```

Kubernetes (k3d):

```bash
kubectl -n shopnotes-crashloop set env deploy/shopnotes-app \
  DATABASE_URL=postgresql://shopnotes:shopnotes@postgres:5432/shopnotes
kubectl -n shopnotes-crashloop rollout status deploy/shopnotes-app
sed -i 's#postgressql://#postgresql://#' k8s.yaml   # also fix the file, so the next apply is correct
./check.sh k8s
```

## How to prevent it

- Validate config in CI: a small test that parses `DATABASE_URL` (or starts the app against a test DB).
- Keep the database URL in one Secret / `.env` file that is reviewed, not typed by hand in many places.
- Alert on restart count (`kube_pod_container_status_restarts_total`), not only on "pod exists".

## Interview questions

**Q1. What is CrashLoopBackOff?**
A: It means the container starts, crashes, and Kubernetes restarts it again and again. Each time Kubernetes waits a bit longer before the next restart, this wait is the "back-off". It is a symptom, so I must find why the process exits.

**Q2. How do you debug a pod in CrashLoopBackOff?**
A: I run `kubectl describe pod` to see the exit code and events. Then I run `kubectl logs <pod> --previous` to read the logs of the container that crashed. Most of the time the reason is in the last lines, like a bad config or a missing file.

**Q3. Is it good that the app crashes when the config is wrong?**
A: Yes, failing fast is good, because the problem is loud and clear in the logs. A bad pod also does not become Ready, so with a rolling update the old good pods keep serving traffic. It is worse when an app starts with bad config and fails slowly later.

## Explain it (script)

**English:** "The app container was restarting again and again, so Nginx gave 502. I read the logs of the crashed container and saw 'invalid dsn'. The DATABASE_URL had a typo: postgressql with an extra s. I corrected it to postgresql and redeployed. Now the container stays up and /health is 200. To prevent this, we will check the config in CI and alert on restarts."

**Hindi / Hinglish:** "App container baar baar restart ho raha tha, isliye Nginx 502 de raha tha. Maine crash hue container ke logs padhe, usme 'invalid dsn' tha. DATABASE_URL me typo tha: postgressql, ek extra s. Maine use postgresql kiya aur redeploy kiya. Ab container chal raha hai aur /health 200 hai. Aage CI me config check karenge aur restart pe alert lagayenge."
