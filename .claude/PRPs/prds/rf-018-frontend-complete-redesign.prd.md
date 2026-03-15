# Frontend Complete Redesign & Testing Infrastructure

**Project**: Political Authority Highlighter  
**Scope**: Full frontend modernization + comprehensive local testing stack  
**Status**: DRAFT - Ready for Implementation  
**Version**: 1.1 (revised with Anthropic skill best practices + gap resolution)

---

## Problem Statement

The Political Authority Highlighter MVP is functionally complete with good responsiveness and accessibility, but has **zero design system implementation**. Current state:

- ❌ No dark mode (light-only)
- ❌ No custom fonts (system default instead of Inter/Plus Jakarta Sans/JetBrains Mono)
- ❌ No glassmorphism effects or modern micro-interactions
- ❌ No home page (`/` returns 404)
- ❌ Basic component styling without formal state definitions
- ❌ No local full-stack testing infrastructure to validate design changes
- ❌ No reusable test skills for web and API contexts
- ❌ No visual regression baseline to prevent design drift

**Impact**: The platform cannot launch to the general Brazilian public (18+ years) without a modern, trustworthy visual identity. Users expect SaaS-quality design; current implementation feels unfinished. There are also no safeguards preventing future feature work from silently breaking design compliance.

**Cost of inaction**: Cannot ship to users; fails to meet PRD quality bar; lacks testing safeguards against regressions.

---

## Evidence

- **Design PRD exists but is unimplemented**: `docs/prd/frontend_design_prd.md` specifies a complete design system (tokens, typography, animations, accessibility). Current codebase implements only ~30% of it.
- **No home page**: `/` route does not exist; new users arriving at the domain see a 404.
- **User target mismatch**: Everyday Brazilians on low-end Android + 3G expect simple, trustworthy design. Current light-only interface with system fonts does not convey "modern SaaS."
- **No regression safeguards**: Visual changes can be introduced without detection; no snapshot baseline exists.
- **Missing test skills**: Both `apps/web/` and `apps/api/` lack context-specific testing skills, making test strategy inconsistent across sessions and contributors.

---

## Proposed Solution

**Complete implementation of the Frontend Design PRD** across all pages + new home page + comprehensive local testing infrastructure + reusable project skills.

**What we're building:**
1. **Design System** — Dark mode + light mode with semantic CSS variables; custom fonts (Inter, Plus Jakarta Sans, JetBrains Mono) with full typography scale
2. **Home Page** — Hero + featured politicians + CTA to listing
3. **Component Refinement** — Buttons, cards, navigation with glassmorphism; all interactive states (hover, focus, active, disabled)
4. **Micro-interactions** — Page transitions, tooltip animations, skeleton loaders, button hover effects
5. **Testing Infrastructure** — Local full-stack environment (Supabase CLI + Fastify API + Next.js web), visual regression testing, automated a11y validation
6. **Reusable Test Skills** — Context-specific skills for `apps/web/` and `apps/api/` following Anthropic best practices, replicated in `.agents/skills/`
7. **CI/CD Updates** — Add design validation + visual regression steps to `.github/workflows/`

---

## Key Hypothesis

**We believe** that a modern, consistently-designed interface with dark mode, custom fonts, and glassmorphic effects **will** signal trustworthiness and professionalism to everyday Brazilians exploring politician data.

**We'll know we're right when:**

1. ✅ 100% Frontend Design PRD compliance (all components styled per spec)
2. ✅ Zero automated a11y violations (WCAG 2.1 AA) across all pages
3. ✅ All pages pass responsive tests at mobile (375px), tablet (768px), desktop (1920px)
4. ✅ Visual regression baselines established for all pages (20+ screenshots)
5. ✅ Dark mode auto-detects browser/system preference + can be toggled
6. ✅ Local full-stack environment starts with a single command
7. ✅ Home page exists, loads featured politicians, and drives users to listing

---

## What We're NOT Building

