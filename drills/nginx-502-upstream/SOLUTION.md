# Solution: nginx-502-upstream

> Do not read this before you submit your root cause.

## Root cause

Nginx sends traffic to `app:5050`, but the Flask app listens on port `5000`.
Nothing answers on 5050, so Nginx gets "connection refused" and returns `502 Bad Gateway`.

Proof:

```bash
docker compose logs nginx | grep -i "connect() failed"
# connect() failed (111: Connection refused) while connecting to upstream, upstream: "http://172.x.x.x:5050/health"
docker compose logs app | grep Running
# Running on http://0.0.0.0:5000
```

## Fix

```bash
sed -i 's#http://app:5050;#http://app:5000;#' nginx.conf     # the line: set $upstream http://app:5000;
docker compose up -d --force-recreate nginx   # recreate so the container sees the edited file
docker compose exec nginx nginx -t            # config test: "syntax is ok"
./check.sh
```

## How to prevent it

- Keep the app port in one place (an env var like `APP_PORT`) and use it in both the app and Nginx.
- Run `nginx -t` and a smoke test (`curl /health` through Nginx) in CI before the deploy.
- Alert on the 5xx rate at the load balancer, not only on "container is up".

## Interview questions

**Q1. What is the difference between 502, 503 and 504?**
A: 502 means the proxy could not get a good answer from the backend, for example the connection was refused. 503 means the service is not available right now, for example overloaded or in maintenance. 504 means the proxy reached the backend but the backend did not answer in time.

**Q2. How do you debug a 502 from Nginx?**
A: First I read the Nginx error log, it tells me the upstream address and the error. Then I check that the backend is running and on which port it listens. Then I test the connection from inside the Nginx container, for example with `wget -qO- http://app:5000/health`.

**Q3. The container is "Up" but users get 502. How is that possible?**
A: "Up" only means the process is running. The proxy can still point to the wrong host or port, or the app can listen only on 127.0.0.1. So I always test the real path that users take, through the proxy.

## Explain it (script)

**English:** "Users got 502 errors. I checked the Nginx error log and saw connection refused to port 5050. The app listens on 5000, so the Nginx config had the wrong port. I changed the port to 5000, tested the config, and recreated Nginx. Now /health returns 200. To stop this again, we will keep the port in one variable and add a smoke test to the deploy."

**Hindi / Hinglish:** "Users ko 502 error aa raha tha. Maine Nginx ka error log dekha, usme port 5050 pe connection refused tha. App asal me port 5000 pe chal raha hai, toh Nginx config me galat port tha. Maine port 5000 kiya, config test kiya aur Nginx ko recreate kiya. Ab /health 200 de raha hai. Aage se port ek hi variable me rakhenge aur deploy me smoke test add karenge."
