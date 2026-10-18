DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS user_institutions (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id text NOT NULL CHECK(institution_id IN ('brightline','unifeso')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id,institution_id)
  );

  INSERT INTO user_institutions(user_id,institution_id)
  SELECT id,'brightline' FROM users
  ON CONFLICT DO NOTHING;
END $$;
