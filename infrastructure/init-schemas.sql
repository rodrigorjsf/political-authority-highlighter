-- Create schemas
CREATE SCHEMA IF NOT EXISTS public_data;
CREATE SCHEMA IF NOT EXISTS internal_data;

-- Create roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'api_reader') THEN
    CREATE ROLE api_reader;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pipeline_admin') THEN
    CREATE ROLE pipeline_admin;
  END IF;
END $$;

-- api_reader: SELECT only on public_data, ZERO access to internal_data
GRANT USAGE ON SCHEMA public_data TO api_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public_data TO api_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public_data GRANT SELECT ON TABLES TO api_reader;
-- Explicitly: no GRANT on internal_data (omission is the security boundary)

-- pipeline_admin: full access to both schemas
GRANT ALL ON SCHEMA public_data TO pipeline_admin;
GRANT ALL ON SCHEMA internal_data TO pipeline_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public_data TO pipeline_admin;
GRANT ALL ON ALL TABLES IN SCHEMA internal_data TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public_data GRANT ALL ON TABLES TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA internal_data GRANT ALL ON TABLES TO pipeline_admin;

-- Create application users (passwords from env in production)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'api_reader_user') THEN
    CREATE USER api_reader_user WITH PASSWORD 'reader_password_change_in_prod';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pipeline_admin_user') THEN
    CREATE USER pipeline_admin_user WITH PASSWORD 'admin_password_change_in_prod';
  END IF;
END $$;
GRANT api_reader TO api_reader_user;
GRANT pipeline_admin TO pipeline_admin_user;
