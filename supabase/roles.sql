-- Custom roles and grants for Supabase local (and optional remote via db push --include-roles)
-- Mirrors infrastructure/init-schemas.sql for api_reader and pipeline_admin.

-- Enable extensions (required for unaccent and pgcrypto)
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas (public exists by default; we add internal_data for sensitive data)
CREATE SCHEMA IF NOT EXISTS internal_data;

-- Create unaccent_immutable wrapper for use in generated columns
CREATE OR REPLACE FUNCTION public.unaccent_immutable(text) RETURNS text AS $$
  SELECT unaccent($1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Create roles (dev passwords; use Supabase Dashboard / Vault in production)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_reader') THEN
    CREATE ROLE api_reader WITH LOGIN PASSWORD 'reader_password_dev';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pipeline_admin') THEN
    CREATE ROLE pipeline_admin WITH LOGIN PASSWORD 'admin_password_dev';
  END IF;
END
$$;

-- api_reader: SELECT only on public, NOTHING on internal_data
GRANT USAGE ON SCHEMA public TO api_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO api_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO api_reader;
REVOKE ALL ON SCHEMA internal_data FROM api_reader;

-- pipeline_admin: ALL on both schemas
GRANT USAGE, CREATE ON SCHEMA public TO pipeline_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pipeline_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pipeline_admin;

GRANT USAGE, CREATE ON SCHEMA internal_data TO pipeline_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA internal_data TO pipeline_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA internal_data TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA internal_data GRANT ALL ON TABLES TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA internal_data GRANT ALL ON SEQUENCES TO pipeline_admin;
