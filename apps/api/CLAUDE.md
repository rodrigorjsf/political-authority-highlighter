# Backend Development Guide -- Political Authority Highlighter

Stack: Fastify 5.x | TypeBox | Drizzle ORM 0.36+ | Supabase (PostgreSQL 16) | pg-boss 10

## Core Principles

1. **Dependency Inversion**: Services depend on repository interfaces, not Drizzle directly. Routes depend on services. Enables unit testing with in-memory stubs.

2. **Repository Pattern (DDD)**: All DB access through repository functions. No inline Drizzle queries in routes or services. Only repositories import from `packages/db/`.

3. **Idempotent Upserts**: Every pipeline write uses `ON CONFLICT DO UPDATE` via `onConflictDoUpdate()`. Same ingestion twice = same result.

4. **Schema-Enforced Isolation**: API connects with `api_reader` (SELECT on `public` only). Pipeline connects with `pipeline_admin` (ALL on both schemas). Database-enforced, not convention.

5. **Single Responsibility**: One resource per route file, one use case per service method, one source per adapter. Functions ≤ 30 lines, files ≤ 300 lines.

## Architecture Boundaries

**API IS responsible for**: Pre-computed politician data from `public` schema, TypeBox request validation, `fast-json-stringify` serialization, rate limiting/CORS/security headers, Cache-Control for Cloudflare CDN, health check.

**API NOT responsible for**: Data ingestion, score calculation, writing to DB (`api_reader` SELECT-only), user auth, accessing `internal_data`.

**Pipeline IS responsible for**: Fetching from 6 government sources, transforming/normalizing data, CPF hash-based cross-source matching, score calculation (4 dimensions), publishing to `public` schema, triggering Vercel ISR revalidation, CPF encryption.

**Pipeline NOT responsible for**: Serving HTTP requests, frontend rendering, user-facing error messages.

## File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Route | `<resource>.route.ts` | `politicians.route.ts` |
| Service | `<resource>.service.ts` | `politician.service.ts` |
| Repository | `<resource>.repository.ts` | `politician.repository.ts` |
| Schema (TypeBox) | `<resource>.schema.ts` | `politician.schema.ts` |
| Adapter | `<source>.adapter.ts` | `camara.adapter.ts` |
| Transformer | `<entity>.transformer.ts` | `expense.transformer.ts` |
| Scorer | `<component>.ts` in `scoring/components/` | `transparency.ts` |
| Unit test | `<module>.test.ts` co-located | `politician.service.test.ts` |
| Integration test | `<module>.integration.test.ts` | `politicians.route.integration.test.ts` |

## Naming Conventions

- Route handlers: `listPoliticians`, `getPoliticianBySlug` (verb + resource)
- Service methods: `findPoliticiansByFilters`, `calculateIntegrityScore` (verb + domain concept)
- Repository methods: `selectPoliticianBySlug`, `upsertPolitician` (query-descriptive)
- Adapter methods: `fetchDeputados`, `fetchSenadores` (source-specific fetch)
- Transformer functions: `toPolitician`, `toExpense` (to + target type)
- DB row types: append `Row` — `PoliticianRow`
- Insert types: append `Insert`/`Upsert` — `PoliticianInsert`
- Job payload types: append `Payload` — `CamaraSyncPayload`

## API Conventions

**URL structure**: `GET /api/v1/politicians`, `GET /api/v1/politicians/:slug`, `GET /api/v1/politicians/:slug/bills|votes|expenses|assets|candidacies`, `GET /api/v1/scores/ranking`, `GET /api/v1/sources/status`, `GET /api/v1/methodology`, `GET /health`

**Pagination**: Cursor-based (keyset) only — never OFFSET. Response: `{ data: [...], cursor: string | null }`.

**Cursor codec**: `encodeCursor`/`decodeCursor` is duplicated across 7 API services — do not add an 8th copy. RF-019 Phase 1 will consolidate.

**Cache-Control** (Cloudflare): Politicians + ranking: `public, max-age=300, s-maxage=3600`. Sources status: `max-age=60, s-maxage=300`. Methodology: `max-age=86400, s-maxage=604800`. Health: `no-store`.

**Error format**: RFC 7807 Problem Details. Every route must declare `response` schemas in TypeBox — Fastify uses them for `fast-json-stringify` serialization (strips undeclared fields).

**All route handlers must be `async function`** (Fastify 5 plugin requirement) — add `// eslint-disable-next-line @typescript-eslint/require-await` only when no await inside.

## Drizzle Patterns

- Schema: `pgSchema('public')` not `pgSchema('public_data')` — migrations use `public.` prefix
- GIN index syntax: `index('name').using('gin', column)` (NOT `.on(column).using('gin')`)
- `noUncheckedIndexedAccess`: `rows[0]` is `T | undefined` — always null-check
- `exactOptionalPropertyTypes`: build cursor objects conditionally: `cursor !== undefined ? { cursor } : {}`
- Zod cursor guards in all services: parse cursor with schema before use

## pg-boss Patterns (Pipeline)

- `createQueue`: options object requires `name` field even though first param is queue name
- `schedule` third param must be `{}` not `null`
- Worker entry: `apps/pipeline/src/worker.ts`; schedules: `apps/pipeline/src/scheduler.ts`
- Retry policy: 3 attempts with exponential backoff (1min, 5min, 15min); timeout 2 hours
- Use `pg-boss` for ALL scheduled tasks — not `setTimeout`/`setInterval`

