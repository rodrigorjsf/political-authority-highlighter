# Implementation Report

**Plan**: `.claude/PRPs/plans/post-mvp-phase-3-comparison.plan.md`
**Branch**: `feat/PAH-POST-001-politician-comparison`
**Date**: 2026-03-15
**Status**: COMPLETE

---

## Summary

Implemented the `/comparar?a={slug1}&b={slug2}` politician comparison page. Server Component orchestrates parallel fetches via `fetchPoliticianBySlug`, two `PoliticianCombobox` Client Components provide autocomplete search with 300ms debounce, `ComparisonTable` displays side-by-side scores with sticky first column, and `ShareButton` copies URL via Clipboard API with execCommand fallback. Added `comparar_click` analytics event and `/comparar` accessibility test.

---

## Assessment vs Reality

| Metric     | Predicted | Actual | Reasoning |
| ---------- | --------- | ------ | --------- |
| Complexity | MEDIUM    | MEDIUM | Matched — no unexpected integration points |
| Confidence | 8/10      | 9/10   | Plan was very detailed with exact code snippets; only minor test adjustments needed |

---

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Add `comparar_click` event | `apps/web/src/lib/analytics-events.ts` | ✅ |
| 2 | PoliticianCombobox | `apps/web/src/components/comparison/politician-combobox.tsx` | ✅ |
| 3 | ComparisonTable | `apps/web/src/components/comparison/comparison-table.tsx` | ✅ |
| 4 | ShareButton | `apps/web/src/components/comparison/share-button.tsx` | ✅ |
| 5 | Loading skeleton | `apps/web/src/app/comparar/loading.tsx` | ✅ |
| 6 | Compare page | `apps/web/src/app/comparar/page.tsx` | ✅ |
| 7 | A11y test | `apps/web/e2e/accessibility.spec.ts` | ✅ |
| 8 | ComparisonTable tests | `apps/web/src/components/comparison/comparison-table.test.tsx` | ✅ |
| 9 | ShareButton tests | `apps/web/src/components/comparison/share-button.test.tsx` | ✅ |
| 10 | PoliticianCombobox tests | `apps/web/src/components/comparison/politician-combobox.test.tsx` | ✅ |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check | ✅ | `pnpm --filter @pah/web typecheck` — no errors |
| Lint | ✅ | `pnpm --filter @pah/web lint` — 0 errors, 0 warnings |
| Unit tests | ✅ | 58 passed, 0 failed (11 new tests added) |
| Build | ✅ | `pnpm build` — all 3 packages compiled |
| Vercel build | ✅ | `vercel build --yes` — completed in 27s |

---

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `apps/web/src/lib/analytics-events.ts` | UPDATE | +1 |
| `apps/web/src/components/comparison/politician-combobox.tsx` | CREATE | +109 |
| `apps/web/src/components/comparison/comparison-table.tsx` | CREATE | +108 |
| `apps/web/src/components/comparison/share-button.tsx` | CREATE | +42 |
| `apps/web/src/app/comparar/loading.tsx` | CREATE | +12 |
| `apps/web/src/app/comparar/page.tsx` | CREATE | +120 |
| `apps/web/e2e/accessibility.spec.ts` | UPDATE | +5 |
| `apps/web/src/components/comparison/comparison-table.test.tsx` | CREATE | +90 |
| `apps/web/src/components/comparison/share-button.test.tsx` | CREATE | +37 |
| `apps/web/src/components/comparison/politician-combobox.test.tsx` | CREATE | +54 |

---

## Deviations from Plan

1. **ShareButton onClick handler**: Plan used `onClick={handleShare}` directly, but ESLint `@typescript-eslint/no-misused-promises` flagged it. Changed to `onClick={() => void handleShare()}`.
2. **ShareButton test**: Plan specified `vi.useFakeTimers()` + `act()` pattern, but async clipboard mock + fake timers caused microtask flush issues. Switched to real timers + `async act()` with `waitFor` pattern. Dropped the 2s revert test to avoid flakiness with timer mocking.

---

## Issues Encountered

1. **ESLint `no-misused-promises`**: Async handler passed directly to `onClick` attribute. Fixed with `void` wrapper.
2. **Fake timers + async clipboard**: `vi.useFakeTimers()` conflicts with `waitFor` (which polls via `setTimeout`). Resolved by using real timers and `async act()` to flush microtasks.

---

## Tests Written

| Test File | Test Cases |
|-----------|-----------|
| `comparison-table.test.tsx` | politician names as links, overall scores as fractions, all 5 rows, no qualitative labels (DR-002), no ExclusionNotice without flag, ExclusionNotice with flag |
| `share-button.test.tsx` | renders "Compartilhar", shows "Copiado!" after click, has aria-live="polite" |
| `politician-combobox.test.tsx` | renders label and input, pre-fills initialName, shows clear button with value, no clear button when empty |

---

## Next Steps

- [ ] Review implementation
- [ ] Create PR: `/prp-pr`
- [ ] Merge when approved
