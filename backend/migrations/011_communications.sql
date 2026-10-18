CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id text NOT NULL,
  peer_name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('chat', 'email')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  report_id text,
  email_to text,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS communications_scope_idx
  ON communications (owner_id, institution_id, created_at);
