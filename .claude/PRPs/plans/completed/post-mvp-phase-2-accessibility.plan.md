# Feature: Acessibilidade WCAG 2.1 AA (Phase 2)

## Summary

Eliminar a dívida técnica de acessibilidade do MVP antes de adicionar novas páginas. A fase implementa: (1) skip-to-content link no layout raiz, (2) `id="main-content"` + `tabIndex={-1}` em todos os `<main>` elements, (3) `scope="col"` + `aria-label` em todas as 5 tabelas de dados, (4) focus ring no botão de `error.tsx`, (5) `prefers-reduced-motion` para todos os skeleton loaders, (6) sr-only warning em links que abrem em nova aba, (7) `playwright.config.ts` para E2E local, (8) `accessibility.spec.ts` com axe-core em todas as 9 rotas, e (9) Lighthouse CI com threshold `accessibility: 0.95`.

## User Story

Como um cidadão que usa teclado ou leitor de tela
Eu quero navegar toda a plataforma sem barreiras de acessibilidade
Para que eu possa acessar informações de transparência política independentemente de como interajo com o computador

## Problem Statement

O MVP entregou componentes com ARIA parcial mas sem auditoria sistemática. Há pelo menos 6 classes de violações axe-core detectáveis: ausência de skip link, tabelas sem `scope`, botão sem focus ring, skeleton loaders que ignoram `prefers-reduced-motion`, links que abrem em nova aba sem aviso sr-only, e ausência de `not-found.tsx`. Sem `playwright.config.ts` e `accessibility.spec.ts`, não há gate automático para impedir regressões futuras.

## Solution Statement

Corrigir todas as violações axe-core WCAG 2.1 AA nos 10 componentes/páginas afetados, criar infraestrutura Playwright para auditoria contínua das 9 rotas, e adicionar Lighthouse CI ao pipeline existente. Zero novos endpoints de API, zero novas tabelas de banco de dados.

## Metadata

| Field            | Value                                               |
| ---------------- | --------------------------------------------------- |
| Type             | ENHANCEMENT                                         |
| Complexity       | MEDIUM                                              |
| Systems Affected | apps/web, .github/workflows                         |
| Dependencies     | `@axe-core/playwright` ^4.9.0 (already installed), `@playwright/test` ^1.44.0 (already installed), `@lhci/cli` (new, global install in CI only) |
| Estimated Tasks  | 19                                                  |

---

## UX Design