- **Politician login/profile features** — Deferred to v1.1; not in MVP scope
- **Advanced analytics dashboard** — Out of scope; focus on core data exploration
- **Multi-language support** — Portuguese only for MVP
- **Mobile app** — Web-only for launch
- **Custom OG image generation** — Static fallback acceptable for MVP
- **A/B testing framework** — Not needed for initial launch

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| **PRD Compliance** | 100% of MUST items | Checklist audit against `docs/prd/frontend_design_prd.md` |
| **A11y Violations** | 0 (WCAG 2.1 AA) | aXe-core E2E scan on all pages |
| **Responsive Coverage** | All pages pass 3 viewports | Playwright visual regression |
| **Dark Mode** | System preference auto-detected + user toggle | Manual + E2E test |
| **Visual Regression Baseline** | 20+ screenshots stored in repo | Playwright `toHaveScreenshot()` |
| **Local Stack** | Single-command startup | `pnpm dev:full` or equivalent |
| **Test Skills** | Both `web` and `api` skills deployed + replicated to `.agents/skills/` | Skill file existence check |

---

## Users & Context

### Primary User
- **Who**: Brazilian citizen, 18+ years old, any literacy level, diverse device (low-end Android common), may use 3G network
- **Current behavior**: Searches "deputado name" on Google, finds fragmented data across multiple government sites
- **Trigger moment**: Before voting, when evaluating a candidate, when sharing info with friends
- **Success state**: Finds politician's data in one place, understands score, sees voting history, feels confident

### Job to Be Done
"When I don't know a trustworthy politician, I want to find and understand data about them in a friendly and understandable way, so I can check all data from the politicians and choose some to vote or share."

### Non-Users
- Politicians managing their own profiles (future feature, not MVP)
- Government officials auditing the platform
- Paid/authenticated users (free public access only)

---

## Existing Skills & MCPs Leveraged

Before building new infrastructure, this PRD explicitly uses existing project capabilities:

| Capability | Resource | Used For |
|------------|----------|---------|
| Design compliance enforcement | `web-frontend-design` skill | Invoked before any UI phase begins |
| Browser testing | `playwright-mcp` | E2E tests, screenshots, a11y scans |
| Live browser inspection | `browser-testing-with-devtools` | Visual debugging, CSS inspection |
| Web testing patterns | `web-testing` skill | Test writing guidance, a11y patterns |
| Domain rule enforcement | `project-guardian` skill | Validating DR-002 (neutrality), DR-001 (silent exclusion) |
| Project environment | Supabase CLI (`supabase start`) | Local database on port 54322 |
| Frontend preview | Vercel MCP (`mcp__vercel__*`) | Mirror Vercel preview environment configs |
| Local DB migrations | `supabase db reset` | Apply migrations + seed data locally |
| Documentation updates | `docs:update-docs` skill | **Mandatory at end of each phase** |
| Skill creation | `customaize-agent:test-skill` | Create web + API specific test skills |

**New capabilities needed** (not currently available):
- Visual regression test suite (`apps/web/e2e/visual-regression.spec.ts`)
- Context-specific test skills for `apps/web/` and `apps/api/`
- Full-stack local dev startup script

---

## Non-Negotiable Process Rules

These apply to **every implementation phase** in this PRD:

### Rule 1: Design Skill Gate (UI Phases Only)
Before implementing any UI change (Phases 1–8):
```
MUST invoke: /web-frontend-design skill
```
This skill enforces the Frontend Design PRD. Do not write any JSX, CSS, or Tailwind classes without it.

### Rule 2: Documentation Gate (All Phases)
At the **end of every phase** before marking it complete:
```
MUST execute: /docs:update-docs
MUST evaluate: if .github/workflows/ need updates for the change
```

### Rule 3: Testing Gate (All Phases)
Tests must pass **before** a phase is marked complete. For UI phases (1–8):
```
MUST run: pnpm --filter @pah/web test
MUST run: pnpm build (full build check)
MUST verify: no visual regression diffs
MUST verify: no a11y violations introduced
```

