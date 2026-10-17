CREATE TABLE IF NOT EXISTS dataset_images (
  filename text PRIMARY KEY,
  patient_id text NOT NULL,
  finding_labels text[] NOT NULL,
  sha256 text NOT NULL,
  content bytea NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dataset_images_labels_gin ON dataset_images USING gin(finding_labels);