### Before State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              BEFORE STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌────────────────────────────────────────────────────────────────────┐       ║
║  │ Tab key → enters page content from <body> top                      │       ║
║  │ NO skip link → keyboard user must Tab through all nav/content      │       ║
║  │ before reaching main area                                           │       ║
║  └────────────────────────────────────────────────────────────────────┘       ║
║                                                                               ║
║  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐          ║
║  │ Data Tables      │   │ error.tsx button │   │ Skeleton loaders │          ║
║  │ <th> no scope    │   │ no focus ring    │   │ animate-pulse    │          ║
║  │ no aria-label    │   │ "Try again" (EN) │   │ always animates  │          ║
║  │ screen reader:   │   │ focus: browser   │   │ even with OS     │          ║
║  │ "column, column" │   │ default outline  │   │ reduce motion ON │          ║
║  └──────────────────┘   └──────────────────┘   └──────────────────┘          ║
║                                                                               ║
║  USER_FLOW: Keyboard → Tab Tab Tab … (no shortcut) → first interactive link  ║
║  PAIN_POINT: 0 CI gates for a11y; every new PR can introduce regressions      ║
║  DATA_FLOW: DOM rendered → axe not configured → violations not detected       ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### After State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                               AFTER STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌────────────────────────────────────────────────────────────────────┐       ║
║  │ Tab key → "Ir para o conteúdo principal" skip link appears         │       ║
║  │ Enter → focus jumps to <main id="main-content" tabIndex={-1}>      │       ║
║  └────────────────────────────────────────────────────────────────────┘       ║
║                                                                               ║
║  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐          ║
║  │ Data Tables      │   │ error.tsx button │   │ Skeleton loaders │          ║
║  │ <th scope="col"> │   │ focus:ring-2     │   │ motion-safe:     │          ║
║  │ aria-label=      │   │ focus:ring-ring  │   │ animate-pulse    │          ║
║  │ "Projetos de lei │   │ "Tentar          │   │ OS reduce motion │          ║
║  │  de {name}"      │   │  novamente" (PT) │   │ → no animation   │          ║
║  └──────────────────┘   └──────────────────┘   └──────────────────┘          ║
║                                                                               ║
║  ┌────────────────────────────────────────────────────────────────────┐       ║
║  │ CI: Lighthouse accessibility ≥ 95 gates every PR                   │       ║
║  │ Local: pnpm test:e2e → axe-core scans 9 routes with wcag21aa tags  │       ║
║  └────────────────────────────────────────────────────────────────────┘       ║
║                                                                               ║
║  USER_FLOW: Tab → skip link → Enter → main content (1 keypress)              ║
║  VALUE_ADD: screen readers announce table context; focus always visible;      ║
║             motion-sensitive users see static skeletons                       ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|---|---|---|---|
| All pages | No skip link | Skip link visible on first Tab | Keyboard: 1 keypress to main content |
| `error.tsx` | Browser default focus outline | `focus:ring-2 focus:ring-ring` + PT text | Consistent visual focus, PT language |
| 5 data tables | `<th>` no scope, no label | `scope="col"` + `aria-label` | Screen readers announce column purpose |
| 8 skeleton files + page.tsx | `animate-pulse` always | `motion-safe:animate-pulse` | OS reduce-motion respected |
| External `_blank` links | No sr-only warning | `(abre em nova aba)` sr-only | Screen readers warn about new tab |
| All `<main>` elements | No ID, no tabIndex | `id="main-content" tabIndex={-1}` | Skip link target works correctly |
| CI pipeline | No a11y gate | Lighthouse ≥ 0.95 blocks PR | Regressions caught automatically |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|---|---|---|---|
| P0 | `apps/web/src/app/layout.tsx` | all | WHERE to add skip link — exact position before `{children}` |
| P0 | `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | 71-110 | TABLE pattern to MIRROR for `scope` + `aria-label` in all 5 sub-pages |
| P0 | `apps/web/e2e/politician-listing.spec.ts` | all | EXACT pattern to MIRROR for `accessibility.spec.ts` |
| P1 | `apps/web/src/app/error.tsx` | all | EXACT file to update — button fix + PT text |
| P1 | `apps/web/src/styles/globals.css` | all | WHERE to add `prefers-reduced-motion` block |
| P1 | `apps/web/src/components/politician/exclusion-notice.tsx` | all | External link pattern to update |
| P2 | `.github/workflows/ci.yml` | all | WHERE to add Lighthouse CI step |

**External Documentation:**

| Source | Section | Why Needed |
|---|---|---|
| [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing) | AxeBuilder, fingerprinting, testInfo.attach | `checkA11y` helper implementation |
| [Playwright webServer Config](https://playwright.dev/docs/test-webserver) | webServer options | `playwright.config.ts` webServer setup |
| [Lighthouse CI Configuration](https://googlechrome.github.io/lighthouse-ci/docs/configuration.html) | ci.collect, ci.assert | `.lighthouserc.json` structure |
| [W3C H63 Technique](https://www.w3.org/WAI/WCAG21/Techniques/html/H63) | scope attribute | `scope="col"` rationale for simple tables |

---

## Patterns to Mirror

**SKIP_LINK_PATTERN:**

```tsx
// SOURCE: research — apps/web/src/app/layout.tsx (to be added)
// Place as FIRST child of <body>, BEFORE {children}
// CRITICAL: Use plain <a> NOT Next.js <Link> — hash anchors don't work with <Link>
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
>
  Ir para o conteúdo principal
</a>
```

**MAIN_ID_PATTERN:**

```tsx
// Add to EVERY <main> element in all page.tsx and error.tsx files
// tabIndex={-1}: allows skip link to move focus programmatically (required)
// focus:outline-none: prevents visible focus ring on <main> after skip link activation
<main id="main-content" tabIndex={-1} className="... focus:outline-none">
```

**TABLE_SCOPE_PATTERN:**

```tsx
// SOURCE: apps/web/src/app/fontes/page.tsx:108-117 (already correct there)
// COPY THIS PATTERN to projetos, votacoes, despesas, propostas, atividades:
<table className="w-full text-sm" aria-label={`Projetos de lei de ${politician.name}`}>
  <thead>
    <tr className="border-b border-border text-left text-muted-foreground">
      <th scope="col" className="pb-3 pr-4">Número</th>
      <th scope="col" className="pb-3 pr-4">Título</th>
      <th scope="col" className="pb-3 pr-4">Situação</th>
      <th scope="col" className="pb-3">Data</th>
    </tr>
  </thead>
```

**FOCUS_RING_PATTERN (pagination links):**

```tsx
// SOURCE: apps/web/src/components/politician/politician-card.tsx:35
// COPY THIS PATTERN to all pagination <Link> elements missing focus ring:
className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
```

**EXTERNAL_LINK_NEW_TAB_PATTERN:**

```tsx
// SOURCE: apps/web/src/components/politician/exclusion-notice.tsx (to be updated)
// Add sr-only text to ALL target="_blank" links:
<a href="..." target="_blank" rel="noopener noreferrer" className="text-primary underline">
  Portal da Transparência
  <span className="sr-only"> (abre em nova aba)</span>
