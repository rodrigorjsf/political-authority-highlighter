---
name: project-architecture
description: Architecture enforcement during development. Use when creating files, database queries, adding dependencies, or modifying infrastructure.
---

# Project Architecture Enforcement

## Purpose

Enforces the architectural decisions documented in ARCHITECTURE.md and the 7 ADRs for **Political Authority Highlighter**.

## Core Architecture Rules

### 1. Two-Schema Database Separation (ADR-001)

```
PostgreSQL 16
├── public_data schema (10 tables) — API reads from here
│   ├── politicians, integrity_scores, bills, votes, expenses...
│   └── data_source_status
└── internal_data schema (5 tables) — Pipeline writes here
    ├── politician_identifiers (CPF encrypted)
    ├── exclusion_records (corruption indicators)
    ├── ingestion_logs, raw_source_data, cpf_match_audit
    └── NEVER accessible by api_reader role
```

**Enforcement:**
- [ ] Files in `apps/api/` NEVER import from `internal-schema.ts`
- [ ] API routes NEVER reference `internal_data` tables
- [ ] Database client in API uses `api_reader` role (SELECT only on `public_data`)
- [ ] Database client in pipeline uses `pipeline_admin` role (ALL on both schemas)
- [ ] The ONLY data crossing schemas is `exclusion_flag` boolean on `politicians` table

### 2. TypeScript Strict Mode

All `tsconfig.json` files must include:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Best Practices (CLAUDE.md):**
- [ ] Interfaces over types for object shapes
- [ ] Use Enums for constant values (e.g., `PoliticalRole`, `DataSource`)
- [ ] Export all types by default
- [ ] Use type guards instead of type assertions (`as`)
- [ ] Destructure objects (e.g., `const { name } = user`)
- [ ] Use `ms` package for time-related configuration

**Forbidden patterns:**
- `any` type (use `unknown` + type guards)
- `as` type assertions (except `as const` and test factories)
- `@ts-ignore` or `@ts-expect-error` without issue link

### 3. Drizzle ORM Usage

- All schema definitions in `packages/db/src/`
- Two separate schema files: `public-schema.ts` and `internal-schema.ts`
- Two client constructors: `createPublicDb()` and `createPipelineDb()`
- Repository pattern: one repository file per entity
- No inline Drizzle queries in route handlers
- Use keyset (cursor) pagination, NEVER OFFSET

### 4. Job Scheduling: pg-boss Only (ADR-003)

- **NO Redis** — pg-boss uses PostgreSQL as its backend
- **NO cron jobs** — all scheduling via pg-boss
- **NO setTimeout/setInterval** — use pg-boss for delays and retries
- Job definitions in `apps/pipeline/src/scheduler.ts`
- Each data source has its own named job
- Retry policy: 3 attempts with exponential backoff

### 5. Frontend: Next.js 15 ISR on Vercel (ADR-002)

- App Router (not Pages Router)
- Server Components by default; `'use client'` only when necessary
- ISR for politician profile pages (revalidate on-demand after pipeline publishes)
- Static generation for methodology page
- No client-side state management library (use URL search params + Server Components)
- Tailwind CSS + shadcn/ui for UI components

### 6. Docker Compose on Hetzner (ADR-006)

- Backend API + PostgreSQL in Docker Compose on Hetzner CX22
- Frontend on Vercel Free tier (separate deployment)
- No Kubernetes, no managed databases (budget constraint)
- Caddy reverse proxy for HTTPS with automatic Let's Encrypt

### 7. Monorepo Structure

```
political-authority-highlighter/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   ├── api/          # Fastify 5 backend
│   └── pipeline/     # Data ingestion pipeline
├── packages/
│   ├── db/           # Drizzle schema + clients
│   ├── shared/       # Shared types, utils, constants
│   └── scoring/      # Score calculation logic
├── infrastructure/   # Docker Compose, Caddy config
├── docs/prd/         # PRD, Architecture, ER
└── .claude/skills/   # Enforcement skills
```

## Adding New Dependencies

1. Check if Node.js built-in modules can do it first
2. Verify package is actively maintained (< 6 months since last release)
3. Run `npm audit` for vulnerabilities
4. Add to the specific app/package `package.json`, never root
5. Document rationale in PR description

## Cost Ceiling Verification

Before any infrastructure change:

| Component | Current Cost | Budget |
|-----------|-------------|--------|
| Hetzner CX22 VPS | ~$6/month | — |
| Vercel Free | $0 | — |
| Domain + DNS | ~$1/month | — |
| **Total** | **~$7/month** | **< $100/month** |

Any change that pushes total above $100/month requires explicit approval.

## Changelog

| Date | PRD Version | Summary |
|------|-------------|---------|
| 2026-02-28 | 1.0 | Initial architecture enforcement skill |
