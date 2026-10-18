CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_hash text NOT NULL UNIQUE,
  refresh_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
CREATE TABLE IF NOT EXISTS reports (
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id text NOT NULL,
  modality text NOT NULL,
  radiologist text NOT NULL,
  ordering_physician text NOT NULL,
  text text NOT NULL CHECK (length(text)>0),
  flagged_by_radiologist boolean NOT NULL,
  ground_truth jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY(owner_id,report_id)
);
CREATE TABLE IF NOT EXISTS extractions (
  owner_id uuid NOT NULL,
  report_id text NOT NULL,
  findings jsonb NOT NULL,
  PRIMARY KEY(owner_id,report_id),
  FOREIGN KEY(owner_id,report_id) REFERENCES reports(owner_id,report_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS report_analyses (
  owner_id uuid NOT NULL,
  report_id text NOT NULL,
  analysis jsonb NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, report_id),
  FOREIGN KEY(owner_id,report_id) REFERENCES reports(owner_id,report_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sim_state (
  owner_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sim_now double precision NOT NULL DEFAULT 0 CHECK(sim_now>=0)
);
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id text NOT NULL,
  finding text NOT NULL,
  evidence text NOT NULL,
  urgency text NOT NULL CHECK(urgency IN ('critical','urgent','actionable')),
  deadline_hours integer NOT NULL,
  confidence text NOT NULL CHECK(confidence IN ('high','medium','low')),
  status text NOT NULL DEFAULT 'notified' CHECK(status IN ('detected','notified','read','action_taken','closed','escalated')),
  escalation_level integer NOT NULL DEFAULT 0 CHECK(escalation_level BETWEEN 0 AND 2),
  current_target text NOT NULL,
  notified_at_sim double precision NOT NULL DEFAULT 0,
  deadline_at_sim double precision NOT NULL,
  acknowledged_at_sim double precision,
  FOREIGN KEY(owner_id,report_id) REFERENCES reports(owner_id,report_id) ON DELETE CASCADE,
  CHECK(deadline_hours=CASE urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 24 ELSE 720 END)
);
CREATE INDEX IF NOT EXISTS cases_owner_order ON cases(owner_id,urgency,deadline_at_sim);
CREATE TABLE IF NOT EXISTS events (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  type text NOT NULL,
  detail text NOT NULL,
  at_sim double precision NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS events_case_order ON events(owner_id,case_id,at_sim,id);
CREATE TABLE IF NOT EXISTS files (
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id text NOT NULL,
  mime_type text NOT NULL CHECK(mime_type IN ('application/json','image/png','image/jpeg','application/pdf')),
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,file_id)
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
CREATE TABLE IF NOT EXISTS file_links (
  token_hash text PRIMARY KEY,
  owner_id uuid NOT NULL,
  file_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  FOREIGN KEY(owner_id,file_id) REFERENCES files(owner_id,file_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS dataset_images (
  filename text PRIMARY KEY,
  patient_id text NOT NULL,
  finding_labels text[] NOT NULL,
  sha256 text NOT NULL,
  content bytea NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dataset_images_labels_gin ON dataset_images USING gin(finding_labels);
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

ALTER TABLE cases ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS closed_at_sim double precision;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS requester_sent_at timestamptz;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS requester_sent_at_sim double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS view_all_reports boolean NOT NULL DEFAULT false;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS dataset_filename text;

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
