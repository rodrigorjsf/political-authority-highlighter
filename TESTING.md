# Testing Guide

This guide documents how to run all test types for Political Authority Highlighter — unit tests, integration tests, and full-stack E2E tests.

---

## Prerequisites

- **Node.js 22+** — `node --version`
- **pnpm 9+** — `pnpm --version`
- **Supabase CLI** — included as a devDependency (`supabase` binary available after `pnpm install`)
- **Docker** — required for `supabase start` (Supabase runs via Docker)
- **`.env.local` file** — copy from `.env.example` and fill in the values below

---

## Service Ports

| Service           | Port  | URL                                                          |
| ----------------- | ----- | ------------------------------------------------------------ |
| Supabase DB       | 54322 | `postgresql://postgres:postgres@127.0.0.1:54322/postgres`    |
| Supabase Studio   | 54323 | `http://localhost:54323`                                     |
| Supabase API      | 54321 | `http://localhost:54321` (PostgREST — internal use only)     |
| Fastify API       | 3001  | `http://localhost:3001`                                      |
| Next.js Web       | 3000  | `http://localhost:3000`                                      |

---

## Environment Variables

Create `.env.local` at the project root. Copy `.env.example` as a starting point, then set these values for local development:

| Variable                | Required By        | Local Dev Value                                                          |
| ----------------------- | ------------------ | ------------------------------------------------------------------------ |
| `DATABASE_URL`          | pipeline           | `postgresql://postgres:postgres@127.0.0.1:54322/postgres`                |
| `DATABASE_URL_READER`   | api                | `postgresql://postgres:postgres@127.0.0.1:54322/postgres`                |
| `DATABASE_URL_WRITER`   | pipeline           | `postgresql://postgres:postgres@127.0.0.1:54322/postgres`                |
| `RESEND_API_KEY`        | api, pipeline      | `re_test_dummy` — emails won't actually send in dev                      |
| `EMAIL_ENCRYPTION_KEY`  | api, pipeline      | `0000000000000000000000000000000000000000000000000000000000000000` (64 hex zeros) |
| `ALERTS_FROM_EMAIL`     | api                | `test@example.com`                                                       |
| `API_BASE_URL`          | api                | `http://localhost:3001`                                                   |
| `VERCEL_REVALIDATE_TOKEN` | api, pipeline    | any string (e.g., `local-dev-token`)                                     |
| `NEXT_PUBLIC_API_URL`   | web                | `http://localhost:3001/api/v1`                                           |
| `CPF_ENCRYPTION_KEY`    | pipeline           | any 32-byte hex string for local dev (e.g., 64 hex zeros)               |

> **Security note**: The dummy values above are safe for local development only. Never use them in production or commit real secrets to version control.

---

## Local Development Stack (3-Terminal Workflow)

Start each service in a separate terminal in this order:

### Terminal 1 — Database

```bash
pnpm dev:db
```

Runs `supabase start`. The first run pulls Docker images (~2–5 min). Subsequent runs are fast (~15 sec). Wait until all services show `Started` in the output.

After startup, confirm the DB is ready:

```bash
supabase status
```

### Terminal 2 — API

```bash
pnpm dev:api
```

Runs the Fastify server on port 3001 via `tsx watch`. Requires `.env.local` to be set. If the API fails to start, check that all required env vars are set (see table above).

Verify the API is ready:

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

### Terminal 3 — Web

```bash
pnpm dev:web
```

Runs Next.js on port 3000 in development mode. Requires `NEXT_PUBLIC_API_URL` to be set.

Open `http://localhost:3000` — you should see the home page with seeded politicians.

---

## Running Tests

### Unit Tests (all packages)

```bash
pnpm test
```

Runs all unit tests via Turborepo. No services need to be running.

### Integration Tests (API — isolated, no DB required)

```bash
pnpm --filter @pah/api test:integration
```

Integration tests use Testcontainers (PostgreSQL) — they spin up their own DB containers and do not require Supabase to be running.

### E2E Tests (requires full stack)

Start all 3 services (Terminals 1–3 above), then:

```bash
pnpm --filter @pah/web test:e2e
```

Playwright reuses the running dev server (`reuseExistingServer: true` in `playwright.config.ts`). Tests run against the real seeded database.

To run a specific test:

```bash
pnpm --filter @pah/web test:e2e -- --grep 'perfil'
```

To run with visible browser:

```bash
pnpm --filter @pah/web test:e2e -- --headed
```

---

## Database Operations

### Reset and Reseed

To re-run all migrations and restore the 25 seed politicians:

```bash
supabase db reset
```

> This drops and recreates all tables, applies migrations, and runs `supabase/seed.sql`.

### Seed Data

