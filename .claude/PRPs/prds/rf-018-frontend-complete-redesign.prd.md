# Frontend Complete Redesign & Testing Infrastructure

## Problem Statement

The Political Authority Highlighter MVP is functionally complete with good responsiveness and accessibility, but has zero design system implementation. The platform uses system-default fonts, offers no dark mode, has no home page (`/` returns 404), and lacks glassmorphism or modern micro-interactions. There are no visual regression baselines to prevent design drift, no local full-stack testing infrastructure, and no reusable test skills for `apps/web/` or `apps/api/`.

**Impact**: The platform cannot launch to the general Brazilian public (18+ years) without a modern, trustworthy visual identity. Users on low-end Android + 3G expect SaaS-quality design; current implementation feels unfinished. No safeguards prevent future feature work from silently breaking design compliance.

**Cost of inaction**: Cannot ship to users; fails to meet PRD quality bar; lacks testing safeguards against regressions.

## Evidence

- **Design PRD exists but is unimplemented**: `docs/prd/frontend_design_prd.md` specifies a complete design system (tokens, typography, animations, accessibility). Current codebase implements only ~30% of it.
- **No home page**: `/` route does not exist; new users arriving at the domain see a 404.
- **User target mismatch**: Everyday Brazilians on low-end Android + 3G expect simple, trustworthy design. Current light-only interface with system fonts does not convey "modern SaaS."
- **No regression safeguards**: Visual changes can be introduced without detection; no snapshot baseline exists.
- **Missing test skills**: Both `apps/web/` and `apps/api/` lack context-specific testing skills, making test strategy inconsistent across sessions and contributors.

## Proposed Solution

Complete implementation of the Frontend Design PRD across all pages, a new home page, comprehensive local testing infrastructure, and reusable project skills. The approach is token-first: CSS variables define the entire design system (light + dark), fonts load via `next/font` for 3G safety, and a ThemeScript prevents FOUC. Navigation gets glassmorphism effects and a mobile bottom tab bar. Testing infrastructure includes 30 visual regression baselines, enhanced a11y E2E scans, a local full-stack environment, and context-specific test skills for both web and API apps. This approach was chosen over adopting shadcn/ui to avoid migration cost and preserve the token-first flexibility already in place.

## Key Hypothesis

We believe that a modern, consistently-designed interface with dark mode, custom fonts, and glassmorphic effects will signal trustworthiness and professionalism to everyday Brazilians exploring politician data.

We'll know we're right when:

1. 100% Frontend Design PRD compliance (all components styled per spec)
2. Zero automated a11y violations (WCAG 2.1 AA) across all pages in both themes
3. All pages pass responsive tests at mobile (375px), tablet (768px), desktop (1920px)
4. Visual regression baselines established for all pages (30 screenshots)
5. Dark mode auto-detects browser/system preference + can be toggled
6. Local full-stack environment starts with documented workflow
7. Home page exists, loads featured politicians, and drives users to listing

## What We're NOT Building

- **Politician login/profile features** — Deferred to v1.1; not in MVP scope
- **Advanced analytics dashboard** — Out of scope; focus on core data exploration
- **Multi-language support** — Portuguese only for MVP
- **Mobile app** — Web-only for launch
- **Custom OG image generation** — Static fallback acceptable for MVP
- **A/B testing framework** — Not needed for initial launch

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| **PRD Compliance** | 100% of MUST items | Checklist audit against `docs/prd/frontend_design_prd.md` |
| **A11y Violations** | 0 (WCAG 2.1 AA) | aXe-core E2E scan on all pages, both themes |
| **Responsive Coverage** | All pages pass 3 viewports | Playwright visual regression |
| **Dark Mode** | System preference auto-detected + user toggle | E2E test + manual verification |
| **Visual Regression Baseline** | 30 screenshots stored in repo | Playwright `toHaveScreenshot()` |
| **Local Stack** | Documented 3-terminal workflow | `TESTING.md` + manual verification |
| **Test Skills** | Both `web` and `api` skills deployed | Skill file existence in `.claude/skills/` AND `.agents/skills/` |

