-- Training track per user: 'devops' (default) or 'cro'.
ALTER TABLE users ADD COLUMN track TEXT NOT NULL DEFAULT 'devops';
