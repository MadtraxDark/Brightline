DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS user_institutions (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id text NOT NULL CHECK(institution_id IN ('hctco_unifeso','hospital_sao_jose','beneficencia_portuguesa','outro_hospital')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id,institution_id)
  );

  INSERT INTO user_institutions(user_id,institution_id)
  SELECT id,'hctco_unifeso' FROM users
  ON CONFLICT DO NOTHING;
END $$;
