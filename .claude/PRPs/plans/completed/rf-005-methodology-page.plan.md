# Feature: RF-005 — Score Methodology Transparency Page

## Summary

Build a fully static SSG page at `/metodologia` that explains how politician integrity scores are calculated. The page documents the 4 score components with formulas, lists 6 official government data sources with links, explains the anti-corruption component (DR-001 compliant, no record details), and displays the current methodology version. Zero data dependencies — no API calls at render time. Pure static Server Component with `revalidate = 604800` (7-day cache).

## User Story

As a Brazilian citizen who sees an integrity score on the listing page,
I want to read how the score is calculated and which data sources are used,
So that I can trust the score and make an informed decision before the election.

## Problem Statement

Citizens who see a 72/100 score and want to understand it hit a 404 at `/metodologia`, destroying trust. Without transparency about the scoring methodology, the platform appears arbitrary. The `/metodologia` route does not exist.

## Solution Statement

Create a single static page (`revalidate = 604800`) with 5 sections: formula overview, 4 score component descriptions, 6 official data source links, anti-corruption component explanation (DR-001 compliant), and methodology version footer. The `methodology_version` is a hardcoded constant `'v1.0'` for Phase 1 — Phase 8 (RF-004 scoring engine) will replace it with an API-fetched value.

## Metadata

| Field | Value |
|-------|-------|
| Type | NEW_CAPABILITY |
| Complexity | LOW |
| Systems Affected | `apps/web` |
| Dependencies | none (fully static) |
| Estimated Tasks | 2 |

---

## UX Design

### Before State

```
╔══════════════════════════════════════════════════════════════╗
║  /metodologia                                                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  404 — Page Not Found                                        ║
║                                                              ║
║  PAIN: Trust is destroyed. Score seems arbitrary.            ║
╚══════════════════════════════════════════════════════════════╝
```

### After State

```
╔══════════════════════════════════════════════════════════════╗
║  /metodologia                                                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Como calculamos a pontuação de integridade                  ║
║                                                              ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ Pontuação = Transparência + Atividade Legislativa +      │ ║
║  │   Regularidade Financeira + Anti-Corrupção               │ ║
║  │   (cada componente: 0–25 pontos; total: 0–100)           │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                              ║
║  Componentes do Score                                        ║
║  • Transparência (0-25) — disponibilidade de dados públicos ║
║  • Atividade Legislativa (0-25) — votações e projetos        ║
║  • Regularidade Financeira (0-25) — despesas e patrimônio   ║
║  • Anti-Corrupção (0 ou 25) — binário, bases públicas        ║
║                                                              ║
║  Fontes de Dados                                             ║
║  • Câmara dos Deputados           [Link ↗]                   ║
║  • Senado Federal                 [Link ↗]                   ║
║  • Portal da Transparência        [Link ↗]                   ║
║  • TSE — Trib. Superior Eleitoral [Link ↗]                   ║
║  • TCU — Trib. de Contas da União [Link ↗]                   ║
║  • CGU — Controladoria-Geral      [Link ↗]                   ║
║                                                              ║
║  Componente Anti-Corrupção                                   ║
║  [DR-001 compliant explanation — no record details]          ║
║                                                              ║
║  Versão da metodologia: v1.0                                 ║
╚══════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/metodologia` | 404 Not Found | Static SSG page | Citizen understands scoring methodology |
| Listing score `72/100` | Score is opaque | Score + future methodology link | Trust is established |

---

## Mandatory Reading

**CRITICAL: Read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `apps/web/src/app/politicos/page.tsx` | 1–19 | MIRROR: `revalidate` + `metadata` + `export default` pattern |
| P1 | `apps/web/src/app/layout.tsx` | all | Understand what wraps pages (`lang="pt-BR"`, `bg-background`) |
| P1 | `apps/web/src/components/politician/politician-card.tsx` | all | MIRROR: Tailwind class conventions, DR-002 compliance comments, JSDoc style |
| P2 | `apps/web/src/components/filters/role-filter.test.tsx` | 1–15 | MIRROR: RTL import structure (describe/it/expect/vi) |

---

## Patterns to Mirror

**PAGE_MODULE_PATTERN (revalidate + metadata):**

```typescript
// SOURCE: apps/web/src/app/politicos/page.tsx:1-19
export const revalidate = 3600  // ← change to 604800 (7 days)

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Políticos — Autoridade Política',
  description: 'Lista de deputados federais e senadores...',
  alternates: { canonical: 'https://autoridade-politica.com.br/politicos' },
}

export default async function PoliticosPage(...): Promise<React.JSX.Element> {
```

