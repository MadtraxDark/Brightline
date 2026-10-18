ALTER TABLE users ADD COLUMN IF NOT EXISTS view_all_reports boolean NOT NULL DEFAULT false;

UPDATE users
SET view_all_reports = true
WHERE id IN (
  '35bb6bd1-ea03-4b12-9509-0abde2a69e13',
  '533b0c83-b2a4-46a7-8cc4-a5975440e4c3',
  '8ad3b371-6ad8-428f-9539-602c8e0b28f1',
  '319d5793-e767-4c0e-8306-13e0532ec4c6'
);