## Open Questions

- [ ] **Profile page a11y E2E**: Requires seeded database; needs a fixture `test-politician-sp` slug in `supabase/seed.sql` or test-specific seed.
- [ ] **Snapshot storage**: Large snapshot files in git repo may slow clone. Consider Git LFS for `__snapshots__/`.
- [ ] **CI E2E runtime**: Full visual regression (30 screenshots x 2 browsers) may take 5-10 min. Acceptable for CI?
- [ ] **Vercel environment variables**: Do preview deploys use different `NEXT_PUBLIC_API_URL`? Verify via Vercel MCP before creating `TESTING.md`.
- [x] ~~**Featured politicians endpoint**: Resolved — API uses `limit=3` and client-side sort fallback; `.catch(() => [])` for build-time.~~
- [x] ~~**Home page illustration**: Resolved — data-driven hero with stats + text, no illustration needed.~~
- [x] ~~**Inter vs Plus Jakarta Sans**: Resolved — Inter is primary (`--font-inter`), Plus Jakarta Sans is CSS fallback in `--font-sans` stack.~~

---

## Users & Context

**Primary User**

- **Who**: Brazilian citizen, 18+ years old, any literacy level, diverse device (low-end Android common), may use 3G network
- **Current behavior**: Searches "deputado name" on Google, finds fragmented data across multiple government sites
- **Trigger**: Before voting, when evaluating a candidate, when sharing info with friends
- **Success state**: Finds politician's data in one place, understands score, sees voting history, feels confident

**Job to Be Done**
When I don't know a trustworthy politician, I want to find and understand data about them in a friendly and understandable way, so I can check all data from the politicians and choose some to vote or share.

**Non-Users**

- Politicians managing their own profiles (future feature, not MVP)
- Government officials auditing the platform
- Paid/authenticated users (free public access only)

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Light mode design tokens (colors, typography, spacing, radius) | Foundation for all components |
| Must | Dark mode design tokens matching PRD exactly | Feature requirement + accessibility |
| Must | Dark mode system preference detection + toggle (Sun/Moon in header) | PRD-required; UX standard |
| Must | Custom fonts: Inter, JetBrains Mono via `next/font` | Brand identity; PRD-required |
| Must | Home page with hero + featured politicians + CTA | MVP: user landing point |
| Must | Update all 10+ pages to use design tokens | Consistency |
| Must | Button component states (default, hover, focus, active, disabled) | PRD-specified |
| Must | Card/bento grid styling with surface tokens | Core data layout pattern |
| Must | Glassmorphism effects on header (`backdrop-blur-md`) | Vibe aesthetic |
| Must | Page transition animations (300ms fade) | Visual continuity |
| Must | Tooltip animations (150ms fade, dark background) | a11y: explain terms |
| Must | Mobile bottom tab navigation bar (44x44px min touch targets) | Mobile UX standard; PRD-required |
| Must | 0 a11y violations post-redesign | WCAG 2.1 AA compliance |
| Must | Local full-stack environment (Supabase CLI + API + Web) | Testing prerequisite |
| Must | Visual regression baseline (30 screenshots, 3 viewports, 2 themes) | Regression prevention |
| Must | CI/CD updated with design + a11y validation steps | Regression prevention in pipeline |
| Must | Web test skill (context-specific, deployed to `.agents/skills/`) | Sustainable testing |
| Must | API test skill (context-specific, deployed to `.agents/skills/`) | Sustainable testing |
| Should | Skeleton loaders matching data shapes (cards, tables, text) | UX polish |
| Should | Advanced button hover translation (`-translate-y-[1px]` + shadow) | Vibe polish |
| Could | Animated progress bars on score gauges | Nice-to-have |
| Won't | Custom OG image generation | Defer; static fallback OK |

### MVP Scope

