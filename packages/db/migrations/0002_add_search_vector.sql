-- 0002_add_search_vector.sql — RF-015: tsvector FTS column for politician name search

-- unaccent strips diacritics: 'José' → 'Jose', 'João' → 'Joao'
-- Pre-installed in PostgreSQL 16; IF NOT EXISTS makes it idempotent
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create immutable wrapper for unaccent to use in GENERATED ... STORED columns
-- (PostgreSQL requires immutability for STORED generated columns)
CREATE OR REPLACE FUNCTION public_data.unaccent_immutable(text) RETURNS text AS $$
  SELECT unaccent($1);
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE public_data.politicians
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('simple', public_data.unaccent_immutable(coalesce(name, '')))
    ) STORED;

-- GIN index for sub-100ms full-text search on 594 rows
CREATE INDEX IF NOT EXISTS idx_politicians_search
  ON public_data.politicians USING GIN (search_vector);
