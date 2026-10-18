ALTER TABLE cases ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS closed_at_sim double precision;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS requester_sent_at timestamptz;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS requester_sent_at_sim double precision;
