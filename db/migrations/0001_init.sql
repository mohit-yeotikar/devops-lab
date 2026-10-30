CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  handle TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'trainee',
  city TEXT DEFAULT '',
  github TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  target_role TEXT DEFAULT 'DevOps Engineer',
  show_hindi INTEGER NOT NULL DEFAULT 1,
  public_portfolio INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  last_seen_at TEXT
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE ticket_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',          -- todo | doing | review | changes | done
  checklist TEXT NOT NULL DEFAULT '[]',          -- JSON array of checked acceptance indexes
  evidence TEXT NOT NULL DEFAULT '{}',           -- JSON {links:[], notes:""}
  hours REAL NOT NULL DEFAULT 0,
  explanation TEXT DEFAULT '',                   -- the trainee's own words (last coached version)
  explain_score INTEGER,                         -- 0-10 from coach
  reviewer_note TEXT DEFAULT '',
  started_at TEXT,
  submitted_at TEXT,
  reviewed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, ticket_id)
);
CREATE TABLE work_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id TEXT,
  day TEXT NOT NULL,                             -- YYYY-MM-DD
  hours REAL NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX work_log_user_day ON work_log(user_id, day);
CREATE TABLE coach_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread TEXT NOT NULL,                          -- e.g. ticket:s01-t01 | interview:<id> | drill:<name>
  role TEXT NOT NULL,                            -- user | assistant
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX coach_thread ON coach_messages(user_id, thread);
CREATE TABLE interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,                           -- all | s01 ...
  questions TEXT NOT NULL,                       -- JSON [{q, ticketId}]
  answers TEXT NOT NULL DEFAULT '[]',            -- JSON [{a, score, feedback, better}]
  score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE TABLE drill_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drill TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  fix TEXT NOT NULL DEFAULT '',
  minutes INTEGER,
  verdict TEXT NOT NULL,                         -- correct | partly | wrong
  feedback TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX drill_user ON drill_results(user_id, drill);
