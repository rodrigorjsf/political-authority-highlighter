-- 0007_add_committees.sql — public_data schema: committees (RF-011)

CREATE TABLE IF NOT EXISTS public_data.committees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id     UUID NOT NULL REFERENCES public_data.politicians(id),
  external_id       VARCHAR(100) NOT NULL,
  source            VARCHAR(20) NOT NULL,
  committee_name    TEXT NOT NULL,
  role              VARCHAR(50) NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (politician_id, external_id)
);

-- Index for politician lookup
CREATE INDEX IF NOT EXISTS idx_committees_politician
  ON public_data.committees(politician_id);
