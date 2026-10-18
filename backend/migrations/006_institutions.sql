CREATE TABLE IF NOT EXISTS institutions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  PRIMARY KEY (user_id, name)
);

INSERT INTO institutions (user_id, name)
SELECT users.id, company.name
FROM users
CROSS JOIN (
  VALUES
    ('HCTCO · UNIFESO'),
    ('Hospital São José · Teresópolis'),
    ('Hospital Beneficência Portuguesa · Teresópolis'),
    ('Outro hospital'),
    ('Asl Softhouse')
) AS company(name)
ON CONFLICT DO NOTHING;

UPDATE users
SET institutions = '[
  "hctco-unifeso",
  "hospital-sao-jose-teresopolis",
  "hospital-beneficencia-portuguesa-teresopolis",
  "outro-hospital",
  "asl-softhouse"
]'::jsonb;

INSERT INTO sim_state (owner_id, institution_id)
SELECT users.id, company.id
FROM users
CROSS JOIN (
  VALUES
    ('hctco-unifeso'),
    ('hospital-sao-jose-teresopolis'),
    ('hospital-beneficencia-portuguesa-teresopolis'),
    ('outro-hospital'),
    ('asl-softhouse')
) AS company(id)
ON CONFLICT DO NOTHING;
