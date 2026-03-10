# RF-MVP — Remaining MVP Core Features (RF-004 to RF-017)

> **PRD Reference:** `docs/prd/PRD.md` § 2.1 RF-004 through RF-017
> **Status:** DRAFT — Implementation Tracker (2 complete, 7 pending)
> **Generated:** 2026-03-03
> **Prerequisite:** All Phases from `rf-001-politician-catalog-listing.prd.md` are COMPLETE

---

## Problem Statement

The listing page (`/politicos`) with filtering and search is complete and production-ready. However, the platform delivers zero value to citizens who click through to a politician's profile — because no profile pages exist, no real data is ingested from government APIs, and the scoring engine has never run. A platform that shows cards but no detail pages, with no real data, has a high bounce rate and fails its core KPI (≥ 3 pages/session).

## Evidence

- `/apps/web/src/app/` contains only one route: `politicos/` — no `[slug]`, no `/metodologia`, no `/fontes`
- `apps/pipeline/src/` does not exist — zero pipeline code, zero adapters, zero scheduled jobs
- `packages/db/src/internal-schema.ts` is a 4-line stub — no exclusion records, no raw source data, no CPF tables
- `packages/db/migrations/public/` has only 2 files — no bills, votes, expenses, or proposals schema
- All `integrity_scores` rows in the database contain seed data only — not real government data

## Proposed Solution

Implement the remaining 13 MVP features in 9 sequential+parallel phases, ordered by strategic priority:

1. **Quick-win static pages** (RF-005 methodology, partial RF-017 SEO) — visible trust signal with zero data dependency
2. **Profile pages UI** (RF-007 overview + RF-008-012 sections) — with schema + seed data, before real data arrives
3. **Data ingestion pipeline** (RF-013) — the foundational unlock for all real data
4. **Data products** (RF-004 scoring, RF-006 anti-corruption, RF-014 freshness) — powered by pipeline
5. **Polish passes** (RF-016 responsive, RF-017 SEO completion) — after all pages exist

## Key Hypothesis

We believe providing full politician profiles with real government data (bills, votes, expenses, score breakdown) will convert listing visitors into engaged session users.
We'll know we're right when average session depth reaches ≥ 3 pages within 30 days of pipeline activation.

## What We're NOT Building

- **Politician comparison (RF-POST-001)** — post-MVP, not in this tracker
- **Alert subscriptions / public API / comments** — all post-MVP
- **Staging environment** — post-MVP; dev + production only
- **Autocomplete search suggestions** — explicitly excluded from RF-015 scope
- **OG image API endpoint** — deferred from RF-017 MVP (static card with text is sufficient for MVP)

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| All 17 RF acceptance criteria met | 100% | Manual AC checklist per RF |
| Pipeline daily sync success rate | ≥ 99% | pg-boss job logs |
| Profile page LCP | < 2.0s | Lighthouse CI |
| API p95 response time (profile endpoints) | < 300ms | Fastify server logs |
| All 594 politicians with computed score | 100% | DB query on integrity_scores |
| `pnpm lint && pnpm typecheck && pnpm test` pass | 100% | CI/CD on every PR |

## Open Questions

- [ ] For RF-013: Does Senado API still return XML in production, or has it migrated to JSON? Check `https://legis.senado.leg.br/dadosabertos/` before building adapter.
- [ ] For RF-013: TSE bulk CSV — what's the current election cycle file URL? Validate before building TSE adapter.
- [ ] For RF-004: Should `transparency_score` count only sources with data, or penalize sources that returned errors (vs. sources that simply have no data for a politician)?
- [ ] For RF-007: Should the profile page show score breakdown as a visual bar chart or just numeric values? (Design decision — affects component complexity)
- [ ] For RF-012: CEAP/CEAPS data from Portal da Transparencia — is it paginated in the API or bulk? Rate limit implications for 594 politicians × potentially hundreds of expenses each.

---

## Implementation Audit (as of 2026-03-03)

### Completed Features

| RF | Feature | Branch/PR |
|----|---------|-----------|
| RF-001 | Politician Catalog Listing | merged: main |
| RF-002 | Filter by Political Role | merged: main |
| RF-003 | Filter by State/UF | merged: main |
| RF-015 | Search Politician by Name | PR #4: feat/PAH-015-name-search |
| RF-005 | Methodology Page | merged: main |
| RF-007 | Politician Profile Overview | merged: main |
| RF-008 | Profile Section — Bills | PR #5: feat/PAH-007-politician-profile-overview |

