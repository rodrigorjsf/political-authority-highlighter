# Supabase Configuration

This directory contains the Supabase CLI configuration for local development and remote deployment.

## Migration Flow (Drizzle → Supabase)

1. **Generate**: `pnpm --filter @pah/db drizzle-kit generate` — writes SQL to `packages/db/migrations/`.
2. **Sync**: Copy new migration files from `packages/db/migrations/` to `supabase/migrations/` (including `internal/` if any).
3. **Local**: `supabase start` (first time) or `supabase db reset` — applies migrations in `supabase/migrations/`, then `roles.sql`, then `seed.sql`. DB runs on port **54322**.
4. **Remote**: `supabase link --project-ref <id>` then `supabase db push` (no `--local`) — applies migrations to the linked project. Used in CI via `deploy.yml`.

## Project Structure

- `config.toml` — CLI config (db port 54322, major_version, seed path).
- `roles.sql` — Custom roles `api_reader` and `pipeline_admin`, schema `internal_data`, extensions. Run on `supabase start` and `supabase db reset`.
- `migrations/` — SQL migrations (same set as `packages/db/migrations/`; keep in sync after generating).
- `seed.sql` — Dev seed data (run after migrations on `supabase db reset`).

## Local Connection

After `supabase start`:

- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Studio**: <http://127.0.0.1:54323> (if enabled in config)

Set `DATABASE_URL`, `DATABASE_URL_READER`, and `DATABASE_URL_WRITER` in `.env.local` to the URL above for local dev.
