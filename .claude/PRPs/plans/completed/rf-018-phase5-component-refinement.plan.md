# Feature: RF-018 Phase 5 — Component Refinement

## Summary

Refine all UI components across the frontend to match the Frontend Design PRD (`docs/prd/frontend_design_prd.md`) specifications. This phase upgrades border radii on cards/panels from `rounded-lg` to `rounded-xl`, adds missing button states (focus, active, disabled) across all interactive elements, enforces 44px minimum touch targets on form inputs, adds table row hover states, and applies `font-mono` to all score/number displays. No new components are created — this is a systematic refinement of existing inline patterns.

## User Story

As a Brazilian citizen on a mobile device
I want a polished, consistent interface with proper interactive feedback
So that I feel confident the platform is trustworthy and professional

## Problem Statement

Components implement ~70% of the Frontend Design PRD spec. Key gaps: cards use `rounded-lg` instead of `rounded-xl`; buttons lack consistent `:active` and `:disabled` states; inputs miss 44px minimum height; table rows have no hover feedback; score numbers don't use `font-mono` (JetBrains Mono). These gaps create visual inconsistency and reduce perceived quality.

## Solution Statement

Systematically update every component and page to match the PRD spec, using the existing CSS variable token system. All changes use semantic Tailwind classes that resolve through `tokens.css`, so dark mode is inherited automatically. No new dependencies. No new components.

## Metadata

| Field            | Value |
| ---------------- | ----- |
| Type             | ENHANCEMENT |
| Complexity       | MEDIUM |
| Systems Affected | `apps/web/src/components/`, `apps/web/src/app/` |
| Dependencies     | None (tokens already defined in Phase 1) |
| Estimated Tasks  | 12 |

---

## UX Design

### Before State

```
╔═══════════════════════════════════════════════════════════════╗
║                          BEFORE                              ║
╠═══════════════════════════════════════════════════════════════╣
║                                                              ║
║   Cards:     rounded-lg (8px radius)                         ║
║   Buttons:   hover + focus only (no active, inconsistent)    ║
║   Inputs:    ~36px height, no hover state                    ║
║   Tables:    no row hover, flat and static                   ║
║   Scores:    tabular-nums only, system font not JetBrains    ║
║                                                              ║
║   PAIN: Components feel ~70% finished; inconsistent          ║
║         interactive states reduce trust signal                ║
╚═══════════════════════════════════════════════════════════════╝
```

### After State

```
╔═══════════════════════════════════════════════════════════════╗
║                           AFTER                              ║
╠═══════════════════════════════════════════════════════════════╣
║                                                              ║
║   Cards:     rounded-xl (12px radius), consistent surface bg ║
║   Buttons:   hover + focus + active + disabled (all 4)       ║
║              Primary: -translate-y-[1px] + shadow on hover   ║
║              Disabled: opacity-50 + cursor-not-allowed       ║
║   Inputs:    min-h-[44px], hover:border-ring/50              ║
║   Tables:    hover:bg-muted on data rows, transition         ║
║   Scores:    font-mono tabular-nums (JetBrains Mono)         ║
║                                                              ║
║   VALUE: 100% PRD compliance on component specs;             ║
║          professional, tactile, trustworthy feel              ║
╚═══════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| PoliticianCard | `rounded-lg` | `rounded-xl` | Softer, more modern card appearance |
| All primary buttons | Inconsistent hover/focus | Uniform: translate-up + shadow + ring + active | Clear tactile click feedback |
| All inputs/selects | ~36px height, no hover | 44px min height, border highlight on hover | Easier to tap on mobile |
| All data table rows | No hover | `hover:bg-muted transition-colors` | Visual row tracking while reading |
| Score numbers | System font | JetBrains Mono via `font-mono` | Analytical "data dashboard" feel |
| Disabled buttons | `disabled:opacity-50` only | + `cursor-not-allowed` | Clear non-interactive signal |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `docs/prd/frontend_design_prd.md` | all | Authoritative design spec — ALL component changes must match this |
| P0 | `apps/web/src/styles/tokens.css` | all | Token inventory — use only semantic names from here |
| P0 | `apps/web/tailwind.config.ts` | all | Tailwind ↔ token mapping — know available class names |
| P1 | `apps/web/src/components/politician/politician-card.tsx` | all | PRIMARY card pattern to update |
| P1 | `apps/web/src/components/politician/score-breakdown.tsx` | all | Score display pattern to update |
| P1 | `apps/web/src/app/page.tsx` | all | Homepage CTA — REFERENCE pattern for button hover |
| P2 | `apps/web/src/components/politician/politician-card.test.tsx` | all | Test pattern to FOLLOW |
| P2 | `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | 70-111 | Table pattern — REFERENCE for row hover |
| P2 | `apps/web/src/components/filters/search-bar.tsx` | 38-47 | Input pattern to update |

