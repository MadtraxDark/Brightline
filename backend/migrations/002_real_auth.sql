-- Additive migration: existing accounts and sessions are preserved.
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');
