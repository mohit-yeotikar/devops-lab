# Solution: db-connection-pool-exhausted

> Do not read this before you submit your root cause.

## Root cause

The `db()` helper in `app/app.py` opens a new Postgres connection for every request and keeps it in the `_connections` list, but it never closes it.
After about 10 requests all 10 Postgres connection slots are used by idle connections, and new connections fail with `FATAL: sorry, too many clients already`.

Proof:

```bash
docker compose logs app | grep -i "too many clients"
docker compose exec postgres psql -U shopnotes -c "select count(*) from pg_stat_activity where state='idle';"
# (after the slots are full even this psql may fail - that is the same error)
```

## Fix

Close the connection at the end of every request (and stop keeping it in a list):

```bash
python3 - <<'PY'
p = "app/app.py"
s = open(p).read()
s = s.replace('''    _connections.append(conn)
    with conn, conn.cursor() as cur:  # commit on success, rollback on error
        yield cur
''', '''    try:
        with conn, conn.cursor() as cur:  # commit on success, rollback on error
            yield cur
    finally:
        conn.close()
''')
open(p, "w").write(s)
PY
docker compose up -d --build app
./check.sh
```

A bigger app should use a real pool with a fixed size, for example `psycopg2.pool.ThreadedConnectionPool(1, 5, DATABASE_URL)` and `putconn()` after each request, or PgBouncer in front of Postgres.

## How to prevent it

- Always open connections with `try/finally` or a `with` block that closes them, or use a pool with a max size.
- Set the app pool size so that (pool size x number of app replicas) is less than `max_connections`.
- Monitor connections: alert when `pg_stat_activity` count is above 80% of `max_connections`.

## Interview questions

**Q1. What does "too many clients already" mean?**
A: It means Postgres reached `max_connections`, so it refuses new connections. Usually the app leaks connections or has too many replicas each with a big pool. I check `pg_stat_activity` to see who holds the connections and in which state.

**Q2. Why not just increase max_connections?**
A: Each Postgres connection uses memory and CPU, so a very high number makes the database slow. If the app leaks connections, a higher limit only delays the problem. I fix the leak and use a connection pool or PgBouncer.

**Q3. What is a connection pool and why do we use it?**
A: A pool keeps a small, fixed number of open connections and lends them to requests, then takes them back. Opening a new connection is slow, so a pool makes requests faster. It also puts a hard limit on how many connections the app can use.

## Explain it (script)

**English:** "After some traffic the app returned 500. The logs said 'too many clients already', and pg_stat_activity showed all 10 connections idle and owned by the app. The code opened a new connection for every request and never closed it. I added a finally block that closes the connection and redeployed. Now, after two load tests, the app uses only one or two connections and /health is 200."

**Hindi / Hinglish:** "Thodi traffic ke baad app 500 de raha tha. Logs me 'too many clients already' tha, aur pg_stat_activity me saari 10 connections idle thi, sab app ki. Code har request pe nayi connection kholta tha aur kabhi band nahi karta tha. Maine finally block me connection close kiya aur redeploy kiya. Ab do load test ke baad bhi app sirf ek-do connections use karta hai aur /health 200 hai."