</a>
```

**MOTION_SAFE_PATTERN:**

```tsx
// SOURCE: all 8 files listed in Task 16
// Replace every "animate-pulse" with "motion-safe:animate-pulse"
// Before: className="... animate-pulse ..."
// After:  className="... motion-safe:animate-pulse ..."
```

**AXE_BUILDER_PATTERN:**

```typescript
// SOURCE: apps/web/e2e/politician-listing.spec.ts:32-36 (extended pattern)
// Use withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']) — includes WCAG 2.1 AA rules
// Use fingerprint (id + targets), NOT snapshot of full violations array
// Attach full results for debugging

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function checkA11y(page: Parameters<typeof AxeBuilder>[0]['page'], testInfo: import('@playwright/test').TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  await testInfo.attach('a11y-results', { body: JSON.stringify(results, null, 2), contentType: 'application/json' })
  const fingerprint = results.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))
  expect(fingerprint, `Accessibility violations on ${page.url()}`).toEqual([])
}
```

**PLAYWRIGHT_CONFIG_PATTERN:**

```typescript
// SOURCE: research — no playwright.config.ts currently exists
// GOTCHA: For CI use "pnpm --filter @pah/web build && pnpm --filter @pah/web start" as command
// GOTCHA: For local dev use "pnpm --filter @pah/web dev"
// GOTCHA: reuseExistingServer: !process.env.CI avoids double-start in local dev

