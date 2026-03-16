# Feature: RF-018 Phase 1 — Design Tokens

**PRD**: `.claude/PRPs/prds/rf-018-frontend-complete-redesign.prd.md`
**Selected Phase**: #1 — Design Tokens (no dependencies; first actionable phase)

> **Parallel execution note**: After Phase 1 is complete and merged, Phases 2 (Custom Fonts), 3 (Dark Mode), 4 (Home Page), and 9 (Local Full-Stack) can all run in parallel in separate worktrees.

---

## Summary

Phase 1 establishes the design token foundation for the entire frontend redesign. The good news: `tokens.css` and `tailwind.config.ts` already exist with most of the correct structure from an earlier partial implementation. This phase **completes** the token system by filling identified gaps (missing transition timing variables, incomplete Tailwind radius mappings, Tailwind v4 CSS syntax migration) and validates the full token pipeline from CSS custom property → Tailwind class → rendered component.

---

## User Story

As a Brazilian citizen using the platform on a mobile device,  
I want all pages to feel visually consistent, modern, and responsive in both light and dark modes,  
So that I trust the platform and can comfortably explore political data.

---

## Problem Statement

The design token foundation is ~85% implemented. Three concrete gaps prevent Phase 2+ from building on a solid base:

1. **Missing transition tokens**: `tokens.css` declares colors, typography, spacing, and radius, but has no `--transition-*` variables. Phases 7 (micro-interactions) and 5 (component refinement) need these to implement consistent animation timing.

2. **Incomplete Tailwind radius mapping**: `tailwind.config.ts` maps `borderRadius.lg`, `md`, and `sm` to CSS vars, but omits `xl`, `2xl`, and `full` — so classes like `rounded-xl` and `rounded-2xl` (used in PRD component specs) fall back to Tailwind defaults instead of project tokens.

3. **Tailwind v4 full migration required**: `globals.css` uses v3 `@tailwind` directives while `tailwindcss@4.2.1` is installed — but there is no `postcss.config.*` file and no `@tailwindcss/postcss` devDependency. This means the build today either relies on Next.js's internal PostCSS fallback (fragile, undocumented) or silently downgrades to v3 behavior. A complete v4 migration has four parts: (a) install `@tailwindcss/postcss`, (b) create `postcss.config.mjs`, (c) migrate CSS directives, and (d) audit `tailwind.config.ts` against v4 breaking changes. This is the largest task in Phase 1.

---

## Solution Statement

1. Add `--transition-fast`, `--transition-normal`, `--transition-slow` CSS variables to all three token blocks in `tokens.css` (`:root`, `[data-theme="dark"]`, `[data-theme="light"]`).
2. Fix `--radius-2xl` value from `1rem` to `1.25rem` to match the Frontend Design PRD spec.
3. Add `radius-xl`, `radius-2xl`, `radius-full` to `tailwind.config.ts`'s `borderRadius` extend and add `transitionDuration` mappings.
4. **Full Tailwind v4 migration**: (a) install `@tailwindcss/postcss` as a devDependency, (b) create `apps/web/postcss.config.mjs` with the v4 PostCSS plugin, (c) migrate `globals.css` from `@tailwind` directives to `@import "tailwindcss"` + `@config`, (d) audit `tailwind.config.ts` against v4 breaking changes (border defaults, ring defaults, space utilities) and adapt where needed.
5. Verify all tokens resolve correctly via `pnpm build` + Chrome DevTools inspection.

---

## Metadata

| Field            | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| Type             | ENHANCEMENT (completing partial implementation)                  |
| Complexity       | MEDIUM (Tailwind v4 migration carries breaking-change risk)      |
| Systems Affected | `apps/web` (styles + postcss config)                             |
| Dependencies     | `tailwindcss@4.2.1` (installed), `@tailwindcss/postcss` (to install), `next@15.5.x` (installed) |
| Estimated Tasks  | 6                                                                |

---

## UX Design

### Before State

