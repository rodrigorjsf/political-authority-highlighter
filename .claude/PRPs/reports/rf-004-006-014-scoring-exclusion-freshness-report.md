# Implementation Report

**Plan**: `.claude/PRPs/plans/rf-004-006-014-scoring-exclusion-freshness.plan.md`
**Branch**: `feat/PAH-10-scoring-exclusion-freshness`
**Date**: 2026-03-11
**Status**: COMPLETE

---

## Summary

Wired the scoring engine, anti-corruption exclusion detection, and data freshness tracking into the pipeline. Moved `data_source_status` from `internal_data` to `public` schema so `api_reader` can serve it. Added `GET /api/v1/sources` endpoint and `/fontes` web page showing sync status of all 6 government sources.

---

## Assessment vs Reality

| Metric | Predicted | Actual | Reasoning |
|--------|-----------|--------|-----------|
| Complexity | MEDIUM | MEDIUM | Matched — all algorithms existed, only wiring required |
| Confidence | 9/10 | 9/10 | Plan was accurate; minor deviations in test setup and CGU CPF hashing |

**Deviations from plan:**

1. **CGU exclusion CPF field**: Plan used `raw.CPF_HASH` as placeholder. Actual field is `CPF_SERVIDOR` (raw CPF, not hash). Used `hashCPF(raw.CPF_SERVIDOR)` to compute hash before lookup. `ExclusionRecordUpsert` was already in `transformers/tcu.ts`, not `types.ts`.

2. **Publisher test mocking**: `pgSchema('public')` throws at runtime in test environments. Required `vi.mock('@pah/db/public-schema')` and `vi.stubEnv()` pattern (same as `crypto/cpf.test.ts`). Also required returning `{ db, insertMock }` from `buildMockDb()` to avoid `unbound-method` ESLint errors.

3. **Web build error handling**: `/fontes` is prerendered at `next build`, but API is not running in that environment. Added `.catch(() => [])` fallback so the page renders with empty data at build time; ISR revalidates with real data post-deploy.

4. **Relative import**: Used `../../lib/api-client` instead of `@/lib/api-client` (no path aliases configured in web tsconfig, following the existing codebase pattern).

---

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | CREATE migration | `packages/db/migrations/0008_add_data_source_status.sql` | ✅ |
| 2 | UPDATE public-schema | `packages/db/src/public-schema.ts` | ✅ |
| 3 | UPDATE internal-schema | `packages/db/src/internal-schema.ts` | ✅ |
| 4 | UPDATE publisher | `apps/pipeline/src/publisher/index.ts` | ✅ |
| 5 | UPDATE orchestrator | `apps/pipeline/src/orchestrator.ts` | ✅ |
| 6 | CREATE publisher tests | `apps/pipeline/src/publisher/publisher.test.ts` | ✅ |
| 7 | CREATE shared types | `packages/shared/src/types/source.ts` | ✅ |
| 8 | UPDATE shared index | `packages/shared/src/index.ts` | ✅ |
| 9 | CREATE source schema | `apps/api/src/schemas/source.schema.ts` | ✅ |
| 10 | CREATE source repository | `apps/api/src/repositories/source.repository.ts` | ✅ |
| 11 | CREATE source service | `apps/api/src/services/source.service.ts` | ✅ |
| 12 | CREATE sources route | `apps/api/src/routes/sources.route.ts` | ✅ |
| 13 | UPDATE app.ts | `apps/api/src/app.ts` | ✅ |
| 14 | CREATE source service tests | `apps/api/src/services/source.service.test.ts` | ✅ |
| 15 | UPDATE api-client | `apps/web/src/lib/api-client.ts` | ✅ |
| 16 | CREATE fontes page | `apps/web/src/app/fontes/page.tsx` | ✅ |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check (db) | ✅ | No errors |
| Type check (pipeline) | ✅ | No errors |
| Type check (api) | ✅ | No errors |
| Type check (web) | ✅ | No errors |
| Lint | ✅ | 0 errors across all packages |
| Pipeline tests | ✅ | 40 passed (6 files, +4 new publisher tests) |
| API tests | ✅ | 40 passed (7 files, +5 new source service tests) |
| Web tests | ✅ | 32 passed (6 files, unchanged) |
| Build (web) | ✅ | `/fontes` compiled as static page with ISR 1h |

---

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `packages/db/migrations/0008_add_data_source_status.sql` | CREATE | Moves table to public, grants api_reader SELECT |
| `packages/db/src/public-schema.ts` | UPDATE | Added `integer` import + `dataSourceStatus` table |
| `packages/db/src/internal-schema.ts` | UPDATE | Removed `dataSourceStatus` table |
| `apps/pipeline/src/publisher/index.ts` | UPDATE | `.returning()` on upsertPolitician; 2 new methods |
| `apps/pipeline/src/orchestrator.ts` | UPDATE | Full rewrite to wire scoring + exclusion + status |
| `apps/pipeline/src/publisher/publisher.test.ts` | CREATE | 4 tests for new publisher methods |
| `packages/shared/src/types/source.ts` | CREATE | `DataSourceStatus` + `SourceListResponse` interfaces |
| `packages/shared/src/index.ts` | UPDATE | Added `export type { DataSourceStatus, SourceListResponse }` |
| `apps/api/src/schemas/source.schema.ts` | CREATE | TypeBox schemas for GET /api/v1/sources |
| `apps/api/src/repositories/source.repository.ts` | CREATE | Drizzle query against public.data_source_status |
| `apps/api/src/services/source.service.ts` | CREATE | Factory pattern + DTO mapping |
| `apps/api/src/routes/sources.route.ts` | CREATE | GET /api/v1/sources, Cache-Control max-age=60 |
| `apps/api/src/app.ts` | UPDATE | Registered source repository/service/route |
| `apps/api/src/services/source.service.test.ts` | CREATE | 5 tests for source service |
| `apps/web/src/lib/api-client.ts` | UPDATE | Added `fetchSources()` function |
| `apps/web/src/app/fontes/page.tsx` | CREATE | ISR page with 6-source status table |

---

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `apps/pipeline/src/publisher/publisher.test.ts` | upsertPolitician returns id; throws on no rows; upsertExclusionRecord calls insert; upsertDataSourceStatus calls insert |
| `apps/api/src/services/source.service.test.ts` | empty data array; DTO mapping with ISO dates; null lastSyncAt; updatedAt ISO string; multiple rows returned |

---

## Next Steps

- [ ] Apply migration `0008_add_data_source_status.sql` to Supabase (run via Supabase dashboard SQL editor or migrate script)
- [ ] Verify `api_reader` role can SELECT from `public.data_source_status` after migration
- [ ] Create PR: `/prp-pr`
- [ ] Continue with Phase 9 (SEO + Responsive): `/prp-plan .claude/PRPs/prds/rf-mvp-remaining-features.prd.md`