### Rule 4: Skill Replication (Phase 12)
Any skill created during Phase 12 **must**:
```
MUST be created using: /customaize-agent:test-skill
MUST be placed in both: .claude/skills/{skill-name}/ AND .agents/skills/{skill-name}/
```

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| **MUST** | Light mode design tokens (colors, typography, spacing, radius) | Foundation for all components |
| **MUST** | Dark mode design tokens matching PRD exactly | Feature requirement + accessibility |
| **MUST** | Dark mode system preference detection + toggle (Sun/Moon in header) | PRD-required; UX standard |
| **MUST** | Custom fonts: Inter, Plus Jakarta Sans, JetBrains Mono via `next/font` | Brand identity; PRD-required |
| **MUST** | Home page with hero + featured politicians + CTA | MVP: user landing point |
| **MUST** | Update all 10+ pages to use design tokens | Consistency |
| **MUST** | Button component states (default, hover, focus, active, disabled) | PRD-specified |
| **MUST** | Card/bento grid styling with surface tokens | Core data layout pattern |
| **MUST** | Glassmorphism effects on header (`backdrop-blur-md`) | Vibe aesthetic |
| **MUST** | Page transition animations (300ms fade) | Visual continuity |
| **MUST** | Tooltip animations (150ms fade, dark background) | a11y: explain terms |
| **MUST** | Mobile bottom tab navigation bar (44×44px min touch targets) | Mobile UX standard; PRD-required |
| **MUST** | 0 a11y violations post-redesign | WCAG 2.1 AA compliance |
| **MUST** | Local full-stack environment (Supabase CLI + API + Web) | Testing prerequisite |
| **MUST** | Visual regression baseline (20+ screenshots, 3 viewports) | Regression prevention |
| **MUST** | CI/CD updated with design + a11y validation steps | Regression prevention in pipeline |
| **MUST** | Web test skill (context-specific, deployed to `.agents/skills/`) | Sustainable testing |
| **MUST** | API test skill (context-specific, deployed to `.agents/skills/`) | Sustainable testing |
| **SHOULD** | Skeleton loaders matching data shapes (cards, tables, text) | UX polish |
| **SHOULD** | Advanced button hover translation (`-translate-y-[1px]` + shadow) | Vibe polish |
| **COULD** | Animated progress bars on score gauges | Nice-to-have |
| **WON'T** | Custom OG image generation | Defer; static fallback OK |

### User Flow — Critical Path

```
1. User lands on / (HOME PAGE)
   ↓
2. Hero: "Explore dados de políticos" + 3 featured politicians
   ↓
3. Clicks "Ver Todos" CTA → /politicos (LISTING)
   ↓
4. Searches by name, filters by role/state
   ↓
5. Clicks politician card → /politicos/[slug] (PROFILE)
   ↓
6. Sees integrity score, explores tabs
   ↓
7. (Optional) /metodologia (METHODOLOGY)
```

All pages in this flow must: use design tokens, support dark/light mode, use custom fonts, have 0 a11y violations, and be responsive on mobile/tablet/desktop.

---

## Technical Approach

### Architecture: Token-First Design System

```
apps/web/src/styles/
├── globals.css          ← Updated: use CSS variables throughout
├── tokens.css           ← NEW: Full token definitions (light + dark)
└── fonts.css            ← NEW: next/font declarations

apps/web/src/components/
├── theme-toggle.tsx     ← NEW: system preference + localStorage toggle
└── [existing components refactored]

apps/web/src/app/
├── layout.tsx           ← Updated: add font variables + ThemeScript
├── page.tsx             ← NEW: Home page
└── [existing pages updated]

apps/web/tailwind.config.ts
└── Updated: custom colors + font families from tokens
```

### CSS Variable Strategy

```css
/* tokens.css — Light mode defaults */
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

/* Dark mode — system preference (no JS needed) */
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
[data-theme="light"] { --color-background: #ffffff; /* ... */ }
[data-theme="dark"]  { --color-background: #0b0e14; /* ... */ }
```

### Dark Mode — FOUC Prevention

To prevent Flash of Unstyled Content (FOUC), inject an inline script into `<head>` before React hydration:

