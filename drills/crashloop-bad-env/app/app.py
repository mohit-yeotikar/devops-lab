import os
import sys
from contextlib import contextmanager

import psycopg2
from flask import Flask, jsonify, request

app = Flask(__name__)
DATABASE_URL = os.environ.get("DATABASE_URL", "")

@contextmanager
def db():
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
    try:
        with conn, conn.cursor() as cur:  # commit on success, rollback on error
            yield cur
    finally:
        conn.close()

@app.get("/health")
def health():
    try:
        with db() as cur:
            cur.execute("SELECT 1")
        return jsonify(status="ok", db="ok")
    except Exception as e:
        app.logger.error("health check failed: %s", e)
        return jsonify(status="error", db=str(e).strip()), 503

@app.get("/notes")
def list_notes():
    with db() as cur:
        cur.execute("SELECT id, text FROM notes ORDER BY id")
        rows = cur.fetchall()
    return jsonify([{"id": r[0], "text": r[1]} for r in rows])

@app.post("/notes")
def add_note():
    text = str((request.get_json(silent=True) or {}).get("text", "")).strip()
    if not text:
        return jsonify(error="text is required"), 400
    with db() as cur:
        cur.execute("INSERT INTO notes (text) VALUES (%s) RETURNING id", (text,))
        note_id = cur.fetchone()[0]
    return jsonify(id=note_id, text=text), 201

def startup_check():
    # Fail fast: if the database config is wrong, crash at start instead of serving errors.
    try:
        with db() as cur:
            cur.execute("SELECT 1")
    except Exception as e:
        print(f"FATAL: cannot connect to database with DATABASE_URL: {e}", flush=True)
        sys.exit(1)
    print("database connection ok", flush=True)

if __name__ == "__main__":
    startup_check()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), threaded=True)
