# Copilot Code Review Instructions — Political Authority Highlighter

Brazilian political transparency platform. Stack: TypeScript 5.4+ | Next.js 15 | Fastify 5 | Supabase (PostgreSQL 16) | Drizzle ORM | pg-boss 10. Monorepo: `apps/web`, `apps/api`, `apps/pipeline`, `packages/shared`, `packages/db`.

## Domain Rules — REJECT violations immediately

DR-001 Silent Exclusion: NEVER expose why a politician's anticorruption score is 0. No exclusion record details (source, date, reason) in API responses, UI, or logs. Only the boolean `exclusion_flag` crosses from `internal_data` to `public` schema. Politicians with exclusions remain visible — they are NOT filtered out. Frontend shows only: "Information from anti-corruption databases affected this score."

DR-002 Political Neutrality: No party colors anywhere in the UI — use neutral gray/blue palette only. Score weights are uniform (0.25 each for all 4 dimensions). No qualitative labels: never "good/bad/best/worst/corrupt/clean." Display scores as numbers only (e.g., "72/100"). No party-specific scoring logic. No editorial language in vote/bill descriptions. Default sort is by highest score only — never by lowest.

DR-003 Public Data Only: All data from government APIs (Camara, Senado, Portal da Transparencia, TSE, TCU, CGU) under LAI. No scraping, no user-generated content, no news/social media sources.

DR-005 CPF Never Exposed: CPF exists only in `internal_data.politician_identifiers`, encrypted with AES-256-GCM, hashed with SHA-256 for lookups. No CPF in any API response, frontend code, URL parameter, log message, or error message. Reject any code matching `/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/` or referencing `politician_identifiers` outside pipeline code.

DR-006 No Retaliation: No "worst politicians" lists, no ascending score sort, no comparison features, no negative ranking. Platform highlights integrity — it does not expose corruption.

DR-007 Ingestion Idempotency: All database writes use `ON CONFLICT DO UPDATE` (upsert) with natural keys (`source + external_id`). Running ingestion twice produces the same state.

DR-008 Frontend Security: No `@pah/db`, `pg`, `drizzle-orm`, or `pg-boss` imports in `apps/web/`. No `NEXT_PUBLIC_` env vars except `NEXT_PUBLIC_API_URL`. No `dangerouslySetInnerHTML` except JSON-LD `<script>` tags with `JSON.stringify()`. Error boundaries show generic messages only — no stack traces, table names, or internal URLs. All `packages/db/src/` files must import `'server-only'`.

## Architecture Boundaries — REJECT cross-boundary imports

| Source | May Import | Must NOT Import |
|--------|-----------|-----------------|
| `apps/web/` | `packages/shared/` | `packages/db/`, `apps/api/`, `apps/pipeline/` |
| `apps/api/` | `packages/shared/`, `packages/db/public-schema.ts` | `packages/db/internal-schema.ts`, `apps/pipeline/` |
| `apps/pipeline/` | `packages/shared/`, `packages/db/*` | `apps/web/`, `apps/api/` |
| `packages/shared/` | Nothing (zero deps) | Everything |

Database: `public` schema = API reads (SELECT via `api_reader` role). `internal_data` schema = pipeline writes (`pipeline_admin` role). Only `exclusion_flag` boolean crosses schemas. Drizzle code uses `pgSchema('public')` — never hardcode schema names.

## TypeScript & Security

Ban `any` type — use `unknown` with type guards. Ban `as` assertions — except `as const` and `as unknown as T` in test factories. All public functions need explicit return types. Use `interface` for object shapes, `type` for unions/intersections. Use `as const` + type alias for constants (not TypeScript `enum` keyword). Enforce `exactOptionalPropertyTypes`: build optional objects conditionally, never pass `undefined`.

Secrets (`DATABASE_URL`, `CPF_ENCRYPTION_KEY`, API keys) must never appear in logs, error messages, or client bundles. Validate all env vars at startup with Zod. Never commit `.env` files.

## Code Style

No semicolons, single quotes, 2-space indent (Prettier enforced). Import order: external, internal, types. Use object destructuring. Use `ms` package for time durations.

## Frontend (Next.js 15 App Router)

Server Components by default — `'use client'` only for interactivity (state, events, browser APIs). `searchParams` is a Promise in Next.js 15. ISR for politician pages. URL search params as single source of truth — no client state libraries. All images use `next/image`. Touch targets minimum 44x44px. ARIA labels on all interactive elements. Color contrast 4.5:1 minimum. `<html lang="pt-BR">`. Design tokens from `docs/prd/frontend_design_prd.md`. CSP headers in `next.config.ts`.

## Backend (Fastify 5 + Drizzle)

All routes define TypeBox request/response schemas. API is read-only (`api_reader` role). Cursor-based pagination only — never OFFSET. Set Cache-Control headers on every response. Errors use RFC 7807 format. Rate limit: 60 req/min per IP. Repository pattern for all DB access — no inline Drizzle queries in route handlers. Functions max 30 lines. Files max 300 lines.

## Pipeline (Data Ingestion)

Adapters follow `*.adapter.ts` naming. CPF crypto in `src/crypto/cpf.ts` only. All writes use idempotent upserts. Jobs use pg-boss with retry + exponential backoff. Raw responses stored in `internal_data.raw_source_data`. Failed jobs roll back — no partial state.

## Commits & PRs

Conventional commits: `<type>(<scope>): <description>`. Types: feat, fix, refactor, docs, test, chore, perf, ci. Scopes: api, web, pipeline, db, shared, infra. Branch naming: `feat/PAH-<N>-<desc>`, `fix/PAH-<N>-<desc>`.

Pre-merge gates: `pnpm lint` + `pnpm typecheck` + `pnpm build` + `vercel build` + `pnpm test` must all pass.
