ALTER TABLE reports ADD COLUMN IF NOT EXISTS dataset_filename text;

UPDATE reports AS target
SET dataset_filename = (
  SELECT filename FROM dataset_images
  WHERE 'Mass' = ANY(finding_labels)
    AND filename NOT IN ('00021285_003.png', '00000148_001.png', '00001093_013.png')
  ORDER BY cardinality(finding_labels), filename
  LIMIT 1
)
WHERE target.report_id = 'R-006'
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
  WHERE 'Infiltration' = ANY(finding_labels)
    AND filename NOT IN ('00021285_003.png', '00000148_001.png', '00001093_013.png')
  ORDER BY cardinality(finding_labels), filename
  LIMIT 1
)
WHERE target.report_id = 'R-002'
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
  WHERE 'Consolidation' = ANY(finding_labels)
    AND filename NOT IN ('00021285_003.png', '00000148_001.png', '00001093_013.png')
  ORDER BY cardinality(finding_labels), filename
  LIMIT 1
)
WHERE target.report_id = 'R-003'
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
  WHERE 'Edema' = ANY(finding_labels)
    AND filename NOT IN ('00021285_003.png', '00000148_001.png', '00001093_013.png')
  ORDER BY cardinality(finding_labels), filename
  LIMIT 1
)
WHERE target.report_id = 'R-007'
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
  WHERE 'Cardiomegaly' = ANY(finding_labels)
    AND filename NOT IN ('00021285_003.png', '00000148_001.png', '00001093_013.png')
  ORDER BY cardinality(finding_labels), filename
  LIMIT 1
)
WHERE target.report_id = 'R-008'
  AND target.dataset_filename IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM report_files AS linked
    WHERE linked.owner_id = target.owner_id
      AND linked.institution_id = target.institution_id
      AND linked.report_id = target.report_id
      AND linked.role = 'radiograph'
  );