---

## Patterns to Mirror

**CARD_PATTERN (current — to be upgraded):**

```tsx
// SOURCE: apps/web/src/components/politician/politician-card.tsx:32
// CURRENT:
<article className="rounded-lg border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-md">
// CHANGE TO:
<article className="rounded-xl border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-md">
```

**BUTTON_PRIMARY (reference — homepage CTA already correct):**

```tsx
// SOURCE: apps/web/src/app/page.tsx:37-38
// THIS IS THE GOLD STANDARD — replicate hover pattern:
className="inline-flex items-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
```

**BUTTON_SECONDARY (reference — pagination links):**

```tsx
// SOURCE: apps/web/src/app/politicos/page.tsx:90
className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
```

**INPUT_PATTERN (current):**

```tsx
// SOURCE: apps/web/src/components/filters/search-bar.tsx:46
className="w-64 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
```

**TABLE_ROW_PATTERN (current — to add hover):**

```tsx
// SOURCE: apps/web/src/app/politicos/[slug]/projetos/page.tsx:82
// CURRENT:
<tr key={bill.id} className="border-b border-border">
// CHANGE TO:
<tr key={bill.id} className="border-b border-border transition-colors hover:bg-muted">
```

**TEST_STRUCTURE:**

```tsx
// SOURCE: apps/web/src/components/politician/politician-card.test.tsx:19-53
describe('PoliticianCard', () => {
  it('verb + expected behavior', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    expect(screen.getByRole('article')).toBeInTheDocument()
  })
})
```

---

## Files to Change

| File | Action | Justification |
| ---- | ------ | ------------- |
| `apps/web/src/components/politician/politician-card.tsx` | UPDATE | Card radius `rounded-lg` → `rounded-xl`; score `font-mono` |
| `apps/web/src/components/politician/score-breakdown.tsx` | UPDATE | Score numbers: add `font-mono` class |
| `apps/web/src/components/politician/score-badge.tsx` | UPDATE | Score numbers: add `font-mono` class |
| `apps/web/src/components/politician/subscribe-form.tsx` | UPDATE | Button: add focus/active/cursor-not-allowed; input: min-h |
| `apps/web/src/components/filters/search-bar.tsx` | UPDATE | Input: add min-h-[44px], hover state |
| `apps/web/src/components/filters/role-filter.tsx` | UPDATE | Select: add min-h-[44px], hover state |
| `apps/web/src/components/filters/state-filter.tsx` | UPDATE | Select: add min-h-[44px], hover state |
| `apps/web/src/components/comparison/politician-combobox.tsx` | UPDATE | Input: min-h; suggestion hover; clear button states |
| `apps/web/src/components/comparison/share-button.tsx` | UPDATE | Button: add active state, transition |
| `apps/web/src/components/comparison/comparison-table.tsx` | UPDATE | Row hover, score `font-mono` |
| `apps/web/src/app/page.tsx` | UPDATE | (Already correct — verify only) |
| `apps/web/src/app/politicos/page.tsx` | UPDATE | Pagination links: add active state, transition |
| `apps/web/src/app/politicos/[slug]/page.tsx` | UPDATE | Score display: `font-mono`; score card: `rounded-xl`; tab links: consistent states |
| `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | UPDATE | Table rows: hover state; pagination: active state |
| `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` | UPDATE | Table rows: hover state; pagination: active state |
| `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | UPDATE | Table rows: hover state; pagination: active state |
| `apps/web/src/app/politicos/[slug]/propostas/page.tsx` | UPDATE | Table rows: hover state; pagination: active state |
| `apps/web/src/app/politicos/[slug]/atividades/page.tsx` | UPDATE | Table rows: hover state |
| `apps/web/src/app/metodologia/page.tsx` | UPDATE | Card containers: `rounded-lg` → `rounded-xl` |
| `apps/web/src/app/fontes/page.tsx` | UPDATE | Table rows: hover state |
| `apps/web/src/app/error.tsx` | UPDATE | Button: add hover, transition, active state |
| `apps/web/src/app/not-found.tsx` | UPDATE | Link: add transition |
| `apps/web/src/app/comparar/page.tsx` | UPDATE | (Check for any card containers) |
| `apps/web/src/components/politician/exclusion-notice.tsx` | UPDATE | Container: `rounded-md` → `rounded-lg` (inner element per PRD) |

