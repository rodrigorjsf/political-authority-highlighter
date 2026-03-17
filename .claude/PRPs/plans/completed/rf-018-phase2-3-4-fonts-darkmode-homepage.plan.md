# Feature: Custom Fonts + Dark Mode + Home Page (RF-018 Phases 2–4)

## Summary

Implement three parallel frontend capabilities that complete the visual foundation laid by Phase 1 (Design Tokens): (1) load Inter and JetBrains Mono via `next/font/google` with `display: swap` for 3G users, wiring their CSS variables into the existing `--font-sans`/`--font-mono` tokens; (2) enable user-toggleable dark mode with zero FOUC via an inline server-side `ThemeScript` component, backed by the `[data-theme]` selectors already present in `tokens.css`; (3) create the missing home page at `/` with a hero section, API-fetched top-3 politician cards, and a CTA to `/politicos`.

Phases 2, 3, and 4 are independent of each other (all depend only on the completed Phase 1) and can be implemented in any order within the same session. Phase 9 (Local Full-Stack Environment) runs independently — see PRD for its separate planning.

---

## User Story

As a Brazilian citizen visiting the platform for the first time,
I want to see a modern, readable interface with dark mode support and a welcoming home page,
So that I feel confident the platform is trustworthy before exploring politician data.

---

## Problem Statement

- No home page: `/` returns 404 (confirmed: `apps/web/src/app/page.tsx` does not exist)
- No custom fonts: `--font-sans`/`--font-mono` in `tokens.css:24–25` are static strings; `next/font` is not imported anywhere — system font renders instead of Inter
- No dark mode toggle: `[data-theme]` selectors and `@custom-variant dark` are defined but nothing sets `data-theme` on the DOM; no ThemeScript, no ThemeToggle component

---

## Solution Statement

**Phase 2 — Fonts:** Import `Inter` and `JetBrains_Mono` from `next/font/google` in `layout.tsx`. Apply their `.variable` CSS custom property class names to `<html>`. Update `tokens.css` to chain through those variables (`--font-sans: var(--font-inter), ...`). The existing Tailwind config already maps `font-sans` to `var(--font-sans)` — no Tailwind config change needed.

**Phase 3 — Dark Mode:** Create `ThemeScript` (Server Component, inline `<script>` in `<head>`) that reads `localStorage['pah-theme']` and OS preference before first paint to set `data-theme` attribute on `<html>`. Create `ThemeToggle` (Client Component, Sun/Moon icons) that reads/writes that attribute and key. Add `suppressHydrationWarning` to `<html>`. The `@custom-variant dark` Tailwind directive and `[data-theme="dark"]` CSS vars are already present — zero CSS changes needed.

**Phase 4 — Home Page:** Create `apps/web/src/app/page.tsx` as an `async` Server Component. Fetch `fetchPoliticians({ limit: 3 })` (API already sorts by `overallScore DESC`). Render hero + bento grid + CTA. Use the same Tailwind token classes as existing pages. Export `metadata` for SEO.

---

## Metadata

| Field            | Value                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| Type             | ENHANCEMENT                                                                        |
| Complexity       | MEDIUM                                                                             |
| Systems Affected | `apps/web` (layout, components, app pages, styles)                                 |
| Dependencies     | `next@^15.0.0` (already installed), `lucide-react@^0.400.0` (already installed)   |
| Estimated Tasks  | 13 tasks across 3 phases                                                           |
| PRD Source       | `rf-018-frontend-complete-redesign.prd.md` — Phases 2, 3, 4                       |

---

## UX Design

### Before State

```
User visits /
     ↓
  404 Page Not Found
     ↓
  User has no entry point to the platform

Header: None (no navigation, no dark mode control)
Fonts:  System default (San Francisco / Roboto / Arial)
Theme:  Always light (hardcoded)
```

### After State

