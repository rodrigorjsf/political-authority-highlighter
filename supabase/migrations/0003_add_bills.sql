-- 0003_add_bills.sql — public schema: bills (RF-008)

CREATE TABLE IF NOT EXISTS public.bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id   UUID NOT NULL REFERENCES public.politicians(id),
  external_id     VARCHAR(100) NOT NULL,
  source          VARCHAR(20) NOT NULL,
  title           TEXT NOT NULL,
  bill_type       VARCHAR(20) NOT NULL,
  bill_number     VARCHAR(20) NOT NULL,
  bill_year       SMALLINT NOT NULL,
  status          VARCHAR(50) NOT NULL,
  submission_date DATE NOT NULL,
  source_url      VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (politician_id, external_id)
);

-- Index for politician lookup
CREATE INDEX IF NOT EXISTS idx_bills_politician
  ON public.bills(politician_id);

-- Composite index for stable DESC cursor pagination (politician_id, date DESC, id DESC)
CREATE INDEX IF NOT EXISTS idx_bills_pagination
  ON public.bills(politician_id, submission_date DESC, id DESC);