---

## NOT Building (Scope Limits)

- **No new component files** — no `Button.tsx`, `Card.tsx`, or `Badge.tsx` wrapper components. The PRD decision was "Continue with pure Tailwind" (not adopt shadcn/ui). Keep inline utility patterns.
- **No score color mapping** — Design PRD Section 5.1 suggests green/yellow colors based on score range, but DR-002 overrides this: "NO red/green for 'bad'/'good' politicians." Keep neutral `bg-primary` for all progress bars.
- **No glassmorphism header** — that is Phase 6 (Navigation Redesign).
- **No micro-interactions/animations** — that is Phase 7.
- **No skeleton loaders** — that is Phase 7.
- **No page transitions** — that is Phase 7.

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

### Task 1: UPDATE `apps/web/src/components/politician/politician-card.tsx` — Card + Score

- **ACTION**: Upgrade card border radius and add `font-mono` to score display
- **CHANGES**:
  - Line 32: `rounded-lg` → `rounded-xl` on `<article>`
  - Line 35: `rounded-lg` → `rounded-xl` on inner `<Link>` focus ring wrapper
  - Line 79: Add `font-mono` class to score `<span>`: `"font-mono tabular-nums text-sm font-semibold text-primary"`
- **MIRROR**: Homepage CTA uses `rounded-xl` already (`page.tsx:38`)
- **GOTCHA**: Keep `shadow-xs` not `shadow-sm` — Tailwind v4 renamed `shadow-sm` to `shadow-xs`
- **VALIDATE**: `pnpm --filter @pah/web test` — all 6 existing PoliticianCard tests must still pass

### Task 2: UPDATE `apps/web/src/components/politician/score-breakdown.tsx` — Score Font

- **ACTION**: Add `font-mono` to all score number displays in ScoreItem
- **CHANGES**:
  - Line 27: Add `font-mono` to score value span: `"font-mono text-sm font-medium tabular-nums"`
- **MIRROR**: Consistent with score-badge.tsx and politician-card.tsx patterns
- **GOTCHA**: Don't add `font-mono` to the label text — only the numeric value
- **VALIDATE**: `pnpm --filter @pah/web test` — all 6 ScoreBreakdown tests must pass

### Task 3: UPDATE `apps/web/src/components/politician/score-badge.tsx` — Score Font

- **ACTION**: Add `font-mono` to score badge display
- **CHANGES**:
  - Line 13: `"tabular-nums text-sm font-semibold text-primary"` → `"font-mono tabular-nums text-sm font-semibold text-primary"`
- **VALIDATE**: `pnpm --filter @pah/web test`

### Task 4: UPDATE `apps/web/src/components/politician/subscribe-form.tsx` — Button + Input

- **ACTION**: Standardize button states and add 44px input height
- **CHANGES**:
  - Line 83 (input): Add `min-h-[44px]` and hover state: `"flex-1 min-h-[44px] rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"`
  - Line 89 (button): Standardize to full state set: `"min-h-[44px] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"`
- **GOTCHA**: `disabled:hover:translate-y-0` prevents translate on disabled state
- **VALIDATE**: `pnpm --filter @pah/web test`

