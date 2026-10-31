# Solution: disk-full-logs

> Do not read this before you submit your root cause.

## Root cause

The new `log-agent` sidecar runs with `LOG_LEVEL=debug` and writes debug lines non-stop into `debug.log` on the shared 20 MB log volume, so the volume became 100% full.
The app writes an access log line on every request, the write fails with `OSError: [Errno 28] No space left on device`, and Flask returns 500.

Proof:

```bash
docker compose logs app | grep -i "no space left"
docker compose exec app df -h /var/log/shopnotes        # Use% 100%
docker compose exec app ls -lh /var/log/shopnotes       # debug.log is ~20M
```

## Fix

```bash
# 1. Stop the cause: set the agent back to normal log level.
sed -i 's/LOG_LEVEL: debug/LOG_LEVEL: info/' docker-compose.yml
docker compose up -d log-agent

# 2. Free the space. Truncate, do not just delete a file that a process may still hold open.
docker compose exec app truncate -s 0 /var/log/shopnotes/debug.log
docker compose exec app df -h /var/log/shopnotes        # Use% is low again

# 3. Verify.
./check.sh
```

## How to prevent it

- Never run debug logging in production by default; make `LOG_LEVEL` a reviewed setting.
- Rotate logs with a size limit (logrotate, or Docker `logging: max-size`), and write logs to stdout instead of files when you can.
- Alert on disk / volume usage at 80%, long before it is 100%.

## Interview questions

**Q1. The disk is full. How do you find what is using the space?**
A: I run `df -h` to see which filesystem is full. Then I run `du -sh /path/* | sort -h` to find the biggest folder or file. I also check `lsof | grep deleted`, because a deleted file that is still open keeps using space.

**Q2. Why do you truncate a log file instead of deleting it?**
A: If a process still has the file open, `rm` removes only the name, and the space is not freed until the process closes it. `truncate -s 0` makes the file empty at once, and the process can keep writing to it.

**Q3. How do you stop logs from filling a disk again?**
A: I set log rotation with a maximum size and number of files. I keep the log level at info in production. And I add an alert at 80% disk usage so we act before users see errors.

## Explain it (script)

**English:** "All requests failed with 500. The app log showed 'No space left on device'. The log volume was 100% full because the new log agent ran in debug mode and wrote debug lines without stopping. I set the agent to info level, recreated it, and truncated debug.log. Now the volume is almost empty and /health is 200. Next, we will add log rotation and a disk alert at 80%."