```
╔══════════════════════════════════════════════════════╗
║                  BEFORE (Phase 1)                    ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  tokens.css                                          ║
║  ├── ✅ color tokens (light + dark)                  ║
║  ├── ✅ font-family tokens                           ║
║  ├── ✅ spacing tokens                               ║
║  ├── ✅ radius tokens (wrong --radius-2xl value)     ║
║  └── ❌ NO transition timing tokens                  ║
║                                                      ║
║  tailwind.config.ts                                  ║
║  ├── ✅ colors fully mapped                          ║
║  ├── ✅ fontFamily mapped                            ║
║  └── ❌ borderRadius: only lg/md/sm mapped           ║
║        (rounded-xl → Tailwind default, not token)    ║
║                                                      ║
║  globals.css                                         ║
║  └── ⚠️  @tailwind v3 syntax + tailwindcss@4 installed║
║                                                      ║
║  postcss.config.mjs                                  ║
║  └── ❌ MISSING — no PostCSS config file             ║
║        (no @tailwindcss/postcss devDep either)       ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

### After State

```
╔══════════════════════════════════════════════════════╗
║                  AFTER (Phase 1)                     ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  tokens.css                                          ║
║  ├── ✅ color tokens (unchanged)                     ║
║  ├── ✅ font-family tokens (unchanged)               ║
║  ├── ✅ spacing tokens (unchanged)                   ║
║  ├── ✅ radius tokens (--radius-2xl: 1.25rem fixed)  ║
║  └── ✅ transition tokens added (150/200/300ms)      ║
║                                                      ║
║  tailwind.config.ts                                  ║
║  ├── ✅ colors fully mapped (unchanged)              ║
║  ├── ✅ fontFamily mapped (unchanged)                ║
║  └── ✅ borderRadius: lg/md/sm/xl/2xl/full all mapped║
║                                                      ║
║  globals.css                                         ║
║  └── ✅ Tailwind v4 syntax (@import "tailwindcss")   ║
║                                                      ║
║  postcss.config.mjs  (NEW FILE)                      ║
║  └── ✅ @tailwindcss/postcss plugin configured       ║
║                                                      ║
║  DATA_FLOW: CSS var → Tailwind extend → component    ║
║    --radius-2xl  → rounded-2xl    → card edges       ║
║    --transition-normal → duration-[200ms] → buttons  ║
║    --transition-slow   → duration-[300ms] → pages    ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location                      | Before                         | After                              | User Impact                                      |
| ----------------------------- | ------------------------------ | ---------------------------------- | ------------------------------------------------ |
| `tokens.css` `:root`          | No transition vars             | `--transition-fast/normal/slow`    | Enables consistent animation in Phases 5–7       |
| `tailwind.config.ts` radius   | `rounded-xl` = 12px (default)  | `rounded-xl` = `var(--radius-xl)`  | All cards/buttons will honor token-defined radius |
| `globals.css` directives      | `@tailwind base/components...` | `@import "tailwindcss"` + `@config`| Proper v4 syntax; unlocks `@theme` for future    |
| `postcss.config.mjs` (new)    | Does not exist                 | `{ '@tailwindcss/postcss': {} }`   | Required v4 PostCSS plugin; replaces `tailwindcss` plugin |
| `package.json` devDeps        | No `@tailwindcss/postcss`      | `@tailwindcss/postcss` added       | Explicit v4 toolchain dependency                 |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File                                              | Lines  | Why Read This                                             |
| -------- | ------------------------------------------------- | ------ | --------------------------------------------------------- |
| P0       | `apps/web/src/styles/tokens.css`                  | all    | Pattern to EXTEND — add to all three theme blocks         |
| P0       | `apps/web/tailwind.config.ts`                     | all    | Pattern to EXTEND — borderRadius, v4 breaking change audit |
| P0       | `apps/web/src/styles/globals.css`                 | all    | File to MIGRATE from v3 to v4 syntax                      |
| P1       | `apps/web/package.json`                           | devDeps | Verify `tailwindcss` version; add `@tailwindcss/postcss`  |
| P1       | `docs/prd/frontend_design_prd.md`                 | 1–50   | Canonical token values (colors, radius, typography)       |
| P1       | `apps/web/src/components/politician/politician-card.tsx` | all | Example of how tokens are consumed via Tailwind classes |
| P2       | `apps/web/src/app/layout.tsx`                     | all    | Root layout — no changes needed in Phase 1, reference only |

**External Documentation:**

