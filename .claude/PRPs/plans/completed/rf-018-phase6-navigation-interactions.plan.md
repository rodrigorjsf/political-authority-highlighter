# Feature: RF-018 Phase 6 — Navigation & Interactions

## Summary

Validate the navigation system built in Phase 5, add page fade transitions to all 13 pages, fix accessibility gaps in all `loading.tsx` files, and clean up the header background token usage. This is the final UI phase — completing the Frontend Design PRD implementation and unlocking Phases 7–10 (testing infrastructure, visual regression, a11y enhancement, skills/CI).

## User Story

As a Brazilian citizen on mobile or desktop
I want pages to transition smoothly and navigation to feel polished
So that the platform conveys trust and professionalism even on a 3G connection

## Problem Statement

Phase 5 delivered the full navigation shell (glassmorphism header, desktop sidebar, tablet drawer, mobile bottom tab bar) and all component refinements. Three gaps remain before the UI phase is complete:

1. **No page fade transitions**: All `<main>` elements render without animation. PRD requires "300ms fade" on page entry.
2. **Loading page a11y gaps**: 8 `loading.tsx` files are missing `id="main-content"`, `tabIndex={-1}`, `aria-label`, and `focus:outline-none` — skip-link target fails during Suspense fallback.
3. **Hardcoded color in header**: `bg-white/70 dark:bg-[#0b0e14]/70` uses hardcoded hex values. `bg-background/70` is equivalent and uses design tokens, working through both `@media prefers-color-scheme` (CSS vars) and `data-theme` overrides.

## Solution Statement

Add `page-fade-in` keyframe via `tailwind.config.ts` (generates `animate-page-in` Tailwind class), apply `motion-safe:animate-page-in` to all `<main>` elements across 13 files, fix loading.tsx a11y attributes in 8 files, and replace the header hardcoded color with `bg-background/70`. Run `pnpm --filter @pah/web test` + `pnpm build` to confirm gate passes.

## Metadata

| Field            | Value                                                           |
| ---------------- | --------------------------------------------------------------- |
| Type             | ENHANCEMENT                                                     |
| Complexity       | LOW                                                             |
| Systems Affected | `apps/web/src/styles/`, `apps/web/tailwind.config.ts`, `apps/web/src/app/` (13 pages), `apps/web/src/components/navigation/` |
| Dependencies     | Phase 5 complete (✅ navigation built, tokens defined)          |
| Estimated Tasks  | 6                                                               |

---

## UX Design

### Before State

```
╔═══════════════════════════════════════════════════════════════════════╗
║                              BEFORE                                   ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║   Page navigation: content snaps in instantly (no transition)         ║
║   Loading states:  skip-link targets fail during Suspense fallback    ║
║   Header:          bg-white/70 dark:bg-[#0b0e14]/70 (hardcoded hex)  ║
║                                                                       ║
║   PAIN: Pages feel abrupt; skip links broken during loading;          ║
║         one hardcoded color bypasses the token system                 ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### After State

```
╔═══════════════════════════════════════════════════════════════════════╗
║                               AFTER                                   ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║   Page navigation: 300ms fade + 4px translateY — smooth and modern   ║
║   Loading states:  skip-link works during Suspense fallback           ║
║   Header:          bg-background/70 — token-based, both modes        ║
║                                                                       ║
║   VALUE: 100% PRD compliance on animations; no a11y regressions      ║
║          during loading; header uses full token system                ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| All pages `<main>` | No animation | 300ms fade-in + 4px slide | Page entry feels smooth and polished |
| Loading states | Skip link target broken | `id="main-content"` present | Keyboard users skip to content correctly |
| Header background | Hardcoded hex | CSS var token | Consistent token usage; correct in SSR |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `apps/web/tailwind.config.ts` | 1-60 | Pattern to EXTEND — add keyframes/animation here |
| P0 | `apps/web/src/styles/globals.css` | 1-30 | Tailwind v4 setup — `@custom-variant dark`, `@layer base`, motion-safe override |
| P0 | `apps/web/src/app/page.tsx` | 26-28 | MIRROR this `<main>` className pattern for all pages |
| P1 | `apps/web/src/app/politicos/[slug]/loading.tsx` | 1-47 | HAS `aria-label` pattern — other loading.tsx files need this too |
| P1 | `apps/web/src/components/navigation/layout-client.tsx` | 79-82 | Header line to update |
| P2 | `apps/web/src/app/politicos/[slug]/projetos/loading.tsx` | 1-24 | EXAMPLE of a loading.tsx MISSING a11y attrs — fix this pattern |