### Task 5: UPDATE `apps/web/src/components/filters/search-bar.tsx` — Input Height

- **ACTION**: Add 44px min height and hover state to search input
- **CHANGES**:
  - Line 46: Add `min-h-[44px]` and `transition-colors hover:border-ring/50`: `"w-64 min-h-[44px] rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring"`
- **VALIDATE**: `pnpm --filter @pah/web test` — all 4 SearchBar tests must pass

### Task 6: UPDATE `apps/web/src/components/filters/role-filter.tsx` — Select Height

- **ACTION**: Add 44px min height and hover state to role select
- **CHANGES**:
  - Line 46: Add `min-h-[44px]` and `transition-colors hover:border-ring/50`: `"min-h-[44px] rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring"`
- **VALIDATE**: `pnpm --filter @pah/web test` — role-filter tests pass

### Task 7: UPDATE `apps/web/src/components/filters/state-filter.tsx` — Select Height

- **ACTION**: Same as Task 6 — add 44px min height and hover state to state select
- **CHANGES**: Same pattern as role-filter — find the `<select>` className and add `min-h-[44px] transition-colors hover:border-ring/50`
- **VALIDATE**: `pnpm --filter @pah/web test`

### Task 8: UPDATE `apps/web/src/components/comparison/` — Combobox + ShareButton + Table

- **ACTION**: Update comparison components: input height, button states, table row hover, score font
- **CHANGES**:
  - `politician-combobox.tsx`: Input at ~line 82 — add `min-h-[44px] transition-colors hover:border-ring/50`; clear button — add `transition-colors active:bg-muted/80`
  - `share-button.tsx`: Button at ~line 37 — add `transition-colors active:bg-muted/80`
  - `comparison-table.tsx`: Score cells at lines 90-91 — add `font-mono`: `"p-4 text-sm font-semibold font-mono tabular-nums text-primary"`; data rows at line 86 — add `transition-colors hover:bg-muted`
- **VALIDATE**: `pnpm --filter @pah/web test`

### Task 9: UPDATE all data table pages — Row Hover

- **ACTION**: Add `transition-colors hover:bg-muted` to all `<tr>` elements in table bodies across 5 tab pages + fontes
- **FILES** (each has `<tr>` rows in `<tbody>`):
  - `apps/web/src/app/politicos/[slug]/projetos/page.tsx` line 82: `"border-b border-border"` → `"border-b border-border transition-colors hover:bg-muted"`
  - `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` line 91: same change
  - `apps/web/src/app/politicos/[slug]/despesas/page.tsx` line 102: same change
  - `apps/web/src/app/politicos/[slug]/propostas/page.tsx` line 88: same change
  - `apps/web/src/app/politicos/[slug]/atividades/page.tsx` line 86: same change
  - `apps/web/src/app/fontes/page.tsx` line 57 (SourceRow): same change
- **MIRROR**: Design PRD Section 5.2: "Entire row must highlight subtly on desktop"
- **GOTCHA**: Use `hover:bg-muted` (maps to `var(--color-surface)`) — works in both light/dark
- **VALIDATE**: `pnpm --filter @pah/web typecheck` (no tests for table pages currently)

### Task 10: UPDATE all pagination links + tab links — Consistent Button States

- **ACTION**: Add `transition-colors active:bg-muted/80` to all pagination nav links and profile tab links
- **FILES**:
  - `apps/web/src/app/politicos/page.tsx` lines 90, 98: add `transition-colors active:bg-muted/80`
  - `apps/web/src/app/politicos/[slug]/projetos/page.tsx` lines 119, 127: same
  - `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` lines 128, 136: same
  - `apps/web/src/app/politicos/[slug]/despesas/page.tsx` lines 138, 146: same
  - `apps/web/src/app/politicos/[slug]/propostas/page.tsx` lines 133, 141: same
  - `apps/web/src/app/politicos/[slug]/page.tsx` line 178 (profile tab links): add `active:bg-muted/80`
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

### Task 11: UPDATE profile page + methodology + error/not-found — Container Radius + Button States