| Source                                              | Section                         | Why Needed                                                |
| --------------------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) | "Changes from v3" section | v4 CSS syntax: `@import "tailwindcss"`, `@config`, `@theme` |
| [Tailwind v4 Configuration](https://tailwindcss.com/docs/configuration) | JS config in v4 | How to use JS config (tailwind.config.ts) in v4 via `@config` |
| [Next.js — CSS](https://nextjs.org/docs/app/building-your-application/styling/css) | Tailwind CSS section | Next.js + Tailwind v4 integration notes |

---

## Patterns to Mirror

**TOKEN_BLOCK_STRUCTURE** — every variable must appear in all three blocks:

```css
/* SOURCE: apps/web/src/styles/tokens.css:1-96 */
/* COPY THIS PATTERN for new variables: */

/* 1. Light defaults in :root */
:root {
  --NEW-TOKEN: value-light;
}

/* 2. System dark preference override */
@media (prefers-color-scheme: dark) {
  :root {
    --NEW-TOKEN: value-dark;
  }
}

/* 3. Manual [data-theme] attribute overrides */
[data-theme="dark"] {
  --NEW-TOKEN: value-dark;
}

[data-theme="light"] {
  --NEW-TOKEN: value-light;
}
```

**TAILWIND_EXTEND_PATTERN** — how new CSS vars become Tailwind classes:

```typescript
/* SOURCE: apps/web/tailwind.config.ts:42-45 */
/* COPY THIS PATTERN for new token groups: */
borderRadius: {
  lg: 'var(--radius-lg)',   // → rounded-lg
  md: 'var(--radius-md)',   // → rounded-md
  sm: 'calc(var(--radius-md) - 2px)',
  // ADD: xl, 2xl, full
},
```

**COMPONENT_CLASS_USAGE** — how tokens flow through components:

```tsx
/* SOURCE: apps/web/src/components/politician/politician-card.tsx:32 */
/* TOKENS DO NOT appear as raw hex in JSX — always use Tailwind classes: */
<article className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
```

---

## Files to Change

| File                                    | Action | Justification                                                    |
| --------------------------------------- | ------ | ---------------------------------------------------------------- |
| `apps/web/src/styles/tokens.css`        | UPDATE | Add `--transition-*` vars; fix `--radius-2xl` value             |
| `apps/web/tailwind.config.ts`           | UPDATE | Add `radius-xl`, `radius-2xl`, `radius-full` mappings; add `transitionDuration`; fix v4 breaking changes |
| `apps/web/src/styles/globals.css`       | UPDATE | Migrate to Tailwind v4 syntax (`@import "tailwindcss"` + `@config`) |
| `apps/web/postcss.config.mjs`           | CREATE | v4 PostCSS plugin configuration                                  |
| `apps/web/package.json`                 | UPDATE | Add `@tailwindcss/postcss` devDependency                        |

> **No component changes in Phase 1** — this phase only affects the token/config layer. Components already use `rounded-xl`, `rounded-2xl`, etc. via Tailwind defaults; after Phase 1 they will use the project tokens instead.

---

## NOT Building (Scope Limits)

- **next/font loading** — deferred to Phase 2; fonts remain CSS var declarations with system fallbacks
- **ThemeToggle component** — deferred to Phase 3; dark mode is system-preference-only after Phase 1
- **ThemeScript (FOUC prevention)** — deferred to Phase 3
- **Home page** — deferred to Phase 4
- **Navigation components** (header, sidebar, bottom tab bar) — deferred to Phase 6
- **Component visual updates** — deferred to Phase 5
- **Skeleton loader changes** — deferred to Phase 7
- **Visual regression testing** — deferred to Phase 10

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

---

### Task 1: AUDIT `tokens.css` for gaps vs. Frontend Design PRD

- **ACTION**: READ `apps/web/src/styles/tokens.css` and compare against `docs/prd/frontend_design_prd.md` section 3 (Design Tokens & Theming)
- **VERIFY EXISTING**: Confirm all color tokens match PRD Section 3.1 color table exactly
- **IDENTIFY GAPS**:
  - `--radius-2xl` is `1rem` → PRD says `1.25rem` (outer containers)
  - `--transition-fast`, `--transition-normal`, `--transition-slow` are missing
- **VALIDATE**: Grep for `transition` in `tokens.css` to confirm absence: `grep transition apps/web/src/styles/tokens.css`

---

### Task 2: UPDATE `apps/web/src/styles/tokens.css` — add transition tokens + fix radius

- **ACTION**: ADD transition timing variables and fix radius value
- **IMPLEMENT**:

```css
/* Add after the Border Radius block in :root (line ~40) */

/* Animation Timing */
--transition-fast: 150ms ease-in-out;
--transition-normal: 200ms ease-in-out;
--transition-slow: 300ms ease-in-out;
```

- **FIX** `--radius-2xl`: Change from `1rem` to `1.25rem` in ALL THREE BLOCKS:
  - `:root` block (line ~37)
  - `[data-theme="dark"]` block  
  - `[data-theme="light"]` block

- **NOTE**: Transition timing variables DO NOT change with dark/light mode, so they are defined only in `:root` (not in `@media` or `[data-theme]` overrides)

- **GOTCHA**: The `--transition-*` vars use `ease-in-out` timing function — this matches the Tailwind default easing and the PRD's button hover spec (`transition-all duration-200 ease-in-out`)

- **VALIDATE**: `grep -n "transition\|radius-2xl" apps/web/src/styles/tokens.css` — should show all 3 transition vars and `1.25rem` for radius-2xl

---

### Task 3: UPDATE `apps/web/tailwind.config.ts` — map missing radius tokens + add transition durations

- **ACTION**: EXTEND the Tailwind configuration to map all radius tokens and expose transition durations

- **IMPLEMENT** the updated `borderRadius` block:

```typescript
// SOURCE: apps/web/tailwind.config.ts:42-45 — EXTEND THIS BLOCK
borderRadius: {
  full: 'var(--radius-full)',    // → rounded-full (pills/avatars)
  '2xl': 'var(--radius-2xl)',    // → rounded-2xl (outer containers/cards)
  xl: 'var(--radius-xl)',        // → rounded-xl (cards)
  lg: 'var(--radius-lg)',        // → rounded-lg (inner elements/buttons)
  md: 'var(--radius-md)',        // → rounded-md (badges/tags)
  sm: 'calc(var(--radius-md) - 2px)', // → rounded-sm
},
```

- **ADD** `transitionDuration` block after `borderRadius`:

```typescript
transitionDuration: {
  fast: 'var(--transition-fast)',      // duration-fast → 150ms ease-in-out
  normal: 'var(--transition-normal)',  // duration-normal → 200ms ease-in-out
  slow: 'var(--transition-slow)',      // duration-slow → 300ms ease-in-out
},
```

- **GOTCHA**: Tailwind's `extend.transitionDuration` maps to `duration-*` utility classes. Note that these expose the full `150ms ease-in-out` string as a duration value — if only `duration` (not `ease`) is needed, use the Tailwind `duration-150`, `duration-200`, `duration-300` defaults instead and reserve `--transition-*` vars for direct CSS `transition:` property use. **Decision**: Keep both approaches — the CSS vars are for direct `transition` shorthand; Tailwind `duration-150/200/300` (built-in) covers most utility cases.

- **VALIDATE**: `pnpm --filter @pah/web typecheck` — config must be valid TypeScript

---

### Task 4: FULL Tailwind v4 Migration

This is the most complex task in Phase 1. Execute all sub-steps in order; do not skip sub-steps even if the build currently "works" — the current state relies on Next.js internals, not a supported configuration.

---

#### Task 4.1 — Install `@tailwindcss/postcss` devDependency

Tailwind v4 ships the PostCSS plugin as a separate package (`@tailwindcss/postcss`), separate from the main `tailwindcss` package. Without it, PostCSS cannot process `@import "tailwindcss"`.

```bash
pnpm --filter @pah/web add -D @tailwindcss/postcss
```

**VALIDATE**: `cat apps/web/package.json | grep tailwindcss` — should show both `tailwindcss` and `@tailwindcss/postcss` in devDependencies.

---

#### Task 4.2 — CREATE `apps/web/postcss.config.mjs`

No `postcss.config.*` file exists today. Create it as an ES module (`.mjs`) — Next.js 15 supports this format.

```js
// apps/web/postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

**RATIONALE**: In Tailwind v4, the PostCSS plugin key changed from `'tailwindcss'` to `'@tailwindcss/postcss'`. Using the old key with v4 installed would silently fail or use the wrong processor.

**NOTE**: Do NOT add `autoprefixer` — Tailwind v4 includes autoprefixing natively. Adding it is redundant and may cause duplicate vendor prefixes.

**NOTE**: Do NOT use `.cjs` format — the project uses ESM (`"type": "module"` or `import/export` throughout). Use `.mjs`.

**VALIDATE**: File exists at `apps/web/postcss.config.mjs` with `@tailwindcss/postcss` as the only plugin.

---

#### Task 4.3 — MIGRATE `apps/web/src/styles/globals.css` to v4 directives

Replace the three v3 `@tailwind` directives with the single v4 `@import` + `@config` pair.

**CURRENT** (lines 1–3):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

> ⚠️ **IMPORTANT**: These directives are **completely removed** in Tailwind v4 — there is no compatibility mode. The current `globals.css` is broken and produces incorrect output (or relies on Next.js's internal undocumented fallback). This MUST be fixed.

**REPLACE WITH**:
```css
@import "tailwindcss";
@import "./tokens.css";
@config "../../tailwind.config.ts";
```

**Full resulting file**:
```css
@import "tailwindcss";
@import "./tokens.css";
@config "../../tailwind.config.ts";

/* globals.css -- neutral palette, NO party colors */

/* Enable Tailwind dark: utilities to respond to [data-theme="dark"] attribute.
   Matches the [data-theme="dark"] selector in tokens.css.
   Without this, dark:bg-* and dark:text-* classes do nothing. */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@layer base {
  * {
    border-color: var(--color-border);
  }
  body {
    background-color: var(--color-background);
    color: var(--color-text-primary);
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

**EXPLANATION of each line**:
- `@import "tailwindcss"` — replaces all three `@tailwind` directives (which are completely removed in v4)
- `@import "./tokens.css"` — project CSS variables; comes AFTER `@import "tailwindcss"` so tokens override Tailwind's own `:root` vars; comes BEFORE `@config` so custom tokens take effect
- `@config "../../tailwind.config.ts"` — bridges JS config into v4; comes last; CSS values always win over JS config values (safe incremental migration)
- `@custom-variant dark (...)` — **critical new addition**: tells Tailwind v4 that `dark:` variant = ancestor has `[data-theme=dark]`. Without this, `dark:bg-slate-900` and similar classes generate CSS that never matches.

**GOTCHA — import order is load-order-sensitive**:
```
@import "tailwindcss"       → 1st: Tailwind base/utilities/reset
@import "./tokens.css"      → 2nd: our vars OVERRIDE Tailwind's defaults
@config "..."               → 3rd: JS config merges last (CSS wins over JS)
```

**GOTCHA — `@config` path resolution**: Relative to the CSS file (`src/styles/globals.css`). Path `../../tailwind.config.ts` resolves to `apps/web/tailwind.config.ts`. Verify: `realpath --relative-to=apps/web/src/styles apps/web/tailwind.config.ts`.

**VALIDATE**: `pnpm --filter @pah/web build` passes with 0 errors.

---

#### Task 4.4 — AUDIT `tailwind.config.ts` for v4 breaking changes

Tailwind v4 introduced several breaking changes that affect generated CSS. Audit each category:

**4.4a — `darkMode` setting**

Current config has NO explicit `darkMode` key. In v4 with `@custom-variant dark` defined in CSS (Task 4.3), the `dark:` variant is fully controlled by CSS — remove `darkMode` from JS config if present. The `@custom-variant` approach supersedes JS `darkMode` config.

**4.4b — Default border color changed**

| Version | Default `border-color` | Impact |
| ------- | ---------------------- | ------ |
| v3 | `theme('colors.gray.200')` | Gray border on un-styled elements |
| v4 | `currentColor` | Text-color-colored border |

**Mitigation**: Already handled — `@layer base { * { border-color: var(--color-border) } }` in `globals.css` overrides the Tailwind default. ✅ No change needed.

**4.4c — Ring utility default width changed**

| Version | `ring` default | Impact |
| ------- | -------------- | ------ |
| v3 | `3px` | Wider focus ring |
| v4 | `1px` | Thinner focus ring |

**Audit**: All focus rings in the codebase use explicit `ring-2` (2px) — e.g., `focus:ring-2 focus:ring-ring focus:ring-offset-2` in `politician-card.tsx`. ✅ Explicit width; no change needed.

**4.4d — `space-x-*` / `space-y-*` now use `:where()`**

In v4, space utilities use lower-specificity `:where()` selectors. This could affect layouts where space utilities were overridden. Grep to confirm usage:

```bash
grep -rn "space-x-\|space-y-" apps/web/src/
```

If matches exist, visually verify those layouts in dev server after migration.

**4.4e — `shadow-sm` renamed to `shadow-xs`**

```bash
grep -rn "shadow-sm" apps/web/src/
```

If matches exist, rename each `shadow-sm` → `shadow-xs`. The old `shadow` (no suffix) is now `shadow-sm`. Verify expected visuals.

**4.4f — `bg-opacity-*` / `text-opacity-*` removed**

```bash
grep -rn "bg-opacity-\|text-opacity-\|border-opacity-" apps/web/src/
```

If matches exist, replace with slash modifier syntax: `bg-black bg-opacity-50` → `bg-black/50`.

**4.4g — `outline-none` behavior changed**

In v3, `outline-none` removed the outline. In v4, `outline-none` sets `outline-style: none` (still shows in forced-colors mode). For the old behavior, use `outline-hidden`.

```bash
grep -rn "outline-none" apps/web/src/
```

If matches exist in focus-visible contexts (accessibility), evaluate whether `outline-hidden` is needed or if `focus:outline-none focus:ring-2` pattern is sufficient (it is — the explicit `ring-2` provides the visible indicator).

**4.4h — Arbitrary CSS variable syntax changed**

| v3 syntax | v4 syntax |
| --------- | --------- |
| `bg-[--color-brand]` | `bg-(--color-brand)` |
| `text-[--color-text]` | `text-(--color-text)` |

```bash
grep -rn "\[--" apps/web/src/
```

If matches exist, update bracket syntax `[--var]` → parenthesis syntax `(--var)`.

**4.4i — `content` array in JS config**

The `content` array in `tailwind.config.ts` still works in v4 when using `@config`. No change needed.

**4.4j — TypeScript type import**

```typescript
// CURRENT:
import type { Config } from 'tailwindcss'
const config: Config = { ... }
```

In v4, this import still works — `tailwindcss` package exports `Config` type. ✅ No change needed.

**VALIDATE after 4.4**:
```bash
pnpm --filter @pah/web lint && pnpm --filter @pah/web typecheck
```

---

#### Task 4.5 — VERIFY Tailwind v4 migration visually

After the full migration, confirm no visual regressions on the two most complex pages:

```bash
pnpm --filter @pah/web dev
```

Open in browser and check:
- `/politicos` — politician cards render with correct token colors, rounded corners, focus rings
- `/politicos/[any-slug]` — profile page renders correctly in light + dark mode (OS preference)

Specifically verify these v4-sensitive areas:
1. All `border-*` elements show `var(--color-border)` color (not `currentColor`)
2. Focus rings on cards are 2px (not 1px)
3. Any `space-x-*` / `space-y-*` layouts are visually unchanged
4. Shadows render correctly (check if any `shadow-sm` was renamed to `shadow-xs`)
5. No broken opacity utilities (`bg-opacity-*` → `/50` modifier)

**FALLBACK** (if v4 migration breaks the build and cannot be resolved within the task):
1. Revert `globals.css` to `@tailwind base/components/utilities` directives
2. Delete `postcss.config.mjs`
3. Remove `@tailwindcss/postcss` from `package.json`
4. Document in `apps/web/CLAUDE.md` under "Tech Debt": "Tailwind v4 migration pending — currently running v4 package with v3 CSS syntax via Next.js internal PostCSS fallback"
5. Phase 1 still passes: the token gaps (Task 2 + Task 3) are the blocking items; v4 migration is improvement-only

---

### Task 5: AUDIT all component `.tsx` files for hardcoded color values

- **ACTION**: Verify zero hardcoded hex/rgb/hsl colors in component or page files
- **IMPLEMENT**: Run grep to confirm:

```bash
grep -rn "#[0-9a-fA-F]\{3,8\}\|rgb(\|hsl(" apps/web/src/components/ apps/web/src/app/
```

- **EXPECTED**: 0 matches in component/page files. The only hex colors should be in `tokens.css`.
- **IF VIOLATIONS FOUND**: Replace each hardcoded value with the equivalent Tailwind token class (see Pattern 5 from the codebase analysis above). Reference `tailwind.config.ts` color mappings.
- **VALIDATE**: Re-run grep confirms 0 violations

---

### Task 6: VALIDATE Phase 1 completion

Run all of the following and confirm each passes before marking Phase 1 done:

```bash
# 1. Lint
pnpm --filter @pah/web lint

# 2. TypeScript type check
pnpm --filter @pah/web typecheck

# 3. Full monorepo build (MANDATORY per CLAUDE.md)
pnpm build

# 4. Verify CSS variables resolve in DevTools
# Start dev server: pnpm --filter @pah/web dev
# Open Chrome DevTools → Elements → :root → confirm:
#   --transition-fast: 150ms ease-in-out
#   --transition-normal: 200ms ease-in-out
#   --transition-slow: 300ms ease-in-out
#   --radius-2xl: 1.25rem

# 5. Verify Tailwind class maps to token (in browser console):
# getComputedStyle(document.querySelector('[class*="rounded-2xl"]')).borderRadius
# → should be "1.25rem" not "1rem"
```

---

## Testing Strategy

Phase 1 only changes CSS/config files — no new unit tests needed. Validation is structural (build + DevTools inspection).

### Edge Cases Checklist

- [ ] `--radius-2xl` fixed in ALL THREE theme blocks (`:root`, `[data-theme="dark"]`, `[data-theme="light"]`)
- [ ] Transition vars defined ONLY in `:root` (not in dark/light overrides — they don't change with theme)
- [ ] `@config` path in `globals.css` is relative to `src/styles/` not to project root
- [ ] `@tailwindcss/postcss` installed as devDependency before creating `postcss.config.mjs`
- [ ] `postcss.config.mjs` uses `.mjs` extension (ES module, no `autoprefixer`)
- [ ] `@import "tailwindcss"` comes FIRST, then `@import "./tokens.css"`, then `@config` (load order matters)
- [ ] `@custom-variant dark` added to `globals.css` so `dark:` utilities work with `[data-theme=dark]`
- [ ] `shadow-sm` → `shadow-xs` audit done (grep confirms 0 occurrences or all renamed)
- [ ] `bg-opacity-*` / `text-opacity-*` audit done (grep confirms 0 or replaced with `/` modifiers)
- [ ] `[--var]` arbitrary CSS var syntax audit done (grep confirms 0 or replaced with `(--var)`)
- [ ] `pnpm build` passes — no PostCSS errors
- [ ] `rounded-xl` and `rounded-2xl` Tailwind classes now map to token values (not Tailwind v4 defaults)
- [ ] Border color on all elements still shows `var(--color-border)` (not `currentColor`)
- [ ] Focus rings are still 2px (explicit `ring-2` — not affected by v4's 1px default change)
- [ ] Existing components (`politician-card.tsx` etc.) still render correctly — no visual regressions in listing/profile pages

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm --filter @pah/web lint && pnpm --filter @pah/web typecheck
```

**EXPECT**: Exit 0, no errors or warnings

### Level 2: BUILD

```bash
pnpm build
```

**EXPECT**: All packages build successfully including `@pah/web`

### Level 3: TOKEN_VERIFICATION (in browser)

```bash
pnpm --filter @pah/web dev
# Then in Chrome DevTools Console:
getComputedStyle(document.documentElement).getPropertyValue('--transition-fast')
# Expected: " 150ms ease-in-out"
getComputedStyle(document.documentElement).getPropertyValue('--radius-2xl')
# Expected: " 1.25rem"
```

### Level 4: HARDCODED_COLOR_AUDIT

```bash
grep -rn "#[0-9a-fA-F]\{3,8\}\|rgb(\|hsl(" apps/web/src/components/ apps/web/src/app/
```

**EXPECT**: 0 matches

### Level 5: TAILWIND_V4_MIGRATION_CHECK

```bash
# Confirm @tailwindcss/postcss is installed
ls apps/web/node_modules/@tailwindcss/postcss 2>/dev/null && echo "✅ installed" || echo "❌ missing"

# Confirm postcss.config.mjs exists and uses correct plugin
cat apps/web/postcss.config.mjs

# Confirm globals.css no longer has @tailwind directives
grep "@tailwind" apps/web/src/styles/globals.css && echo "❌ v3 directives found" || echo "✅ clean"

# Confirm @import "tailwindcss" is present
grep '@import "tailwindcss"' apps/web/src/styles/globals.css && echo "✅ v4 syntax found" || echo "❌ missing"

# Check space utilities for :where() impact
grep -rn "space-x-\|space-y-" apps/web/src/
```

| Risk | Likelihood | Severity | Mitigation |
| ---- | ---------- | -------- | ---------- |
| `@import "tailwindcss"` fails — `@tailwindcss/postcss` not found by PostCSS | LOW (after Task 4.1) | HIGH | Task 4.1 installs it explicitly; if still fails, check `node_modules/@tailwindcss/postcss` exists |
| `@config` relative path wrong — config not loaded | LOW | HIGH | Verify with `realpath --relative-to=apps/web/src/styles apps/web/tailwind.config.ts` before implementing |
| v4 border-color default (`currentColor`) leaks through | LOW | MEDIUM | `@layer base { * { border-color: var(--color-border) } }` already overrides it — verify in DevTools |
| v4 `space-x-*` `:where()` specificity change breaks a layout | LOW | LOW | Grep for `space-x-/space-y-` and visual-check those components |
| `transitionDuration` map value (`150ms ease-in-out`) rejected by Tailwind | LOW | MEDIUM | If rejected, expose only numeric values (`'150': '150ms'`); use `--transition-*` vars in direct CSS |
| `--radius-2xl` change from `1rem` → `1.25rem` visual shift | LOW | LOW | Cards get slightly rounder — intentional per PRD spec |
| `autoprefixer` added to `postcss.config.mjs` by mistake | LOW | LOW | v4 includes autoprefixing natively; adding it causes duplicate prefixes |

---

## Context for Next Phases

After Phase 1 merges, the following phases can run in parallel in separate Git worktrees:

| Phase | What It Needs from Phase 1 |
| ----- | -------------------------- |
| Phase 2 (Custom Fonts) | Adds `--font-inter`, `--font-jetbrains-mono` vars via `next/font`; uses `@theme inline { --font-sans: var(--font-inter) }` syntax (NOT plain `@theme {}` — `inline` is required when value is a CSS var to prevent Tailwind resolving it at build time) |
| Phase 3 (Dark Mode) | Adds `ThemeProvider` from `next-themes` with `attribute="data-theme"` (matches `@custom-variant dark` added in Phase 1); needs `suppressHydrationWarning` on `<html>`; `useTheme()` must be gated with `mounted` state |
| Phase 4 (Home Page) | Creates `apps/web/src/app/page.tsx` using all token classes (`bg-background`, `rounded-2xl`, etc.) |
| Phase 9 (Local Full-Stack) | No token dependency; can proceed immediately |

---

## Discovery Table

| Category | File:Lines | Pattern Description | Code Snippet |
| -------- | ---------- | ------------------- | ------------ |
| TOKENS | `src/styles/tokens.css:1-96` | All CSS vars in three theme blocks | `:root { --color-background: #FFFFFF; }` |
| TAILWIND | `tailwind.config.ts:1-56` | CSS var → Tailwind extend mapping | `colors: { background: 'var(--color-background)' }` |
| GLOBALS | `src/styles/globals.css:1-28` | Tailwind directives + token import + base layer | `@tailwind base; @import "./tokens.css"; @layer base { body { ... } }` |
| NAMING | `src/components/politician/politician-card.tsx:32` | Token class usage — never raw hex | `className="rounded-lg border border-border bg-card"` |
| SKELETON | `src/app/politicos/loading.tsx:5-12` | `motion-safe:animate-pulse` + `bg-muted` | `<div className="motion-safe:animate-pulse rounded-lg bg-muted">` |
| A11Y | `src/app/politicos/page.tsx:50` | Every `<main>` has `id="main-content" tabIndex={-1}` | `<main id="main-content" tabIndex={-1} className="...">` |
| FOCUS | `src/components/politician/politician-card.tsx:35` | Uniform focus ring pattern | `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2` |

---

*Generated: 2026-03-16*
*PRD Source: rf-018-frontend-complete-redesign.prd.md v1.1*
*Phase: 1 of 12 — Design Tokens*
