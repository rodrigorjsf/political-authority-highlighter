# Infrastructure — Political Authority Highlighter

Stack: Supabase BaaS | Vercel | Cloudflare | GitHub Actions

## Secret Management

| Secret                  | Where Stored       | Used By         |
| ----------------------- | ------------------ | --------------- |
| `SUPABASE_ACCESS_TOKEN` | GitHub Secrets     | CI/CD (DB Push) |
| `SUPABASE_DB_PASSWORD`  | GitHub Secrets     | CI/CD (DB Push) |
| `SUPABASE_PROJECT_ID`   | GitHub Secrets     | CI/CD (DB Push) |
| `DATABASE_URL`          | Supabase Dashboard | API / Pipeline  |
| `CPF_ENCRYPTION_KEY`    | Supabase Dashboard | Pipeline        |
| `EMAIL_ENCRYPTION_KEY`  | Supabase Dashboard | API + Pipeline  |
| `RESEND_API_KEY`        | Supabase Dashboard | API             |
| `ALERTS_FROM_EMAIL`     | Supabase Dashboard | API             |
| `VERCEL_TOKEN`          | GitHub Secrets     | CI/CD           |

## Migration Sync (Drizzle → Supabase)

Drizzle generates to `packages/db/migrations/`. Supabase CLI reads from `supabase/migrations/`. These must stay in sync:

1. `pnpm --filter @pah/db exec drizzle-kit generate` → writes to `packages/db/migrations/`
2. Copy new files to `supabase/migrations/` (including `internal/` subdirectory)
3. `supabase db reset` → applies locally (migrations + `roles.sql` + seed)
4. `supabase db push` → applies to remote (CI/CD)

## Non-Obvious Patterns

- Local Supabase DB port is **54322** (not 5432) — configured in `supabase/config.toml`
- `supabase/roles.sql` creates `api_reader` and `pipeline_admin` roles on every `db reset`
- `docker-compose.yml` is legacy — use `supabase start` for local dev
- Vercel auto-deploys frontend on push to `main`; DB migrations run via GitHub Actions `supabase db push`