---

## Patterns to Mirror

**ANIMATION_CONFIG:**
```typescript
// SOURCE: apps/web/tailwind.config.ts — EXTEND this pattern (add after transitionDuration)
// Copy this approach for keyframes + animation:
theme: {
  extend: {
    // existing: colors, fontFamily, borderRadius, transitionDuration ...
    keyframes: {
      'page-fade-in': {
        from: { opacity: '0', transform: 'translateY(4px)' },
        to: { opacity: '1', transform: 'translateY(0)' },
      },
    },
    animation: {
      'page-in': 'page-fade-in 300ms ease-out',
    },
  },
}
```

**MAIN_ELEMENT_PATTERN:**
```tsx
// SOURCE: apps/web/src/app/page.tsx:26-28
// MIRROR exactly — add motion-safe:animate-page-in to ALL <main> elements:
<main
  id="main-content"
  tabIndex={-1}
  className="focus:outline-none motion-safe:animate-page-in"
>
```

> **Note**: For pages that have `container mx-auto px-4 py-8` in the className, add `motion-safe:animate-page-in` to that same className string.

**LOADING_A11Y_PATTERN:**
```tsx
// SOURCE: apps/web/src/app/politicos/[slug]/loading.tsx:3-4
// HAS aria-label — EXTEND to also include id + tabIndex + focus class:
// CORRECT full pattern:
<main
  id="main-content"
  tabIndex={-1}
  className="container mx-auto px-4 py-8 focus:outline-none"
  aria-label="Carregando [page-name]"
>
```

**MOTION_SAFE_EXISTING_PATTERN:**
```tsx
// SOURCE: apps/web/src/app/politicos/[slug]/loading.tsx:6
// motion-safe: prefix is already in use — FOLLOW this pattern:
<div className="h-32 w-32 ... motion-safe:animate-pulse rounded-full bg-muted" />
```

---

## Files to Change

| File | Action | Change |
|------|--------|--------|
| `apps/web/tailwind.config.ts` | EDIT | Add `keyframes` + `animation` to `theme.extend` |
| `apps/web/src/app/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/politicos/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/politicos/[slug]/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/politicos/[slug]/propostas/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/politicos/[slug]/atividades/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/metodologia/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/fontes/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/comparar/page.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/not-found.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/error.tsx` | EDIT | Add `motion-safe:animate-page-in` to `<main>` className |
| `apps/web/src/app/politicos/loading.tsx` | EDIT | Add `id`, `tabIndex={-1}`, `aria-label`, `focus:outline-none` |
| `apps/web/src/app/politicos/[slug]/loading.tsx` | EDIT | Add `id`, `tabIndex={-1}`, `focus:outline-none` (has `aria-label`) |
| `apps/web/src/app/politicos/[slug]/projetos/loading.tsx` | EDIT | Add `id`, `tabIndex={-1}`, `aria-label`, `focus:outline-none` |
| `apps/web/src/app/politicos/[slug]/votacoes/loading.tsx` | EDIT | Add `id`, `tabIndex={-1}`, `aria-label`, `focus:outline-none` |
| `apps/web/src/app/politicos/[slug]/despesas/loading.tsx` | EDIT | Add `id`, `tabIndex={-1}`, `aria-label`, `focus:outline-none` |
| `apps/web/src/app/politicos/[slug]/propostas/loading.tsx` | EDIT | Add `id`, `tabIndex={-1}`, `aria-label`, `focus:outline-none` |
| `apps/web/src/app/politicos/[slug]/atividades/loading.tsx` | EDIT | Add `id`, `tabIndex={-1}`, `aria-label`, `focus:outline-none` |
| `apps/web/src/app/comparar/loading.tsx` | EDIT | Add `id`, `tabIndex={-1}`, `aria-label`, `focus:outline-none` |
| `apps/web/src/components/navigation/layout-client.tsx` | EDIT | Header: `bg-white/70 dark:bg-[#0b0e14]/70` → `bg-background/70` |

---

## Task Breakdown

### Task 1: Add `page-fade-in` keyframe to `tailwind.config.ts`

**File**: `apps/web/tailwind.config.ts`

Add to `theme.extend` (after the existing `transitionDuration` block):