**TAILWIND_CONTAINER_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/page.tsx:49
// Container: className="container mx-auto px-4 py-8"
// Heading h1: className="mb-6 text-2xl font-bold text-foreground"
// Section heading h2: className="mb-3 text-lg font-semibold text-foreground"
// Body text: className="text-sm text-muted-foreground"
// Card/box: className="rounded-lg border border-border bg-card p-4"
// External link: className="text-primary underline"
```

**DR-001_COMPLIANT_ANTICORUPTION_TEXT:**

```typescript
// SOURCE: apps/web/CLAUDE.md — ExclusionNotice pattern + DR-001
// Per DR-001: NO database names, NO record IDs, NO dates, NO specifics.
// Only acknowledge the component exists and point to Portal da Transparência.
// Exact text to use in section:
'Quando informações de bases públicas de anticorrupção afetam este componente,
o impacto é visível na pontuação, mas os detalhes do registro não são expostos.
Para consultar as bases oficiais, acesse o Portal da Transparência.'
```

**TEST_PATTERN (RTL + Vitest):**

```typescript
// SOURCE: apps/web/src/components/filters/role-filter.test.tsx:1-15
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RoleFilter } from './role-filter'  // ← substitute MetodologiaPage
// Note: page has no props and is synchronous → render(<MetodologiaPage />)
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `apps/web/src/app/metodologia/page.tsx` | CREATE | Static SSG methodology page satisfying all RF-005 AC |
| `apps/web/src/app/metodologia/page.test.tsx` | CREATE | Unit tests verifying page content and compliance |

---

## NOT Building (Scope Limits)

- **API endpoint for `methodology_version`** — version is hardcoded `'v1.0'` for Phase 1; Phase 8 (RF-004) will replace with live DB value via `GET /api/v1/methodology`
- **Header/nav component** — not in RF-005 scope; navigation links are Phase 9 polish
- **Score progress bars** — visual progress bars are Phase 8 (RF-004/RF-007); this page uses text and formulas only
- **Links to methodology from listing page** — the listing page will add a "Metodologia" link in Phase 9 (SEO + polish)
- **Methodology version comparison** — post-MVP
- **English version / i18n** — post-MVP

---

## Step-by-Step Tasks

### Task 1: CREATE `apps/web/src/app/metodologia/page.tsx`

- **ACTION**: CREATE static SSG Server Component
- **IMPLEMENT**:
  - `export const revalidate = 604800` — 7 days (7 × 24 × 3600 = 604800)
  - `export const metadata: Metadata` — title `'Metodologia — Autoridade Política'`, description, canonical URL
  - `const METHODOLOGY_VERSION = 'v1.0'` — hardcoded constant with TODO comment: `// TODO(RF-004): replace with API-fetched value when scoring engine is built`
  - `export default function MetodologiaPage(): React.JSX.Element` — synchronous (no data fetching)
  - **Section 1** (`<section aria-labelledby="how-scores-work">`):
    - `<h1 id="how-scores-work">Como calculamos a pontuação de integridade</h1>`
    - Brief intro paragraph: platform uses public government data from 6 official sources
  - **Section 2** (`<section aria-labelledby="formula">`):
    - `<h2 id="formula">Fórmula</h2>`
    - Code/formula box: `Pontuação = Transparência + Atividade Legislativa + Regularidade Financeira + Anti-Corrupção` (each 0–25; total 0–100)
    - Weights explanation: uniform 0.25 each per DR-002
  - **Section 3** (`<section aria-labelledby="components">`):
    - `<h2 id="components">Componentes do Score</h2>`
    - `<dl>` with 4 `<dt>/<dd>` pairs:
      - **Transparência (0–25)**: "Mede a disponibilidade de dados públicos do parlamentar nas 6 fontes oficiais. Ausência de dados reduz este componente, não indica má conduta."
      - **Atividade Legislativa (0–25)**: "Mede participação em votações nominais, autoria de projetos de lei e atuação em comissões parlamentares."
      - **Regularidade Financeira (0–25)**: "Analisa despesas de gabinete (CEAP/CEAPS) e declarações de patrimônio ao TSE em relação a padrões históricos."
      - **Anti-Corrupção (0 ou 25)**: "Componente binário: 25 pontos se nenhum registro encontrado em bases públicas de anticorrupção; 0 pontos se qualquer registro existir."
  - **Section 4** (`<section aria-labelledby="sources">`):
    - `<h2 id="sources">Fontes de Dados</h2>`
    - `<ul>` with 6 `<li>` items, each with `<a href="..." target="_blank" rel="noopener noreferrer" className="text-primary underline">`:
      1. Câmara dos Deputados — `https://dadosabertos.camara.leg.br`
      2. Senado Federal — `https://legis.senado.leg.br/dadosabertos/`
      3. Portal da Transparência — `https://www.portaltransparencia.gov.br`
      4. TSE — Tribunal Superior Eleitoral — `https://dadosabertos.tse.jus.br`
      5. TCU — Tribunal de Contas da União — `https://portal.tcu.gov.br`
      6. CGU — Controladoria-Geral da União — `https://www.gov.br/cgu/`
  - **Section 5** (`<section aria-labelledby="anticorrupcao">`):
    - `<h2 id="anticorrupcao">Componente Anti-Corrupção</h2>`
    - DR-001 compliant paragraph: "Quando informações de bases públicas de anticorrupção afetam este componente, o impacto é visível na pontuação, mas os detalhes do registro não são expostos. Para consultar as bases oficiais, acesse o [Portal da Transparência](https://www.portaltransparencia.gov.br)."
  - **Footer** (`<footer>`):
    - `<p>Versão da metodologia: {METHODOLOGY_VERSION}</p>`
