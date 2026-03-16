# Implementation Report

**Plan**: `.claude/PRPs/plans/rf-018-phase2-3-4-fonts-darkmode-homepage.plan.md`
**Branch**: `feat/rf-018-phase2-3-4-fonts-darkmode-homepage`
**Date**: 2026-03-16
**Status**: COMPLETE

---

## Summary

Implemented three parallel frontend capabilities completing the visual foundation for RF-018:

1. **Phase 2 — Custom Fonts**: `Inter` and `JetBrains_Mono` loaded via `next/font/google` with `display: swap`, CSS variables `--font-inter`/`--font-jetbrains-mono` wired into `tokens.css` via `var()` fallback pattern. Latin-ext subset included for Portuguese characters.

2. **Phase 3 — Dark Mode**: Zero-FOUC `ThemeScript` Server Component inlines a script in `<head>` to read `localStorage['pah-theme']` and OS preference before first paint. `ThemeToggle` Client Component provides Sun/Moon toggle with mounted-guard to prevent hydration mismatch. `suppressHydrationWarning` added to `<html>`.

3. **Phase 4 — Home Page**: `/` page created as async Server Component with hero section (heading + description + CTA), bento grid of top-3 politician cards (via `fetchPoliticians({ limit: 3 })`), ISR revalidation at 3600s, full SEO metadata and OpenGraph tags.

---

## Assessment vs Reality

| Metric | Predicted | Actual | Reasoning |
|--------|-----------|--------|-----------|
| Complexity | MEDIUM | MEDIUM | Matched — all files existed or were created as specified |
| Confidence | HIGH | HIGH | Root cause was correct; patterns from existing pages transferred cleanly |

**Deviations from plan:**

- `theme-toggle.tsx`: replaced `as 'light' | 'dark'` type assertion with `value === 'dark' ? 'dark' : 'light'` ternary to comply with `no-unsafe-assignment` lint rule (avoids `as` assertion per project TypeScript rules)
- Unit tests: `localStorage.clear()` unavailable in jsdom environment; used `vi.stubGlobal('localStorage', createLocalStorageMock())` with a custom in-memory implementation

---

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 2.1 | UPDATE font CSS variables | `apps/web/src/styles/tokens.css` | ✅ |
| 2.2 | UPDATE layout with Inter + JetBrains Mono | `apps/web/src/app/layout.tsx` | ✅ |
| 3.1 | CREATE ThemeScript Server Component | `apps/web/src/components/theme-script.tsx` | ✅ |
| 3.2 | CREATE ThemeToggle Client Component | `apps/web/src/components/theme-toggle.tsx` | ✅ |
| 3.3 | UPDATE layout with ThemeScript + ThemeToggle | `apps/web/src/app/layout.tsx` | ✅ |
| 4.1 | CREATE home page | `apps/web/src/app/page.tsx` | ✅ |
| T1 | WRITE ThemeToggle unit tests | `apps/web/src/components/theme-toggle.test.tsx` | ✅ |
| T2 | WRITE HomePage unit tests | `apps/web/src/app/page.test.tsx` | ✅ |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check | ✅ | `pnpm --filter @pah/web typecheck` — 0 errors |
| Lint | ✅ | `pnpm --filter @pah/web lint` — 0 errors |
| Unit tests | ✅ | 70 passed (13 test files), 0 failed |
| Build | ✅ | `pnpm build` — all 9 static pages generated; `/` shows as `○ Static` |

---

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `apps/web/src/styles/tokens.css` | UPDATE | `--font-sans`/`--font-mono` now use `var(--font-inter)`/`var(--font-jetbrains-mono)` fallback pattern |
| `apps/web/src/app/layout.tsx` | UPDATE | Inter + JetBrains_Mono fonts, ThemeScript in `<head>`, ThemeToggle in fixed top-right, `suppressHydrationWarning` |
| `apps/web/src/components/theme-script.tsx` | CREATE | Server Component; IIFE sets `data-theme` from localStorage/OS pref before first paint |
| `apps/web/src/components/theme-toggle.tsx` | CREATE | Client Component; Sun/Moon toggle; mounted guard prevents SSR mismatch |
| `apps/web/src/app/page.tsx` | CREATE | Hero + bento grid + CTA; ISR 3600s; full SEO metadata |
| `apps/web/src/components/theme-toggle.test.tsx` | CREATE | 7 tests: toggle behavior, localStorage writes, data-theme attribute |
| `apps/web/src/app/page.test.tsx` | CREATE | 5 tests: hero heading, CTA link, politician cards, error fallback, empty state |

---

## Tests Written

| Test File | Test Cases |
|-----------|-----------|
| `apps/web/src/components/theme-toggle.test.tsx` | renders button after hydration; defaults to light mode; reads dark from localStorage; toggles light→dark; writes to localStorage; sets data-theme; toggles dark→light |
| `apps/web/src/app/page.test.tsx` | renders hero heading; renders CTA to /politicos; renders politician cards; graceful empty on API throw; no featured section when empty |

---

## Next Steps

- [ ] Review and approve PR
- [ ] Merge to main
- [ ] Continue with RF-018 Phase 5: Component Refinement