```typescript
keyframes: {
  'page-fade-in': {
    from: { opacity: '0', transform: 'translateY(4px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
},
animation: {
  'page-in': 'page-fade-in 300ms ease-out',
},
```

This generates the Tailwind class `animate-page-in`.

**Verify**: `animate-page-in` works with Tailwind IntelliSense or check that `pnpm build` finds no unknown class warnings.

---

### Task 2: Apply `motion-safe:animate-page-in` to all `<main>` elements

For each page listed below, add `motion-safe:animate-page-in` to the existing `className` string on the `<main>` element. Do NOT change `id`, `tabIndex`, or other attributes.

**Pages to update** (append to className — no restructuring needed):

| File | Current `<main>` className | Add |
|------|---------------------------|-----|
| `apps/web/src/app/page.tsx` | `"focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/politicos/page.tsx` | `"container mx-auto px-4 py-8 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/politicos/[slug]/page.tsx` | `"container mx-auto px-4 py-8 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | `"container mx-auto px-4 py-8 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` | `"container mx-auto px-4 py-8 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | `"container mx-auto px-4 py-8 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/politicos/[slug]/propostas/page.tsx` | `"container mx-auto px-4 py-8 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/politicos/[slug]/atividades/page.tsx` | `"container mx-auto px-4 py-8 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/metodologia/page.tsx` | `"container mx-auto px-4 py-8 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/fontes/page.tsx` | `"container mx-auto px-4 py-8 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/comparar/page.tsx` | `"container mx-auto px-4 py-8 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/not-found.tsx` | `"flex min-h-[50vh] flex-col items-center justify-center gap-4 focus:outline-none"` | `motion-safe:animate-page-in` |
| `apps/web/src/app/error.tsx` | `"flex min-h-[50vh] flex-col items-center justify-center gap-4 focus:outline-none"` | `motion-safe:animate-page-in` |

**IMPORTANT**: The global `@media (prefers-reduced-motion: reduce)` in `globals.css` overrides `animation-duration: 0.01ms !important` for all elements. The `motion-safe:` Tailwind prefix (which uses `@media (prefers-reduced-motion: no-preference)`) adds an extra layer of intent clarity. Both work together correctly — no conflict.

---

### Task 3: Fix loading page accessibility

Loading pages render as the Suspense fallback while the page is streaming. The skip-link `href="#main-content"` must work during loading — so `id="main-content"` must be on `<main>` in every loading state.

**Pattern to apply to EVERY loading.tsx:**

```tsx
<main
  id="main-content"
  tabIndex={-1}
  className="container mx-auto px-4 py-8 focus:outline-none"
  aria-label="Carregando [descriptive name]"
>
```

**File-by-file changes:**

| File | `aria-label` value | Current state |
|------|-------------------|---------------|
| `apps/web/src/app/politicos/loading.tsx` | `"Carregando lista de políticos"` | Missing id, tabIndex, aria-label |
| `apps/web/src/app/politicos/[slug]/loading.tsx` | `"Carregando perfil do político"` ✅ already has | Missing id, tabIndex, focus class |
| `apps/web/src/app/politicos/[slug]/projetos/loading.tsx` | `"Carregando projetos de lei"` | Missing all |
| `apps/web/src/app/politicos/[slug]/votacoes/loading.tsx` | `"Carregando votações"` | Missing all |
| `apps/web/src/app/politicos/[slug]/despesas/loading.tsx` | `"Carregando despesas"` | Missing all |
| `apps/web/src/app/politicos/[slug]/propostas/loading.tsx` | `"Carregando propostas"` | Missing all |
| `apps/web/src/app/politicos/[slug]/atividades/loading.tsx` | `"Carregando atividades"` | Missing all |
| `apps/web/src/app/comparar/loading.tsx` | `"Carregando comparação"` | Missing all |

---

### Task 4: Fix header background token

**File**: `apps/web/src/components/navigation/layout-client.tsx`
**Line**: ~80

**Change**:
```tsx
// BEFORE
className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-border backdrop-blur-md bg-white/70 dark:bg-[#0b0e14]/70"

// AFTER
className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-border backdrop-blur-md bg-background/70"
```

