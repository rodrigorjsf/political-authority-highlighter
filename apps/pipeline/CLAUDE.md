# Pipeline Development Guide -- Political Authority Highlighter

Stack: Node.js | pg-boss 10 | Drizzle ORM 0.36+ | Pino logger | Supabase (PostgreSQL 16)

See `apps/api/CLAUDE.md` for pg-boss patterns, external API source table, CPF handling rules, and adapter/transformer naming conventions.

## Architecture

The pipeline runs as a long-lived pg-boss worker process (not HTTP). Entry point: `worker.ts`. Schedules defined in `scheduler.ts`.

**Data flow**: `scheduler.ts` → pg-boss queue → `adapters/*.adapter.ts` (fetch raw) → `transformers/*.transformer.ts` (normalize) → `matchers/` (CPF hash cross-reference) → `scoring/calculator.ts` (4 components) → `publisher/publisher.ts` (upsert to `public`) → `publisher/revalidator.ts` (trigger Vercel ISR).

## Non-Obvious Constraints

**Zero tests on adapters**: All 6 source adapters (`camara`, `senado`, `transparencia`, `tse`, `tcu`, `cgu`) have zero tests. RF-019 Phase 3 will add injection points. Do not add tests that rely on real external APIs.

**`orchestrator.ts` has zero tests**: Adapters are tightly coupled with no injection points. Do not add more hard coupling — RF-019 Phase 3 addresses this.

**`ExclusionRecordUpsert` type** lives in `apps/pipeline/src/transformers/tcu.ts`, not a shared types file.

**`slugify` is duplicated** in camara, senado, and tse transformers. Do not add a 4th copy — RF-019 Phase 2 consolidates using `packages/shared`.

**CPF crypto module** reads `env.CPF_ENCRYPTION_KEY` at module level. Tests must call `vi.stubEnv()` before dynamic import.

**CGU source**: Field is `CPF_SERVIDOR` (raw CPF string). Always call `hashCPF(raw.CPF_SERVIDOR)` before identity lookup.

## Scoring Engine

Four components, equal weight (0.25 each):

| Component | Score | Rule |
|-----------|-------|------|
| Transparency | 0-25 | Data availability across sources |
| Legislative | 0-25 | Parliamentary activity |
| Financial | 0-25 | Expense/asset regularity |
| Anticorruption | 0 or 25 | Binary: 0 if any exclusion record exists |

**Anticorruption is binary** — any single exclusion record from any source (CEIS, CNEP, CEAF, CEPIM, TCU, CGU) sets score to 0 and `exclusion_flag` to `true`. Only the boolean crosses to `public` schema (DR-001).

Test coverage targets: `scoring/` ≥ 90%, `transformers/` ≥ 85%, `adapters/` ≥ 70%.

## ISR Revalidation

After publishing, `revalidator.ts` calls the Next.js ISR webhook at `NEXT_PUBLIC_API_URL/api/revalidate` with `VERCEL_REVALIDATE_TOKEN` header. If this call fails, data is still published — revalidation failure is non-fatal but logged.

ISR-calling code in `apps/web/` that runs at build time must add `.catch(() => [])` fallback so `next build` succeeds without a running API.

## What NEVER to Do

- Decrypt CPFs outside `src/crypto/cpf.ts` — only for admin debugging
- Log, expose, or return CPF values anywhere (DR-005)
- Let one source failure stop other sources — catch per-source, mark as `partial`/`failed`
- Use `OFFSET` pagination — use cursor-based queries
- Skip `ON CONFLICT DO UPDATE` — all upserts must be idempotent
- Add a 4th `slugify` implementation — wait for RF-019 Phase 2
- Add an 8th cursor codec — wait for RF-019 Phase 1
- Use `null` as third param to `boss.schedule()` — use `{}`
