ALTER TABLE reports ADD COLUMN IF NOT EXISTS dataset_filename text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_dataset_filename_fkey'
  ) THEN
    ALTER TABLE reports
      ADD CONSTRAINT reports_dataset_filename_fkey
      FOREIGN KEY (dataset_filename) REFERENCES dataset_images(filename);
  END IF;
END $$;

UPDATE reports AS target
SET dataset_filename = (
  SELECT filename FROM dataset_images
  WHERE 'Effusion' = ANY(finding_labels)
  ORDER BY cardinality(finding_labels), filename
  LIMIT 1
)
WHERE target.report_id = 'R-004'
  AND target.dataset_filename IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM report_files AS linked
    WHERE linked.owner_id = target.owner_id
      AND linked.institution_id = target.institution_id
      AND linked.report_id = target.report_id
      AND linked.role = 'radiograph'
  );

UPDATE reports AS target
SET dataset_filename = (
  SELECT filename FROM dataset_images
  WHERE 'Nodule' = ANY(finding_labels)
  ORDER BY cardinality(finding_labels), filename
  LIMIT 1
)
WHERE target.report_id = 'R-005'
  AND target.dataset_filename IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM report_files AS linked
    WHERE linked.owner_id = target.owner_id
      AND linked.institution_id = target.institution_id
      AND linked.report_id = target.report_id
      AND linked.role = 'radiograph'
  );
