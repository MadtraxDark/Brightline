BEGIN;
CREATE TABLE IF NOT EXISTS dataset_image_links (
  token_hash text PRIMARY KEY,
  filename text NOT NULL REFERENCES dataset_images(filename) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS dataset_image_links_expiry ON dataset_image_links(expires_at);
CREATE TABLE IF NOT EXISTS dataset_image_analyses (
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename text NOT NULL REFERENCES dataset_images(filename) ON DELETE CASCADE,
  analysis jsonb NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, filename)
);
CREATE INDEX IF NOT EXISTS dataset_image_analyses_result_gin ON dataset_image_analyses USING gin(analysis);
COMMIT;
