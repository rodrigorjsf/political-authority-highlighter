# Implementation Report

**Plan**: `.claude/PRPs/plans/rf-012-profile-expenses-section.plan.md`
**Source PRD**: `.claude/PRPs/prds/rf-mvp-remaining-features.prd.md` — Phase 5
**Branch**: `feat/PAH-012-profile-expenses-section`
**Date**: 2026-03-07
**Status**: COMPLETE

---

## Summary

Added full-stack parliamentary expenses feature (RF-012): paginated CEAP/CEAPS expenses tab at `/politicos/[slug]/despesas` with yearly totals aggregation, BRL currency formatting, 3-component keyset cursor pagination, and ISR caching. Mirrors the exact pattern from Bills (RF-008) and Votes (RF-009) sections.

---

## Assessment vs Reality

| Metric     | Predicted | Actual | Reasoning |
| ---------- | --------- | ------ | --------- |
| Complexity | MEDIUM    | MEDIUM | Followed votes pattern closely; only deviation was `formatCurrency` placement |
| Confidence | HIGH      | HIGH   | All 15 tasks matched plan; one build issue resolved by inlining utility |

**Deviation**: `formatCurrency` was originally placed in `packages/shared/src/utils/format.ts` with a re-export from `index.ts` via `./utils/format.js`. Next.js webpack couldn't resolve the `.js` → `.ts` mapping for value exports (type-only re-exports worked because they're erased). Fix: inlined the function directly in `packages/shared/src/index.ts` and removed the `utils/` directory.

---

## Tasks Completed

| #  | Task | File | Status |
| -- | ---- | ---- | ------ |
| 1  | Create Expense types | `packages/shared/src/types/expense.ts` | ✅ |
| 2  | Create formatCurrency utility | `packages/shared/src/index.ts` (inlined) | ✅ |
| 3  | Export from shared index | `packages/shared/src/index.ts` | ✅ |
| 4  | Add expenses table to Drizzle schema | `packages/db/src/public-schema.ts` | ✅ |
| 5  | Create SQL migration | `packages/db/migrations/public/0005_add_expenses.sql` | ✅ |
| 6  | Create TypeBox schemas | `apps/api/src/schemas/expense.schema.ts` | ✅ |
| 7  | Create expense repository | `apps/api/src/repositories/expense.repository.ts` | ✅ |
| 8  | Create expense service | `apps/api/src/services/expense.service.ts` | ✅ |
| 9  | Write unit tests | `apps/api/src/services/expense.service.test.ts` | ✅ |
| 10 | Create expenses route | `apps/api/src/routes/expenses.route.ts` | ✅ |
| 11 | Wire DI in app.ts | `apps/api/src/app.ts` | ✅ |
| 12 | Add web API types | `apps/web/src/lib/api-types.ts` | ✅ |
| 13 | Add fetchPoliticianExpenses | `apps/web/src/lib/api-client.ts` | ✅ |
| 14 | Create expenses page | `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | ✅ |
| 15 | Create loading skeleton | `apps/web/src/app/politicos/[slug]/despesas/loading.tsx` | ✅ |

---

## Validation Results

| Check       | Result | Details |
| ----------- | ------ | ------- |
| Type check  | ✅     | 4/4 packages, zero errors |
| Lint        | ✅     | 3/3 packages, 0 errors |
| Unit tests  | ✅     | 25 passed (4 new expense tests), 0 failed |
| Build       | ✅     | Next.js compiled, `/politicos/[slug]/despesas` route present |
| Integration | ⏭️     | N/A — requires PostgreSQL (Testcontainers) |

---

## Files Changed

| File | Action | Lines |
| ---- | ------ | ----- |
| `packages/shared/src/types/expense.ts` | CREATE | +22 |
| `packages/shared/src/index.ts` | UPDATE | +9 |
| `packages/db/src/public-schema.ts` | UPDATE | +22 |
| `packages/db/migrations/public/0005_add_expenses.sql` | CREATE | +18 |
| `apps/api/src/schemas/expense.schema.ts` | CREATE | +40 |
| `apps/api/src/repositories/expense.repository.ts` | CREATE | +91 |
| `apps/api/src/services/expense.service.ts` | CREATE | +82 |
| `apps/api/src/services/expense.service.test.ts` | CREATE | +104 |
| `apps/api/src/routes/expenses.route.ts` | CREATE | +42 |
| `apps/api/src/app.ts` | UPDATE | +6 |
| `apps/web/src/lib/api-types.ts` | UPDATE | +3 |
| `apps/web/src/lib/api-client.ts` | UPDATE | +19 |
| `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | CREATE | +149 |
| `apps/web/src/app/politicos/[slug]/despesas/loading.tsx` | CREATE | +36 |

---

## Deviations from Plan

1. **`formatCurrency` placement**: Plan specified `packages/shared/src/utils/format.ts` with re-export. Next.js webpack couldn't resolve `.js` → `.ts` for value exports (type-only re-exports are erased and don't trigger resolution). Inlined directly in `index.ts` instead. The separate `utils/` directory was removed.

---

## Issues Encountered

1. **ESLint error in test helper**: `buildExpenseRow` lacked explicit return type. Fixed by adding `Partial<ExpenseRow>` param type and `ExpenseRow` return type.
2. **Next.js build failure**: `Module not found: Can't resolve './utils/format.js'`. Root cause: webpack resolves value exports but not type-only exports, and `.js` extension doesn't map to `.ts` without a build step. Fixed by inlining `formatCurrency` in `index.ts`.

---

## Tests Written

| Test File | Test Cases |
| --------- | ---------- |
| `apps/api/src/services/expense.service.test.ts` | `returns empty data and no cursor when no expenses`, `converts numeric string amounts to numbers`, `sets cursor when more rows than limit`, `returns null cursor when rows fit within limit` |

---

## Next Steps

- [ ] Review implementation
- [ ] Create PR: `gh pr create` or `/prp-pr`
- [ ] Merge when approved