```
User visits /
     ↓
  Hero: "Transparência política no Brasil"
  Subheading + [Ver todos os políticos →] CTA
     ↓
  Bento grid: 3 top-scored politician cards
     ↓
  User clicks CTA → /politicos (existing listing)

Header: ThemeToggle (Sun/Moon) in top-right of body
Fonts:  Inter (UI) + JetBrains Mono (scores/numbers)
Theme:  Auto-detects OS preference; user can toggle; persists to localStorage
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/` | 404 error | Home page with hero + politician cards | Platform has an entry point |
| All pages | System font renders | Inter/JetBrains Mono loaded via next/font | Brand identity, consistent render |
| All pages | Always light mode | OS-detected + user-toggleable dark mode | Comfort for dark-mode users |
| Layout | No toggle | Sun/Moon toggle accessible via keyboard | Can switch theme at any time |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `apps/web/src/app/layout.tsx` | all | File to MODIFY — understand current structure exactly |
| P0 | `apps/web/src/styles/tokens.css` | 22–26 | `--font-sans`/`--font-mono` lines to UPDATE |
| P0 | `apps/web/src/styles/globals.css` | 1–12 | `@custom-variant dark` already defined — do NOT duplicate |
| P0 | `apps/web/tailwind.config.ts` | all | `fontFamily.sans`/`fontFamily.mono` already map to CSS vars — NO CHANGE needed |
| P1 | `apps/web/src/app/politicos/page.tsx` | all | Pattern to MIRROR for home page (async Server Component, fetchPoliticians) |
| P1 | `apps/web/src/components/politician/politician-card.tsx` | all | Component to REUSE in home page bento grid |
| P1 | `apps/web/src/lib/api-client.ts` | 56–69 | `fetchPoliticians` signature and return type |
| P2 | `apps/web/src/components/filters/role-filter.tsx` | 1–10 | `'use client'` pattern for Client Components |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| [next/font docs](https://nextjs.org/docs/app/api-reference/components/font#font-function-arguments) | `variable` option + CSS variable usage | `Inter` variable font setup — no `weight` array needed |
| [Next.js App Router Layout](https://nextjs.org/docs/app/api-reference/file-conventions/layout) | Root layout HTML structure | Correct placement of `<head>` child for ThemeScript |

---

## Patterns to Mirror

**ASYNC SERVER COMPONENT (data fetching):**
```typescript
// SOURCE: apps/web/src/app/politicos/page.tsx:27–41
// COPY THIS PATTERN for the home page:
export default async function HomePage(): Promise<React.JSX.Element> {
  // fetchPoliticians sorts by overallScore DESC — limit:3 gives top 3
  const result = await fetchPoliticians({ limit: 3 }).catch(() => ({ data: [], cursor: null }))
  // ...
}
```

**TAILWIND TOKEN CLASSES (from existing components):**
```typescript
// SOURCE: apps/web/src/components/politician/politician-card.tsx:32
// COPY THIS PATTERN — always use Tailwind token names, never hardcode colors:
className="rounded-lg border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
```

**CLIENT COMPONENT:**
```typescript
// SOURCE: apps/web/src/components/filters/role-filter.tsx:1
// COPY THIS PATTERN for ThemeToggle:
'use client'
import { useState, useEffect } from 'react'
```

**FOCUS RING (a11y):**
```typescript
// SOURCE: apps/web/src/components/politician/politician-card.tsx:35
// COPY THIS PATTERN for all interactive elements:
focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
```

**METADATA EXPORT:**
```typescript
// SOURCE: apps/web/src/app/politicos/page.tsx:14–22
// COPY THIS PATTERN for home page SEO:
export const metadata: Metadata = {
  title: '...',
  description: '...',
  alternates: { canonical: 'https://autoridade-politica.com.br' },
}
```

**SUSPENSE SKELETON:**
```typescript
// SOURCE: apps/web/src/app/politicos/page.tsx:54–56
// COPY THIS PATTERN for loading states:
<Suspense fallback={<div className="h-10 w-64 motion-safe:animate-pulse rounded-md bg-muted" />}>
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `apps/web/src/app/layout.tsx` | UPDATE | Add font imports, `.variable` classNames on `<html>`, `suppressHydrationWarning`, `ThemeScript` in `<head>` |
| `apps/web/src/styles/tokens.css` | UPDATE | Change `--font-sans`/`--font-mono` to use `var(--font-inter)`/`var(--font-jetbrains-mono)` |
| `apps/web/src/components/theme-script.tsx` | CREATE | Server Component: inline `<script>` for FOUC-free dark mode |
| `apps/web/src/components/theme-toggle.tsx` | CREATE | Client Component: Sun/Moon toggle button |
| `apps/web/src/app/page.tsx` | CREATE | Home page: hero + top-3 politician cards + CTA |

---

## NOT Building (Scope Limits)

- Navigation redesign (header/sidebar/mobile tab bar) — Phase 6, depends on Phase 5
- `next-themes` installation — PRD explicitly chose custom ThemeScript (no external dep)
- Featured politicians section using a dedicated `/featured` API endpoint — use `fetchPoliticians({ limit: 3 })` (already sorted by score DESC)
- Advanced hero animations or illustrations — Phase 7 scope
- Plus Jakarta Sans font — Inter is primary; Plus Jakarta Sans is fallback string only (not loaded via next/font)
- `[data-theme]` on any element other than `<html>` — the `@custom-variant dark` variant already targets `[data-theme=dark]` attribute

---

## Step-by-Step Tasks

Execute tasks within each phase in order. Phases 2, 3, 4 can be done in any inter-phase order.

---

### ── PHASE 2: CUSTOM FONTS ──

### Task 2.1: UPDATE `apps/web/src/styles/tokens.css` (font variables)

- **ACTION**: Modify `--font-sans` and `--font-mono` to chain through next/font CSS variables
- **FIND**: Line with `--font-sans: 'Inter', 'Plus Jakarta Sans', sans-serif;`
- **REPLACE WITH**: `--font-sans: var(--font-inter, 'Inter'), 'Plus Jakarta Sans', sans-serif;`
- **FIND**: Line with `--font-mono: 'JetBrains Mono', 'Roboto Mono', monospace;`
- **REPLACE WITH**: `--font-mono: var(--font-jetbrains-mono, 'JetBrains Mono'), 'Roboto Mono', monospace;`
- **RATIONALE**: The `var(--font-inter, 'Inter')` pattern provides a graceful fallback if next/font's CSS variable hasn't been applied yet (e.g., in tests, SSR edge cases)
- **GOTCHA**: Do NOT change the `[data-theme]` or `@media (prefers-color-scheme: dark)` blocks — they are correct and complete
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — tokens.css is not TypeScript but this ensures no CSS import errors

### Task 2.2: UPDATE `apps/web/src/app/layout.tsx` (font integration)

- **ACTION**: Import and configure `Inter` and `JetBrains_Mono` from `next/font/google`; apply `.variable` classNames to `<html>`
- **IMPLEMENT**:
  ```typescript
  import { Inter, JetBrains_Mono } from 'next/font/google'

  const inter = Inter({
    subsets: ['latin', 'latin-ext'], // latin-ext for Portuguese accented chars
    variable: '--font-inter',
    display: 'swap',
  })

  const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains-mono',
    display: 'swap',
  })
  ```
- **APPLY TO `<html>`**:
  ```tsx
  <html
    lang="pt-BR"
    className={`${inter.variable} ${jetbrainsMono.variable}`}
    suppressHydrationWarning
  >
  ```
- **WHY `suppressHydrationWarning`**: Required now because `data-theme` attribute will be set by ThemeScript (Task 3.1) before React hydration — avoids hydration mismatch warning. Safe to add now even before ThemeScript exists.
- **GOTCHA**: `Inter` is a variable font — do NOT pass a `weight` array. `JetBrains_Mono` is also variable. Only `subsets` and `variable` are needed.
- **GOTCHA**: The `.variable` className (e.g., `inter.variable`) is something like `__variable_abc123`. It registers the CSS custom property on the element. Without applying it to `<html>`, the `var(--font-inter)` in `tokens.css` will resolve to the fallback.
- **GOTCHA**: `latin-ext` subset is needed for Portuguese characters like `ã`, `ç`, `ê`, `ó` — without it some accented characters fall back to system font
- **DO NOT** add `font-sans` to `<html>` — it's already on `<body>` (line 33: `className="min-h-screen bg-background font-sans antialiased"`)
- **DO NOT** change PlausibleProvider placement — it wraps `<body>`, not `<html>`
- **VALIDATE**: `pnpm --filter @pah/web build` — confirms font variables load; Chrome DevTools → Network tab shows Inter font file loaded

---

### ── PHASE 3: DARK MODE ──

### Task 3.1: CREATE `apps/web/src/components/theme-script.tsx`

- **ACTION**: Create Server Component that renders an inline `<script>` tag for FOUC prevention
- **IMPLEMENT**:
  ```typescript
  // apps/web/src/components/theme-script.tsx
  // Server Component — no 'use client' directive
  export function ThemeScript(): React.JSX.Element {
    const script = `
      (function() {
        try {
          var stored = localStorage.getItem('pah-theme');
          var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          var theme = stored === 'dark' || stored === 'light'
            ? stored
            : (prefersDark ? 'dark' : 'light');
          document.documentElement.setAttribute('data-theme', theme);
        } catch (e) {}
      })();
    `.replace(/</g, '\\u003c');

    return <script dangerouslySetInnerHTML={{ __html: script }} />;
  }
  ```
- **EXPLICIT RETURN TYPE**: `React.JSX.Element` (project convention)
- **GOTCHA**: The `.replace(/</g, '\\u003c')` escapes `<` to prevent HTML injection — required when using `dangerouslySetInnerHTML` with user-influenced content. Keep it.
- **GOTCHA**: The `try/catch` prevents crashes in environments without `localStorage` (Safari private mode, SSR edge cases)
- **GOTCHA**: `stored === 'dark' || stored === 'light'` validation ensures arbitrary localStorage values are ignored (avoids setting `data-theme="null"` or other invalid values)
- **WHY SERVER COMPONENT**: No `'use client'` — this renders as a pure HTML `<script>` string on the server. Adding `'use client'` would make it a hydrated React component with unnecessary JS overhead.
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

### Task 3.2: CREATE `apps/web/src/components/theme-toggle.tsx`

- **ACTION**: Create Client Component for Sun/Moon toggle button
- **IMPLEMENT**:
  ```typescript
  'use client'

  import { useEffect, useState } from 'react'
  import { Sun, Moon } from 'lucide-react'

  const STORAGE_KEY = 'pah-theme'

  export function ThemeToggle(): React.JSX.Element {
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
      setMounted(true)
      const stored = localStorage.getItem(STORAGE_KEY)
      const current = document.documentElement.getAttribute('data-theme')
      setTheme((stored ?? current ?? 'light') as 'light' | 'dark')
    }, [])

    const toggle = (): void => {
      const next = theme === 'light' ? 'dark' : 'light'
      setTheme(next)
      document.documentElement.setAttribute('data-theme', next)
      localStorage.setItem(STORAGE_KEY, next)
    }

    // Render a placeholder until mounted to avoid hydration mismatch
    if (!mounted) {
      return <div className="h-9 w-9" aria-hidden="true" />
    }

    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {theme === 'light' ? (
          <Moon size={16} aria-hidden="true" />
        ) : (
          <Sun size={16} aria-hidden="true" />
        )}
      </button>
    )
  }
  ```
- **MOUNTED GUARD**: Reads DOM state only after mount to prevent SSR/client mismatch. The placeholder `<div>` matches the button's dimensions to prevent layout shift.
- **GOTCHA**: Do NOT render `Sun`/`Moon` based on `useState` initial value during SSR — always show nothing (or stable placeholder) until `useEffect` fires
- **STORAGE_KEY**: Use `'pah-theme'` (matching ThemeScript's `localStorage.getItem('pah-theme')`)
- **lucide-react**: Already installed at `^0.400.0` — `Sun` and `Moon` are available
- **DR-002**: Button text is neutral ("Ativar modo escuro/claro") — no party associations
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

### Task 3.3: UPDATE `apps/web/src/app/layout.tsx` (ThemeScript integration)

- **ACTION**: Add `<head>` with `ThemeScript` to the root layout. Add `ThemeToggle` to the body.
- **IMPLEMENT** — add to layout after font changes from Task 2.2:
  ```tsx
  import { ThemeScript } from '../components/theme-script'
  import { ThemeToggle } from '../components/theme-toggle'

  export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
      <html
        lang="pt-BR"
        className={`${inter.variable} ${jetbrainsMono.variable}`}
        suppressHydrationWarning
      >
        <head>
          <ThemeScript />
        </head>
        <PlausibleProvider ...>
          <body className="min-h-screen bg-background font-sans antialiased">
            <a href="#main-content" className="sr-only focus:not-sr-only ...">
              Ir para o conteúdo principal
            </a>
            <div className="fixed right-4 top-4 z-50">
              <ThemeToggle />
            </div>
            {children}
          </body>
        </PlausibleProvider>
      </html>
    )
  }
  ```
- **ThemeToggle placement**: `fixed right-4 top-4 z-50` — floating top-right corner. Phase 6 (Navigation Redesign) will integrate it into the header properly.
- **GOTCHA**: Next.js App Router automatically deduplicates `<head>` — adding `<head>` with `ThemeScript` is valid and will be merged with Next.js-managed head tags
- **GOTCHA**: `suppressHydrationWarning` on `<html>` silences the warning from `data-theme` being set by ThemeScript before React hydration. This is intentional and safe.
- **VALIDATE**: 
  - `pnpm --filter @pah/web build`
  - Hard refresh in browser → observe no flash of light mode before dark mode applies
  - Toggle works and persists across page refreshes

---

### ── PHASE 4: HOME PAGE ──

### Task 4.1: CREATE `apps/web/src/app/page.tsx`

- **ACTION**: Create home page as `async` Server Component with hero + featured politicians + CTA
- **IMPLEMENT**:
  ```typescript
  // apps/web/src/app/page.tsx
  import { Suspense } from 'react'
  import type { Metadata } from 'next'
  import Link from 'next/link'
  import { fetchPoliticians } from '../lib/api-client'
  import { PoliticianCard } from '../components/politician/politician-card'

  export const revalidate = 3600  // ISR: revalidate every hour

  export const metadata: Metadata = {
    title: 'Autoridade Política — Transparência Política no Brasil',
    description:
      'Explore dados públicos de integridade de deputados federais e senadores brasileiros.',
    alternates: { canonical: 'https://autoridade-politica.com.br' },
    openGraph: {
      title: 'Autoridade Política — Transparência Política no Brasil',
      description: 'Explore dados públicos de integridade de deputados e senadores.',
      url: 'https://autoridade-politica.com.br',
    },
  }

  export default async function HomePage(): Promise<React.JSX.Element> {
    // API sorts by overallScore DESC — limit:3 returns the top 3 politicians
    const result = await fetchPoliticians({ limit: 3 }).catch(() => ({ data: [], cursor: null }))

    return (
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {/* Hero */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground sm:text-5xl">
            Transparência política no Brasil
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
            Dados públicos de integridade de deputados federais e senadores, cruzados de 6 fontes
            oficiais do governo.
          </p>
          <Link
            href="/politicos"
            className="inline-flex items-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Ver todos os políticos →
          </Link>
        </section>

        {/* Featured politicians — bento grid */}
        {result.data.length > 0 && (
          <section
            className="container mx-auto px-4 pb-16"
            aria-labelledby="featured-heading"
          >
            <h2
              id="featured-heading"
              className="mb-6 text-xl font-semibold text-foreground"
            >
              Políticos em destaque
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.map((politician, index) => (
                <PoliticianCard
                  key={politician.id}
                  politician={politician}
                  isAboveFold={true}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    )
  }
  ```
- **IMPORTANT**: The `.catch(() => ({ data: [], cursor: null }))` fallback ensures the page builds even when the API is unavailable (e.g., during `pnpm build` on CI with no API running)
- **isAboveFold={true}**: All 3 featured cards are above the fold — `priority` loading for all photos
- **`revalidate = 3600`**: Matches politician profile page ISR cadence; featured list updates hourly
- **DR-002**: `aria-labelledby="featured-heading"` links section to neutral heading. No qualitative labels ("top", "best"). Section heading: "Políticos em destaque" (neutral)
- **GOTCHA**: Do NOT use `sort=score_desc` query param — the API already sorts by `overallScore DESC` by default (confirmed in `politician.repository.ts`)
- **GOTCHA**: `metadata.title` at page level overrides the `layout.tsx` metadata template. Home page should use the full title, not the template pattern.
- **VALIDATE**: 
  - `pnpm --filter @pah/web build`
  - `curl http://localhost:3000` returns 200
  - Page passes aXe-core (no a11y violations)
  - CTA links to `/politicos`
  - Responsive on 375px / 768px / 1920px

---

## Testing Strategy

### Validation Gates (per PRD)

After completing ALL tasks:

```bash
# 1. Type check
pnpm --filter @pah/web typecheck

# 2. Lint
pnpm --filter @pah/web lint

# 3. Unit tests
pnpm --filter @pah/web test

# 4. Full build (MANDATORY)
pnpm build

# 5. Vercel build (MANDATORY — final gate)
vercel build --yes

# 6. E2E: accessibility (requires running dev server)
pnpm --filter @pah/web test:e2e -- --grep "accessibility"
```

### Manual Checks

| Check | How | Expected |
|-------|-----|----------|
| Inter font renders | Chrome DevTools → Network → filter Fonts | `inter-*.woff2` loaded |
| JetBrains Mono on scores | DevTools → Elements → computed font | `JetBrains Mono` for `.font-mono` elements |
| Dark mode toggle | Click Sun/Moon → refresh | Theme persists; no FOUC |
| OS preference | Set OS to dark → hard refresh | Dark mode applied without toggle |
| Home page 200 | `curl http://localhost:3000` | 200 OK |
| CTA link | Click "Ver todos" | Navigates to `/politicos` |
| Mobile layout | DevTools → 375px | Single-column grid, hero readable |
| A11y | Run `checkA11y` in accessibility.spec.ts | 0 violations on `/` |

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|-----------|-----------|
| `apps/web/src/components/theme-toggle.test.tsx` | renders placeholder before mount; toggles theme on click; writes to localStorage | ThemeToggle logic |
| `apps/web/src/app/page.test.tsx` | renders hero h1; renders CTA link; gracefully renders empty state if fetchPoliticians throws | Home page render |

---

## Edge Cases

- **API unavailable during build**: `fetchPoliticians({ limit: 3 }).catch(...)` fallback in page.tsx returns `{ data: [], cursor: null }` — home page builds with no politician cards shown (hero only)
- **localStorage unavailable** (Safari private mode, SSR): ThemeScript wraps in `try/catch` — dark mode falls back to OS preference detection via `matchMedia`
- **Hydration mismatch**: `suppressHydrationWarning` on `<html>` + mounted-guard in ThemeToggle prevents React hydration errors
- **Portuguese characters in Inter**: `latin-ext` subset covers `ã`, `ç`, `ê`, `ó`, `ú` etc. — required for politician names and UI text
- **No featured politicians in DB**: Section is conditionally rendered with `result.data.length > 0` — hero still shows
- **ThemeToggle placeholder CLS**: The `<div className="h-9 w-9" />` placeholder matches button dimensions exactly — zero layout shift on hydration

---

## Known Risks

| Risk | Mitigation |
|------|-----------|
| Font CLS on 3G | `display: 'swap'` shows system font during load → transitions to Inter. CLS < 0.1 expected. |
| FOUC on `data-theme` | ThemeScript in `<head>` fires before first paint — FOUC eliminated |
| `pnpm build` fails if API down | `.catch()` fallback in home page; `generateStaticParams` already uses same pattern in profile page |
| `lucide-react` icon tree-shaking | Next.js + Turbopack handles it; only `Sun` and `Moon` imported — no bundle concern |

---

## References

- PRD: `rf-018-frontend-complete-redesign.prd.md` (Phases 2, 3, 4)
- Design tokens: `apps/web/src/styles/tokens.css`
- Tailwind custom variant: `apps/web/src/styles/globals.css:9`
- API client: `apps/web/src/lib/api-client.ts:56–69`
- Existing listing page (pattern): `apps/web/src/app/politicos/page.tsx`
- Playwright config: `apps/web/playwright.config.ts`
- A11y spec (extend for home page): `apps/web/e2e/accessibility.spec.ts`

---

*Generated: 2026-03-16*
*PRD: rf-018-frontend-complete-redesign.prd.md — Phases 2 (Custom Fonts), 3 (Dark Mode), 4 (Home Page)*
*Status: Ready for implementation*
*Next step: Run `prp-implement .claude/PRPs/plans/rf-018-phase2-3-4-fonts-darkmode-homepage.plan.md`*
