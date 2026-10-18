CREATE TABLE IF NOT EXISTS report_analyses (
  owner_id uuid NOT NULL,
  report_id text NOT NULL,
  analysis jsonb NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, report_id)
);
CREATE TABLE IF NOT EXISTS report_files (
  owner_id uuid NOT NULL,
  report_id text NOT NULL,
  file_id text NOT NULL,
  role text NOT NULL CHECK(role IN ('report','radiograph')),
  PRIMARY KEY(owner_id,report_id,file_id)
);