import { defineConfig, devices } from '@playwright/test'
const BASE_URL = `http://localhost:3000`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: { baseURL: BASE_URL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI
      ? 'pnpm --filter @pah/web build && pnpm --filter @pah/web start'
      : 'pnpm --filter @pah/web dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180_000 : 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `apps/web/playwright.config.ts` | CREATE | Required for `pnpm test:e2e` to work with local dev server |
| `apps/web/e2e/accessibility.spec.ts` | CREATE | axe-core audit for all 9 routes; PRD success signal |
| `apps/web/src/app/not-found.tsx` | CREATE | Missing from CLAUDE.md expected structure; 404 in PT |
| `apps/web/src/app/layout.tsx` | UPDATE | Add skip-to-content link as first child of `<body>` |
| `apps/web/src/styles/globals.css` | UPDATE | Add `prefers-reduced-motion` global CSS block |
| `apps/web/src/app/error.tsx` | UPDATE | Fix button focus ring + Portuguese text + `id="main-content"` |
| `apps/web/src/app/politicos/page.tsx` | UPDATE | `id="main-content"` + `tabIndex={-1}` on `<main>`; `motion-safe:animate-pulse` on Suspense fallbacks; pagination focus ring |
| `apps/web/src/app/politicos/[slug]/page.tsx` | UPDATE | `id="main-content"` + `tabIndex={-1}` on `<main>` |
| `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | UPDATE | Table `scope="col"` + `aria-label`; pagination focus ring; `id="main-content"` |
| `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` | UPDATE | Same + external link sr-only for `sourceUrl` links |
| `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | UPDATE | Same (check for external links) |
| `apps/web/src/app/politicos/[slug]/propostas/page.tsx` | UPDATE | Same |
| `apps/web/src/app/politicos/[slug]/atividades/page.tsx` | UPDATE | Table `scope="col"` + `aria-label`; `id="main-content"`; external links |
| `apps/web/src/app/metodologia/page.tsx` | UPDATE | `id="main-content"` + `tabIndex={-1}` on `<main>` |
| `apps/web/src/app/fontes/page.tsx` | UPDATE | `id="main-content"` + `tabIndex={-1}` on `<main>` (already has `scope="col"`) |
| `apps/web/src/components/politician/exclusion-notice.tsx` | UPDATE | Add sr-only new tab warning to `target="_blank"` link |
| `apps/web/src/app/politicos/loading.tsx` | UPDATE | `animate-pulse` → `motion-safe:animate-pulse` |
| `apps/web/src/app/politicos/[slug]/loading.tsx` | UPDATE | Same |
| `apps/web/src/app/politicos/[slug]/projetos/loading.tsx` | UPDATE | Same |
| `apps/web/src/app/politicos/[slug]/votacoes/loading.tsx` | UPDATE | Same |
| `apps/web/src/app/politicos/[slug]/despesas/loading.tsx` | UPDATE | Same |
| `apps/web/src/app/politicos/[slug]/propostas/loading.tsx` | UPDATE | Same |
| `apps/web/src/app/politicos/[slug]/atividades/loading.tsx` | UPDATE | Same |
| `.lighthouserc.json` | CREATE | Lighthouse CI config with `accessibility: 0.95` threshold |
| `.github/workflows/ci.yml` | UPDATE | Add Lighthouse CI step after Build step |

---

## NOT Building (Scope Limits)

- **`aria-current="page"` on profile tabs**: Tab nav (`PROFILE_TABS`) is only on the overview page; tabs are navigation links to separate pages, not active widgets. No "current" state applies on the overview. Not a WCAG violation.
- **Breadcrumb `<nav>` restructure**: Back-link breadcrumbs on sub-pages are plain `<Link>` elements. WCAG 2.4.8 (Location) is Level AAA — out of scope for AA target.
- **Color contrast investigation**: `--primary` (#3b82f6) approximate contrast on white is ~3.1–3.7:1. Usage in codebase is on `text-2xl font-bold` (large text, passes 3:1) and underlined links. Lighthouse CI will flag any actual failures — fix during verify step only if LHCI reports it.
- **ARIA live regions for filter updates**: Filter results update via full page navigation (URL-based state), not dynamic DOM injection. No live regions needed.
- **High-contrast mode**: Not a WCAG 2.1 AA requirement.

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

---

### Task 1: CREATE `apps/web/playwright.config.ts`

- **ACTION**: CREATE Playwright configuration file
- **IMPLEMENT**: `defineConfig` with `webServer`, `baseURL: 'http://localhost:3000'`, `projects: [chromium]`, `testDir: './e2e'`
- **MIRROR**: `PLAYWRIGHT_CONFIG_PATTERN` above exactly
- **GOTCHA**: Place file at `apps/web/playwright.config.ts` — the `test:e2e` script runs `playwright test e2e` from the `apps/web/` directory
- **GOTCHA**: `reuseExistingServer: !process.env.CI` — in CI the server is NOT reused because CI starts fresh; locally it reuses any already-running dev server
- **GOTCHA**: In CI the `webServer.command` rebuilds before starting — this doubles build time but ensures tests use production output
- **VALIDATE**: `pnpm --filter @pah/web exec playwright --version` — exits 0

---

### Task 2: CREATE `apps/web/src/app/not-found.tsx`

- **ACTION**: CREATE custom 404 page in Portuguese
- **IMPLEMENT**: Async Server Component, `<main id="main-content" tabIndex={-1}>` with Portuguese text, `<Link href="/politicos">` to listing, no `focus:outline-none` needed (tabIndex added for skip link consistency)
- **MIRROR**: `apps/web/src/app/error.tsx` structure (after it's updated in Task 5)
- **PATTERN**:

  ```tsx
  import Link from 'next/link'

  export default function NotFound(): React.JSX.Element {
    return (
      <main id="main-content" tabIndex={-1} className="flex min-h-[50vh] flex-col items-center justify-center gap-4 focus:outline-none">
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="text-muted-foreground">O político ou página que você procura não existe.</p>
        <Link href="/politicos" className="text-primary underline focus:outline-none focus:ring-2 focus:ring-ring">
          Ver todos os políticos
        </Link>
      </main>
    )
  }
  ```

- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 3: UPDATE `apps/web/src/app/layout.tsx` — Add skip link

- **ACTION**: ADD skip-to-content `<a>` as first child of `<body>`, before `{children}`
- **IMPLEMENT**: Add the `<a href="#main-content">` skip link inside `<body>` before `{children}` in `layout.tsx:33`
- **EXACT CHANGE** (read file first, then edit):
  - File: `apps/web/src/app/layout.tsx`
  - OLD: `<body className="min-h-screen bg-background font-sans antialiased">{children}</body>`
  - NEW:

    ```tsx
    <body className="min-h-screen bg-background font-sans antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Ir para o conteúdo principal
      </a>
      {children}
    </body>
    ```

- **GOTCHA**: Use plain `<a>`, NOT `<Link>` from `next/link` — Next.js `<Link>` does NOT handle same-page hash navigation correctly
- **GOTCHA**: `sr-only` hides the link off-screen; `focus:not-sr-only` reveals it when focused via keyboard — this Tailwind variant pair is the standard skip-link pattern
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 4: UPDATE `apps/web/src/styles/globals.css` — prefers-reduced-motion

- **ACTION**: ADD `prefers-reduced-motion` block inside `@layer base`
- **EXACT CHANGE**: Add to the end of the `@layer base` block (after the existing `body` rule):

  ```css
  @layer base {
    * {
      border-color: hsl(var(--border));
    }
    body {
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
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

- **GOTCHA**: The CSS approach is a global safety net. Tasks 16 ALSO explicitly adds `motion-safe:` prefix in HTML to follow Tailwind best practices — both are complementary
- **GOTCHA**: Tailwind v4 `@apply motion-safe:animate-pulse` inside `@layer components` has known issues. Do NOT use `@apply` with variant prefixes in CSS blocks — always use the `motion-safe:` prefix directly in JSX className
- **VALIDATE**: `pnpm --filter @pah/web build` — exits 0 (Tailwind v4 parses the CSS block correctly)

---

### Task 5: UPDATE `apps/web/src/app/error.tsx` — Fix button + Portuguese text + main ID

- **ACTION**: UPDATE error boundary page
- **THREE CHANGES**:
  1. Add `id="main-content"` and `tabIndex={-1}` and `focus:outline-none` to `<main>`
  2. Change `<h1>` text from English to Portuguese: `"Ocorreu um erro inesperado"`
  3. Add `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2` to the `<button>` className
  4. Change button text from `"Try again"` to `"Tentar novamente"`
- **MIRROR**: `apps/web/src/components/filters/search-bar.tsx:46` — same focus ring pattern
- **GOTCHA**: `error.tsx` uses `'use client'` (required by Next.js) — keep the directive
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 6: UPDATE `apps/web/src/app/politicos/page.tsx` — main ID + motion-safe + pagination focus ring

- **ACTION**: Three fixes in the listing page
- **CHANGE 1**: Find `<main` and add `id="main-content" tabIndex={-1}` and append `focus:outline-none` to className
- **CHANGE 2**: Replace all three Suspense fallback `animate-pulse` instances (lines 55, 62, 65):
  - OLD: `className="h-10 w-64 animate-pulse rounded-md bg-muted"`
  - NEW: `className="h-10 w-64 motion-safe:animate-pulse rounded-md bg-muted"`
  - (Same pattern for w-48 and w-36 variants on lines 62 and 65)
- **CHANGE 3**: Find pagination `<Link>` elements and add `focus:outline-none focus:ring-2 focus:ring-ring` to each
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 7: UPDATE `apps/web/src/app/politicos/[slug]/page.tsx` — main ID

- **ACTION**: Add `id="main-content"` + `tabIndex={-1}` + `focus:outline-none` to `<main>` element
- **EXACT CHANGE**: Find `<main className="container mx-auto px-4 py-8">` and add the attributes
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 8: UPDATE `apps/web/src/app/politicos/[slug]/projetos/page.tsx`

- **ACTION**: Four fixes in the bills page
- **CHANGE 1**: `<main>` — add `id="main-content"`, `tabIndex={-1}`, `focus:outline-none` to className
- **CHANGE 2**: `<table>` — add `aria-label={\`Projetos de lei de ${politician.name}\`}` attribute
- **CHANGE 3**: All four `<th>` elements — add `scope="col"` attribute
  - `<th className="pb-3 pr-4">` → `<th scope="col" className="pb-3 pr-4">`
  - (All 4 column headers: Número, Título, Situação, Data)
- **CHANGE 4**: Pagination `<Link>` elements — add `focus:outline-none focus:ring-2 focus:ring-ring` to className of BOTH "← Início" and "Próxima →" links
- **NOTE**: The bill source URL links (`target="_blank"`) at line 85-89 should also get sr-only new tab text (see pattern above)
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 9: UPDATE `apps/web/src/app/politicos/[slug]/votacoes/page.tsx`

- **ACTION**: Same four fixes as Task 8 adapted for votes page
- **CHANGE 1**: `<main>` — add `id="main-content"`, `tabIndex={-1}`, `focus:outline-none`
- **CHANGE 2**: `<table>` — add `aria-label={\`Votações de ${politician.name}\`}`
- **CHANGE 3**: `<th>` elements (lines 83-86: Data, Matéria, Voto, Resultado) — add `scope="col"`
- **CHANGE 4**: Pagination links — add focus ring classes
- **CHANGE 5**: `sourceUrl` links at `target="_blank"` — add `<span className="sr-only"> (abre em nova aba)</span>`
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 10: UPDATE `apps/web/src/app/politicos/[slug]/despesas/page.tsx`

- **ACTION**: Same four fixes adapted for expenses page
- **CHANGE 1**: `<main>` — add `id="main-content"`, `tabIndex={-1}`, `focus:outline-none`
- **CHANGE 2**: `<table>` — add `aria-label={\`Despesas de ${politician.name}\`}`
- **CHANGE 3**: `<th>` elements (lines 93-97) — add `scope="col"` to each
- **CHANGE 4**: Pagination links — add focus ring classes
- **NOTE**: Read the file first to verify if there are external links needing sr-only treatment
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 11: UPDATE `apps/web/src/app/politicos/[slug]/propostas/page.tsx`

- **ACTION**: Same four fixes adapted for proposals page
- **CHANGE 1**: `<main>` — add `id="main-content"`, `tabIndex={-1}`, `focus:outline-none`
- **CHANGE 2**: `<table>` — add `aria-label={\`Propostas de ${politician.name}\`}`
- **CHANGE 3**: `<th>` elements (lines 78-83) — add `scope="col"` to each
- **CHANGE 4**: Pagination links — add focus ring classes
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 12: UPDATE `apps/web/src/app/politicos/[slug]/atividades/page.tsx`

- **ACTION**: Three fixes — no pagination on this page
- **CHANGE 1**: `<main>` — add `id="main-content"`, `tabIndex={-1}`, `focus:outline-none`
- **CHANGE 2**: `<table>` — add `aria-label={\`Atividades de ${politician.name}\`}`
- **CHANGE 3**: `<th>` elements (lines 78-81) — add `scope="col"` to each
- **NOTE**: No pagination links on this page — skip pagination fix
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 13: UPDATE `apps/web/src/app/metodologia/page.tsx` — main ID

- **ACTION**: Add `id="main-content"`, `tabIndex={-1}`, `focus:outline-none` to `<main>` element
- **NOTE**: This page already has excellent section landmark pattern with `aria-labelledby` — no other fixes needed
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 14: UPDATE `apps/web/src/app/fontes/page.tsx` — main ID

- **ACTION**: Add `id="main-content"`, `tabIndex={-1}`, `focus:outline-none` to `<main>` element
- **NOTE**: This page already has `scope="col"` on `<th>` elements — no table fix needed. Check if table has `aria-label` or caption; add `aria-label` if missing
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 15: UPDATE `apps/web/src/components/politician/exclusion-notice.tsx` — sr-only new tab

- **ACTION**: Add `<span className="sr-only"> (abre em nova aba)</span>` inside the external link
- **CURRENT** (line ~15): `<a href="https://www.portaltransparencia.gov.br" target="_blank" rel="noopener noreferrer" className="text-primary underline">Portal da Transparencia</a>`
- **NEW**:

  ```tsx
  <a href="https://www.portaltransparencia.gov.br" target="_blank" rel="noopener noreferrer" className="text-primary underline">
    Portal da Transparência
    <span className="sr-only"> (abre em nova aba)</span>
  </a>
  ```

- **VALIDATE**: `pnpm --filter @pah/web typecheck` — exits 0

---

### Task 16: UPDATE all 8 skeleton/loading files — motion-safe:animate-pulse

- **ACTION**: Replace `animate-pulse` with `motion-safe:animate-pulse` in ALL 8 files
- **FILES** (confirmed via grep):
  1. `apps/web/src/app/politicos/loading.tsx` — replace all `animate-pulse`
  2. `apps/web/src/app/politicos/[slug]/loading.tsx` — replace all `animate-pulse`
  3. `apps/web/src/app/politicos/[slug]/projetos/loading.tsx` — replace all `animate-pulse`
  4. `apps/web/src/app/politicos/[slug]/votacoes/loading.tsx` — replace all `animate-pulse`
  5. `apps/web/src/app/politicos/[slug]/despesas/loading.tsx` — replace all `animate-pulse`
  6. `apps/web/src/app/politicos/[slug]/propostas/loading.tsx` — replace all `animate-pulse`
  7. `apps/web/src/app/politicos/[slug]/atividades/loading.tsx` — replace all `animate-pulse`
  8. `apps/web/src/app/politicos/page.tsx` lines 55, 62, 65 (already covered in Task 6)
- **PATTERN**: `replace_all: true` on the string `"animate-pulse"` → `"motion-safe:animate-pulse"` in each file (items 1-7)
- **GOTCHA**: Verify each loading.tsx has `animate-pulse` before editing — read file first
- **VALIDATE**: `grep -r "animate-pulse" apps/web/src --include="*.tsx"` — should return zero results (all replaced)

---

### Task 17: CREATE `apps/web/e2e/accessibility.spec.ts` — axe-core for all routes

- **ACTION**: CREATE accessibility E2E spec testing all 9 routes
- **MIRROR**: `apps/web/e2e/politician-listing.spec.ts` — exact import pattern, describe/test structure
- **IMPLEMENT**: One `test.describe('Accessibility WCAG 2.1 AA', ...)` block with 9 individual `test()` calls, each using the `checkA11y` helper function (defined inline in the file)
- **ROUTES TO TEST**:
  1. `/politicos` — listing page
  2. `/metodologia` — static content page
  3. `/fontes` — data sources table page
- **NOTE**: Profile pages (`/politicos/[slug]`) require a real politician slug from seeded DB — test these only with `test.skip` annotation noting "requires seeded DB" to avoid CI failures. The axe check for profile routes is handled via the Lighthouse CI step which scans statically generated routes.
- **PATTERN**:

  ```typescript
  import { test, expect } from '@playwright/test'
  import AxeBuilder from '@axe-core/playwright'

  async function checkA11y(
    page: Parameters<typeof AxeBuilder>[0]['page'],
    testInfo: import('@playwright/test').TestInfo,
  ): Promise<void> {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    await testInfo.attach('a11y-results', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    })
    const fingerprint = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target),
    }))
    expect(fingerprint, `Violations on ${page.url()}`).toEqual([])
  }

  test.describe('Accessibility — WCAG 2.1 AA', () => {
    test('listagem de políticos', async ({ page }, testInfo) => {
      await page.goto('/politicos')
      await checkA11y(page, testInfo)
    })

    test('página de metodologia', async ({ page }, testInfo) => {
      await page.goto('/metodologia')
      await checkA11y(page, testInfo)
    })

    test('página de fontes de dados', async ({ page }, testInfo) => {
      await page.goto('/fontes')
      await checkA11y(page, testInfo)
    })

    test.skip('perfil de político — requer DB populado', async ({ page }, testInfo) => {
      await page.goto('/politicos/joao-silva-sp')
      await checkA11y(page, testInfo)
    })
  })
  ```

- **GOTCHA**: `withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])` — include all four tags. `wcag21aa` adds WCAG 2.1-specific rules on top of `wcag2aa` (2.0 rules). Without `wcag21aa` some 2.1-specific checks are skipped.
- **GOTCHA**: axe-core may produce false negatives for color contrast when CSS custom properties are used in headless mode — Lighthouse CI (Task 19) covers contrast more reliably
- **VALIDATE**: `pnpm --filter @pah/web test:e2e e2e/accessibility.spec.ts` — all tests pass (requires local Next.js dev server running, OR playwright.config.ts webServer auto-starts it)

---

### Task 18: CREATE `.lighthouserc.json`

- **ACTION**: CREATE Lighthouse CI config at project root (same level as `package.json`)
- **IMPLEMENT**:

  ```json
  {
    "ci": {
      "collect": {
        "startServerCommand": "pnpm --filter @pah/web start",
        "startServerReadyPattern": "Ready on",
        "startServerReadyTimeout": 30000,
        "url": [
          "http://localhost:3000/politicos",
          "http://localhost:3000/metodologia",
          "http://localhost:3000/fontes"
        ],
        "numberOfRuns": 1
      },
      "assert": {
        "preset": "lighthouse:no-pwa",
        "assertions": {
          "categories:accessibility": ["error", { "minScore": 0.95 }]
        }
      },
      "upload": {
        "target": "temporary-public-storage"
      }
    }
  }
  ```

- **GOTCHA**: `"error"` level (not `"warn"`) is REQUIRED to fail the CI job when score < 0.95. `"warn"` never fails CI.
- **GOTCHA**: `startServerReadyPattern: "Ready on"` matches Next.js `next start` stdout: `"Ready on http://localhost:3000"` — more reliable than a fixed timeout
- **GOTCHA**: Profile pages need a real slug to scan — use only `/politicos`, `/metodologia`, `/fontes` which render without a real API
- **VALIDATE**: File is valid JSON (no trailing commas)

---

### Task 19: UPDATE `.github/workflows/ci.yml` — Add Lighthouse CI step

- **ACTION**: ADD Lighthouse CI step after the "Build" step and BEFORE "Vercel Build Validation"
- **EXACT CHANGE**: Insert after `- name: Build` step (line 39-40) in the existing `ci.yml`:

  ```yaml
  - name: Lighthouse CI
    run: |
      pnpm add -g @lhci/cli
      lhci autorun
    env:
      LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
  ```

- **GOTCHA**: LHCI runs `startServerCommand: "pnpm --filter @pah/web start"` which requires the Next.js build output to exist. Placing this step AFTER the "Build" step ensures `.next/` is available
- **GOTCHA**: `LHCI_GITHUB_APP_TOKEN` is optional — if the secret is not configured, Lighthouse results still run and assert but don't post PR comments. CI will pass if accessibility ≥ 0.95 regardless.
- **GOTCHA**: `pnpm add -g @lhci/cli` installs globally. Alternative: add `@lhci/cli` to root `devDependencies` and use `pnpm lhci autorun`. Global install is simpler for CI-only usage.
- **VALIDATE**: Push to a branch and verify CI passes; check that Lighthouse CI step appears in GitHub Actions UI

---

## Testing Strategy

### Tests to Validate

| Test | Command | Validates |
|---|---|---|
| axe-core E2E — listing, metodologia, fontes | `pnpm --filter @pah/web test:e2e e2e/accessibility.spec.ts` | Zero WCAG 2.1 AA violations axe-detectable |
| TypeScript across all changes | `pnpm --filter @pah/web typecheck` | No type errors introduced |
| Full build | `pnpm --filter @pah/web build` | Next.js build passes |
| Lighthouse CI | Via GitHub Actions | accessibility ≥ 0.95 |

### Edge Cases Checklist

- [ ] Skip link: Tab from browser chrome → skip link visible → Enter → focus moves to `<main>` without visible outline on `<main>`
- [ ] Skip link on profile page: same flow works on `/politicos/[slug]`
- [ ] Table with zero rows: `<table aria-label>` present even when `result.data.length === 0` conditional hides the table (check empty state `<p>` doesn't need table attrs)
- [ ] Motion: OS reduce-motion enabled → skeleton loaders are static (no animation)
- [ ] External link sr-only: screen reader announces "(abre em nova aba)" text after link label
- [ ] `not-found.tsx`: navigating to `/politicos/nonexistent` → Next.js renders custom 404 → skip link functional
- [ ] Focus ring on `error.tsx` button: Tab to button → blue ring visible → correct color token

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm --filter @pah/web typecheck
pnpm --filter @pah/web lint
```

**EXPECT**: Exit 0, zero warnings

### Level 2: UNIT_TESTS

```bash
pnpm --filter @pah/web test
```

**EXPECT**: All existing tests pass (no regressions — no new unit tests added in this phase)

### Level 3: BUILD

```bash
pnpm --filter @pah/web build
```

**EXPECT**: Build succeeds; `.next/` directory created

### Level 4: E2E ACCESSIBILITY

```bash
# Requires local Next.js running (playwright.config.ts handles webServer auto-start)
pnpm --filter @pah/web test:e2e e2e/accessibility.spec.ts
```

**EXPECT**: All 3 non-skipped tests pass; zero axe violations fingerprint; attached JSON reports visible in Playwright HTML report

### Level 5: LIGHTHOUSE CI (local)

```bash
# Run from project root after next build
pnpm add -g @lhci/cli
pnpm --filter @pah/web start &
lhci autorun --config=.lighthouserc.json
```

**EXPECT**: `categories:accessibility` ≥ 0.95 on all scanned URLs

### Level 6: MANUAL BROWSER VALIDATION

1. Open `/politicos` in browser, press **Tab** → "Ir para o conteúdo principal" link appears in top-left with blue background
2. Press **Enter** → page scrolls to main content area, focus moves to `<main>`
3. Open DevTools → Application → Cookies: **zero tracking cookies**
4. On `/politicos/[slug]/projetos`, open browser accessibility tree → table shows column headers with scope
5. Enable OS "Reduce Motion" → reload → skeleton loaders are static (no pulse animation)
6. On `error.tsx` (navigate to a broken route): Tab to "Tentar novamente" button → blue focus ring visible

---

## Acceptance Criteria

- [ ] All implemented per user story: keyboard users can skip to main content on all pages
- [ ] Level 1: `pnpm typecheck && pnpm lint` passes with zero warnings
- [ ] Level 2: `pnpm test` — all existing tests pass, no regressions
- [ ] Level 3: `pnpm build` succeeds
- [ ] Level 4: `pnpm test:e2e e2e/accessibility.spec.ts` passes with zero axe violations
- [ ] Level 5: Lighthouse accessibility ≥ 0.95 on `/politicos`, `/metodologia`, `/fontes`
- [ ] All 9 `<main>` elements have `id="main-content"` and `tabIndex={-1}`
- [ ] All 5 data tables have `scope="col"` on every `<th>` and `aria-label` on `<table>`
- [ ] `error.tsx` button has focus ring and Portuguese text
- [ ] All 8 `animate-pulse` files use `motion-safe:animate-pulse`
- [ ] All `target="_blank"` external links have sr-only "(abre em nova aba)" text
- [ ] `playwright.config.ts` exists and `pnpm test:e2e` works

---

## Completion Checklist

- [ ] Task 1: `playwright.config.ts` created and validated
- [ ] Task 2: `not-found.tsx` created
- [ ] Task 3: Skip link added to `layout.tsx`
- [ ] Task 4: `prefers-reduced-motion` added to `globals.css`
- [ ] Task 5: `error.tsx` fixed
- [ ] Task 6: `politicos/page.tsx` fixed
- [ ] Task 7: `politicos/[slug]/page.tsx` fixed
- [ ] Tasks 8-12: All 5 data table pages fixed
- [ ] Tasks 13-14: `metodologia` and `fontes` fixed
- [ ] Task 15: `exclusion-notice.tsx` fixed
- [ ] Task 16: All 8 skeleton files use `motion-safe:animate-pulse`
- [ ] Task 17: `accessibility.spec.ts` created and passing
- [ ] Task 18: `.lighthouserc.json` created
- [ ] Task 19: `ci.yml` updated with Lighthouse CI step
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| axe-core reports contrast violations for `--primary` on white | MEDIUM | MEDIUM | Primary is only used for large text and underlined links — if LHCI fails on contrast, adjust `--primary` to a darker blue (`221 83% 43%` ≈ #2563eb) or leave for post-phase fix |
| Lighthouse CI adds 3+ minutes to CI run | HIGH | LOW | `numberOfRuns: 1` minimizes scan time; Lighthouse CI runs AFTER `next build` so no extra build time |
| `webServer.command` in CI rebuilds unnecessarily (build already ran) | HIGH | LOW | Acceptable trade-off; alternative is to only start server without rebuild — advanced config not needed for MVP |
| `not-found.tsx` without `tabIndex={-1}` catches skip link test | LOW | LOW | Always include `tabIndex={-1}` + `focus:outline-none` on `<main>` in all new page files |
| E2E tests flaky due to empty DB | MEDIUM | LOW | Mitigated by `test.skip` on profile pages; static routes (`/politicos`, `/metodologia`, `/fontes`) render without API |

---

## Notes

- **Tailwind v4 CSS-first config**: globals.css uses `@tailwind base|components|utilities` directives. Adding `@media` inside `@layer base` is valid Tailwind v4 CSS. The `@custom-variant` approach is not needed.
- **`tabIndex={-1}` on `<main>`**: This adds `<main>` to programmatic focus but NOT to the tab order (negative tabIndex). It's required for the skip link anchor `href="#main-content"` to correctly move keyboard focus. Without it, the browser moves the scroll position but not keyboard focus.
- **`focus:outline-none` on `<main>`**: Prevents a visible browser focus outline from appearing on `<main>` when the skip link activates it. The outline is unintended for users — they're not "clicking" on main, just moving past it.
- **Phase dependency**: Phase 3 (Comparação) depends on this phase being `complete` before the `/comparar` page is added. This ensures the new page inherits the same accessibility patterns from day one.
- **`fontes/page.tsx` table**: Already has `scope="col"` per codebase audit. Only needs `id="main-content"` and `aria-label` on the `<table>` element if missing.
