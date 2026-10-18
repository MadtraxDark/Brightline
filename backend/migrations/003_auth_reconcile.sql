-- The first auth and dataset migrations shared version 002. Reapply the auth
-- additions idempotently so databases that recorded either 002 get the full shape.
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');