The minimum to validate the hypothesis is: design tokens applied to all pages (light + dark), custom fonts loaded, home page with featured politicians, glassmorphism header, mobile bottom tab bar, and zero a11y violations. Visual regression baselines and test skills are required for sustainability but not for the visual validation itself.

### User Flow

```
1. User lands on / (HOME PAGE)
   |
2. Hero: "Explore dados de politicos" + 3 featured politicians
   |
3. Clicks "Ver Todos" CTA -> /politicos (LISTING)
   |
4. Searches by name, filters by role/state
   |
5. Clicks politician card -> /politicos/[slug] (PROFILE)
   |
6. Sees integrity score, explores tabs
   |
7. (Optional) /metodologia (METHODOLOGY) or /fontes (SOURCES)
```

All pages in this flow must: use design tokens, support dark/light mode, use custom fonts, have 0 a11y violations, and be responsive on mobile/tablet/desktop.

---

## Technical Approach

**Feasibility**: HIGH — all technologies are already in the stack (Tailwind CSS, Next.js 15, Playwright). The token-first CSS variable approach is a styling layer change with no architectural risk.

**Architecture Notes**

- **Token-first design system**: CSS variables in `tokens.css` define all colors, spacing, radii, and transitions. Components reference tokens via Tailwind utilities or `var()`. No hardcoded color values.
- **Dark mode strategy**: CSS vars (`:root` defaults + `@media prefers-color-scheme` + `[data-theme]` override) + inline `ThemeScript` for FOUC prevention + `ThemeToggle` client component writing to `localStorage` key `'pah-theme'`.
- **Font loading**: `next/font/google` with `display: swap` — Inter (`--font-inter`) as primary sans, JetBrains Mono (`--font-jetbrains-mono`) for numeric/code displays. 3G-safe via swap.
- **Navigation architecture**: `LayoutClient` wraps all content — glassmorphism header (sticky, backdrop-blur-md), desktop sidebar (280px, lg+), tablet drawer (slide from left), mobile bottom tab bar (fixed bottom, sm-).
- **Local stack**: `supabase start` (port 54322) + `pnpm --filter @pah/api dev` (port 3001) + `pnpm --filter @pah/web dev` (port 3000). NOT raw Docker PostgreSQL — Supabase CLI already has migrations + seed data.
- **Existing skills leveraged**: `web-frontend-design` (design compliance), `playwright-mcp` (E2E), `browser-testing-with-devtools` (visual debugging), `web-testing` (test patterns), `project-guardian` (domain rules), `docs:update-docs` (documentation gate), `customaize-agent:test-skill` (skill creation).

**File Structure**

```
apps/web/src/styles/
  globals.css          <- Tailwind v4 with @import "tailwindcss" + @custom-variant dark
  tokens.css           <- Full token definitions (light + dark)

apps/web/src/components/
  theme-script.tsx     <- Server Component: inline FOUC prevention script
  theme-toggle.tsx     <- Client Component: Sun/Moon toggle + localStorage
  navigation/
    layout-client.tsx  <- LayoutClient: header + sidebar + mobile tab bar
    nav-items.ts       <- Navigation item definitions

apps/web/src/app/
  layout.tsx           <- Font variables + ThemeScript + LayoutClient
  page.tsx             <- Home page (hero + featured politicians + CTA)
```

**CSS Variable Strategy**

```css
/* tokens.css -- Light mode defaults */
:root {
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-border: #e2e8f0;
  --color-primary: #1d4ed8;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-text-primary: #0f172a;
  --color-text-muted: #64748b;

  --font-sans: var(--font-inter), 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: var(--font-jetbrains-mono), 'Roboto Mono', monospace;

  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.25rem;
  --radius-full: 9999px;

  --transition-fast: 150ms ease-in-out;
  --transition-normal: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}

/* Dark mode -- system preference */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0b0e14;
    --color-surface: #161b22;
    --color-border: #30363d;
    --color-primary: #3b82f6;
    --color-success: #22c55e;
    --color-warning: #facc15;
    --color-text-primary: #f8fafc;
    --color-text-muted: #94a3b8;
  }
}

/* User override via toggle (JS sets data-theme attribute) */
[data-theme="light"] { /* light overrides */ }
[data-theme="dark"]  { /* dark overrides */ }
```