```typescript
// apps/web/src/components/theme-script.tsx
// Server Component — renders inline script tag
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var stored = localStorage.getItem('theme');
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

### Font Loading — 3G Friendly

```typescript
// apps/web/src/app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',    // Show system font while loading — 3G-safe
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})
```

### Local Full-Stack Environment

**Preferred stack** (mirrors production most closely):

| Service | Tool | Port | Notes |
|---------|------|------|-------|
| PostgreSQL | `supabase start` | 54322 | Uses migrations + seed.sql from `supabase/` |
| API | `pnpm --filter @pah/api dev` | 3001 | Fastify dev server with hot reload |
| Web | `pnpm --filter @pah/web dev` | 3000 | Next.js dev server |

**Why `supabase start` instead of raw PostgreSQL Docker**: The Supabase CLI runs the full local stack including your migrations, roles.sql, and seed data. A raw PostgreSQL container would require manually re-running all migration files and role grants. `supabase start` is already documented in `CLAUDE.md` as the preferred local development approach.

**Startup script** (root `package.json` addition):

```json
{
  "scripts": {
    "dev:db": "supabase start",
    "dev:api": "pnpm --filter @pah/api dev",
    "dev:web": "pnpm --filter @pah/web dev"
  }
}
```

For parallelized startup, a `TESTING.md` will document the 3-terminal workflow.

**For E2E tests (headless)**, a Docker Compose file targeting only web + API is appropriate (database still uses Supabase CLI):

```yaml
# docker-compose.test.yml — API + Web only (DB = supabase start)
services:
  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql://postgres:postgres@host.docker.internal:54322/postgres
      NODE_ENV: test
      PORT: 3001
    ports: ["3001:3001"]

  web:
    build: ./apps/web
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      NODE_ENV: test
    ports: ["3000:3000"]
    depends_on: [api]
```

### Vercel Environment Mirroring

Use Vercel MCP to retrieve preview environment variables for accurate local replication:

```
mcp__vercel__get_project → retrieve NEXT_PUBLIC_API_URL, VERCEL_REVALIDATE_TOKEN
mcp__vercel__list_deployments → compare preview vs local behavior
mcp__vercel__get_runtime_logs → diagnose any production-vs-local divergence
```

Document findings in `TESTING.md` under "Environment Parity Notes."

### Visual Regression Strategy

```typescript
// apps/web/e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test'

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

