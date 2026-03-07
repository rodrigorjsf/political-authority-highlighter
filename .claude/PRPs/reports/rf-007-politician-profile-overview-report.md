# Implementation Report

**Plan**: `.claude/PRPs/plans/rf-007-politician-profile-overview.plan.md`
**Branch**: `feat/PAH-007-politician-profile-overview`
**Date**: 2026-03-04
**Status**: COMPLETE

---

## Summary

Implemented the politician profile overview page at `/politicos/[slug]` with ISR (`revalidate = 3600`), a new `GET /api/v1/politicians/:slug` API endpoint, and a `ScoreBreakdown` component with 4 sub-score progress bars. Also created `ExclusionNotice` (DR-001 compliant), a loading skeleton, and `generateStaticParams` / `generateMetadata` for SEO.

---

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Add `PoliticianProfile` shared type | `packages/shared/src/types/politician.ts`, `packages/shared/src/index.ts` | done |
| 2 | TypeBox schemas | `apps/api/src/schemas/politician.schema.ts` | done |
| 3 | Repository `selectBySlug` | `apps/api/src/repositories/politician.repository.ts` | done |
| 4 | Service `findBySlug` | `apps/api/src/services/politician.service.ts` | done |
| 5 | Route `GET /politicians/:slug` | `apps/api/src/routes/politicians.route.ts` | done |
| 6 | Web API types | `apps/web/src/lib/api-types.ts` | done |
| 7 | `fetchPoliticianBySlug` + export `ApiError` | `apps/web/src/lib/api-client.ts` | done |
| 8 | `ScoreBreakdown` component | `apps/web/src/components/politician/score-breakdown.tsx` | done |
| 9 | `ExclusionNotice` component | `apps/web/src/components/politician/exclusion-notice.tsx` | done |
| 10 | Profile page | `apps/web/src/app/politicos/[slug]/page.tsx` | done |
| 11 | Loading skeleton | `apps/web/src/app/politicos/[slug]/loading.tsx` | done |
| 12 | API service tests | `apps/api/src/services/politician.service.test.ts` | done |
| 13 | ScoreBreakdown tests | `apps/web/src/components/politician/score-breakdown.test.tsx` | done |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check | pass | 4/4 packages clean |
| Lint | pass | 3/3 packages, 0 errors |
| Unit tests (API) | pass | 9 passed (7 existing + 2 new findBySlug) |
| Unit tests (web) | pass | 32 passed (26 existing + 6 new ScoreBreakdown) |
| Build | pass | `/politicos/[slug]` renders as SSG with generateStaticParams |

---

## Deviations from Plan

1. **Relative imports instead of `@/` aliases**: The project uses relative imports (`../../lib/api-client`) not `@/` aliases. Plan specified `@/` — fixed during implementation.

2. **`ApiError` catch pattern**: Plan noted the `notFound()` inside `try/catch` bug. Implemented the revised `try/catch` + `instanceof ApiError` pattern instead of the `.catch()` callback, because TypeScript had issues with the return type of the `.catch()` variant. Functionally identical.

3. **`generateStaticParams` with try/catch**: Added try/catch around `fetchPoliticians` so builds don't fail when API is not running. Returns `[]` — ISR handles pages on-demand.

4. **`PoliticianProfile` re-export**: Plan Task 6 said to add a new interface in `api-types.ts`. Instead, imported and re-exported from `@pah/shared` (following the existing pattern for `PoliticianCard`, etc.).

5. **`showMethodologyLink` prop type**: Added `| undefined` to the optional prop type for `exactOptionalPropertyTypes` compliance.

---

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `apps/api/src/services/politician.service.test.ts` | `findBySlug` returns mapped dto, `findBySlug` returns undefined for missing slug |
| `apps/web/src/components/politician/score-breakdown.test.tsx` | renders 4 labels, renders score fractions, renders progressbars with aria-valuenow, no qualitative labels (DR-002), methodology link when enabled, no methodology link by default |

---

## Next Steps

- [ ] Create PR: `/prp-pr`
