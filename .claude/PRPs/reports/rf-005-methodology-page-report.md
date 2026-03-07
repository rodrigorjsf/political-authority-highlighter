# Implementation Report — RF-005 Methodology Page

**Plan**: `.claude/PRPs/plans/rf-005-methodology-page.plan.md`
**Branch**: `feat/PAH-005-methodology-page`
**Date**: 2026-03-03
**Status**: COMPLETE

---

## Summary

Implemented a fully static SSG page at `/metodologia` explaining how politician integrity scores are calculated. The page documents all 4 score components with formulas, lists 6 official government data sources with links, explains the anti-corruption component (DR-001 compliant), and displays methodology version v1.0. Zero API dependencies — pure static Server Component with `revalidate = 604800` (7-day cache).

---

## Assessment vs Reality

| Metric | Predicted | Actual | Reasoning |
|--------|-----------|--------|-----------|
| Complexity | LOW | LOW | Two files, no backend changes, no mocks — exactly as predicted |
| Confidence | 9/10 | 9/10 | Only deviation was duplicate text matches in tests |

---

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Create static methodology page | `apps/web/src/app/metodologia/page.tsx` | ✅ |
| 2 | Create unit tests | `apps/web/src/app/metodologia/page.test.tsx` | ✅ |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check (`@pah/web`) | ✅ | 0 errors |
| Type check (full workspace) | ✅ | 4/4 packages pass |
| Lint | ✅ | 0 errors |
| Unit tests (web) | ✅ | 26 passed (21 existing + 5 new) |
| Unit tests (api) | ✅ | 7 passed |
| Build (`next build`) | ✅ | `/metodologia` pre-rendered as static, 1w revalidation |

---

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `apps/web/src/app/metodologia/page.tsx` | CREATE | +161 |
| `apps/web/src/app/metodologia/page.test.tsx` | CREATE | +50 |

---

## Deviations from Plan

1. **Test duplicate text matches**: "Portal da Transparência" appears twice in page (sources section + anti-corruption section) and "bases públicas de anticorrupção" appears twice (component description + anti-corruption section). Tests were adjusted to use `getAllByRole`/`getAllByText` instead of `getByRole`/`getByText` for these cases.

---

## Issues Encountered

1. **RTL `getByRole` multiple matches**: `getByRole('link', { name: /portal da transparência/i })` threw because the link appears in both the sources list and the anti-corruption explanation. Fixed by using `getAllByRole` and asserting on `[0]`.
2. **RTL `getByText` multiple matches**: Same pattern with "bases públicas de anticorrupção" text appearing in both the Anti-Corrupção `<dd>` component and the dedicated section. Fixed with `getAllByText`.

---

## Tests Written

| Test File | Test Cases |
|-----------|-----------|
| `apps/web/src/app/metodologia/page.test.tsx` | renders main heading; renders 4 score component labels; renders 6 data source links with correct URLs; renders anti-corruption section without specific database or record details (DR-001); renders methodology version |

---

## Next Steps

- [ ] Create PR: `/prp-pr`
- [ ] Continue PRD: `/prp-plan .claude/PRPs/prds/rf-mvp-remaining-features.prd.md` (next phase: RF-007 Profile Overview)