**FOUC Prevention**

```typescript
// apps/web/src/components/theme-script.tsx (Server Component)
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var stored = localStorage.getItem('pah-theme');
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            var theme = stored || (prefersDark ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', theme);
          })();
        `.replace(/</g, '\\u003c'),
      }}
    />
  )
}
```

**Visual Regression Strategy**

```typescript
// apps/web/e2e/visual-regression.spec.ts
const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 667  },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
] as const

const PAGES = [
  { name: 'home',        path: '/' },
  { name: 'listing',     path: '/politicos' },
  { name: 'methodology', path: '/metodologia' },
  { name: 'sources',     path: '/fontes' },
  { name: 'profile',     path: '/politicos/test-politician-sp' },
] as const
// 5 pages x 3 viewports x 2 themes = 30 baseline screenshots
// maxDiffPixelRatio: 0.02 (2% tolerance for anti-aliasing)
```

**A11y Strategy**

```typescript
// apps/web/e2e/accessibility.spec.ts (enhanced)
// Covers all pages in both light and dark modes
// Uses @axe-core/playwright with tags: wcag2a, wcag2aa, wcag21a, wcag21aa
// Dark mode via emulateMedia({ colorScheme: 'dark' })
```

**Test Skill Specifications**

Web test skill (`web-testing-pah`):

- SKILL.md (overview, <100 lines) + unit-testing.md + e2e-testing.md + a11y-testing.md + visual-regression.md
- Created using `/customaize-agent:test-skill`
- Deployed to `.claude/skills/web-testing-pah/` AND `.agents/skills/web-testing-pah/`

API test skill (`api-testing-pah`):

- SKILL.md (overview, <100 lines) + unit-testing.md + integration-testing.md + route-testing.md + domain-rules.md
- Created using `/customaize-agent:test-skill`
- Deployed to `.claude/skills/api-testing-pah/` AND `.agents/skills/api-testing-pah/`

**Local Full-Stack Environment**

| Service | Tool | Port | Notes |
|---------|------|------|-------|
| PostgreSQL | `supabase start` | 54322 | Uses migrations + seed.sql from `supabase/` |
| API | `pnpm --filter @pah/api dev` | 3001 | Fastify dev server with hot reload |
| Web | `pnpm --filter @pah/web dev` | 3000 | Next.js dev server |

For headless CI, a `docker-compose.test.yml` targets API + Web only (DB = `supabase start`).

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dark mode FOUC | MEDIUM | `ThemeScript` inline before React hydration prevents flash |
| Font CLS (layout shift) | MEDIUM | `font-display: swap` + size-adjust hint |
| Visual regression test fragility | MEDIUM | 2% pixel tolerance + `waitForLoadState('networkidle')` |
| Supabase CLI version mismatch | LOW | Pin CLI version in package.json devDependencies |
| Animation jank on low-end Android | MEDIUM | CSS transforms only; respect `prefers-reduced-motion` |
| aXe-core false negatives | MEDIUM | Supplement with manual keyboard navigation test |
| Skill token bloat | LOW | Apply progressive disclosure; keep SKILL.md < 100 lines |

---

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases that can run concurrently (e.g., "with 3" or "-")
  DEPENDS: phases that must complete first (e.g., "1, 2" or "-")
  PRP: link to generated plan file once created
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | **Design Tokens** | CSS variables (light + dark modes, typography, spacing, radius, animation) | complete | - | - | `.claude/PRPs/plans/completed/rf-018-phase-1-design-tokens.plan.md` |
| 2 | **Custom Fonts** | Inter + JetBrains Mono via `next/font`, apply to layout + components | complete | with 3 | 1 | `.claude/PRPs/plans/completed/rf-018-phase2-3-4-fonts-darkmode-homepage.plan.md` |
| 3 | **Dark Mode** | System detection (ThemeScript FOUC prevention) + ThemeToggle component | complete | with 2 | 1 | `.claude/PRPs/plans/completed/rf-018-phase2-3-4-fonts-darkmode-homepage.plan.md` |
| 4 | **Home Page** | Hero + featured politicians (API-fetched) + CTA, SEO metadata | complete | with 2,3 | 1 | `.claude/PRPs/plans/completed/rf-018-phase2-3-4-fonts-darkmode-homepage.plan.md` |
| 5 | **Component Refinement** | Buttons, cards, forms, tables, badges per PRD spec | complete | - | 1,2,3 | `.claude/PRPs/plans/completed/rf-018-phase5-component-refinement.plan.md` |
| 6 | **Navigation & Interactions** | Validate navigation (built in Phase 5), add page fade transitions, final audit | complete | - | 5 | `.claude/PRPs/plans/rf-018-phase6-navigation-interactions.plan.md` |
| 7 | **Testing Infrastructure** | Local full-stack env + TESTING.md + docker-compose.test.yml + convenience scripts | in-progress | - | - | `.claude/PRPs/plans/rf-018-phase7-testing-infrastructure.plan.md` |
| 8 | **Visual Regression** | 30 baseline screenshots (5 pages x 3 viewports x light + dark) | pending | with 9 | 6,7 | - |
| 9 | **A11y Enhancement** | Full WCAG 2.1 AA scan all pages, both themes; dark mode variants; contrast audit | pending | with 8 | 6 | - |
| 10 | **Skills + CI/CD + Docs** | Web + API test skills, `.agents/skills/` replication, CI/CD updates, `docs:update-docs` | pending | - | 8,9 | - |

### Phase Details

**Phase 1: Design Tokens** -- complete (PR #37)

- **Goal**: Establish all CSS variables for light/dark modes, typography, spacing, border radius, and animation timing
- **Scope** (delivered):
  - `apps/web/src/styles/tokens.css` -- all CSS vars defined (colors, spacing, radius, transitions)
  - `apps/web/src/styles/globals.css` -- migrated to Tailwind v4 syntax (`@import "tailwindcss"` + `@custom-variant dark`)
  - `apps/web/postcss.config.mjs` -- created with `@tailwindcss/postcss` plugin
  - `apps/web/tailwind.config.ts` -- added radius/transition token mappings
  - Tailwind v4 full migration -- installed `@tailwindcss/postcss`, fixed breaking changes (shadow-sm to shadow-xs)
- **Success signal**: `pnpm typecheck` (5 packages), `pnpm lint`, `pnpm build`, `vercel build` all pass

**Phase 2: Custom Fonts** -- complete (PR #39)

- **Goal**: Load Inter and JetBrains Mono via `next/font` with `display: swap` for 3G users
- **Scope** (delivered):
  - Fonts imported in `apps/web/src/app/layout.tsx` using `next/font/google`
  - `--font-sans` applied to `<body>` and all UI text
  - `--font-mono` applied to all numeric score displays and table data
  - No Cumulative Layout Shift verified via Lighthouse
- **Success signal**: Chrome DevTools shows Inter rendering; no CLS in Lighthouse

**Phase 3: Dark Mode** -- complete (PR #39)

- **Goal**: System preference auto-applies; user can toggle; no FOUC
- **Scope** (delivered):
  - `ThemeScript` server component (inline script for FOUC prevention in `<head>`)
  - `ThemeToggle` client component (Sun/Moon icon; reads/writes localStorage key `'pah-theme'`)
  - OS preference change listener via `matchMedia`
  - `ThemeScript` rendered before all other children in root layout
- **Success signal**: Toggle switches modes; OS preference detected on first load; no FOUC on hard refresh

**Phase 4: Home Page** -- complete (PR #39)

- **Goal**: `/` loads with hero, API-fetched featured politicians, CTA button
- **Scope** (delivered):
  - `apps/web/src/app/page.tsx` created
  - Hero: heading h1 + subheading + CTA button (`href="/politicos"`)
  - Featured politicians: fetch top 3 from API with `.catch(() => [])` fallback for build-time
  - Bento grid layout: 1 col mobile, 2 cols tablet, 3 cols desktop
  - SEO metadata at page level
- **Success signal**: Page builds; passes aXe-core; CTA links to `/politicos`; responsive on 3 viewports

**Phase 5: Component Refinement** -- complete (branch `feat/rf-018-phase5-component-refinement`)

- **Goal**: All components visually match Frontend Design PRD specifications
- **Scope** (delivered):
  - Buttons: primary/secondary; hover `-translate-y-[1px]` + shadow; disabled `opacity-50 cursor-not-allowed`
  - Cards: `bg-[--color-surface]`, `border-[--color-border]`, `rounded-xl`/`rounded-2xl`
  - Forms/Inputs: 44px min height; focus ring `ring-2 ring-[--color-primary]`
  - Tags/Badges: `bg-[--color-surface]`; neutral text (no party colors)
  - Tables: `border-b border-[--color-border]`; row hover `hover:bg-[--color-surface]`
  - Score displays: `font-mono` class
  - Navigation: glassmorphism header, desktop sidebar (280px), mobile bottom tab bar (44x44px), tablet drawer -- **built ahead of original Phase 6 scope**
  - Skeleton loaders: `ui/skeleton.tsx` with `Skeleton`, `SkeletonText`, `SkeletonCard`
  - Tooltips: `ui/tooltip.tsx` with 150ms fade, dark bg, `aria-describedby`
  - `prefers-reduced-motion` handling in `globals.css`
- **Success signal**: All components render in both modes; no hardcoded color values; 70 unit tests pass; `pnpm build` passes

**Phase 6: Navigation & Interactions** -- complete (branch `feat/rf-018-phases6-12-nav-interactions-testing`)

- **Goal**: Validate already-built navigation, add remaining page fade transitions, perform final cross-page design audit
- **Scope** (delivered):
  - **Navigation validation**: Confirmed glassmorphism header, desktop sidebar (280px), tablet drawer, mobile bottom tab bar all built in Phase 5 — all PRD spec requirements met (blur, 44px touch targets, `aria-current`, `aria-label`, keyboard nav). No code changes needed.
  - **Page fade transitions**: Added `page-fade-in` keyframe + `animate-page-in` to `tailwind.config.ts`; applied `motion-safe:animate-page-in` to all 13 `<main>` elements across all pages and tab views
  - **Loading page a11y**: Fixed all 8 `loading.tsx` files — added `id="main-content"`, `tabIndex={-1}`, `aria-label` (in pt-BR), `focus:outline-none` so skip-link works during Suspense fallback
  - **Header token**: Replaced hardcoded `bg-white/70 dark:bg-[#0b0e14]/70` with `bg-background/70` in `layout-client.tsx`
- **Success signal**: 70 unit tests pass; `pnpm build` passes; navigation passes audit; all pages consistently use design tokens in both modes

**Phase 7: Testing Infrastructure**

- **Goal**: Local full-stack environment that mirrors production for E2E test validation
- **Scope**:
  - Document 3-terminal workflow in `TESTING.md` (supabase start -> api dev -> web dev)
  - Create `docker-compose.test.yml` for headless CI test environment (API + Web only; DB = Supabase CLI)
  - Use Vercel MCP to retrieve environment variable names; document in TESTING.md under "Environment Parity Notes"
  - Add `"dev:db"`, `"dev:api"`, `"dev:web"` convenience scripts to root `package.json`
  - Verify API health at `GET /health` on :3001; Web loads at :3000
  - Test ISR revalidation token (`VERCEL_REVALIDATE_TOKEN`) in local env
- **Success signal**: All 3 services start without error; home page loads; politician listing loads; API returns data; workflow documented in `TESTING.md`

**Phase 8: Visual Regression**

- **Goal**: 30 baseline screenshots (5 pages x 3 viewports x 2 themes) stored in repo
- **Scope**:
  - Create `apps/web/e2e/visual-regression.spec.ts` per design in Technical Approach
  - Run `pnpm playwright test visual-regression --update-snapshots` to generate baselines
  - Commit baselines to repo under `apps/web/e2e/__snapshots__/`
  - Configure Playwright to fail on diffs > 2% pixel ratio
  - Document snapshot update process in `TESTING.md` (when/how to approve intentional changes)
- **Success signal**: All 30 screenshots generated; re-run shows 0 diffs; update process documented

**Phase 9: A11y Enhancement**

- **Goal**: Zero WCAG 2.1 AA violations on all pages in both light and dark modes
- **Scope**:
  - Expand `apps/web/e2e/accessibility.spec.ts` to cover all pages including profile (requires seeded DB)
  - Add dark mode variant tests (`emulateMedia({ colorScheme: 'dark' })`) -- currently only light mode exists
  - Run `pnpm playwright test accessibility` and confirm 0 violations
  - Verify keyboard navigation on all interactive elements (especially navigation components from Phase 5)
  - Verify contrast ratios for dark mode: >= 4.5:1 normal text, >= 3:1 large text
  - Generate final a11y audit report
- **Success signal**: 0 violations in both modes on all pages; keyboard nav tested; contrast ratios documented

**Phase 10: Skills + CI/CD + Docs**

- **Goal**: Sustainable infrastructure: test skills, CI gates, complete documentation
- **Scope**:

  Web Test Skill (use `/customaize-agent:test-skill`):
  - Name: "Testing Political Authority Highlighter Web"
  - Description: Context-specific testing guide for apps/web/. Covers unit tests (Vitest + RTL), E2E tests (Playwright + aXe-core), visual regression baselines, and dark mode validation. Use when writing, running, or debugging tests in apps/web/, or when a design change needs regression validation before merge.
  - Structure: SKILL.md (<100 lines) + unit-testing.md + e2e-testing.md + a11y-testing.md + visual-regression.md
  - Deploy to: `.claude/skills/web-testing-pah/` AND `.agents/skills/web-testing-pah/`

  API Test Skill (use `/customaize-agent:test-skill`):
  - Name: "Testing Political Authority Highlighter API"
  - Description: Context-specific testing guide for apps/api/. Covers unit tests (Vitest), integration tests (Testcontainers + real PostgreSQL), and Fastify route testing. Use when writing, running, or debugging tests in apps/api/, or when validating API behavior against public schema boundaries (DR-001, DR-006).
  - Structure: SKILL.md (<100 lines) + unit-testing.md + integration-testing.md + route-testing.md + domain-rules.md
  - Deploy to: `.claude/skills/api-testing-pah/` AND `.agents/skills/api-testing-pah/`

  CI/CD Updates (evaluate `project-cicd` skill):
  - `.github/workflows/ci.yml`: Add steps for visual regression test + a11y validation + Playwright E2E
  - Ensure Docker test environment (`docker-compose.test.yml`) is used in CI for E2E
  - Add snapshot diff artifacts upload on failure
  - `.github/workflows/deploy.yml`: Add pre-deploy visual regression check

  Documentation:
  - Create `TESTING.md` at project root (if not created in Phase 7): local dev setup, Docker test env, snapshot update workflow
  - Create `apps/web/DESIGN-SYSTEM.md`: token reference, color palette, dark mode guide
  - Update root `CLAUDE.md`: add design token system reference + test skill pointers
  - Run `docs:update-docs` skill to sync all documentation

- **Success signal**: Both skills deployed to `.claude/skills/` AND `.agents/skills/`; CI passes with new steps; `pnpm build` + `vercel build --yes` pass; `docs:update-docs` executed; memory updated

### Parallelism Notes

Phases 8 and 9 can run in parallel in separate worktrees: visual regression (Phase 8) and a11y enhancement (Phase 9) touch different test files (`visual-regression.spec.ts` vs `accessibility.spec.ts`) and have no shared state. Both depend on Phase 6 (pages finalized) and Phase 7 (local stack for running E2E tests). Phase 10 must wait for both 8 and 9 because the test skills need to document the visual regression and a11y workflows that those phases create.

### Process Rules (All Phases)

These apply to every implementation phase:

1. **Design Skill Gate** (UI Phases 1-6): Invoke `/web-frontend-design` skill before implementing any UI change.
2. **Documentation Gate** (All Phases): Run `docs:update-docs` at the end of every phase. Evaluate if `.github/workflows/` need updates.
3. **Testing Gate** (All Phases): `pnpm --filter @pah/web test` + `pnpm build` must pass before a phase is marked complete.
4. **Skill Replication** (Phase 10): Skills created using `/customaize-agent:test-skill` must be placed in both `.claude/skills/` AND `.agents/skills/`.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Dark mode strategy | System preference detect + FOUC-free script + user toggle | Tailwind `dark:` prefix only | Explicit control; no hydration mismatch; works with older browsers |
| CSS variable structure | `:root` + `@media prefers-color-scheme` + `[data-theme]` | Tailwind dark: prefix only | FOUC prevention requires non-JS fallback; `[data-theme]` enables user override |
| Font loading | `next/font/google` with `display: swap` | Self-hosted or CDN | Built-in optimization; prevents FOUC; swap is 3G-safe |
| Local DB layer | `supabase start` (Supabase CLI) | Raw PostgreSQL in Docker | Already has migrations + seed data; matches production schema exactly; CLAUDE.md-mandated |
| Home page | Required for MVP | Defer to v1.1 | User landing point; required for CTA flow; domain root 404 is unacceptable |
| Component library | Continue with pure Tailwind | Adopt shadcn/ui | No breaking changes; token-first is more flexible; avoids migration cost |
| Mobile nav | Bottom tab bar | Top hamburger menu | PRD specifies bottom nav; better thumb reach on mobile |
| Skill structure | Progressive disclosure (SKILL.md + referenced files) | Single large SKILL.md | Follows Anthropic best practices; reduces token usage; easier to maintain |
| Skill replication | `.claude/skills/` AND `.agents/skills/` | One location only | User requirement; ensures availability in all execution contexts |
| Phase consolidation (v1.2) | Merge Phases 6+7+8 into single Phase 6 | Keep original 12 phases | Navigation, skeletons, tooltips, button hovers already built in Phase 5; remaining work (page transitions + audit) fits one phase |

---

## Research Summary

**Market Context**
Brazilian government transparency tools (e.g., Atlas Politico, Ranking dos Politicos) use basic designs with no dark mode or design system. A polished, token-based design with dark mode would differentiate PAH significantly. Mobile-first is critical: ~75% of Brazilian internet access is mobile, with a significant share on low-end Android + 3G/4G.

**Technical Context**

- Feasibility: HIGH. All required technologies already in the stack (Tailwind CSS v4, Next.js 15 `next/font`, Playwright, Vitest).
- Token-first CSS variable approach is proven in production at scale (Vercel's design system, Stripe Dashboard).
- `next/font` eliminates external font requests, critical for 3G performance.
- Supabase CLI local development is already the project standard; no new infrastructure needed for testing.
- Playwright visual regression (`toHaveScreenshot`) is stable and supports cross-browser baseline comparison.
- Phase 5 delivered significantly more than originally scoped (navigation, skeletons, tooltips), reducing remaining work from ~7 UI phases to ~1 validation phase.

---

*Generated: 2026-03-15*
*Revised: 2026-03-16 (v1.2 -- restructured to PRP template; consolidated phases 6-8 based on codebase reality; resolved 3 open questions; added Research Summary and MVP Scope)*
*Status: IN-PROGRESS -- Phases 1-6 complete, Phase 7 in-progress, 8-10 pending*
