# Implementation Report

**Plan**: `.claude/PRPs/plans/post-mvp-phase-2-accessibility.plan.md`
**Branch**: `feat/PAH-28-accessibility-wcag-2.1-aa`
**Date**: 2026-03-15
**Status**: COMPLETE

---

## Summary

Implemented WCAG 2.1 AA accessibility improvements across the entire `apps/web` application. Added skip-to-content link, `id="main-content"` + `tabIndex={-1}` on all `<main>` elements, `scope="col"` + `aria-label` on all 5 data tables, focus rings on pagination links, sr-only warnings on all `target="_blank"` links, `motion-safe:animate-pulse` in all 8 skeleton loaders, `prefers-reduced-motion` global CSS block, Portuguese error page text, Playwright E2E config, axe-core accessibility spec, Lighthouse CI config, and Lighthouse step in CI.

---

## Assessment vs Reality

| Metric     | Predicted | Actual | Reasoning |
| ---------- | --------- | ------ | --------- |
| Complexity | MEDIUM    | MEDIUM | Plan was accurate — straightforward mechanical fixes across many files |
| Confidence | HIGH      | HIGH   | No surprises; the 2 TypeScript fixes were anticipated edge cases |

**Deviations from plan:**

- `playwright.config.ts`: Used `...(isCI ? { workers: 1 } : {})` spread instead of `workers: process.env.CI ? 1 : undefined` to satisfy `exactOptionalPropertyTypes` (project-wide TypeScript setting).
- `accessibility.spec.ts`: Used `import { type Page, type TestInfo }` from `@playwright/test` instead of `Parameters<typeof AxeBuilder>[0]['page']` — `AxeBuilder` is a class, not a function, so `Parameters<>` resolves to `never`.
- Updated `error.test.tsx` to match new Portuguese text ("Ocorreu um erro inesperado" / "Tentar novamente") — pre-existing tests tested English text that was changed.
- Added sr-only `(abre em nova aba)` to `despesas/page.tsx` and `propostas/page.tsx` external links (plan only explicitly listed votacoes and projetos, but the pattern applies to all external links).

---

## Tasks Completed

| #   | Task | File | Status |
| --- | ---- | ---- | ------ |
| 1   | CREATE playwright.config.ts | `apps/web/playwright.config.ts` | ✅ |
| 2   | CREATE not-found.tsx | `apps/web/src/app/not-found.tsx` | ✅ |
| 3   | UPDATE layout.tsx — skip link | `apps/web/src/app/layout.tsx` | ✅ |
| 4   | UPDATE globals.css — prefers-reduced-motion | `apps/web/src/styles/globals.css` | ✅ |
| 5   | UPDATE error.tsx — PT text + focus ring + main ID | `apps/web/src/app/error.tsx` | ✅ |
| 6   | UPDATE politicos/page.tsx — main ID + motion-safe + focus ring | `apps/web/src/app/politicos/page.tsx` | ✅ |
| 7   | UPDATE [slug]/page.tsx — main ID | `apps/web/src/app/politicos/[slug]/page.tsx` | ✅ |
| 8   | UPDATE projetos/page.tsx — table scope + aria-label + focus ring + sr-only | `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | ✅ |
| 9   | UPDATE votacoes/page.tsx — table scope + aria-label + focus ring + sr-only | `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` | ✅ |
| 10  | UPDATE despesas/page.tsx — table scope + aria-label + focus ring + sr-only | `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | ✅ |
| 11  | UPDATE propostas/page.tsx — table scope + aria-label + focus ring + sr-only | `apps/web/src/app/politicos/[slug]/propostas/page.tsx` | ✅ |
| 12  | UPDATE atividades/page.tsx — table scope + aria-label + main ID | `apps/web/src/app/politicos/[slug]/atividades/page.tsx` | ✅ |
| 13  | UPDATE metodologia/page.tsx — main ID | `apps/web/src/app/metodologia/page.tsx` | ✅ |
| 14  | UPDATE fontes/page.tsx — main ID | `apps/web/src/app/fontes/page.tsx` | ✅ |
| 15  | UPDATE exclusion-notice.tsx — sr-only new tab | `apps/web/src/components/politician/exclusion-notice.tsx` | ✅ |
| 16  | UPDATE all 7 skeleton/loading files — motion-safe | 7 loading.tsx files | ✅ |
| 17  | CREATE accessibility.spec.ts | `apps/web/e2e/accessibility.spec.ts` | ✅ |
| 18  | CREATE .lighthouserc.json | `.lighthouserc.json` | ✅ |
| 19  | UPDATE ci.yml — Lighthouse CI step | `.github/workflows/ci.yml` | ✅ |

---

## Validation Results

| Check      | Result | Details |
| ---------- | ------ | ------- |
| Type check | ✅     | 0 errors |
| Lint       | ✅     | 0 errors |
| Unit tests | ✅     | 45 passed (0 failed) — updated 3 error.test.tsx tests for PT text |
| Build      | ✅     | Next.js build completes successfully |
| E2E        | ⏭️     | Requires running server — handled by playwright.config.ts webServer |
| Lighthouse | ⏭️     | CI-only — requires `@lhci/cli` global install |

---

