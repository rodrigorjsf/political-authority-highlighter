# Pipeline — Political Authority Highlighter

Stack: Node.js | pg-boss 10 | Drizzle ORM 0.36+ | Pino logger | Supabase (PostgreSQL 16)

## Architecture

The pipeline runs as a long-lived pg-boss worker process (not HTTP). Entry point: `src/index.ts`. Schedules: `src/scheduler.ts`.

**Data flow**: `scheduler.ts` → pg-boss queue → `adapters/<source>.ts` (fetch raw) → `transformers/*.transformer.ts` (normalize) → `matching/` (CPF hash cross-reference) → `scoring/engine.ts` (4 components) → `publisher/` (upsert to `public`) → ISR revalidation (trigger Vercel).

## pg-boss Patterns

- `createQueue`: options object requires `name` field even though first param is queue name
- `schedule()` third param must be `{}` not `null`
- Use pg-boss for ALL scheduled tasks — not `setTimeout`/`setInterval`
- Retry: 3 attempts with exponential backoff (1min, 5min, 15min); timeout 2 hours

## External API Sources

| Source | Rate Limit | Format | Cadence |
|--------|-----------|--------|---------|
| Camara | 120/min | JSON | Daily |
| Senado | None | XML/JSON | Daily |
| Transparencia | 90/min | JSON (API key) | Daily |
| TSE | N/A | CSV bulk | Weekly |
| TCU | None | JSON | Weekly |
| CGU | N/A | CSV bulk | Monthly |

## Non-Obvious Constraints

**Zero tests on adapters**: All 6 adapters in `src/adapters/` have zero tests. RF-019 Phase 3 will add injection points.

**`orchestrator.ts` has zero tests**: Adapters are tightly coupled. RF-019 Phase 3 addresses this.

**`ExclusionRecordUpsert` type** lives in `src/transformers/tcu.ts`, not a shared types file.

**`slugify` is duplicated** in camara, senado, and tse transformers. Do not add a 4th copy — RF-019 Phase 2 consolidates.

**Cursor codec**: `encodeCursor`/`decodeCursor` is duplicated across 5 API services — do not add a 6th copy.

## Scoring Engine

Four components, equal weight (0.25 each):

| Component | Score | Rule |
|-----------|-------|------|
| Transparency | 0-25 | Data availability across sources |
| Legislative | 0-25 | Parliamentary activity |
| Financial | 0-25 | Expense/asset regularity |
| Anticorruption | 0 or 25 | Binary: 0 if any exclusion record exists |

**Anticorruption is binary** — any exclusion record sets score to 0 and `exclusion_flag` to `true`. Only the boolean crosses to `public` schema (DR-001).

## ISR Revalidation

After publishing, the publisher calls the Next.js ISR webhook. If this call fails, data is still published — revalidation failure is non-fatal but logged.

ISR-calling code in `apps/web/` must add `.catch(() => [])` fallback so `next build` succeeds without a running API.

## What NEVER to Do

- Let one source failure stop other sources — catch per-source, mark as `partial`/`failed`
- Skip `ON CONFLICT DO UPDATE` — all upserts must be idempotent
- Use `null` as third param to `boss.schedule()` — use `{}`