**Rationale**: `bg-background/70` resolves to `color-mix(in srgb, var(--color-background) 70%, transparent)`. Since `--color-background` is `#FFFFFF` in light mode and `#0B0E14` in dark mode (via both `@media prefers-color-scheme` and `[data-theme]`), this works correctly in all scenarios including SSR (CSS-only) without needing the `dark:` Tailwind prefix.

---

### Task 5: Navigation audit

Verify against the Frontend Design PRD (docs/prd/frontend_design_prd.md §4.2) and the Phase 5 plan:

| PRD Requirement | Implementation | Status |
|-----------------|----------------|--------|
| Header: `backdrop-blur-md` glassmorphism | `backdrop-blur-md` on header | ✅ |
| Header: sticky top | `fixed left-0 right-0 top-0 z-50` | ✅ |
| Desktop sidebar: 280px fixed left | `fixed w-[280px]... lg:flex` | ✅ |
| Mobile: bottom tab bar | `fixed bottom-0... sm:hidden` | ✅ |
| Tablet: collapsible drawer | `translate-x-0 / -translate-x-full` slide | ✅ |
| Touch targets: 44px min | `min-h-[44px] min-w-[44px]` on all interactive | ✅ |
| `aria-current="page"` on active nav | `isActive ? 'page' : undefined` | ✅ |
| `aria-label` on nav landmarks | `aria-label="Navegação principal"` | ✅ |
| Hamburger: `aria-expanded`, `aria-controls` | Present with `drawerOpen` state | ✅ |
| Theme toggle visible in header | `<ThemeToggle />` always visible | ✅ |

No code changes required from this audit — Phase 5 fully delivered navigation.

---

### Task 6: Build + test gate

Run in order:

```bash
# Unit tests (Vitest — all 70+ tests must pass)
pnpm --filter @pah/web test

# Full monorepo build (catches Next.js compilation errors)
pnpm build

# Optional: E2E a11y scan (requires dev server)
pnpm --filter @pah/web test:e2e
```

All three must pass before Phase 6 is marked complete. Fix any failures before proceeding.

---

## Architecture Notes

**Why `tailwind.config.ts` for keyframes (not `globals.css`)**: The project already uses `tailwind.config.ts` for all token mappings (`colors`, `fontFamily`, `borderRadius`, `transitionDuration`). Adding `keyframes`/`animation` here keeps all Tailwind extension logic in one place. The `@config "../../tailwind.config.ts"` directive in `globals.css` processes this file, so the generated `animate-page-in` class is available project-wide.

**Why `motion-safe:` prefix**: Three layers of motion safety:
1. `motion-safe:animate-page-in` → animation only applied at CSS class level when `prefers-reduced-motion: no-preference`
2. `@layer base @media (prefers-reduced-motion: reduce)` in `globals.css` → overrides `animation-duration: 0.01ms !important` as global fallback
3. PRD spec: "motion should be purposeful, never purely decorative"

**Token cleanup rationale**: Tailwind v4 with CSS vars uses `color-mix()` for opacity modifiers. `bg-background/70` generates `background-color: color-mix(in srgb, var(--color-background) 70%, transparent)`. This is supported in all modern browsers and resolves correctly through both CSS custom property update strategies (media query and `data-theme` attribute).

---

## Validation Checklist (before marking complete)

- [ ] `pnpm --filter @pah/web test` passes (all Vitest unit tests)
- [ ] `pnpm build` passes (no Next.js compilation errors)
- [ ] All `<main>` elements have `motion-safe:animate-page-in` (grep: `grep -r "id=\"main-content\"" apps/web/src/app`)
- [ ] All `loading.tsx` files have `id="main-content"` (grep: `grep -rn "loading.tsx" --include="*.tsx"`)
- [ ] Header uses `bg-background/70` (no hardcoded hex in header className)
- [ ] No hardcoded hex colors outside `tokens.css` in `layout-client.tsx` (grep: `grep "#" apps/web/src/components/navigation/layout-client.tsx`)
- [ ] `pnpm --filter @pah/web test:e2e` passes a11y scan on all pages

---

## Success Signal

Navigation passes keyboard navigation test; page transitions render at 60fps (verified via Chrome DevTools Performance); all pages visually consistent in both modes; `pnpm build` + `pnpm --filter @pah/web test` pass.

After Phase 6, update PRD status:
```
| 6 | **Navigation & Interactions** | ... | pending → complete | - | 5 | `.claude/PRPs/plans/completed/rf-018-phase6-navigation-interactions.plan.md` |
```