## Files Changed

| File | Action | Notes |
| ---- | ------ | ----- |
| `apps/web/playwright.config.ts` | CREATE | Playwright config with webServer auto-start |
| `apps/web/src/app/not-found.tsx` | CREATE | Custom 404 in Portuguese |
| `apps/web/e2e/accessibility.spec.ts` | CREATE | axe-core audit for 3 routes |
| `.lighthouserc.json` | CREATE | Lighthouse CI config, accessibility ≥ 0.95 |
| `apps/web/src/app/layout.tsx` | UPDATE | Skip-to-content link |
| `apps/web/src/styles/globals.css` | UPDATE | prefers-reduced-motion block |
| `apps/web/src/app/error.tsx` | UPDATE | main ID + PT text + focus ring |
| `apps/web/src/app/error.test.tsx` | UPDATE | Tests updated for PT text |
| `apps/web/src/app/politicos/page.tsx` | UPDATE | main ID + motion-safe + pagination focus ring |
| `apps/web/src/app/politicos/[slug]/page.tsx` | UPDATE | main ID |
| `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | UPDATE | main ID + table attrs + focus ring + sr-only |
| `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` | UPDATE | main ID + table attrs + focus ring + sr-only |
| `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | UPDATE | main ID + table attrs + focus ring + sr-only |
| `apps/web/src/app/politicos/[slug]/propostas/page.tsx` | UPDATE | main ID + table attrs + focus ring + sr-only |
| `apps/web/src/app/politicos/[slug]/atividades/page.tsx` | UPDATE | main ID + table attrs |
| `apps/web/src/app/metodologia/page.tsx` | UPDATE | main ID |
| `apps/web/src/app/fontes/page.tsx` | UPDATE | main ID |
| `apps/web/src/components/politician/exclusion-notice.tsx` | UPDATE | sr-only new tab warning |
| `apps/web/src/app/politicos/loading.tsx` | UPDATE | motion-safe:animate-pulse (2 instances) |
| `apps/web/src/app/politicos/[slug]/loading.tsx` | UPDATE | motion-safe:animate-pulse (12 instances) |
| `apps/web/src/app/politicos/[slug]/projetos/loading.tsx` | UPDATE | motion-safe:animate-pulse (7 instances) |
| `apps/web/src/app/politicos/[slug]/votacoes/loading.tsx` | UPDATE | motion-safe:animate-pulse (8 instances) |
| `apps/web/src/app/politicos/[slug]/despesas/loading.tsx` | UPDATE | motion-safe:animate-pulse (17 instances) |
| `apps/web/src/app/politicos/[slug]/propostas/loading.tsx` | UPDATE | motion-safe:animate-pulse (9 instances) |
| `apps/web/src/app/politicos/[slug]/atividades/loading.tsx` | UPDATE | motion-safe:animate-pulse (7 instances) |
| `.github/workflows/ci.yml` | UPDATE | Lighthouse CI step after Build |

---

## CI Incident — Lighthouse preset misconfiguration (2026-03-15)

**Incident:** PR 29 CI failed on the "Lighthouse CI" step with 6 hard failures (✘) and 6 warnings (⚠️).

**Root cause:** `.lighthouserc.json` foi criado com `"preset": "lighthouse:no-pwa"`, que habilita asserções para TODAS as categorias Lighthouse (Performance, SEO, Best Practices, além de Accessibility). O Phase 2 definia apenas `accessibility ≥ 0.95`. As falhas eram todas de Performance, SEO e Best Practices — nenhuma de Accessibility:

| Falha | Categoria | Motivo em CI |
| ----- | --------- | ------------ |
| `errors-in-console` | Best Practices | API calls falham sem banco de dados em CI → console errors |
| `legacy-javascript-insight` | Performance | Next.js bundle inclui polyfills (comportamento normal) |
| `network-dependency-tree-insight` | Performance | Característica estrutural de SSR |
| `unused-javascript` | Performance | Next.js code splitting normal |
| `meta-description` (só `/politicos`) | SEO | Provável render degradado em CI sem API disponível |
| `bf-cache` (só `/politicos`) | Performance | Headers Next.js previnem bfcache por design |

**Correção aplicada (2026-03-15):**

- Removido `"preset": "lighthouse:no-pwa"` do `.lighthouserc.json` — mantido apenas `categories:accessibility ≥ 0.95`
- Adicionada Phase 6 ao PRD (`post-mvp-engagement-and-reach.prd.md`) para cobrir SEO, Best Practices e Performance contra Vercel preview URL quando o produto estiver completo

**Lição:** Lighthouse CI em servidor local sem banco de dados real não é ambiente confiável para categorias de Performance, Best Practices e SEO. Essas categorias requerem execução contra Vercel preview deployment (dados reais + CDN). Somente `categories:accessibility` é confiável em servidor local, pois não depende de dados dinâmicos.

---

## Next Steps

- [x] Fix `.lighthouserc.json` — preset removido, CI passa agora
- [ ] Review implementation
- [ ] Create PR: `gh pr create` or `/prp-pr`
- [ ] Configure `LHCI_GITHUB_APP_TOKEN` secret in GitHub (optional — CI passes without it)
- [ ] Merge when approved
