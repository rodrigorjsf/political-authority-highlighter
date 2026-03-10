# Supabase Best Practices -- PAH Migration Reference

> Researched: 2026-03-09
> Sources: Supabase official docs, Drizzle ORM official docs
> Status: Complete

---

## 1. Free Tier Limits (as of 2026)

### Database & Compute

| Resource | Free (Nano) | Pro (Micro) |
|----------|-------------|-------------|
| Database size | 500 MB | 8 GB included, then $0.125/GB |
| Compute | Shared CPU, up to 0.5 GB RAM | 2-core ARM (shared), 1 GB RAM |
| Direct connections | 60 | 60 |
| Pooler connections (Supavisor) | 200 | 200 |
| Disk IOPS | 250 | 500 |
| Disk throughput | 43 Mbps | 87 Mbps |
| Projects | 2 free projects max | Unlimited |

### Platform Quotas

| Resource | Free | Pro |
|----------|------|-----|
| Egress (bandwidth) | 5 GB | 250 GB ($0.09/GB after) |
| Storage size | 1 GB | 100 GB ($0.021/GB after) |
| Edge Function invocations | 500,000/month | 2 million ($2/million after) |
| Edge Functions per project | 100 | 500 |
| MAU (auth) | 50,000 | 100,000 ($0.00325/MAU after) |
| Realtime connections | 200 | 500 |
| Realtime messages | 2 million | 5 million |
| File upload size | 50 MB max | 50 GB max |
| Pro plan base cost | $0 | $25/month |

### Edge Function Runtime Limits

| Limit | Free | Paid |
|-------|------|------|
| Memory | 256 MB | 256 MB |
| Wall clock duration | 150 seconds | 400 seconds |
| CPU time per request | 2 seconds | 2 seconds |
| Function bundle size | 20 MB | 20 MB |

### Is Free Tier Sufficient for PAH?

For ~594 politician records, daily data sync, and up to 50k MAU:

- **Database size**: 594 records with related tables (bills, votes, expenses, scores) could reach 100-300 MB. The 500 MB limit is tight but initially viable. **Upgrade trigger**: when data volume exceeds ~400 MB.
- **MAU**: 50k MAU is exactly the free tier limit. Any growth requires Pro.
- **Edge Functions**: 500k invocations/month should suffice for daily pipeline runs. The pipeline runs once daily with ~6 source adapters x ~594 records = ~3,564 operations per run x 30 days = ~107k/month. Well within limits.
- **Bandwidth**: 5 GB egress is the most likely bottleneck with 50k MAU. Each politician page (JSON API responses) might be 5-10 KB. If each user views 5 pages on average: 50,000 x 5 x 10 KB = 2.5 GB. Tight but possible.
- **Connections**: 60 direct + 200 pooler is sufficient for the API (Fastify) + pipeline (pg-boss).

**Recommendation**: Start on Free tier for development and early launch. Plan for Pro ($25/month) upgrade when approaching 50k MAU or 500 MB database size. The 5 GB egress limit will likely be the first constraint hit.

Sources:

- <https://supabase.com/docs/guides/platform/billing-on-supabase>
- <https://supabase.com/docs/guides/platform/compute-and-disk>
- <https://supabase.com/docs/guides/platform/database-size>
- <https://supabase.com/docs/guides/functions/limits>
- <https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations>

---

## 2. Local Development

### Prerequisites

- Docker Desktop, Rancher Desktop, Podman, or OrbStack (container runtime with Docker-compatible APIs)
- Node.js 20+ (required for `npx supabase`)

### Setup Workflow

```bash
# Install CLI as dev dependency (pnpm monorepo)
pnpm add supabase --save-dev --allow-build=supabase

# Initialize Supabase project (creates supabase/ directory)
pnpx supabase init

# Start all local services (first run downloads Docker images)
pnpx supabase start

# Local services available at:
# Studio UI:    http://localhost:54323
# API:          http://localhost:54321
# DB:           postgresql://postgres:postgres@localhost:54322/postgres
# Mailpit:      http://localhost:54324
```

### Stopping and Resetting

```bash
# Stop without losing data
pnpx supabase stop

# Stop and delete all data
pnpx supabase stop --no-backup

# Reset database to current migrations + seed
pnpx supabase db reset
```

### Seeding Data

Place seed SQL in `supabase/seed.sql`. It runs automatically after `supabase db reset`.

### Integration with pnpm Monorepo

The `supabase/` directory should live at the monorepo root. Add to root `package.json`:

```json
{
  "scripts": {
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:reset": "supabase db reset",
    "supabase:migration": "supabase migration new",
    "supabase:diff": "supabase db diff"
  }
}
```

### Security Note (WSL2)

When on an untrusted network, create a separate Docker network bound to localhost:

```bash
docker network create -o 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1' local-network
npx supabase start --network-id local-network
```

Sources:

- <https://supabase.com/docs/guides/local-development>
- <https://supabase.com/docs/guides/local-development/cli/getting-started>

---

## 3. CLI Migrations

### `supabase db push` vs `supabase migration` Workflow

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `supabase migration new <name>` | Create empty migration file | Writing manual SQL migrations |
| `supabase db diff -f <name>` | Auto-generate migration from schema changes | After making changes in local Studio |
| `supabase db reset` | Drop and recreate local DB with all migrations + seed | Testing migrations locally |
| `supabase migration up` | Apply pending migrations only (no reset) | Incremental local testing |
| `supabase db push` | Push local migrations to a linked remote project | Deploying to staging/production |
| `supabase db pull` | Pull remote schema changes into local migration files | Syncing dashboard changes |

### Key Workflow

1. Write migration SQL or use `db diff` to generate it
2. Test locally with `supabase db reset`
3. Commit migration files to git
4. Deploy with `supabase db push` (via CI/CD or manually)

### Drizzle ORM + Supabase Migrations

Drizzle has its own migration system (`drizzle-kit push` / `drizzle-kit generate`). Two approaches:

**Option A: Drizzle-only migrations (recommended for this project)**

- Define schemas in Drizzle TypeScript files
- Use `drizzle-kit generate` to create SQL migration files
- Place generated SQL in `supabase/migrations/` directory
- Deploy via `supabase db push`

**Option B: Supabase-native migrations**

- Write raw SQL in `supabase/migrations/`
- Use Drizzle only for runtime queries (not schema management)

### Two-Schema Setup (public + internal_data)

For the PAH project's dual-schema architecture:

```bash
# Pull each schema separately
supabase db pull                          # pulls public schema
supabase db pull --schema internal_data   # pulls internal_data schema

# Diff against specific schema
supabase db diff --schema public -f my_change
supabase db diff --schema internal_data -f my_internal_change
```

**Important caveat**: If `supabase/migrations/` is empty, `db pull` ignores the `--schema` parameter. Pull without `--schema` first, then pull the specific schema.

Sources:

- <https://supabase.com/docs/guides/local-development/overview>
- <https://supabase.com/docs/guides/deployment/managing-environments>
- <https://supabase.com/docs/guides/local-development/declarative-database-schemas>

---

## 4. Connection Pooling (Supavisor)

### Connection Types

| Type | Port | Use Case | Prepared Statements |
|------|------|----------|-------------------|
| Direct connection | 5432 | Migrations, pg_dump, long-lived server processes | Yes |
| Pooler - Session mode | 5432 (pooler URL) | Persistent backends needing IPv4 | Yes |
| Pooler - Transaction mode | 6543 | Serverless/edge functions, short-lived connections | **No** |

### Connection String Formats

```
# Direct (IPv6 only by default)
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Pooler - Transaction mode (IPv4 + IPv6)
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Pooler - Session mode (IPv4 + IPv6)
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### Drizzle ORM with Supavisor

**Transaction mode (serverless/edge -- must disable prepared statements):**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Transaction mode on port 6543 -- MUST set prepare: false
const client = postgres(process.env.DATABASE_URL, { prepare: false })
const db = drizzle({ client })
```

**Direct connection (persistent server like Fastify):**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Direct connection on port 5432 -- prepared statements work
const client = postgres(process.env.DATABASE_URL)
const db = drizzle({ client })
```

### PAH Project Configuration

| Component | Connection Type | Reason |
|-----------|----------------|--------|
| Fastify API server | Session mode (port 5432) or Direct | Long-lived process, benefits from prepared statements |
| Pipeline (pg-boss) | Direct connection (port 5432) | Needs LISTEN/NOTIFY (requires direct or session mode) |
| Drizzle migrations | Direct connection (port 5432) | DDL operations need direct access |

### Pool Size Guidelines

- If heavily using PostgREST (Data API): keep pool size at 40% of max connections
- If not using PostgREST: can allocate up to 80% to pool
- Nano/Micro: 200 pooler clients shared between session and transaction modes
- Total combined connections across both modes cannot exceed the pool size setting

Sources:

- <https://supabase.com/docs/guides/database/connecting-to-postgres>
- <https://supabase.com/docs/guides/database/connection-management>
- <https://orm.drizzle.team/docs/connect-supabase>
- <https://supabase.com/docs/guides/database/drizzle>

---

## 5. Row Level Security (RLS)

### Best Practices for Public-Read-Only Data

For PAH's public politician data (read-only via API):

```sql
-- Enable RLS on all public tables
ALTER TABLE public.politicians ENABLE ROW LEVEL SECURITY;

-- Allow public read access (no auth required)
CREATE POLICY "Public read access"
  ON public.politicians
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies = no write access via API
```

**This is an intentional `USING (true)` pattern** -- appropriate for genuinely public data like politician records. The Supabase linter (lint 0024) may flag this as a warning, but it is correct for public transparency data.

### Combining Schema RBAC with RLS

The PAH project uses database-level role isolation (ADR-001):

```sql
-- api_reader role: can only SELECT from public schema
-- pipeline_admin role: can INSERT/UPDATE on both schemas