### Partial Implementations (schema/structure exists, logic missing)

| RF | What Exists | What's Missing |
|----|-------------|----------------|
| RF-004 | `integrity_scores` table with 4 components + binary anticorruption constraint in DB schema | Scoring engine, pipeline adapters, transformer code |
| RF-006 | `exclusion_flag` boolean in `public.politicians` and `integrity_scores` | `internal_data.exclusion_records` table, pipeline exclusion detection, UI notice component on profile |
| RF-016 | Responsive grid in `/politicos` listing, role/state filter components use mobile-friendly widths | All profile pages (don't exist yet), full 320px–2560px audit, 44px tap targets verification |
| RF-017 | Root `layout.tsx` metadata, listing page canonical URL | Dynamic `generateMetadata()` per profile slug, JSON-LD Person schema, `sitemap.xml`, `robots.txt` |

### Not Started

RF-009, RF-010, RF-011, RF-012, RF-013, RF-014

---

## Users & Context

**Primary User**

- **Who:** Cidadão Engajado — Brazilian voter who clicked a politician card from the listing
- **Current behavior:** Hits a dead end (no profile page exists), bounces back to listing or leaves
- **Trigger:** Recognized a politician's name in the listing, wants to understand their score
- **Success state:** Reads profile overview, explores one detail section (bills or expenses), clicks official source link

**Job to Be Done**
When I see a politician's score on the listing and want to understand why, I want to explore their bills, votes, and expenses in one place, so I can make an informed decision before the election.

**Non-Users**
Researchers needing bulk data export (post-MVP API), users wanting comparison features (post-MVP).

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | RF | Capability | Rationale |
|----------|----|------------|-----------|
| Must | RF-007 | Politician profile overview page | Profile is the core value delivery point |
| Must | RF-013 | Data ingestion pipeline (all 6 sources) | Without real data, scores are meaningless |
| Must | RF-004 | Integrity score calculation | Score without methodology is untrustworthy |
| Must | RF-006 | Anti-corruption silent exclusion | Legal/domain requirement (DR-001) |
| Must | RF-008 | Bills/proposals section | Legislative activity is the primary trust signal |
| Must | RF-009 | Voting record section | Second-most important activity indicator |
| Must | RF-012 | Public expenses section | Most searched-for data by journalists/citizens |
| Must | RF-005 | Methodology transparency page | Trust-building; reduces bounce on "why this score?" |
| Should | RF-010 | Proposals section | Important completeness; parallelizable with RF-008 |
| Should | RF-011 | Agenda/activities section | Committee memberships; lower user demand |
| Should | RF-014 | Data freshness indicator | Transparency about data recency |
| Should | RF-017 | SEO and social sharing metadata | Profile discoverability via Google |
| Could | RF-016 | Full responsive mobile audit | Partially done; complete after all pages exist |

---

## Technical Approach

**Feasibility**: HIGH — all technology choices are already made, stack is established, patterns exist

**Architecture Notes**

- Profile pages follow the same ISR pattern as `/politicos` (revalidate=3600): Server Component → fetch API → render with Suspense
- Pipeline app (`apps/pipeline/`) needs to be bootstrapped: `pg-boss` scheduler + 6 adapter modules
- Internal schema tables (exclusion_records, raw_source_data, politician_identifiers, ingestion_logs, data_source_status) must be added to `packages/db/src/internal-schema.ts` before pipeline code
- Score calculation is a pure function: `transparency + legislative + financial + anticorruption` — all weights 0.25 per DR-002
- Each profile section is an independent API endpoint: `GET /api/v1/politicians/:slug/bills`, `:votes`, `:expenses`, etc.
- Existing filter+search pattern in repository layer is the model for all new data queries

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Senado API returns XML, not JSON | MEDIUM | Build XML parser fallback using fast-xml-parser |
| Portal da Transparencia 90 req/min rate limit | HIGH | Adaptive backoff in adapter; cache raw_source_data; batch by politician |
| TSE CSV files are large (>100MB) | MEDIUM | Stream-parse with csv-parse; do not load into memory |
| CPF matching fails for politicians with name changes | LOW | Fuzzy name fallback after exact CPF match; log unmatched IDs for manual review |
| pg-boss job isolation | LOW | Already in stack (ADR-003); use dedicated queue per source adapter |

---

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases that can run concurrently (e.g., "with 3")
  DEPENDS: phases that must complete first
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Methodology Page (RF-005) | Static SSG page at /metodologia explaining 4 score components, sources, and silent exclusion | complete | with 2 | - | `.claude/PRPs/plans/completed/rf-005-methodology-page.plan.md` |
| 2 | Politician Profile — Overview (RF-007) | ISR profile page at /politicos/[slug] with photo, score breakdown, section navigation | complete | with 1 | - | `.claude/PRPs/plans/completed/rf-007-politician-profile-overview.plan.md` |
| 3 | Profile Section — Bills (RF-008) | Paginated bills table on profile, API endpoint, DB schema | complete | with 4,5 | 2 | `.claude/PRPs/plans/completed/rf-008-profile-bills-section.plan.md` |
| 4 | Profile Section — Voting Record (RF-009) | Paginated votes table on profile, API endpoint, DB schema | complete | with 3,5 | 2 | `.claude/PRPs/plans/completed/rf-009-profile-votes-section.plan.md` |
| 5 | Profile Section — Expenses (RF-012) | Paginated expenses table with BRL formatting, API endpoint, DB schema | complete | with 3,4 | 2 | `.claude/PRPs/plans/completed/rf-012-profile-expenses-section.plan.md` |
| 6 | Profile Sections — Proposals + Agenda (RF-010, RF-011) | Proposals list + committee memberships, API endpoints, DB schema | complete | - | 2 | `.claude/PRPs/plans/completed/rf-010-011-profile-proposals-agenda.plan.md` |
| 7 | Data Ingestion Pipeline (RF-013) | Bootstrap pipeline app, 6 source adapters, pg-boss scheduler, internal schema | pending | - | - | - |
| 8 | Scoring + Anti-Corruption + Freshness (RF-004, RF-006, RF-014) | Scoring engine, exclusion detection, data_source_status, /fontes page | pending | - | 7 | - |
| 9 | SEO + Responsive Polish (RF-017, RF-016) | generateMetadata() per profile, JSON-LD, sitemap.xml, robots.txt, mobile audit | pending | - | 2,6 | - |
| 10 | Frontend Security Hardening (DR-008) | CSP header, server-only guards, ESLint restrictions, CI bundle scan, pnpm audit (RNF-SEC-011,012,014,017) | pending | with 5 | - | - |
| 11 | Code Quality & Best Practices Refactor | Align codebase with TypeScript best practices (interfaces, enums, type guards, destructuring, ms package) | pending | - | 10 | - |

### Phase Details

**Phase 1: Methodology Page (RF-005)**

- **Goal:** Give citizens a trust anchor explaining how scores are calculated
- **Scope:** Single SSG page at `/metodologia`. Sections: how scores work (4 components with formulas), data sources (6 links), anti-corruption component explanation (silent exclusion, no details), current `methodology_version` from API. `revalidate = 604800` (7 days).
- **Success signal:** Page accessible at `/metodologia`, all 6 AC from RF-005 met, no hardcoded values
- **Parallel with:** Phase 2 (completely independent)

**Phase 2: Politician Profile — Overview (RF-007)**

- **Goal:** Give citizens a landing page when clicking a politician card
- **Scope:** Route `/politicos/[slug]/page.tsx`. Displays: photo (with fallback), name, party, state, role, tenure start, bio summary, overall score (0-100), visual breakdown of 4 score components, data freshness badge (placeholder until RF-014 is built), tab navigation to sections (bills, votes, proposals, agenda, expenses). ISR `revalidate = 3600`. New API endpoint: `GET /api/v1/politicians/:slug`.
- **DB changes:** No new tables — uses existing `politicians` + `integrity_scores` joined by slug
- **Success signal:** `/politicos/joao-silva-sp` loads with all data fields, score breakdown visible, section tabs render, `next build` passes
- **Parallel with:** Phase 1 (both independent of pipeline)

**Phase 3: Profile Section — Bills (RF-008)**

- **Goal:** Display legislative projects authored/co-authored by politician
- **Scope:** Tab route `/politicos/[slug]/projetos`. New DB table: `public.bills`. New API endpoint: `GET /api/v1/politicians/:slug/bills?cursor=&limit=20`. Card/row shows: title, type, number, year, status, date, source URL. Pagination 20/page DESC by date. Empty state for no bills.
- **DB changes:** New migration `0003_add_bills.sql`
- **Parallel with:** Phases 4, 5 (same pattern, different table)

**Phase 4: Profile Section — Voting Record (RF-009)**

- **Goal:** Display voting history with participation rate
- **Scope:** Tab route `/politicos/[slug]/votacoes`. New DB table: `public.votes`. New API endpoint. Shows: session date, matter description, vote cast (sim/não/abstenção/ausente), session result, source URL. Summary statistic: participation rate. Pagination 20/page DESC by session date.
- **DB changes:** New migration `0004_add_votes.sql`
- **Parallel with:** Phases 3, 5

**Phase 5: Profile Section — Expenses (RF-012)**

- **Goal:** Display CEAP/CEAPS parliamentary expenses
- **Scope:** Tab route `/politicos/[slug]/despesas`. New DB table: `public.expenses`. New API endpoint. Grouped by year/month. Shows: category, supplier, amount in BRL (R$ X.XXX,XX via `formatCurrency` from `@pah/shared`), document number, source URL. Yearly totals.
- **DB changes:** New migration `0005_add_expenses.sql`
- **Parallel with:** Phases 3, 4

**Phase 6: Profile Sections — Proposals + Agenda (RF-010, RF-011)**

- **Goal:** Complete all 5 profile section tabs
- **Scope:** `/politicos/[slug]/propostas` and `/politicos/[slug]/atividades`. New DB tables: `proposals`, `committees`. API endpoints for both. Proposals: paginated list with type, number, date, summary, status, source URL. Agenda: committee memberships sorted DESC by start date (current first).
- **DB changes:** New migrations `0006_add_proposals.sql`, `0007_add_committees.sql`
- **Depends on:** Phase 2 (profile page structure)

**Phase 7: Data Ingestion Pipeline (RF-013)**

- **Goal:** Ingest real government data from all 6 sources on schedule
- **Scope:** Bootstrap `apps/pipeline/` app. Internal schema tables: `raw_source_data`, `exclusion_records`, `politician_identifiers`, `ingestion_logs`, `data_source_status`. 6 source adapters: Camara (REST/JSON), Senado (REST/XML→JSON fallback), Portal da Transparencia (REST/JSON, API key, 90 req/min), TSE (CSV bulk), TCU CADIRREG (REST/JSON), CGU-PAD (CSV bulk). Transformers: normalize each source to shared types. CPF matcher: AES-256-GCM encryption + SHA-256 hash for cross-source identity. Publisher: upsert to `public` schema tables. pg-boss scheduler: 6 cron definitions per RF-013 AC #1-6.
- **DB changes:** New migrations in `packages/db/migrations/internal/`
- **Technical note:** This is the largest single phase — plan to break into sub-PRPs per adapter if needed
- **Depends on:** None (can be built independently of profile UI phases)

**Phase 8: Scoring + Anti-Corruption + Freshness (RF-004, RF-006, RF-014)**

- **Goal:** Make scores real and make the trust chain visible
- **Scope:**
  - RF-004: Scoring engine (pure function) in `apps/pipeline/src/scoring/`. Formula: `transparency + legislative + financial + anticorruption`. Each component 0-25. Uses data from pipeline. Writes to `public.integrity_scores`.
  - RF-006: Exclusion detection in pipeline: query Portal da Transparencia, TCU, CGU per politician CPF/name. Write boolean-only `exclusion_flag` to `public.politicians`. UI notice component on RF-007 profile page.
  - RF-014: `data_source_status` table populated by pipeline. New page `/fontes` (SSG, revalidate=3600): table of all 6 sources with last sync time, records processed, status. Profile page data freshness badge reads from this table.
- **Depends on:** Phase 7 (pipeline must run and produce data)

**Phase 9: SEO + Responsive Polish (RF-017, RF-016)**

- **Goal:** Make profiles discoverable via search engines and pixel-perfect on mobile
- **Scope:**
  - RF-017: `generateMetadata()` in `/politicos/[slug]/page.tsx` with dynamic `og:title`, `og:description`, `og:image` (politician photo URL), canonical URL. JSON-LD `Person` schema component. `sitemap.xml` route at `/sitemap.xml` (dynamic, reads all slugs from API). `robots.txt` at `/robots.txt` (static, allows all). All pages: unique titles, unique descriptions.
  - RF-016: Full viewport audit 320px–2560px across all pages. Verify 44×44px tap targets on all interactive elements. Fix any horizontal overflow on mobile. Stack profile section tabs vertically on mobile.
- **Depends on:** Phases 2 and 6 (all profile pages must exist before SEO can be applied)

**Phase 10: Frontend Security Hardening (DR-008)**

- **Goal:** Apply the security-first principle (PRD v1.1) to all existing and future frontend code
- **Scope:**
  - **CSP Header (RNF-SEC-011):** Add full `Content-Security-Policy-Report-Only` header to `next.config.ts` via `headers()` function. Policy: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self'; connect-src 'self' {NEXT_PUBLIC_API_URL}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.
  - **`server-only` guards (RNF-SEC-012):** Add `import 'server-only'` to `packages/db/src/public-schema.ts`, `internal-schema.ts`, `clients.ts`, and `migrate.ts`. Install `server-only` as a dependency of `@pah/db`.
  - **ESLint restrictions (RNF-SEC-012):** Add `no-restricted-imports` rule to `apps/web/.eslintrc.cjs` forbidding `@pah/db`, `pg`, `drizzle-orm`, `pg-boss`.
  - **CI bundle scan (RNF-SEC-017):** Add `pnpm audit --audit-level=high` step and post-build forbidden-pattern grep to `.github/workflows/ci.yml` (per project-cicd skill Security CI Steps).
  - **Error sanitization verification (RNF-SEC-014):** Audit existing `error.tsx` and `api-client.ts` to confirm no internal details leak. The existing implementations already comply; this is a verification task.
- **DB changes:** None
- **Success signal:** `next build` fails if any Client Component imports `@pah/db`. CI fails on high vulnerabilities. CI fails if `drizzle-orm` or `DATABASE_URL` appear in `.next/static/chunks/`. CSP header visible in browser DevTools Network tab.
- **Parallel with:** Phase 5 (completely independent — config and tooling only, no feature code)
- **Note:** Phase 7 pipeline must also implement HTML stripping of government source text in transformers (RNF-SEC-013) when built.

**Phase 11: Code Quality & Best Practices Refactor**

- **Goal:** Align existing and new code with the updated project standards in `CLAUDE.md`.
- **Scope:**
  - Convert `role` ('deputado' | 'senador') and `source` ('camara' | 'senado') string literals to Enums in `packages/shared`.
  - Replace type assertions (`as`) with type guards or Zod schema validation (e.g., in `decodeCursor`, `apiFetch`).
  - Ensure `import 'server-only'` is present in all `@pah/db` internal modules (DR-008).
  - Apply object destructuring across services and route handlers.
  - Integrate `ms` package for time-related configurations (e.g., Fastify rate-limit).
  - Export all types/interfaces by default.
- **Success signal:** `pnpm lint` and `pnpm typecheck` pass; no `as` assertions in business logic; enums used consistently.
- **Depends on:** Phase 10 (Security hardening)

### Parallelism Notes

- Phases 1 and 2 can run simultaneously — both are zero-dependency (no pipeline, no new tables)
- Phases 3, 4, and 5 can run simultaneously in separate worktrees — each adds an independent DB table and section tab
- Phase 7 (pipeline) can run in parallel with Phases 1-6 — pipeline and profile UI are completely decoupled until Phase 8
- Phase 8 gates on Phase 7 (needs real data to score) but not on Phases 1-6 (scoring is pipeline-internal)
- Phase 9 gates on all profile pages existing (Phases 2, 6) to complete SEO dynamic metadata

---

## Technical Infrastructure Notes

### New API Endpoints Required

| Endpoint | RF | Returns |
|----------|----|---------|
| `GET /api/v1/politicians/:slug` | RF-007 | Profile overview + score breakdown |
| `GET /api/v1/politicians/:slug/bills` | RF-008 | Paginated bills |
| `GET /api/v1/politicians/:slug/votes` | RF-009 | Paginated votes + participation rate |
| `GET /api/v1/politicians/:slug/proposals` | RF-010 | Paginated proposals |
| `GET /api/v1/politicians/:slug/committees` | RF-011 | Committee memberships |
| `GET /api/v1/politicians/:slug/expenses` | RF-012 | Paginated expenses grouped by year/month |
| `GET /api/v1/sources` | RF-014 | data_source_status for all 6 sources |

### New DB Tables Required

| Table | Schema | RF | Migration |
|-------|--------|----|-----------|
| `public.bills` | public | RF-008 | 0003_add_bills.sql |
| `public.votes` | public | RF-009 | 0004_add_votes.sql |
| `public.expenses` | public | RF-012 | 0005_add_expenses.sql |
| `public.proposals` | public | RF-010 | 0006_add_proposals.sql |
| `public.committees` | public | RF-011 | 0007_add_committees.sql |
| `internal_data.raw_source_data` | internal | RF-013 | internal/0001_initial.sql |
| `internal_data.exclusion_records` | internal | RF-013 | internal/0001_initial.sql |
| `internal_data.politician_identifiers` | internal | RF-013 | internal/0001_initial.sql |
| `internal_data.ingestion_logs` | internal | RF-013 | internal/0001_initial.sql |
| `internal_data.data_source_status` | internal | RF-013/014 | internal/0001_initial.sql |

### New Next.js Routes Required

| Route | RF | Type |
|-------|----|------|
| `/metodologia` | RF-005 | SSG (revalidate=604800) |
| `/politicos/[slug]` | RF-007 | ISR (revalidate=3600) |
| `/politicos/[slug]/projetos` | RF-008 | ISR (revalidate=3600) |
| `/politicos/[slug]/votacoes` | RF-009 | ISR (revalidate=3600) |
| `/politicos/[slug]/propostas` | RF-010 | ISR (revalidate=3600) |
| `/politicos/[slug]/atividades` | RF-011 | ISR (revalidate=3600) |
| `/politicos/[slug]/despesas` | RF-012 | ISR (revalidate=3600) |
| `/fontes` | RF-014 | ISR (revalidate=3600) |
| `/sitemap.xml` | RF-017 | dynamic |
| `/robots.txt` | RF-017 | static |

### Pipeline App Bootstrapping Required

- `apps/pipeline/package.json` — package with pg-boss, axios, fast-xml-parser, csv-parse, node-cron
- `apps/pipeline/src/index.ts` — entry point registering pg-boss and all scheduled jobs
- `apps/pipeline/src/adapters/` — one file per source
- `apps/pipeline/src/transformers/` — one file per source
- `apps/pipeline/src/scoring/` — score calculator
- `apps/pipeline/src/publisher/` — upsert to public schema
- `apps/pipeline/Dockerfile.pipeline` — already referenced in docker-compose.yml but doesn't exist

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Phase order | Profile UI before pipeline | Pipeline first | UI with seed data is demonstrable; pipeline takes longer and can be built in parallel |
| Profile routing | Tab-based routes (/slug/projetos) | Single page with sections | ISR per section means each tab can be independently cached and revalidated |
| Pipeline approach | Phase 7 monolithic PRP | Separate PRP per adapter | Start with one PRP; break into sub-PRPs per adapter if complexity demands it |
| OG image | Use politician photoUrl | Generate OG image API | Static photo is sufficient for MVP; avoids serverless function complexity |
| Expenses grouping | API groups by year/month | Client-side grouping | Server-side grouping keeps payload small; consistent with pagination pattern |

---

## Research Summary

**Codebase Audit (2026-03-03)**

Complete (4): RF-001 (listing), RF-002 (role filter), RF-003 (state filter), RF-015 (name search).
Partial (4): RF-004 (schema only), RF-006 (boolean flag only), RF-016 (listing page only), RF-017 (root layout only).
Not started (9): RF-005, RF-007, RF-008, RF-009, RF-010, RF-011, RF-012, RF-013, RF-014.

**Technical Context**

All technology choices locked-in (TypeScript, Next.js 15 ISR, Fastify 5, Drizzle ORM, pg-boss, PostgreSQL 16). Patterns for each layer established across Phases 1-4. Primary implementation risk is RF-013 pipeline scope — 6 different APIs with different formats, rate limits, and auth. Build pipeline adapters with stub testing first; validate against real APIs in integration.

---

*Generated: 2026-03-03*
*Status: DRAFT — ready for implementation*
