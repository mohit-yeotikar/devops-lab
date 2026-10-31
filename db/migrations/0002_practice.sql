-- Finished practice labs (browser terminal). One row per finish.
CREATE TABLE practice_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab TEXT NOT NULL,
  commands INTEGER NOT NULL DEFAULT 0,
  seconds INTEGER,
  quiz_score INTEGER,
  quiz_total INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX practice_user ON practice_runs(user_id, lab);
