# Solution: dns-wrong-service-name

> Do not read this before you submit your root cause.

## Root cause

The app's `DATABASE_URL` uses the host `db`, but the compose service was renamed to `postgres`, and Docker's DNS only knows service names.
So the name `db` does not resolve, and every database connection fails with `could not translate host name "db" to address`.

Proof:

```bash
curl -s http://localhost:8088/health
# {"db":"could not translate host name \"db\" to address: ...","status":"error"}
docker compose exec app python -c "import socket; socket.gethostbyname('db')"        # error
docker compose exec app python -c "import socket; print(socket.gethostbyname('postgres'))"   # works
```

## Fix

Point the app to the real service name:

```bash
sed -i 's#@db:5432#@postgres:5432#' docker-compose.yml
docker compose up -d app          # recreates the app with the new env
./check.sh
```

(Another valid fix: keep the old name working with a network alias on the postgres service: `networks: { default: { aliases: [db] } }`.)

## How to prevent it

- When you rename a service, search for the old name everywhere (`grep -rn "db:" .`) in the same PR.
- Put the DB host in one variable (`DB_HOST`) that both the service and the app config use.
- Add a smoke test after deploy that calls `/health`, which checks the database.

## Interview questions

**Q1. How do containers find each other in Docker Compose?**
A: Compose puts all services on one network, and Docker has a built-in DNS server at 127.0.0.11. Each service name (and network alias) becomes a hostname. So the app can connect to `postgres:5432` and Docker returns the IP of that container.

**Q2. How do you debug a "could not resolve host" error inside a container?**
A: I go into the container and try to resolve the name, for example with `getent hosts postgres` or `nslookup`. I check that both containers are on the same network with `docker network inspect`. Then I compare the name in the config with the real service name.

**Q3. How does this work in Kubernetes?**
A: In Kubernetes a Service gets a DNS name like `postgres.my-namespace.svc.cluster.local`. Inside the same namespace the short name `postgres` also works. If the Service name or namespace is wrong, I see the same kind of DNS error.

## Explain it (script)

**English:** "The health check returned 503 even though Postgres was healthy. The error was 'could not translate host name db'. Yesterday's cleanup renamed the service from db to postgres, but the DATABASE_URL still used db. Docker DNS only knows service names, so db did not resolve. I changed the host to postgres and recreated the app. Now /health is 200."