-- Keep model results from the shared public image dataset isolated by hospital.
DO $$ BEGIN
  IF to_regclass('public.report_analyses') IS NOT NULL THEN
    ALTER TABLE report_analyses
      ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
    ALTER TABLE report_analyses DROP CONSTRAINT IF EXISTS report_analyses_owner_id_report_id_fkey;
    ALTER TABLE report_analyses DROP CONSTRAINT IF EXISTS report_analyses_report_institution_fkey;
    ALTER TABLE report_analyses DROP CONSTRAINT IF EXISTS report_analyses_pkey;
    ALTER TABLE report_analyses
      ADD CONSTRAINT report_analyses_pkey PRIMARY KEY(owner_id,institution_id,report_id);
    ALTER TABLE report_analyses
      ADD CONSTRAINT report_analyses_report_institution_fkey
      FOREIGN KEY(owner_id,institution_id,report_id)
      REFERENCES reports(owner_id,institution_id,report_id) ON DELETE CASCADE;
  END IF;
  IF to_regclass('public.report_files') IS NOT NULL THEN
    ALTER TABLE report_files
      ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
    ALTER TABLE report_files DROP CONSTRAINT IF EXISTS report_files_owner_id_report_id_fkey;
    ALTER TABLE report_files DROP CONSTRAINT IF EXISTS report_files_owner_id_file_id_fkey;
    ALTER TABLE report_files DROP CONSTRAINT IF EXISTS report_files_report_institution_fkey;
    ALTER TABLE report_files DROP CONSTRAINT IF EXISTS report_files_file_institution_fkey;
    ALTER TABLE report_files DROP CONSTRAINT IF EXISTS report_files_pkey;
    ALTER TABLE report_files
      ADD CONSTRAINT report_files_pkey PRIMARY KEY(owner_id,institution_id,report_id,file_id);
    ALTER TABLE report_files
      ADD CONSTRAINT report_files_report_institution_fkey
      FOREIGN KEY(owner_id,institution_id,report_id)
      REFERENCES reports(owner_id,institution_id,report_id) ON DELETE CASCADE;
    ALTER TABLE report_files
      ADD CONSTRAINT report_files_file_institution_fkey
      FOREIGN KEY(owner_id,institution_id,file_id)
      REFERENCES files(owner_id,institution_id,file_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.dataset_image_analyses') IS NOT NULL THEN
    ALTER TABLE dataset_image_analyses
      ADD COLUMN IF NOT EXISTS institution_id text NOT NULL DEFAULT '__legacy__';
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid='dataset_image_analyses'::regclass
        AND conname='dataset_image_analyses_pkey'
    ) THEN
      ALTER TABLE dataset_image_analyses DROP CONSTRAINT dataset_image_analyses_pkey;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid='dataset_image_analyses'::regclass
        AND conname='dataset_image_analyses_pkey'
    ) THEN
      ALTER TABLE dataset_image_analyses
        ADD CONSTRAINT dataset_image_analyses_pkey PRIMARY KEY(owner_id,institution_id,filename);
    END IF;
  END IF;
END $$;
