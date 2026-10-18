CREATE TABLE IF NOT EXISTS report_analyses (
  owner_id uuid NOT NULL,
  report_id text NOT NULL,
  analysis jsonb NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, report_id),
  FOREIGN KEY(owner_id,report_id) REFERENCES reports(owner_id,report_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS report_files (
  owner_id uuid NOT NULL,
  report_id text NOT NULL,
  file_id text NOT NULL,
  role text NOT NULL CHECK(role IN ('report','radiograph')),
  PRIMARY KEY(owner_id,report_id,file_id),
  FOREIGN KEY(owner_id,report_id) REFERENCES reports(owner_id,report_id) ON DELETE CASCADE,
  FOREIGN KEY(owner_id,file_id) REFERENCES files(owner_id,file_id) ON DELETE CASCADE
);