- **MIRROR**: `apps/web/src/app/politicos/page.tsx:1-20` for module-level exports
- **GOTCHA**: Synchronous component (`function`, not `async function`) — no data fetching, simpler to test
- **GOTCHA**: DR-001 — anti-corruption section MUST NOT mention specific database names (CGU CEIS, CEPIM, etc.), record IDs, or dates
- **GOTCHA**: DR-002 — no qualitative labels; avoid "melhor", "pior", "corrupto", "honesto"
- **GOTCHA**: All 6 external links require `target="_blank" rel="noopener noreferrer"` (WCAG 2.1 AA)
- **GOTCHA**: `<html lang="pt-BR">` is already set in root layout — no need to set it here
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

### Task 2: CREATE `apps/web/src/app/metodologia/page.test.tsx`

- **ACTION**: CREATE unit tests
- **IMPLEMENT**: 5 tests using Vitest + RTL:

  ```typescript
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import MetodologiaPage from './page'

  describe('MetodologiaPage', () => {
    it('renders main heading', () => {
      render(<MetodologiaPage />)
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('renders 4 score component labels', () => {
      render(<MetodologiaPage />)
      expect(screen.getByText(/transparência/i)).toBeInTheDocument()
      expect(screen.getByText(/atividade legislativa/i)).toBeInTheDocument()
      expect(screen.getByText(/regularidade financeira/i)).toBeInTheDocument()
      expect(screen.getByText(/anti-corrupção/i)).toBeInTheDocument()
    })

    it('renders 6 data source links', () => {
      render(<MetodologiaPage />)
      const links = screen.getAllByRole('link')
      // At minimum 6 external source links + possibly 1 portal link in AC section
      expect(links.length).toBeGreaterThanOrEqual(6)
      expect(screen.getByRole('link', { name: /câmara dos deputados/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /senado federal/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /portal da transparência/i })).toBeInTheDocument()
    })

    it('renders anti-corruption section without specific database or record details (DR-001)', () => {
      render(<MetodologiaPage />)
      // Should describe the component in neutral terms
      expect(screen.getByText(/bases públicas de anticorrupção/i)).toBeInTheDocument()
      // Should NOT expose specific database names
      expect(screen.queryByText(/ceis/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/cepim/i)).not.toBeInTheDocument()
    })

    it('renders methodology version', () => {
      render(<MetodologiaPage />)
      expect(screen.getByText(/versão da metodologia/i)).toBeInTheDocument()
      expect(screen.getByText(/v1\.0/i)).toBeInTheDocument()
    })
  })
  ```

