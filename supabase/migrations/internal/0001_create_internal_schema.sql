-- Internal data schema for pipeline processing
-- DR-006: api_reader role has ZERO permissions on internal_data
CREATE SCHEMA IF NOT EXISTS internal_data;

-- Raw API response audit trail
CREATE TABLE IF NOT EXISTS internal_data.raw_source_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  raw_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_source_data_source_date
  ON internal_data.raw_source_data(source, fetched_at DESC);

-- Anti-corruption exclusion records (DR-001: details stay internal)
CREATE TABLE IF NOT EXISTS internal_data.exclusion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL,
  source VARCHAR(50) NOT NULL,
  cpf_hash VARCHAR(64) NOT NULL,
  exclusion_type VARCHAR(100) NOT NULL,
  record_date TIMESTAMPTZ,
  record_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exclusion_records_politician
  ON internal_data.exclusion_records(politician_id);
CREATE INDEX IF NOT EXISTS idx_exclusion_records_cpf_hash
  ON internal_data.exclusion_records(cpf_hash);

-- Encrypted CPF mapping (DR-005: AES-256-GCM encrypted, SHA-256 hashed)
CREATE TABLE IF NOT EXISTS internal_data.politician_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL,
  cpf_encrypted TEXT NOT NULL,
  cpf_hash VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_politician_identifiers_politician
  ON internal_data.politician_identifiers(politician_id);

-- Pipeline job execution history
CREATE TABLE IF NOT EXISTS internal_data.ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  job_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_upserted INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_source
  ON internal_data.ingestion_logs(source);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_started
  ON internal_data.ingestion_logs(started_at);

-- Data freshness metadata per source
CREATE TABLE IF NOT EXISTS internal_data.data_source_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL UNIQUE,
  last_sync_at TIMESTAMPTZ,
  record_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: block PostgREST / api_reader from reading internal tables
ALTER TABLE internal_data.raw_source_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_data.exclusion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_data.politician_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_data.ingestion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_data.data_source_status ENABLE ROW LEVEL SECURITY;
