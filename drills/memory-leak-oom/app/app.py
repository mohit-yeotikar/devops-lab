import json
import os
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

# Response cache to make GET /notes faster. Key = full URL, value = rendered page.
_page_cache = {}

@app.get("/notes")
def list_notes():
    key = request.full_path  # e.g. "/notes?page=1&_=1730300000"
    if key not in _page_cache:
        with db() as cur:
            cur.execute("SELECT id, text FROM notes ORDER BY id")
            rows = cur.fetchall()
        body = json.dumps([{"id": r[0], "text": r[1]} for r in rows])
        # Keep a padded, pre-rendered page (512 KB) ready for the HTML view.
        _page_cache[key] = body.ljust(512 * 1024).encode()
    return app.response_class(_page_cache[key].rstrip(), mimetype="application/json")

@app.post("/notes")
def add_note():
    text = str((request.get_json(silent=True) or {}).get("text", "")).strip()
    if not text:
        return jsonify(error="text is required"), 400
    with db() as cur:
        cur.execute("INSERT INTO notes (text) VALUES (%s) RETURNING id", (text,))
        note_id = cur.fetchone()[0]
    return jsonify(id=note_id, text=text), 201

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), threaded=True)
