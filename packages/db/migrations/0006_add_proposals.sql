-- 0006_add_proposals.sql — public_data schema: proposals (RF-010)

CREATE TABLE IF NOT EXISTS public_data.proposals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id     UUID NOT NULL REFERENCES public_data.politicians(id),
  external_id       VARCHAR(100) NOT NULL,
  source            VARCHAR(20) NOT NULL,
  proposal_type     VARCHAR(20) NOT NULL,
  proposal_number   VARCHAR(20) NOT NULL,
  proposal_year     SMALLINT NOT NULL,
  summary           TEXT NOT NULL,
  status            VARCHAR(50) NOT NULL,
  submission_date   DATE NOT NULL,
  source_url        VARCHAR(500),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (politician_id, external_id)
);

-- Index for politician lookup
CREATE INDEX IF NOT EXISTS idx_proposals_politician
  ON public_data.proposals(politician_id);

-- Composite index for stable DESC cursor pagination (politician_id, date DESC, id DESC)
CREATE INDEX IF NOT EXISTS idx_proposals_pagination
  ON public_data.proposals(politician_id, submission_date DESC, id DESC);
