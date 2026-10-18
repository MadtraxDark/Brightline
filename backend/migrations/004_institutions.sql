-- Keep legacy records intact and explicitly outside every hospital scope.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS institutions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_institution_id text;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
ALTER TABLE extractions ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
ALTER TABLE events ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
ALTER TABLE sim_state ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
ALTER TABLE files ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
ALTER TABLE file_links ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
ALTER TABLE file_links ADD COLUMN IF NOT EXISTS session_access_hash text;

-- Change existing natural keys to include institution, preserving all rows.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='extractions'::regclass AND conname='extractions_owner_id_report_id_fkey') THEN
    ALTER TABLE extractions DROP CONSTRAINT extractions_owner_id_report_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cases'::regclass AND conname='cases_owner_id_report_id_fkey') THEN
    ALTER TABLE cases DROP CONSTRAINT cases_owner_id_report_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='file_links'::regclass AND conname='file_links_owner_id_file_id_fkey') THEN
    ALTER TABLE file_links DROP CONSTRAINT file_links_owner_id_file_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='extractions'::regclass AND conname='extractions_report_institution_fkey') THEN
    ALTER TABLE extractions DROP CONSTRAINT extractions_report_institution_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cases'::regclass AND conname='cases_report_institution_fkey') THEN
    ALTER TABLE cases DROP CONSTRAINT cases_report_institution_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='file_links'::regclass AND conname='file_links_file_institution_fkey') THEN
    ALTER TABLE file_links DROP CONSTRAINT file_links_file_institution_fkey;
  END IF;
  -- Some existing deployments also persist analysis metadata and report files.
  -- Keep those rows under the same legacy scope while changing their report FK.
  IF to_regclass('public.report_analyses') IS NOT NULL THEN
    ALTER TABLE report_analyses ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
    ALTER TABLE report_analyses DROP CONSTRAINT IF EXISTS report_analyses_owner_id_report_id_fkey;
  END IF;
  IF to_regclass('public.report_files') IS NOT NULL THEN
    ALTER TABLE report_files ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
    ALTER TABLE report_files DROP CONSTRAINT IF EXISTS report_files_owner_id_report_id_fkey;
    ALTER TABLE report_files DROP CONSTRAINT IF EXISTS report_files_owner_id_file_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='reports'::regclass AND conname='reports_pkey') THEN
    ALTER TABLE reports DROP CONSTRAINT reports_pkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='reports'::regclass AND conname='reports_pkey') THEN
    ALTER TABLE reports ADD CONSTRAINT reports_pkey PRIMARY KEY(owner_id,institution_id,report_id);
  END IF;
  IF to_regclass('public.report_analyses') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='report_analyses'::regclass AND conname='report_analyses_report_institution_fkey') THEN
    ALTER TABLE report_analyses ADD CONSTRAINT report_analyses_report_institution_fkey
      FOREIGN KEY(owner_id,institution_id,report_id) REFERENCES reports(owner_id,institution_id,report_id) ON DELETE CASCADE;
  END IF;
  IF to_regclass('public.report_files') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='report_files'::regclass AND conname='report_files_report_institution_fkey') THEN
    ALTER TABLE report_files ADD CONSTRAINT report_files_report_institution_fkey
      FOREIGN KEY(owner_id,institution_id,report_id) REFERENCES reports(owner_id,institution_id,report_id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='extractions'::regclass AND conname='extractions_pkey') THEN
    ALTER TABLE extractions DROP CONSTRAINT extractions_pkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='extractions'::regclass AND conname='extractions_pkey') THEN
    ALTER TABLE extractions ADD CONSTRAINT extractions_pkey PRIMARY KEY(owner_id,institution_id,report_id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='extractions'::regclass AND conname='extractions_owner_id_report_id_fkey') THEN
    ALTER TABLE extractions DROP CONSTRAINT extractions_owner_id_report_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='extractions'::regclass AND conname='extractions_report_institution_fkey') THEN
    ALTER TABLE extractions ADD CONSTRAINT extractions_report_institution_fkey
      FOREIGN KEY(owner_id,institution_id,report_id) REFERENCES reports(owner_id,institution_id,report_id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cases'::regclass AND conname='cases_owner_id_report_id_fkey') THEN
    ALTER TABLE cases DROP CONSTRAINT cases_owner_id_report_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cases'::regclass AND conname='cases_report_institution_fkey') THEN
    ALTER TABLE cases ADD CONSTRAINT cases_report_institution_fkey
      FOREIGN KEY(owner_id,institution_id,report_id) REFERENCES reports(owner_id,institution_id,report_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cases'::regclass AND conname='cases_owner_institution_id_unique') THEN
    ALTER TABLE cases ADD CONSTRAINT cases_owner_institution_id_unique UNIQUE(owner_id,institution_id,id);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='events'::regclass AND conname='events_case_id_fkey') THEN
    ALTER TABLE events DROP CONSTRAINT events_case_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='events'::regclass AND conname='events_case_institution_fkey') THEN
    ALTER TABLE events ADD CONSTRAINT events_case_institution_fkey
      FOREIGN KEY(owner_id,institution_id,case_id) REFERENCES cases(owner_id,institution_id,id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='sim_state'::regclass AND conname='sim_state_pkey') THEN
    ALTER TABLE sim_state DROP CONSTRAINT sim_state_pkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='sim_state'::regclass AND conname='sim_state_pkey') THEN
    ALTER TABLE sim_state ADD CONSTRAINT sim_state_pkey PRIMARY KEY(owner_id,institution_id);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='files'::regclass AND conname='files_pkey') THEN
    ALTER TABLE files DROP CONSTRAINT files_pkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='files'::regclass AND conname='files_pkey') THEN
    ALTER TABLE files ADD CONSTRAINT files_pkey PRIMARY KEY(owner_id,institution_id,file_id);
  END IF;
  IF to_regclass('public.report_files') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='report_files'::regclass AND conname='report_files_file_institution_fkey') THEN
    ALTER TABLE report_files ADD CONSTRAINT report_files_file_institution_fkey
      FOREIGN KEY(owner_id,institution_id,file_id) REFERENCES files(owner_id,institution_id,file_id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='file_links'::regclass AND conname='file_links_owner_id_file_id_fkey') THEN
    ALTER TABLE file_links DROP CONSTRAINT file_links_owner_id_file_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='file_links'::regclass AND conname='file_links_file_institution_fkey') THEN
    ALTER TABLE file_links ADD CONSTRAINT file_links_file_institution_fkey
      FOREIGN KEY(owner_id,institution_id,file_id) REFERENCES files(owner_id,institution_id,file_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='file_links'::regclass AND conname='file_links_session_access_fkey') THEN
    ALTER TABLE file_links ADD CONSTRAINT file_links_session_access_fkey
      FOREIGN KEY(session_access_hash) REFERENCES sessions(access_hash) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS reports_scope_order ON reports(owner_id,institution_id,report_id);
CREATE INDEX IF NOT EXISTS cases_scope_order ON cases(owner_id,institution_id,urgency,deadline_at_sim);
CREATE INDEX IF NOT EXISTS events_scope_order ON events(owner_id,institution_id,case_id,at_sim,id);
CREATE INDEX IF NOT EXISTS files_scope_order ON files(owner_id,institution_id,file_id);
