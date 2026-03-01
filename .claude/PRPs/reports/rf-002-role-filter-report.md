# Implementation Report — RF-002 Role Filter

**Plan**: `.claude/PRPs/plans/rf-002-role-filter.plan.md`
**Branch**: `feat/PAH-002-role-filter`
**Date**: 2026-03-01
**Status**: COMPLETE

---

## Summary

Added a `RoleFilter` Client Component to the `/politicos` listing page that allows users to filter the 594-politician grid to deputados (513) or senadores (81) only. The filter uses `useSearchParams` + `useRouter.push()` for URL-based state management. The backend was already fully implemented from Phase 1 — this was a pure frontend change across 4 files.

---

## Assessment vs Reality

| Metric | Predicted | Actual | Reasoning |
|--------|-----------|--------|-----------|
| Complexity | LOW | LOW | Backend fully complete; 4 files, 5 tasks as planned |
| Confidence | 9/10 | 9/10 | One deviation: vi.fn() required in mock factories; type fixes for ReadonlyURLSearchParams |

**Deviations:**
1. `vitest.setup.ts` mock upgraded from plain functions to `vi.fn()` factories — required for `mockReturnValueOnce` to work in per-test overrides
2. Test file needed `ReadonlyURLSearchParams` cast and full `AppRouterInstance` shape for strict TypeScript — resolved with `as unknown as` and complete mock object

---

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Add `next/navigation` mock | `apps/web/vitest.setup.ts` | ✅ |
| 2 | Create `RoleFilter` component | `apps/web/src/components/filters/role-filter.tsx` | ✅ |
| 3 | Update `PoliticosPage` | `apps/web/src/app/politicos/page.tsx` | ✅ |
| 4 | Create `RoleFilter` tests | `apps/web/src/components/filters/role-filter.test.tsx` | ✅ |
| 5 | Full validation suite | all | ✅ |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check (web) | ✅ | 0 errors |
| Type check (full workspace) | ✅ | 4/4 packages pass |
| Lint | ✅ | 0 errors |
| Unit tests (web) | ✅ | 11 passed (5 new RoleFilter + 6 existing PoliticianCard) |
| Unit tests (api) | ✅ | 7 passed (cache hit) |
| Build (`next build`) | ✅ | No `missing-suspense-with-csr-bailout` error |

---

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `apps/web/vitest.setup.ts` | UPDATE | +10 |
| `apps/web/src/components/filters/role-filter.tsx` | CREATE | +52 |
| `apps/web/src/app/politicos/page.tsx` | UPDATE | +18/-5 |
| `apps/web/src/components/filters/role-filter.test.tsx` | CREATE | +66 |

---

## Deviations from Plan

1. **vi.fn() in mock factories**: The plan showed `useSearchParams: () => new URLSearchParams()` but this returns a plain function without `mockReturnValueOnce`. Updated to `vi.fn(() => new URLSearchParams())` for per-test override capability.
2. **Type safety in test helpers**: `URLSearchParams` is not directly assignable to `ReadonlyURLSearchParams`. Added `mockSearchParams()` and `mockRouter()` helper functions with `as unknown as` casts. TypeScript strict mode requires full `AppRouterInstance` shape for router mock.

---

## Issues Encountered

1. **`vi.mocked(...).mockReturnValueOnce is not a function`** — global mock used plain functions. Fixed by switching to `vi.fn()` factories in `vitest.setup.ts`.
2. **`ReadonlyURLSearchParams` type incompatibility** — `URLSearchParams.append` signature differs. Fixed with `as unknown as ReadonlyURLSearchParams` helper.
3. **`AppRouterInstance` incomplete mock** — router mock missing `back`, `forward`, `refresh`, `replace`. Fixed by adding all required properties to mock helper.

---

## Tests Written

| Test File | Test Cases |
|-----------|-----------|
| `apps/web/src/components/filters/role-filter.test.tsx` | renders 3 options; defaults to empty; shows senador selected; router.push called with role+no cursor; removes role param when cleared |

---

## Next Steps

- [ ] Create PR: `/prp-pr`
- [ ] Phase 3: State Filter (RF-003) — can start now in parallel worktree (same pattern as RoleFilter)
- [ ] Continue: `/prp-plan .claude/PRPs/prds/rf-001-politician-catalog-listing.prd.md`
