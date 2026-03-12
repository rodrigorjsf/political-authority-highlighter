-- RF-012: Add expenses table for parliamentary expense tracking (CEAP/CEAPS)
-- Supports cursor-based pagination on (year DESC, month DESC, id DESC)

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES public.politicians(id),
  external_id VARCHAR(100) NOT NULL,
  source VARCHAR(20) NOT NULL,
  year SMALLINT NOT NULL,
  month SMALLINT NOT NULL,
  category VARCHAR(255) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  document_number VARCHAR(100),
  source_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (external_id, politician_id)
);

-- Indexes for efficient querying and pagination
CREATE INDEX IF NOT EXISTS idx_expenses_politician ON public.expenses(politician_id);
CREATE INDEX IF NOT EXISTS idx_expenses_pagination ON public.expenses(year DESC, month DESC, id DESC);
