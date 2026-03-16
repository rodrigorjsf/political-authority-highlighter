# Plan: Frontend Complete Redesign - Phase 1 (Design Tokens)

**Source**: `.claude/PRPs/prds/rf-018-frontend-complete-redesign.prd.md`
**Created**: 2026-03-15T22:42:10-03:00
**Status**: pending

## Goal

Establish the core design system foundation by defining CSS variables for light and dark modes, typography, spacing, border radius, and animation timing. This sets the stage for all subsequent redesign phases and ensures we follow the Frontend Design PRD correctly.

## Context

The current `apps/web/src/styles/globals.css` uses HSL color variables within the `:root` pseudo-class for a single theme (light mode). The `tailwind.config.ts` file maps these HSL variables to Tailwind classes. We need to transition to a hex-based token system defined in a new file (`tokens.css`), supporting dark mode via both `@media (prefers-color-scheme: dark)` and `[data-theme]` attributes to prevent FOUC and allow user overrides.

## Patterns to Mirror

```typescript
// SOURCE: docs/prd/frontend_design_prd.md:38-45 — Color Palette
// Light mode defaults
--color-background: #FFFFFF;
--color-surface: #F8FAFC;
--color-border: #E2E8F0;
--color-primary: #1D4ED8;
--color-success: #16A34A;
// etc...
```

## Execution Tasks

### Task 1: Create Design Tokens File
**File**: `apps/web/src/styles/tokens.css`
**Action**: CREATE

**Description**: Create a new CSS file to hold all design tokens (colors, typography scales, border radii, transitions). It must include `:root` for light mode defaults, `@media (prefers-color-scheme: dark)` for system dark mode, and `[data-theme="light"]`/`[data-theme="dark"]` for user overrides, strictly adhering to the `frontend_design_prd.md` hex codes.

**MIRROR**: `docs/prd/frontend_design_prd.md:27-140` — Follow exact design tokens documented in the PRD.

```css
/* What to create */
:root {
  /* Light mode core */
  --color-background: #FFFFFF;
  --color-surface: #F8FAFC;
  /* ...rest from PRD */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0F172A;
    /* ...dark equivalents from PRD */
  }
}

[data-theme="dark"] {
  /* Copy of prefers-color-scheme: dark contents for manual toggle support */
}
```

**Validation**: `pnpm --filter @pah/web run lint`

---

### Task 2: Update Global Styles
**File**: `apps/web/src/styles/globals.css`
**Action**: MODIFY
**Lines**: approx. 5-21

**Description**: Import `tokens.css` at the top of the file (after Tailwind directives). Remove all the legacy HSL variable definitions inside `:root`. Ensure the base layer uses the new CSS variables (e.g., `background-color: var(--color-background); color: var(--color-text-primary);`).

**MIRROR**: `apps/web/src/styles/globals.css:2-4` — Preserve existing tailwind base/components/utilities imports, just add tokens.css after.

```css
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

@import "./tokens.css";

@layer base {
  body {
    background-color: var(--color-background);
    color: var(--color-text-primary);
  }
}
```

**Validation**: `pnpm --filter @pah/web run lint`

---

### Task 3: Update Tailwind Configuration
**File**: `apps/web/tailwind.config.ts`
**Action**: MODIFY
**Lines**: approx. 10-38

**Description**: Update the `theme.extend` section to map Tailwind utility classes to the new CSS variables defined in `tokens.css`. Update `colors` section to map core colors (e.g. `background: 'var(--color-background)'`). Update `fontFamily` to use `var(--font-sans)` and `var(--font-mono)`. Update `borderRadius` to use `--radius-md` etc.

**MIRROR**: `tailwind.config.ts:15-30` — Keep the structure but replace `hsl(var(--...))` with standard `var(--color-...)` calls pointing to tokens.

```typescript
// What to change
extend: {
  colors: {
    background: "var(--color-background)",
    foreground: "var(--color-text-primary)",
    muted: {
      DEFAULT: "var(--color-surface)",
      foreground: "var(--color-text-secondary)",
    },
    // ...other mappings
  },
  fontFamily: {
    sans: ["var(--font-sans)", "sans-serif"],
  },
}
```

**Validation**: `pnpm --filter @pah/web run typecheck`

---

## Validation Commands

```bash
pnpm --filter @pah/web run typecheck
pnpm --filter @pah/web run lint
pnpm --filter @pah/web run build
```

## Acceptance Criteria

- [ ] `tokens.css` contains all PRD-specified CSS variables for light and dark modes.
- [ ] `tokens.css` contains CSS variables for typography (sans, mono), border radius, and transitions.
- [ ] `globals.css` imports `tokens.css` and correctly applies base styles.
- [ ] `tailwind.config.ts` is updated to consume the new CSS variables.
- [ ] All validation commands pass (`pnpm build`).
- [ ] Inspecting `/politicos` in Chrome DevTools confirms new CSS variables resolve correctly.

## Out of Scope

- Implementing the `ThemeToggle` component or FOUC prevention script (Phase 3).
- Adding custom fonts via `next/font` (Phase 2).
- Updating actual React components or pages to use the new tokens (Phase 5+).
