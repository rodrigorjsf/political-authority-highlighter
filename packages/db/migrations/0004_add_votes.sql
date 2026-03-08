-- 0004_add_votes.sql — public_data schema: votes (RF-009)

CREATE TABLE IF NOT EXISTS public_data.votes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id       UUID NOT NULL REFERENCES public_data.politicians(id),
  external_id         VARCHAR(100) NOT NULL,
  source              VARCHAR(20) NOT NULL,
  session_date        DATE NOT NULL,
  matter_description  TEXT NOT NULL,
  vote_cast           VARCHAR(20) NOT NULL,
  session_result      VARCHAR(100) NOT NULL,
  source_url          VARCHAR(500),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (politician_id, external_id)
);

-- Index for politician lookup
CREATE INDEX IF NOT EXISTS idx_votes_politician
  ON public_data.votes(politician_id);

-- Composite index for stable DESC cursor pagination (politician_id, date DESC, id DESC)
CREATE INDEX IF NOT EXISTS idx_votes_pagination
  ON public_data.votes(politician_id, session_date DESC, id DESC);