- **MIRROR**: `apps/web/src/components/filters/role-filter.test.tsx:1-15` for import/describe structure
- **GOTCHA**: No mocks needed — the component is synchronous and has no external dependencies. Render directly with `render(<MetodologiaPage />)` (NOT `render(await MetodologiaPage())` — this is synchronous)
- **GOTCHA**: `vi.mocked(useSearchParams)` and `vi.mocked(useRouter)` are NOT needed — page has no Client Components
- **VALIDATE**: `pnpm --filter @pah/web test` — expect 26 tests pass (21 existing + 5 new)

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|-----------|-----------|
| `apps/web/src/app/metodologia/page.test.tsx` | heading, 4 components, 6 source links, DR-001 anti-corruption, version | Page content, RF-005 AC, domain rule compliance |

### Edge Cases Checklist

- [ ] DR-001: anti-corruption text contains no database names (CEIS, CEPIM, CNEP, etc.)
- [ ] DR-001: anti-corruption text contains no record IDs, dates, or politician-specific details
- [ ] DR-002: No qualitative labels ("melhor"/"pior"/"corrupto"/"honesto") anywhere in page
- [ ] All 6 external links have `rel="noopener noreferrer"` (verified by visual inspection + manual test)
- [ ] `revalidate = 604800` confirms 7-day SSG cache (7 × 24 × 3600 = 604800 ✓)

---

## Validation Commands

```bash
# Level 1: Static Analysis
pnpm --filter @pah/web typecheck    # 0 errors
pnpm --filter @pah/web lint         # 0 errors

# Level 2: Unit Tests
pnpm --filter @pah/web test
# Expect: 26 tests pass (21 existing + 5 new)

# Level 3: Full Suite + Build
pnpm --filter @pah/web build
# Expect: next build succeeds; /metodologia route is pre-rendered as SSG
pnpm typecheck && pnpm test

# Level 5: Manual Validation
# 1. pnpm --filter @pah/web dev
# 2. Visit http://localhost:3000/metodologia
# 3. Verify: h1 heading is present
# 4. Verify: 4 score components listed with descriptions
# 5. Verify: 6 source links present and open correct URLs in new tab
# 6. Verify: anti-corruption section uses neutral language (no DB names)
# 7. Verify: version "v1.0" displayed
# 8. Verify: no party colors, no qualitative labels (DR-002)
```

---

## Acceptance Criteria

- [ ] Page accessible at `/metodologia` (HTTP 200)
- [ ] Documents all 4 score components with formulas (RF-005 AC #2)
- [ ] Lists all 6 data sources with official links (RF-005 AC #3)
- [ ] Anti-corruption section is DR-001 compliant — no record details (RF-005 AC #4)
- [ ] Displays `METHODOLOGY_VERSION = 'v1.0'` (RF-005 AC #5)
- [ ] `export const revalidate = 604800` — 7-day SSG cache (RF-005 AC #6)
- [ ] `pnpm --filter @pah/web build` succeeds
- [ ] 26 unit tests pass (21 existing + 5 new)
- [ ] `pnpm lint` passes with 0 errors
- [ ] `pnpm typecheck` passes with 0 errors

---

## Completion Checklist

- [ ] Task 1 completed and typecheck passes
- [ ] Task 2 completed and 5 new tests pass
- [ ] Level 1: Static analysis (lint + typecheck) passes
- [ ] Level 2: 26 unit tests pass
- [ ] Level 3: `next build` succeeds
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DR-001 violation in anti-corruption section | LOW | HIGH | Test explicitly verifies no CEIS/CEPIM/CNEP text |
| DR-002 violation: qualitative labels | LOW | HIGH | Test verifies no "melhor"/"pior"/"corrupto" text |
| Build failure — missing directory | LOW | LOW | `apps/web/src/app/metodologia/` created as part of file creation |
| revalidate value wrong | LOW | LOW | 604800 = 7 × 24 × 3600 = 604800 ✓ (confirmed in plan) |
| Async render mismatch in tests | LOW | LOW | Component is synchronous — no `await` needed in tests |

---

## Notes

- **Parallel with Phase 2 (RF-007 Profile Overview)**: Phases 1 and 2 can run concurrently in separate branches. Phase 1 is frontend-only (no API/DB changes). Phase 2 requires new API endpoint but different web files.
- **methodology_version v1.0 rationale**: The scoring algorithm has one published version (documented here). When Phase 8 (RF-004) builds the scoring engine, the `METHODOLOGY_VERSION` constant in this file should be replaced with a server-side fetch from `GET /api/v1/methodology` with `{ next: { revalidate: 604800, tags: ['methodology'] } }`.
- **No loading.tsx needed**: Static SSG pages have no loading state — the ISR stale-while-revalidate pattern serves pre-built HTML instantly.