- **ACTION**: Upgrade container radii and standardize button states on remaining pages
- **CHANGES**:
  - `apps/web/src/app/politicos/[slug]/page.tsx` line 147: Score card `rounded-lg` → `rounded-xl`; line 150: score display add `font-mono`: `"mt-1 font-mono text-4xl font-bold tabular-nums"`
  - `apps/web/src/app/metodologia/page.tsx`: All card containers `rounded-lg` → `rounded-xl` (lines 39, 56, 63, 70, 77, 177)
  - `apps/web/src/app/error.tsx` line 25: Add hover and transition to reset button: `"rounded-md bg-primary px-4 py-2 text-primary-foreground transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:translate-y-0"`
  - `apps/web/src/app/not-found.tsx` line 14: Add transition: `"text-primary underline transition-colors focus:outline-none focus:ring-2 focus:ring-ring"`
  - `apps/web/src/components/politician/exclusion-notice.tsx` line 8: Keep `rounded-md` (inner panel per PRD spec — this is correct for an inner element; no change needed)
- **VALIDATE**: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web test`

### Task 12: VALIDATE — Full Build + Test Suite

- **ACTION**: Run complete validation pipeline
- **COMMANDS**:
  1. `pnpm --filter @pah/web test` — all unit tests pass
  2. `pnpm lint` — zero warnings across all packages
  3. `pnpm typecheck` — tsc --noEmit passes
  4. `pnpm build` — full build succeeds (catches Next.js webpack errors)
  5. `vercel build --yes` — simulates Vercel CI environment
- **GOTCHA**: If any test fails, fix the test to match the new class patterns (e.g., test querying for `rounded-lg` needs update to `rounded-xl`)
- **VALIDATE**: All 5 commands exit 0

---

## DR-002 Design Decision: Score Colors

The Frontend Design PRD Section 5.1 suggests dynamic score colors: "Green for >80, Yellow for 50-79." However, **DR-002 (Critical Domain Rule) overrides this**: "No party colors anywhere in the UI. Use a neutral gray/blue palette." The web CLAUDE.md explicitly states: "NO red/green for 'bad'/'good' politicians."

**Decision**: Keep `bg-primary` (neutral blue) for all score progress bars. Do NOT implement score-range color mapping. This is a deliberate violation of Design PRD Section 5.1 in favor of the higher-priority Domain Rule DR-002.

---

## Testing Strategy

### Unit Tests to Update/Verify

| Test File | Expected Impact | Action |
| --------- | --------------- | ------ |
| `politician-card.test.tsx` | 6 tests — no breakage expected (tests check content, not CSS classes) | RUN — verify pass |
| `score-breakdown.test.tsx` | 6 tests — no breakage expected | RUN — verify pass |
| `score-badge.test.tsx` | (none exists) | SKIP — low value for class-only change |
| `subscribe-form.test.tsx` | (if exists) | RUN — verify pass |
| `search-bar.test.tsx` | 4 tests — no breakage expected | RUN — verify pass |
| `role-filter.test.tsx` | 4 tests — no breakage expected | RUN — verify pass |
| `state-filter.test.tsx` | tests — no breakage expected | RUN — verify pass |
| `theme-toggle.test.tsx` | 7 tests — unaffected | RUN — verify pass |
| `page.test.tsx` (homepage) | 5 tests — no breakage expected | RUN — verify pass |

### Edge Cases Checklist

- [ ] `font-mono` class renders correctly when JetBrains Mono font is loaded
- [ ] `font-mono` fallback chain works when font fails to load (Roboto Mono → monospace)
- [ ] `min-h-[44px]` doesn't break mobile layout with flex containers
- [ ] `hover:bg-muted` on table rows doesn't conflict with sticky columns in comparison table
- [ ] `disabled:hover:translate-y-0` correctly prevents hover animation on disabled buttons
- [ ] `active:translate-y-0` resets the translate on mouse down
- [ ] `hover:border-ring/50` (50% opacity border) provides visible but subtle hover feedback
- [ ] `transition-colors` doesn't cause jank on table rows with many cells
- [ ] Dark mode: all hover/active states look correct (automatic via token system)

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm lint && pnpm typecheck
```

