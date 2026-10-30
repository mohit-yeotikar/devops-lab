# Solution: expired-tls-cert

> Do not read this before you submit your root cause.

## Root cause

The TLS certificate that Nginx serves (`certs/shopnotes.crt`) expired on 1 October 2025 (`notAfter=Oct  1 00:00:00 2025 GMT`), and nobody renewed it.
Browsers and curl reject an expired certificate, so every HTTPS connection fails with "certificate has expired".

Proof:

```bash
openssl x509 -in certs/shopnotes.crt -noout -dates
curl -sS --cacert certs/shopnotes.crt https://localhost:8447/health
# curl: (60) SSL certificate problem: certificate has expired
```

## Fix

Make a new certificate (here self-signed, valid 365 days, for `localhost`) and reload Nginx:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout certs/shopnotes.key -out certs/shopnotes.crt \
  -subj "/CN=localhost/O=ShopNotes" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
openssl x509 -in certs/shopnotes.crt -noout -dates     # notAfter is next year
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
./check.sh
```

In a company with a public site you renew with the CA instead, for example `certbot renew` (Let's Encrypt) or cert-manager in Kubernetes.

## How to prevent it

- Automate renewal (certbot timer, cert-manager), never renew by hand from a calendar note.
- Monitor expiry: alert 30 days and 7 days before `notAfter` (blackbox exporter `probe_ssl_earliest_cert_expiry`).
- Keep a list of all certificates and who owns each one.

## Interview questions

**Q1. How do you check when a certificate expires?**
A: For a file I run `openssl x509 -in cert.crt -noout -dates`. For a live server I run `openssl s_client -connect host:443 -servername host` and pipe it to `openssl x509 -noout -dates`. I always check the live server, because the file on disk can be different from what is served.

**Q2. The new certificate is on the server but users still see the old one. Why?**
A: Nginx reads the certificate only at start or reload, so I must run `nginx -s reload`. There can also be a load balancer or CDN in front that has its own copy. I check the served certificate with `openssl s_client` to be sure.

**Q3. What is the difference between `curl -k` and fixing the certificate?**
A: `curl -k` tells curl to skip all certificate checks, so it hides the problem and is not safe. Real users and browsers still see the error. The real fix is a valid certificate, and `-k` is only for quick tests.

## Explain it (script)

**English:** "Customers saw 'connection not private'. curl said 'certificate has expired', and openssl showed the notAfter date was 1 October 2025. The certificate was never renewed. I created a new certificate valid for one year, tested the Nginx config, and reloaded Nginx. Now HTTPS works without -k. Next, we will automate renewal and add an expiry alert 30 days before."

**Hindi / Hinglish:** "Customers ko 'connection not private' dikh raha tha. curl ne bola 'certificate has expired', aur openssl me notAfter date 1 October 2025 thi. Certificate renew hi nahi hua tha. Maine ek saal ka naya certificate banaya, Nginx config test kiya aur Nginx reload kiya. Ab HTTPS bina -k ke chal raha hai. Aage renewal automate karenge aur expiry se 30 din pehle alert lagayenge."