-- RLS adds defense-in-depth ON TOP of role-based access:
-- Even if someone bypasses the application layer,
-- RLS policies enforce access rules at the database level.
```

For `internal_data` schema:

- The `api_reader` role has ZERO permissions on `internal_data` (enforced via REVOKE)
- RLS on `internal_data` tables provides additional protection
- Only `pipeline_admin` can access internal tables

### RLS Performance Impact

Key findings from Supabase's benchmark tests:

1. **Add indexes** on columns used in RLS policies (up to 99.94% improvement)
2. **Wrap functions in `(select ...)`** to enable PostgreSQL optimizer caching:

   ```sql
   -- Slow: function called per row
   USING (auth.uid() = user_id)
   -- Fast: function result cached per statement
   USING ((select auth.uid()) = user_id)
   ```

3. **Always add filters** to queries, even when RLS provides them implicitly
4. **Specify roles with `TO`** to skip policy evaluation for irrelevant roles
5. **For PAH**: Since policies are simple `USING (true)` for public read, performance impact is negligible

Sources:

- <https://supabase.com/docs/guides/database/postgres/row-level-security>

---

## 6. Supabase + GitHub Actions

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token for CLI authentication |
| `SUPABASE_DB_PASSWORD` | Project-specific database password |
| `SUPABASE_PROJECT_ID` | Project reference string (from dashboard URL) |

### CI Workflow (Pull Requests)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase local development setup
        run: supabase db start

      - name: Verify generated types are checked in
        run: |
          supabase gen types typescript --local > types.gen.ts
          if ! git diff --ignore-space-at-eol --exit-code --quiet types.gen.ts; then
            echo "Detected uncommitted changes after build."
            git diff
            exit 1
          fi
```

### Deploy Workflow (Push to main)

```yaml
# .github/workflows/deploy.yml
name: Deploy Migrations to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.PRODUCTION_DB_PASSWORD }}
      SUPABASE_PROJECT_ID: ${{ secrets.PRODUCTION_PROJECT_ID }}

    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - run: supabase link --project-ref $SUPABASE_PROJECT_ID
      - run: supabase db push
```

### Setup-CLI Action

The `supabase/setup-cli@v1` action:

- Works on ubuntu-latest, windows-latest, macos-latest
- Installs and exposes a specified version of the Supabase CLI
- Use `version: latest` or pin to a specific version

Sources:

- <https://supabase.com/docs/guides/deployment/managing-environments>
- <https://github.com/supabase/setup-cli>

---

## 7. Cost Optimization

### Free vs Pro Feature Comparison

| Feature | Free | Pro ($25/month) |
|---------|------|-----------------|
| Database size | 500 MB | 8 GB (auto-scales) |
| Daily backups | Yes (limited) | 7-day retention |
| PITR | Not available | Add-on (requires Small compute) |
| Egress | 5 GB | 250 GB |
| Edge Functions | 500k invocations | 2M invocations |
| MAU | 50,000 | 100,000 |
| Support | Community | Email |
| Custom domains | No | Yes |
| Compute credits | None | $10/month included |

### Upgrade Triggers for PAH

1. **Database exceeds 400 MB** (500 MB limit = read-only mode)
2. **MAU approaching 50,000** (hard limit on Free)
3. **Egress exceeds 4 GB/month** (5 GB limit)
4. **Need for daily backups with retention** (Free has limited backup)
5. **Need for PITR** (only on Pro+ with Small compute add-on)
6. **Need for more than 100 Edge Functions**

### Backup Strategy on Free Tier

Since Free tier has limited automatic backups:

```bash
# Manual backup via CLI (recommended to run regularly)
supabase db dump --linked > backup_$(date +%Y%m%d).sql

# Data-only dump
supabase db dump --linked --data-only > data_$(date +%Y%m%d).sql
```

**Recommendation**: Set up a GitHub Actions cron job to dump and store backups:

```yaml
name: Database Backup
on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM UTC

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
          supabase db dump --linked > backup.sql
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.PRODUCTION_DB_PASSWORD }}
      - uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ github.run_id }}
          path: backup.sql
          retention-days: 30
```

### PITR on Pro

- Requires Pro plan + Small compute add-on (~$15/month extra)
- Replaces daily backups (finer granularity)
- 2-minute RPO (Recovery Point Objective)
- WAL files archived every 2 minutes or when size threshold exceeded
- Total Pro + Small compute = ~$40/month minimum for PITR

Sources:

- <https://supabase.com/docs/guides/platform/backups>
- <https://supabase.com/docs/guides/platform/billing-on-supabase>
- <https://supabase.com/docs/guides/platform/compute-and-disk>