**EXPECT**: Exit 0, zero errors or warnings

### Level 2: UNIT_TESTS

```bash
pnpm --filter @pah/web test
```

**EXPECT**: All tests pass (currently ~40+ tests across 10+ files)

### Level 3: FULL_SUITE

```bash
pnpm test && pnpm build
```

**EXPECT**: All tests pass, build succeeds with no webpack errors

### Level 4: VERCEL_BUILD

```bash
vercel build --yes
```

**EXPECT**: Simulated Vercel deploy succeeds — final CI gate

### Level 5: BROWSER_VALIDATION (manual)

If browser MCP is available:

- [ ] Navigate to `/` — verify CTA button hover animation
- [ ] Navigate to `/politicos` — verify card `rounded-xl`, score uses JetBrains Mono
- [ ] Navigate to `/politicos/[slug]` — verify large score display uses JetBrains Mono
- [ ] Navigate to `/politicos/[slug]/projetos` — verify table row hover
- [ ] Toggle dark mode — verify all hover/active states work in both themes
- [ ] Check inputs on mobile viewport (375px) — verify 44px touch target

---

## Acceptance Criteria

- [ ] All cards/panels use `rounded-xl` (outer containers per PRD spec)
- [ ] All primary buttons have: hover (-translate-y-[1px] + shadow), focus (ring), active (translate-y-0), disabled (opacity-50 + cursor-not-allowed)
- [ ] All secondary buttons/links have: hover (bg-muted), focus (ring), active (bg-muted/80)
- [ ] All form inputs/selects have: `min-h-[44px]`, hover (border highlight), focus (ring)
- [ ] All table body rows have: `transition-colors hover:bg-muted`
- [ ] All score/number displays use `font-mono` class (JetBrains Mono)
- [ ] No hardcoded color values introduced
- [ ] No DR-002 violations (no score-based color mapping)
- [ ] All existing tests pass
- [ ] `pnpm build` and `vercel build --yes` both succeed

---

## Completion Checklist

- [ ] All 12 tasks completed in dependency order
- [ ] Each task validated immediately after completion
- [ ] Level 1: Static analysis (lint + typecheck) passes
- [ ] Level 2: Unit tests pass
- [ ] Level 3: Full test suite + build succeeds
- [ ] Level 4: Vercel build passes
- [ ] Level 5: Browser validation done (if available)
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Test assertions on CSS classes break | LOW | LOW | Tests assert on content/roles, not classes — unlikely to break |
| `hover:bg-muted` on table rows conflicts with sticky column bg | LOW | MEDIUM | Test comparison-table specifically — sticky column has `bg-card` which is opaque |
| `min-h-[44px]` causes overflow on mobile filter bar | LOW | LOW | Filters use `flex gap-4` wrapping — height increase is safe |
| `font-mono` causes layout shift if JetBrains Mono loads late | LOW | LOW | Font uses `display: swap` and is preloaded by `next/font` in layout.tsx |
| `transition-all duration-200` on buttons causes perf jank | LOW | LOW | CSS transforms only (translate, shadow) — GPU-accelerated |

---

## Notes

### Class Pattern Reference

**Primary button (full state set):**

```
rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground
transition-all duration-200
hover:-translate-y-[1px] hover:shadow-md
focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
active:translate-y-0
disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
```

**Secondary button (full state set):**

```
rounded-md border border-border px-4 py-2 text-sm
transition-colors
hover:bg-muted
focus:outline-none focus:ring-2 focus:ring-ring
active:bg-muted/80
```

**Form input (full state set):**

```
min-h-[44px] rounded-md border border-border bg-background px-3 py-2 text-sm
transition-colors
hover:border-ring/50
focus:outline-none focus:ring-2 focus:ring-ring
disabled:opacity-50 disabled:cursor-not-allowed
```

**Table row:**

```
border-b border-border transition-colors hover:bg-muted
```

**Score number:**

```
font-mono tabular-nums text-sm font-semibold text-primary
```