## CPF Handling (Non-Negotiable)

1. CPFs exist ONLY in `internal_data.politician_identifiers`
2. `api_reader` has ZERO permissions on `internal_data`
3. No CPF in any API endpoint, response, log, or error
4. CPF encryption key is env var only (`CPF_ENCRYPTION_KEY`)
5. Cross-source matching uses SHA-256 hash — decryption only for admin debugging
6. CGU field is `CPF_SERVIDOR` (raw CPF) — call `hashCPF(raw.CPF_SERVIDOR)` before lookup
7. CPF crypto module: `apps/pipeline/src/crypto/cpf.ts` — reads `env.CPF_ENCRYPTION_KEY` at module level; tests need `vi.stubEnv()` before dynamic import

## External API Sources

| Source | Base URL | Auth | Format | Rate Limit | Cadence |
|--------|---------|------|--------|-----------|---------|
| Camara | `dadosabertos.camara.leg.br/api/v2` | None | JSON | 120/min | Daily |
| Senado | `legis.senado.leg.br/dadosabertos` | None | XML/JSON | None | Daily |
| Transparencia | `api.portaltransparencia.gov.br/api-de-dados` | API Key (header) | JSON | 90/min | Daily |
| TSE | `dadosabertos.tse.jus.br` | None | CSV bulk | N/A | Weekly |
| TCU | `api-cadirreg.apps.tcu.gov.br` | None | JSON | None | Weekly |
| CGU | `portaldatransparencia.gov.br/download-de-dados` | None | CSV bulk | N/A | Monthly |

**Adapters**: Zero tests currently. All 6 adapter files in `apps/pipeline/src/adapters/`. `slugify` is duplicated in camara/senado/tse transformers — do not add a 4th copy; RF-019 Phase 2 consolidates.

`ExclusionRecordUpsert` type is defined in `apps/pipeline/src/transformers/tcu.ts`, not a shared types file.

## Testing

```bash
pnpm --filter @pah/api test               # Unit tests (excludes *.integration.test.ts)
pnpm --filter @pah/api test:integration   # Requires live PostgreSQL (Testcontainers)
pnpm --filter @pah/pipeline test          # Pipeline unit tests (49 tests)
```

**Mock patterns**:

- Use `MockRepository`/`MockResend` interfaces with `as unknown as T` cast for `explicit-function-return-type` + `unbound-method` lint rules
- Use `expect.stringMatching(...)` cast as `unknown` for `unsafe-assignment` on asymmetric matchers
- Publisher tests: `vi.stubEnv()` + `vi.mock('@pah/db/public-schema')` needed to avoid `pgSchema('public')` runtime error
- Return `{ db, insertMock }` from factory to avoid `unbound-method` ESLint error
- `JSON.parse()` results: cast as `Record<string, unknown>` for `@typescript-eslint/no-unsafe-assignment`

## Security Baseline

**Input validation**: All query params via TypeBox with min/max. Slug: `^[a-z0-9-]+$`. State: 2-char uppercase. Search: ≤ 100 chars, sanitized for PostgreSQL FTS. Numeric params bounded.

**Output**: TypeBox response schemas strip undeclared fields via `fast-json-stringify`. Never bypass with `reply.raw` or `@Res()`.

**CPF**: Encrypted + hashed at rest. Never in responses or logs. `api_reader` cannot query `internal_data` at database level.

**Raw SQL**: Only in pipeline for complex cross-schema operations. API must use Drizzle query builder (parameterized queries).

**Helmet** on API: `contentSecurityPolicy` with `defaultSrc: ["'none'"]`, HSTS `maxAge: 31536000`.

## What NEVER to Do

| Anti-Pattern | Why Prohibited |
|---|---|
| `reply.raw` / bypass Fastify serialization | Skips TypeBox validation, leaks unknown fields |
| Import `internal-schema.ts` in `apps/api/` | Violates schema isolation (ADR-001) even if DB role prevents queries |
| Inline Drizzle queries in routes | Breaks repository pattern, makes unit testing impossible |
| OFFSET pagination | Performance degrades on large tables — use cursor/keyset |
| CPF in logs, responses, or errors | LGPD violation (DR-005) |
| `any` type | Use `unknown` + type guards or Zod/TypeBox parsing |
| `as` assertions (except `as const`, test factories) | Hides type errors |
| Skip response schema in route | Falls back to JSON.stringify, may leak sensitive fields |
| Hardcode API URLs, keys, flags | All config via `config/env.ts` validated at startup |
| Raw SQL in API layer | Use Drizzle builder for parameterized queries |
| Write endpoints in API | API is read-only (`api_reader` role) — all writes in pipeline |
| `setTimeout`/`setInterval` for scheduling | Use pg-boss (retry, DLQ, persistence) |
| CPF decryption outside `crypto/cpf.ts` | Confined to pipeline crypto module |
| 8th cursor codec copy | RF-019 Phase 1 will consolidate — reuse existing |
| 4th `slugify` copy | RF-019 Phase 2 consolidates — reuse from `packages/shared` |