for (const { name: viewport, width, height } of VIEWPORTS) {
  for (const { name: page, path } of PAGES) {
    test(`${page} @${viewport}`, async ({ page: p }) => {
      await p.setViewportSize({ width, height })
      await p.goto(`http://localhost:3000${path}`)
      await p.waitForLoadState('networkidle')
      await expect(p).toHaveScreenshot(`${page}-${viewport}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02, // 2% tolerance for anti-aliasing
      })
    })

    test(`${page} dark mode @${viewport}`, async ({ page: p }) => {
      await p.setViewportSize({ width, height })
      await p.emulateMedia({ colorScheme: 'dark' })
      await p.goto(`http://localhost:3000${path}`)
      await p.waitForLoadState('networkidle')
      await expect(p).toHaveScreenshot(`${page}-dark-${viewport}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      })
    })
  }
}
```

Total: 5 pages × 3 viewports × 2 themes = **30 baseline screenshots**.

### A11y Strategy (Enhanced)

```typescript
// apps/web/e2e/accessibility.spec.ts (enhanced)
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES = [
  { name: 'home',        path: '/' },
  { name: 'listing',     path: '/politicos' },
  { name: 'methodology', path: '/metodologia' },
  { name: 'sources',     path: '/fontes' },
]

for (const { name, path } of PAGES) {
  test(`${name}: zero WCAG 2.1 AA violations (light mode)`, async ({ page }) => {
    await page.goto(`http://localhost:3000${path}`)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test(`${name}: zero WCAG 2.1 AA violations (dark mode)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(`http://localhost:3000${path}`)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
}
```

### Web Test Skill Specification (Anthropic Best Practices)

The skill to be created in Phase 12 using `/customaize-agent:test-skill`:

```yaml
# .claude/skills/web-testing-pah/SKILL.md frontmatter
name: Testing Political Authority Highlighter Web
description: >
  Context-specific testing guide for apps/web/ in the Political Authority Highlighter project.
  Covers unit tests (Vitest + RTL), E2E tests (Playwright + aXe-core), visual regression
  baselines, and dark mode validation. Use when writing, running, or debugging tests in
  apps/web/, or when a design change needs regression validation before merge.
```

**Skill body must follow progressive disclosure:**
- `SKILL.md` — overview + quick commands (under 100 lines)
- `unit-testing.md` — Vitest + RTL patterns, mock setup
- `e2e-testing.md` — Playwright patterns, visual regression workflow
- `a11y-testing.md` — aXe-core patterns, WCAG 2.1 AA checklist
- `visual-regression.md` — snapshot baseline process, update workflow

### API Test Skill Specification (Anthropic Best Practices)

```yaml
# .claude/skills/api-testing-pah/SKILL.md frontmatter
name: Testing Political Authority Highlighter API
description: >
  Context-specific testing guide for apps/api/ in the Political Authority Highlighter project.
  Covers unit tests (Vitest), integration tests (Testcontainers + real PostgreSQL), and
  Fastify route testing. Use when writing, running, or debugging tests in apps/api/, or when
  validating API behavior against public schema boundaries (DR-001, DR-006).
```

**Skill body must follow progressive disclosure:**
- `SKILL.md` — overview + quick commands (under 100 lines)
- `unit-testing.md` — service + transformer tests, mocking patterns
- `integration-testing.md` — Testcontainers setup, real DB queries
- `route-testing.md` — Fastify inject testing, TypeBox schema validation
- `domain-rules.md` — DR-001, DR-005, DR-006 validation checklist

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | Gate |
|---|-------|-------------|--------|----------|---------|------|
| 1 | **Design Tokens** | CSS variables (light + dark modes, typography, spacing, radius, animation) | pending | — | — | build + typecheck |
| 2 | **Custom Fonts** | Inter + JetBrains Mono via `next/font`, apply to layout + components | pending | with 3 | 1 | font visual check |
| 3 | **Dark Mode** | System detection (ThemeScript FOUC prevention) + ThemeToggle component | pending | with 2 | 1 | toggle E2E |
| 4 | **Home Page** | Hero + featured politicians (API-fetched) + CTA, SEO metadata | pending | with 2,3 | 1 | a11y + responsive |
| 5 | **Component Refinement** | Buttons, cards, forms, tables, badges per PRD spec | pending | — | 1,2,3 | visual + a11y |
| 6 | **Navigation Redesign** | Glassmorphism header + desktop sidebar + mobile bottom tab bar | pending | with 5 | 1,2,3 | responsive + a11y |
| 7 | **Micro-interactions** | Page transitions (300ms), button hovers, skeleton loaders, tooltips | pending | with 5,6 | 5 | perf + motion |
| 8 | **Page Updates** | Apply tokens to all 10+ pages consistently | pending | — | 5,6,7 | full E2E pass |
| 9 | **Local Full-Stack** | Supabase CLI + API dev + Web dev + Docker for test env + TESTING.md | pending | — | — | stack startup |
| 10 | **Visual Regression** | 30 baseline screenshots (5 pages × 3 viewports × light + dark) | pending | with 11 | 8,9 | all baselines pass |
| 11 | **A11y Enhancement** | Full WCAG 2.1 AA scan all pages, both themes; contrast audit | pending | with 10 | 8 | 0 violations |
| 12 | **Skills + CI/CD + Docs** | Web + API test skills (Anthropic BP), `.agents/skills/` replication, CI/CD, `docs:update-docs` | pending | — | 8,10,11 | skills deployed |

### Execution Order

```
Phase 1 (foundation) → Phases 2, 3, 4, 9 in parallel
                    → Phase 5 (after 2+3) → Phases 6, 7 in parallel
                                          → Phase 8 (after 5+6+7)
                                            → Phases 10, 11 in parallel (after 8+9)
                                              → Phase 12 (final)
```

---

## Phase Details

### Phase 1: Design Tokens
- **Goal**: Establish all CSS variables for light/dark modes, typography, spacing, border radius, and animation timing
- **Scope**:
  - Create `apps/web/src/styles/tokens.css` with complete variable definitions
  - Update `globals.css` to replace all hardcoded values with `var(--*)`
  - Define `:root` (light defaults), `@media (prefers-color-scheme: dark)` overrides, and `[data-theme]` attribute selectors
  - Update `tailwind.config.ts` to extend with token-based custom colors and font families
- **Mandatory gates**: Run `pnpm build`; inspect `/politicos` in Chrome DevTools confirming CSS variables resolve; run `docs:update-docs`

### Phase 2: Custom Fonts
- **Goal**: Load Inter and JetBrains Mono via `next/font` with `display: swap` for 3G users
- **Scope**:
  - Import fonts in `apps/web/src/app/layout.tsx` using `next/font/google`
  - Apply `--font-sans` to `<body>` and all UI text
  - Apply `--font-mono` to all numeric score displays and table data
  - Verify no Cumulative Layout Shift (CLS > 0) via Lighthouse
- **Mandatory gates**: Chrome DevTools shows Inter rendering; no CLS in Lighthouse; run `docs:update-docs`

### Phase 3: Dark Mode
- **Goal**: System preference auto-applies; user can toggle; no FOUC
- **Scope**:
  - Create `ThemeScript` server component (inline script for FOUC prevention in `<head>`)
  - Create `ThemeToggle` client component (Sun/Moon icon; reads/writes localStorage key `'pah-theme'`)
  - Listen for `window.matchMedia('prefers-color-scheme: dark').addEventListener('change', ...)` to track OS changes
  - Add `ThemeScript` before all other children in root layout
- **Mandatory gates**: Toggle switches modes; OS preference detected on first load; no FOUC on hard refresh; run `docs:update-docs`

### Phase 4: Home Page
- **Goal**: `/` loads with hero, API-fetched featured politicians, CTA button
- **Scope**:
  - Create `apps/web/src/app/page.tsx`
  - Hero: heading `h1` + subheading + CTA button (`href="/politicos"`)
  - Featured politicians: fetch top 3 politicians by score from API (`/api/politicians?limit=3&sort=score_desc`); use `.catch(() => [])` fallback for build-time
  - Bento grid layout: 1 col mobile, 2 cols tablet, 3 cols desktop
  - SEO: `export const metadata = { title, description, openGraph }` at page level
- **Mandatory gates**: Page builds; passes aXe-core; CTA links to `/politicos`; responsive on 3 viewports; run `docs:update-docs`

### Phase 5: Component Refinement
- **Goal**: All components visually match Frontend Design PRD specifications
- **Scope**:
  - **Buttons**: primary (solid `bg-[--color-primary]`), secondary (outline); hover: `-translate-y-[1px]` + shadow; disabled: `opacity-50 cursor-not-allowed`
  - **Cards**: background `bg-[--color-surface]`, border `border-[--color-border]`, radius `rounded-xl` or `rounded-2xl`
  - **Forms/Inputs**: 44px min height; focus ring with `ring-2 ring-[--color-primary]`
  - **Tags/Badges**: `bg-[--color-surface]` background; neutral text (no party colors)
  - **Tables**: borderless rows with `border-b border-[--color-border]`; row hover `hover:bg-[--color-surface]`
  - **Score displays**: always use `font-mono` class
- **Mandatory gates**: All components render in both modes; no hardcoded color values; run `pnpm --filter @pah/web test`; run `docs:update-docs`

### Phase 6: Navigation Redesign
- **Goal**: Glassmorphism header, flat sidebar, mobile bottom tab bar
- **Scope**:
  - **Header**: `sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-[#0b0e14]/70 border-b border-[--color-border]`; includes SearchBar + ThemeToggle
  - **Desktop sidebar** (1024px+): 280px fixed, `bg-[--color-surface]`, active item `bg-[--color-border]/50`
  - **Mobile tab bar** (< 640px): `fixed bottom-0 w-full`, 5 tabs (Home, Buscar, Metodologia, Fontes), each 44×44px, `backdrop-blur-sm`
  - **Tablet drawer** (640–1024px): collapsible, slides in from left with smooth CSS transition
- **Mandatory gates**: Glassmorphism blur visible in both modes; tab bar accessible via keyboard; all nav items ≥ 44×44px; run `docs:update-docs`

### Phase 7: Micro-interactions & Animations
- **Goal**: Purposeful, accessible animations for all state changes
- **Scope**:
  - **Page transitions**: `animate-in fade-in duration-300` on `<main>` content wrapper
  - **Skeleton loaders**: shape-matched pulse skeletons for cards, tables, text blocks
  - **Button hovers**: `transition-all duration-200 ease-in-out hover:-translate-y-[1px]`
  - **Tooltips**: `transition-opacity duration-150 opacity-0 group-hover:opacity-100`, dark bg
  - **All animations**: wrapped in `@media (prefers-reduced-motion: no-preference)` or use Tailwind `motion-safe:` prefix
- **Mandatory gates**: 60fps on devtools profiler; no animation fires on `prefers-reduced-motion: reduce`; run `docs:update-docs`

### Phase 8: Page Updates
- **Goal**: Apply design tokens and all Phase 1–7 work consistently across every page
- **Scope** — all pages must use tokens, support dark mode, use custom fonts:
  - `src/app/politicos/page.tsx` (listing)
  - `src/app/politicos/[slug]/page.tsx` (profile overview)
  - `src/app/politicos/[slug]/projetos/page.tsx`
  - `src/app/politicos/[slug]/votacoes/page.tsx`
  - `src/app/politicos/[slug]/despesas/page.tsx`
  - `src/app/politicos/[slug]/propostas/page.tsx`
  - `src/app/politicos/[slug]/atividades/page.tsx`
  - `src/app/metodologia/page.tsx`
  - `src/app/fontes/page.tsx`
  - `src/app/not-found.tsx` and `src/app/error.tsx`
- **Mandatory gates**: `pnpm build` passes; `vercel build --yes` passes; full Playwright E2E suite passes; run `docs:update-docs`

### Phase 9: Local Full-Stack Environment
- **Goal**: One-command local stack that mirrors production environment for test validation
- **Scope**:
  - Document 3-terminal workflow in `TESTING.md` (supabase start → api dev → web dev)
  - Create `docker-compose.test.yml` for headless CI test environment (API + Web only; DB = Supabase CLI)
  - Use Vercel MCP (`mcp__vercel__get_project`, `mcp__vercel__get_deployment`) to retrieve environment variable names; document in TESTING.md
  - Add `"dev:all"` convenience script or `Makefile` target
  - Verify API health at `GET /health` on :3001; Web loads at :3000
  - Test ISR revalidation token (`VERCEL_REVALIDATE_TOKEN`) in local env
- **Mandatory gates**: All 3 services start without error; home page loads; politician listing loads; API returns data; run `docs:update-docs`

### Phase 10: Visual Regression Testing
- **Goal**: 30 baseline screenshots (5 pages × 3 viewports × 2 themes) stored in repo
- **Scope**:
  - Create `apps/web/e2e/visual-regression.spec.ts` per design in Technical Approach section
  - Run `pnpm playwright test visual-regression --update-snapshots` to generate baselines
  - Commit baselines to repo under `apps/web/e2e/__snapshots__/`
  - Configure Playwright to fail on diffs > 2% pixel ratio
  - Document snapshot update process in `TESTING.md` (when/how to approve intentional changes)
- **Mandatory gates**: All 30 screenshots generated; re-run shows 0 diffs; update process documented; run `docs:update-docs`

### Phase 11: A11y Testing Enhancement
- **Goal**: Zero WCAG 2.1 AA violations on all pages in both light and dark modes
- **Scope**:
  - Expand `apps/web/e2e/accessibility.spec.ts` to cover all pages (per Technical Approach spec)
  - Add dark mode variant tests (`emulateMedia({ colorScheme: 'dark' })`)
  - Run `pnpm playwright test accessibility` and confirm 0 violations
  - Verify keyboard navigation on all interactive elements manually
  - Verify contrast ratios for dark mode: ≥ 4.5:1 normal text, ≥ 3:1 large text
  - Generate final a11y audit report as attachment
- **Mandatory gates**: 0 violations in both modes; keyboard nav tested; run `docs:update-docs`

### Phase 12: Skills, CI/CD & Documentation
- **Goal**: Sustainable infrastructure: test skills, CI gates, complete documentation
- **Scope**:

  **Web Test Skill** (use `/customaize-agent:test-skill`):
  - Name: "Testing Political Authority Highlighter Web"
  - Description (third person, includes when to use): see specification above
  - Structure: SKILL.md (overview, <100 lines) + unit-testing.md + e2e-testing.md + a11y-testing.md + visual-regression.md
  - Deploy to: `.claude/skills/web-testing-pah/` AND `.agents/skills/web-testing-pah/`

  **API Test Skill** (use `/customaize-agent:test-skill`):
  - Name: "Testing Political Authority Highlighter API"
  - Description (third person, includes when to use): see specification above
  - Structure: SKILL.md (overview, <100 lines) + unit-testing.md + integration-testing.md + route-testing.md + domain-rules.md
  - Deploy to: `.claude/skills/api-testing-pah/` AND `.agents/skills/api-testing-pah/`

  **CI/CD Updates** (evaluate `project-cicd` skill):
  - `.github/workflows/ci.yml`: Add steps for visual regression test + a11y validation + Playwright E2E
  - Ensure Docker test environment (`docker-compose.test.yml`) is used in CI for E2E
  - Add snapshot diff artifacts upload on failure
  - `.github/workflows/deploy.yml`: Add pre-deploy visual regression check

  **Documentation**:
  - Create `TESTING.md` at project root: local dev setup, Docker test env, snapshot update workflow
  - Create `apps/web/DESIGN-SYSTEM.md`: token reference, color palette, dark mode guide
  - Update root `CLAUDE.md`: add design token system reference + test skill pointers
  - Run `docs:update-docs` skill to sync all documentation

- **Mandatory gates**: Both skills deployed to `.claude/skills/` AND `.agents/skills/`; CI passes; `pnpm build` passes; `vercel build --yes` passes; `docs:update-docs` executed; memory updated in `.claude/projects/*/memory/`

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

---

## Technical Risks

| Risk | Likelihood | Severity | Mitigation |
|------|------------|----------|-----------|
| Dark mode FOUC | MEDIUM | HIGH | `ThemeScript` inline before React hydration prevents flash |
| Font CLS (layout shift) | MEDIUM | LOW | `font-display: swap` + size-adjust hint |
| Visual regression test fragility | MEDIUM | LOW | 2% pixel tolerance + `waitForLoadState('networkidle')` |
| Supabase CLI version mismatch | LOW | MEDIUM | Pin CLI version in package.json devDependencies |
| Animation jank on low-end Android | MEDIUM | LOW | CSS transforms only; respect `prefers-reduced-motion` |
| aXe-core false negatives | MEDIUM | LOW | Supplement with manual keyboard navigation test |
| Skill token bloat | LOW | MEDIUM | Apply progressive disclosure; keep SKILL.md < 100 lines |

---

## Open Questions

- [ ] **Featured politicians endpoint**: Does API support `?sort=score_desc`? If not, use `limit=3` and sort client-side?
- [ ] **Home page illustration**: Use data-driven hero (stats), plain text, or illustration? Affects Phase 4 scope.
- [ ] **Profile page a11y**: Requires seeded database for E2E; needs a fixture `test-politician-sp` slug.
- [ ] **Vercel environment variables**: Do preview deploys use different `NEXT_PUBLIC_API_URL`? Verify via Vercel MCP.
- [ ] **Inter vs Plus Jakarta Sans**: PRD mentions both. Should Inter be primary fallback to Plus Jakarta Sans, or vice versa?
- [ ] **Snapshot storage**: Large snapshot files in git repo may slow clone. Consider Git LFS for `__snapshots__/`.
- [ ] **CI E2E runtime**: Full visual regression (30 screenshots × 2 browsers) may take 5–10 min. Acceptable for CI?

---

## Pre-Launch Checklist (All Phases Complete)

- [ ] All MUST capabilities implemented (Frontend Design PRD)
- [ ] 100% dark mode coverage — all pages, all components
- [ ] Custom fonts loaded (Inter, JetBrains Mono)
- [ ] Home page: hero + featured politicians + CTA
- [ ] 0 aXe-core WCAG 2.1 AA violations in light + dark mode
- [ ] 30 visual regression baselines committed to repo
- [ ] All pages responsive: 375px / 768px / 1920px
- [ ] Local full-stack starts cleanly (`supabase start` + API + web)
- [ ] `TESTING.md` created with full setup guide
- [ ] Web test skill deployed to `.claude/skills/` and `.agents/skills/`
- [ ] API test skill deployed to `.claude/skills/` and `.agents/skills/`
- [ ] CI/CD updated (visual regression + a11y steps)
- [ ] `pnpm build` passes
- [ ] `vercel build --yes` passes
- [ ] `docs:update-docs` executed and memory updated
- [ ] Manual smoke test: dark mode toggle, all tabs, home CTA

---

*Generated: 2026-03-15*  
*Revised: 2026-03-15 (v1.1 — Anthropic skill best practices + gap resolution)*  
*Status: DRAFT - Ready for Implementation*  
*Next Step: Run `/prp-plan .claude/PRPs/prds/rf-018-frontend-complete-redesign.prd.md` to create Phase 1 implementation plan*
