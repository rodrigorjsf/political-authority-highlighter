# Implementation Report — RF-015 Name Search

**Plan**: `.claude/PRPs/plans/rf-015-name-search.plan.md`
**Branch**: `feat/PAH-015-name-search`
**Date**: 2026-03-02
**Status**: COMPLETE

---

## Summary

Implemented full-text name search for the `/politicos` listing via a PostgreSQL `tsvector` generated column (`search_vector`) driven by `unaccent(name)`. Added a debounced `SearchBar` Client Component (300ms debounce, min 2 chars) above the filter bar. Wired `search` through all 5 backend layers (TypeBox schema → route → service → repository → DB). The `'simple'` FTS dictionary prevents stemming of proper names; GIN index ensures sub-100ms search on 594 rows.

---

## Assessment vs Reality

| Metric | Predicted | Actual | Reasoning |
|--------|-----------|--------|-----------|
| Complexity | MEDIUM | MEDIUM | Full-stack as expected; one API deviation in Drizzle index builder |
| Confidence | 8/10 | 8/10 | Root cause was correct; one Drizzle API surface difference found |

**Deviations:**

1. **Drizzle GIN index API**: Plan showed `.on(table.searchVector).using('gin')` but the actual API in Drizzle 0.36.4 is `index('name').using('gin', column)` — `using()` is on `IndexBuilderOn`, takes method + columns together, not chained after `.on()`.
2. **Debounce test mock**: `mockReturnValueOnce` only covers one render. When `setValue()` triggers a re-render, `useRouter()` is called again and gets the default mock. Fixed by calling `mockReturnValueOnce` twice (for both renders) in debounce tests that trigger state updates.

---

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Add tsvector customType + generated column + GIN index | `packages/db/src/public-schema.ts` | ✅ |
| 2 | Create migration SQL | `packages/db/migrations/public/0002_add_search_vector.sql` | ✅ |
| 3 | Add `search` to TypeBox query schema | `apps/api/src/schemas/politician.schema.ts` | ✅ |
| 4 | Add `search` to service interface + pass-through | `apps/api/src/services/politician.service.ts` | ✅ |
| 5 | Add `search` to repository + tsvector WHERE | `apps/api/src/repositories/politician.repository.ts` | ✅ |
| 6 | Destructure `search` in route handler | `apps/api/src/routes/politicians.route.ts` | ✅ |
| 7 | Create SearchBar Client Component | `apps/web/src/components/filters/search-bar.tsx` | ✅ |
| 8 | Create SearchBar unit tests | `apps/web/src/components/filters/search-bar.test.tsx` | ✅ |
| 9 | Wire SearchBar into politicos page | `apps/web/src/app/politicos/page.tsx` | ✅ |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check (`@pah/db`) | ✅ | 0 errors |
| Type check (`@pah/api`) | ✅ | 0 errors |
| Type check (`@pah/web`) | ✅ | 0 errors |
| Type check (full workspace) | ✅ | 4/4 packages pass |
| Lint | ✅ | 0 errors |
| Unit tests (web) | ✅ | 21 passed (16 existing + 5 new SearchBar) |
| Unit tests (api) | ✅ | 7 passed (no new unit tests for backend) |
| Build (`next build`) | ✅ | No `missing-suspense-with-csr-bailout` error |

---

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `packages/db/src/public-schema.ts` | UPDATE | +14 |
| `packages/db/migrations/public/0002_add_search_vector.sql` | CREATE | +13 |
| `apps/api/src/schemas/politician.schema.ts` | UPDATE | +2 |
| `apps/api/src/services/politician.service.ts` | UPDATE | +2 |
| `apps/api/src/repositories/politician.repository.ts` | UPDATE | +7 |
| `apps/api/src/routes/politicians.route.ts` | UPDATE | +2 |
| `apps/web/src/components/filters/search-bar.tsx` | CREATE | +39 |
| `apps/web/src/components/filters/search-bar.test.tsx` | CREATE | +82 |
| `apps/web/src/app/politicos/page.tsx` | UPDATE | +7/-2 |

---

## Deviations from Plan

1. **Drizzle GIN index builder API**: `index('name').using('gin', column)` — not `.on(column).using('gin')`. The `using()` method is on `IndexBuilderOn` and takes both method and columns as arguments.
2. **Test mock for re-renders**: Used two `mockReturnValueOnce` calls per test for tests that trigger re-renders via `setValue()`. The plan showed `mockReturnValueOnce` once, which only covers the initial render.

---

## Issues Encountered

1. **`Property 'using' does not exist on type 'IndexBuilder'`** — Drizzle 0.36.4 has `using()` on `IndexBuilderOn`, not `IndexBuilder`. Fixed by using `index('name').using('gin', table.searchVector)` instead of chaining after `.on()`.
2. **Debounce tests: `pushMock` called 0 times** — `mockReturnValueOnce` consumed on first render; re-render from `setValue()` got default mock. Fixed by calling `mockReturnValueOnce` twice per test.

---

## Tests Written

| Test File | Test Cases |
|-----------|-----------|
| `apps/web/src/components/filters/search-bar.test.tsx` | renders input with placeholder; defaults to empty; shows "joao" when search=joao in URL; router.push called with ?search=joao after 300ms (clears cursor); removes search param when cleared to < 2 chars |

---

## Next Steps

- [ ] Create PR: `/prp-pr`
- [ ] Apply DB migration to live database: `psql $DATABASE_URL -f packages/db/migrations/public/0002_add_search_vector.sql`
- [ ] Continue PRD: `/prp-plan .claude/PRPs/prds/rf-001-politician-catalog-listing.prd.md` (next phase)