The seed includes 25 politicians (15 deputados + 10 senadores) from various parties and states with integrity scores. The first politician is `Ana Lima` (SP) with slug `ana-lima-sp` and score 92/100.

Access Supabase Studio to inspect the data: `http://localhost:54323`

---

## Verifying the Full Stack

After starting all 3 services:

```bash
# 1. API health
curl http://localhost:3001/health
# Expected: {"status":"ok"}

# 2. Listing endpoint
curl 'http://localhost:3001/api/v1/politicians?limit=5' | jq '.data | length'
# Expected: 5

# 3. Profile endpoint
curl http://localhost:3001/api/v1/politicians/ana-lima-sp | jq '.slug'
# Expected: "ana-lima-sp"
```

Open `http://localhost:3000/politicos` — should show 25 seeded politicians.

Open `http://localhost:3000/politicos/ana-lima-sp` — should show Ana Lima's profile.

---

## Environment Parity Notes

| Aspect                 | Local Dev                              | Production / Supabase Remote             |
| ---------------------- | -------------------------------------- | ---------------------------------------- |
| DB port                | 54322 (Supabase CLI local)             | 6543 (Supavisor pooler)                  |
| Postgres config        | `prepare: true` (direct connections)   | `prepare: false` (pooler)                |
| `DATABASE_URL_READER`  | `postgres:postgres@127.0.0.1:54322`    | pooler URL from Supabase Dashboard       |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:3001/api/v1`         | `https://api.autoridade-politica.com.br` |
| Email sending          | Disabled (`re_test_dummy` key)         | Real Resend API key                      |
| ISR revalidation       | Any token string                       | Secret token in Vercel env               |

---

## Visual Regression Tests

Baselines are stored in `apps/web/e2e/__snapshots__/` and committed to the repository.

**Coverage**: 30 screenshots — 5 pages × 3 viewports × 2 themes

| Pages | Viewports | Themes |
|-------|-----------|--------|
| `/`, `/politicos`, `/metodologia`, `/fontes`, `/politicos/ana-lima-sp` | 375×667, 768×1024, 1920×1080 | `light`, `dark` |

**Tolerance**: 2% pixel ratio (`maxDiffPixelRatio: 0.02`) — handles sub-pixel anti-aliasing differences.

**Snapshot naming**: `{page}-{viewport}-{theme}-chromium-{os}.png`
Example: `home-mobile-dark-chromium-linux.png`
Stored in subdirectory: `apps/web/e2e/__snapshots__/visual-regression.spec.ts-snapshots/`

### Prerequisites

Visual regression tests intercept all API calls with deterministic mock data (see `apps/web/e2e/visual-regression.spec.ts`). No database, Supabase, or API server is needed.

Playwright auto-starts the Next.js dev server if one is not already running. If port 3000 is occupied by another process, run with an explicit port:

```bash
WEB_PORT=3001 pnpm --filter @pah/web test:e2e -- visual-regression --update-snapshots
```

System requirement: Playwright Chromium browser dependencies must be installed:

```bash
npx playwright install-deps chromium  # requires sudo on Linux
```

### Generate new baselines

Run this when creating baselines for the first time, or after intentional design changes:

```bash
pnpm --filter @pah/web test:e2e -- --update-snapshots
```

Commit the updated snapshot files alongside the design change. Include a note in the PR
description explaining what changed visually and why.

### Verify no regressions

Run this to confirm no pages have changed since the last baseline:

```bash
pnpm --filter @pah/web test:e2e -- visual-regression
```

All 30 tests must pass (exit 0). If a test fails, Playwright generates a diff image in
`apps/web/playwright-report/`. Run `npx playwright show-report` to view the visual diff.

### When to update snapshots

- After intentional design changes (token updates, component redesigns)
- After changes to `tokens.css`, `globals.css`, or any component in `apps/web/src/components/`
- When adding a new page to the visual regression suite
- **Never** update snapshots to suppress a legitimate regression — investigate first

### OS compatibility note

Baselines are pixel-exact and OS-specific. If baselines were generated on macOS and CI runs
on Linux (or vice versa), font rendering differences may cause failures. In that case,
regenerate baselines on Linux to match CI, or rely on the 2% tolerance.

---

## CI Environment

The CI pipeline (`ci.yml`) runs unit tests, lint, and typecheck on every push. Full E2E tests in CI will be added in Phase 10.

For local CI simulation using Docker (see `docker-compose.test.yml`):

```bash
# Prerequisites: supabase start (DB must be running on host port 54322)
# Set required env vars in .env.local or pass inline

docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

> Note: Phase 10 will integrate `docker-compose.test.yml` into the GitHub Actions workflow.
