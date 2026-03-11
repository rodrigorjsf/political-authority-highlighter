-- 0008_add_data_source_status.sql — move data_source_status to public schema (RF-014)
-- api_reader needs SELECT access; source status is non-sensitive (LAI compliant)

DROP TABLE IF EXISTS internal_data.data_source_status;

CREATE TABLE IF NOT EXISTS public.data_source_status (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        VARCHAR(50) UNIQUE NOT NULL,
  last_sync_at  TIMESTAMPTZ,
  record_count  INTEGER NOT NULL DEFAULT 0,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial rows for all 6 sources so the /fontes page shows something immediately
INSERT INTO public.data_source_status (source, status) VALUES
  ('camara', 'pending'),
  ('senado', 'pending'),
  ('transparencia', 'pending'),
  ('tse', 'pending'),
  ('tcu', 'pending'),
  ('cgu', 'pending')
ON CONFLICT (source) DO NOTHING;

-- Grant read access to api_reader role
GRANT SELECT ON TABLE public.data_source_status TO api_reader;
