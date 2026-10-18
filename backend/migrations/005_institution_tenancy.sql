-- Shared database tenancy. Existing records are retained and assigned to the
-- historic default institution (HCTCO · UNIFESO).
ALTER TABLE user_institutions DROP CONSTRAINT IF EXISTS user_institutions_institution_id_check;
ALTER TABLE user_institutions ADD CONSTRAINT user_institutions_institution_id_check
  CHECK (institution_id IN ('hctco_unifeso','hospital_sao_jose','beneficencia_portuguesa','outro_hospital'));
INSERT INTO user_institutions(user_id,institution_id)
SELECT id,'hctco_unifeso' FROM users ON CONFLICT DO NOTHING;
DELETE FROM user_institutions WHERE institution_id IN ('brightline','unifeso');

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS institution_id text;
UPDATE sessions SET institution_id='hctco_unifeso'
WHERE institution_id IS NULL OR institution_id IN ('brightline','unifeso');
ALTER TABLE sessions ALTER COLUMN institution_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS patients (
  institution_id text NOT NULL DEFAULT current_setting('brightline.institution_id', true),
  patient_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institution_id, patient_ref)
);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS patient_ref text;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['patients','reports','extractions','report_analyses','sim_state','cases','events','files','report_files','file_links'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS institution_id text', t);
    EXECUTE format('UPDATE %I SET institution_id=''hctco_unifeso'' WHERE institution_id IS NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN institution_id SET DEFAULT current_setting(''brightline.institution_id'', true)', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN institution_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS institution_isolation ON %I', t);
    EXECUTE format('CREATE POLICY institution_isolation ON %1$I USING (%1$I.institution_id=current_setting(''brightline.institution_id'', true) AND EXISTS (SELECT 1 FROM user_institutions ui WHERE ui.user_id=current_setting(''brightline.user_id'', true)::uuid AND ui.institution_id=%1$I.institution_id)) WITH CHECK (%1$I.institution_id=current_setting(''brightline.institution_id'', true) AND EXISTS (SELECT 1 FROM user_institutions ui WHERE ui.user_id=current_setting(''brightline.user_id'', true)::uuid AND ui.institution_id=%1$I.institution_id))', t);
  END LOOP;
END $$;
-- Include the tenant in report keys so identical accession IDs can coexist
-- for one physician at different institutions.
ALTER TABLE extractions DROP CONSTRAINT IF EXISTS extractions_owner_id_report_id_fkey;
ALTER TABLE report_analyses DROP CONSTRAINT IF EXISTS report_analyses_owner_id_report_id_fkey;
ALTER TABLE report_files DROP CONSTRAINT IF EXISTS report_files_owner_id_report_id_fkey;
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_owner_id_report_id_fkey;
ALTER TABLE extractions DROP CONSTRAINT IF EXISTS extractions_report_tenant_fkey;
ALTER TABLE report_analyses DROP CONSTRAINT IF EXISTS report_analyses_report_tenant_fkey;
ALTER TABLE report_files DROP CONSTRAINT IF EXISTS report_files_report_tenant_fkey;
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_report_tenant_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_pkey;
ALTER TABLE extractions DROP CONSTRAINT IF EXISTS extractions_pkey;
ALTER TABLE report_analyses DROP CONSTRAINT IF EXISTS report_analyses_pkey;
ALTER TABLE report_files DROP CONSTRAINT IF EXISTS report_files_pkey;
ALTER TABLE reports ADD PRIMARY KEY (owner_id,institution_id,report_id);
ALTER TABLE extractions ADD PRIMARY KEY (owner_id,institution_id,report_id);
ALTER TABLE report_analyses ADD PRIMARY KEY (owner_id,institution_id,report_id);
ALTER TABLE report_files ADD PRIMARY KEY (owner_id,institution_id,report_id,file_id);
ALTER TABLE extractions ADD CONSTRAINT extractions_report_tenant_fkey
  FOREIGN KEY (owner_id,institution_id,report_id) REFERENCES reports(owner_id,institution_id,report_id) ON DELETE CASCADE;
ALTER TABLE report_analyses ADD CONSTRAINT report_analyses_report_tenant_fkey
  FOREIGN KEY (owner_id,institution_id,report_id) REFERENCES reports(owner_id,institution_id,report_id) ON DELETE CASCADE;
ALTER TABLE report_files ADD CONSTRAINT report_files_report_tenant_fkey
  FOREIGN KEY (owner_id,institution_id,report_id) REFERENCES reports(owner_id,institution_id,report_id) ON DELETE CASCADE;
ALTER TABLE cases ADD CONSTRAINT cases_report_tenant_fkey
  FOREIGN KEY (owner_id,institution_id,report_id) REFERENCES reports(owner_id,institution_id,report_id) ON DELETE CASCADE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reports_patient_institution_fkey') THEN
    ALTER TABLE reports ADD CONSTRAINT reports_patient_institution_fkey
      FOREIGN KEY (institution_id,patient_ref) REFERENCES patients(institution_id,patient_ref);
  END IF;
END $$;
ALTER TABLE sim_state DROP CONSTRAINT IF EXISTS sim_state_pkey;
ALTER TABLE sim_state ADD CONSTRAINT sim_state_pkey PRIMARY KEY(owner_id,institution_id);

-- File access tickets are scoped to the same institution as their file.
