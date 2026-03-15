# Implementation Report

**Plan**: `.claude/PRPs/plans/post-mvp-phase-1-analytics.plan.md`
**Branch**: `feat/post-mvp-phase-1-analytics`
**Date**: 2026-03-15
**Status**: COMPLETE

---

## Summary

Instrumented the platform with Plausible Analytics (LGPD-compliant, zero cookies) using `next-plausible@3.12.5` via the proxy approach. The Plausible script is served from same-origin (`/js/script.js`), bypassing ad-blockers without violating CSP. A shared typed `useAnalytics()` hook instruments 3 Client Components (SearchBar, RoleFilter, StateFilter) with custom events. `PlausibleProvider` wraps the root layout as a Server Component with zero client bundle cost. Analytics are disabled by default — only enabled in production Vercel via `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true`.

---

## Assessment vs Reality

| Metric     | Predicted | Actual | Reasoning |
| ---------- | --------- | ------ | --------- |
| Complexity | LOW       | LOW    | Matched — all changes were additive, no refactoring needed |
| Confidence | 8/10      | 9/10   | One deviation: `interface` → `type` for `PahEvents` due to TypeScript index signature constraint |

**Deviation from plan:**

- `PahEvents` was specified as `interface` in the plan but required `type` — TypeScript's `Events` constraint (`{ [K: string]: Props }`) requires an index signature, which `interface` cannot satisfy without explicitly adding one. `type` aliases satisfy structural compatibility checks and is the correct tool for non-extensible event maps.

---

## Tasks Completed

| #   | Task                                          | File                                                        | Status |
| --- | --------------------------------------------- | ----------------------------------------------------------- | ------ |
| 1   | Install `next-plausible` package              | `apps/web/package.json`                                     | ✅     |
| 2   | Create `analytics-events.ts` hook module      | `apps/web/src/lib/analytics-events.ts`                      | ✅     |
| 3   | Wrap next.config.ts with `withPlausibleProxy` | `apps/web/next.config.ts`                                   | ✅     |
| 4   | Add `PlausibleProvider` to root layout        | `apps/web/src/app/layout.tsx`                               | ✅     |
| 5   | Add Plausible env vars to `.env.example`      | `.env.example`                                              | ✅     |
| 6   | Add `busca_realizada` event to SearchBar      | `apps/web/src/components/filters/search-bar.tsx`            | ✅     |
| 7   | Add `filtro_aplicado` event to RoleFilter     | `apps/web/src/components/filters/role-filter.tsx`           | ✅     |
| 8   | Add `filtro_aplicado` event to StateFilter    | `apps/web/src/components/filters/state-filter.tsx`          | ✅     |

---

## Validation Results

| Check       | Result | Details                       |
| ----------- | ------ | ----------------------------- |
| Type check  | ✅     | `tsc --noEmit` — 0 errors     |
| Lint        | ✅     | `eslint src` — 0 errors       |
| Unit tests  | ✅     | 45 passed, 0 failed           |
| Build       | ✅     | `next build` compiled cleanly |
| Vercel build| ✅     | `.vercel/output` built in 23s |

---

## Files Changed

| File                                                        | Action | Lines  |
| ----------------------------------------------------------- | ------ | ------ |
| `apps/web/package.json`                                     | UPDATE | +1     |
| `apps/web/src/lib/analytics-events.ts`                      | CREATE | +10    |
| `apps/web/next.config.ts`                                   | UPDATE | +3/-1  |
| `apps/web/src/app/layout.tsx`                               | UPDATE | +8/-1  |
| `.env.example`                                              | UPDATE | +5     |
| `apps/web/src/components/filters/search-bar.tsx`            | UPDATE | +4/-2  |
| `apps/web/src/components/filters/role-filter.tsx`           | UPDATE | +5/-3  |
| `apps/web/src/components/filters/state-filter.tsx`          | UPDATE | +5/-3  |

---

## Deviations from Plan

- **`PahEvents` type**: Changed from `interface` to `type`. The `Events` constraint in `next-plausible` requires `{ [K: string]: Props }` index signature, which TypeScript only satisfies structurally via `type` aliases, not interfaces without explicit index signatures. The plan's CLAUDE.md rule ("prefer `interface` for object shapes") doesn't apply here because the type is constrained by the library's generic parameter.

---

## Issues Encountered

- First typecheck after Task 2 failed with `TS2344: Type 'PahEvents' does not satisfy the constraint 'Events'. Index signature for type 'string' is missing`. Fixed by changing `interface` to `type`.

---

## Tests Written

No new tests required (per plan's Testing Strategy section):

- `useAnalytics()` is a thin wrapper with no logic
- Custom events are fire-and-forget with correctness verified in Plausible dashboard
- Plausible is disabled in test environments — all 45 existing tests pass without mocking changes

---

## Next Steps

- [ ] Set `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true` and `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=autoridade-politica.com.br` in Vercel dashboard (production environment only)
- [ ] Create Plausible Cloud account and add `autoridade-politica.com.br` domain
- [ ] Create Goals in Plausible dashboard for `busca_realizada` and `filtro_aplicado` events
- [ ] Create PR: `/prp-pr`
- [ ] Continue with Phase 2 (Accessibility) in parallel
