# Infrastructure & DevOps

Managed infrastructure for the Political Authority Highlighter via **Supabase**, **Vercel**, and **Cloudflare**.

## Architecture

- **Database** — Supabase managed PostgreSQL 16 (Free tier; upgrade to Pro when needed).
- **Frontend** — Vercel Free.
- **CDN/DNS** — Cloudflare Free.

## Tech Stack

- **Database:** PostgreSQL 16 (Supabase, dual-schema `public` + `internal_data`).
- **TLS:** Supabase managed (API) + Vercel managed (frontend).
- **CI/CD:** GitHub Actions + Supabase CLI.

## Principles

- **12-Factor** — Config in environment variables.
- **Managed First** — Supabase handles backups, patches, and pooling.
- **Least Privilege** — `api_reader` vs `pipeline_admin` roles.
- **Disposable** — Full local stack reproducible via `supabase start`.

## Structure

```
├── init-schemas.sql       # Schema & role init (local dev)
└── seed.sql               # Seed data for local development
```

## Workflows

- **Local dev:** `supabase start` (requires Supabase CLI + Docker).
- **Deploy migrations:** `supabase db push` (via GitHub Actions `deploy.yml`).
- **Reset local DB:** `supabase db reset`.

## Cost

Optimized for **~$1.50/month** (launch):

- Supabase Free: $0/mo.
- Domain: ~$1.50/mo.
- Vercel/Cloudflare: Free.

Upgrade to Supabase Pro ($25/mo) when database exceeds 500 MB, MAU exceeds 50k, or PITR is needed.
