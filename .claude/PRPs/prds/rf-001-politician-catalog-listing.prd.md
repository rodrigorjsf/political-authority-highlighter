# RF-001 — Politician Catalog Listing

> **PRD Reference:** docs/prd/PRD.md § 2.1 RF-001, RF-002, RF-003
> **Status:** DRAFT
> **Generated:** 2026-02-28

---

## Problem Statement

Brazilian citizens who want to assess their representatives have no unified, fast interface to browse and compare federal politicians by integrity data. Government portals are fragmented and non-comparable. This page is the primary entry point of the platform — without it, all other profile data is unreachable.

## Evidence

- PRD § 1.1: Citizens must navigate 6+ government websites to gather what this page consolidates in one view.
- PRD § 1.5: KPI target of 3+ pages/session requires a compelling listing that drives profile clicks.
- PRD § 2.3 Journey 2: "Browse and Filter" is an explicit validated user flow — catalog listing is step 1.
- PRD § 3.1 RNF-PERF-001: LCP < 2.0s mandated — listing page is the highest-traffic page and the primary LCP target.

## Proposed Solution

A server-rendered listing page (`/politicos`) displaying politician cards in a responsive grid, fetching pre-computed score data from the Fastify API. Cards show the 6 required fields per the PRD acceptance criteria. Default sort is `overall_score DESC`. Cursor-based pagination returns 20 politicians per page. Photo fallback placeholder displayed when `photo_url` is null. Filters (RF-002, RF-003) and search (RF-015) are delivered as follow-on phases on the same page.

## Key Hypothesis

We believe a clean, fast politician listing page sorted by integrity score will convert organic search traffic into profile page visits. We'll know we're right when >= 3 pages/session average is achieved within 30 days of launch.

## What We're NOT Building

- **Filters (RF-002, RF-003)** — separate phase, same page; listed as Phase 2 and Phase 3 below
- **Full-text search (RF-015)** — separate phase; Phase 4 below
- **Infinite scroll** — deliberate choice; cursor pagination is SEO-friendly and cache-deterministic
- **Politician comparison (RF-POST-001)** — explicitly post-MVP
- **Sorting options** — only score DESC in MVP; other sorts are a future nice-to-have

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| LCP | < 2.0s on 4G | Lighthouse CI / Vercel Analytics |
| Pages per session | >= 3 | Vercel Analytics |
| Card → Profile click-through | > 40% of listing visits | Vercel Analytics |
| API p95 response time | < 300ms | Fastify server logs |
| Zero layout shift (CLS) | < 0.1 | Lighthouse CI |

## Open Questions

- [ ] Does the API return `tenure_start_date` directly, or does it need to be derived from candidacy data? (Check Camara/Senado API fields before implementing transformer)
- [ ] What placeholder image should be used for missing `photo_url`? (SVG avatar vs gray box — design decision before frontend build)
- [ ] Should `active = false` politicians be shown in the listing, or only active ones? (PRD says "currently or recently holding" — clarify filter logic)

---

## Users & Context

**Primary User**
- **Who:** Cidadão Engajado — Brazilian voter aged 18-45, digitally literate, arrives via Google search
- **Current behavior:** Manually visits Camara and Senado portals separately, finds no unified view
- **Trigger:** Upcoming election, news story about a politician, social media share
- **Success state:** Finds their state's politicians, clicks a profile, understands the score in < 60 seconds

**Job to Be Done**
When I want to evaluate my federal representatives before an election, I want to see all politicians ranked by their integrity score in one page, so I can quickly decide which profiles are worth investigating further.

**Non-Users**
- Journalists (they need deeper data, not the listing — they go to profiles directly)
- API researchers (post-MVP public API)
- Users on metered connections (we mitigate with SSG/ISR + Cloudflare CDN, not by simplifying the page)

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Politician card with 6 fields | Core acceptance criteria RF-001 AC #1 |
| Must | Default sort: overall_score DESC | AC #2 — primary user mental model |
| Must | Cursor-based pagination (20/page) | AC #4 — SEO + performance |
| Must | Photo fallback placeholder | AC #1 — many politicians lack photos initially |
| Must | LCP < 2s | AC #3 — non-negotiable performance SLA |
| Should | Role filter (RF-002) | Phase 2 — listed page loses utility without it |
| Should | State filter (RF-003) | Phase 3 — combinable with role filter |
| Could | Name search (RF-015) | Phase 4 — powerful but not blocking |
| Won't | Sorting alternatives | Future — score DESC is sufficient for MVP |
| Won't | Infinite scroll | Deliberate — pagination is SEO-canonical |

### MVP Scope

Phase 1 only: The listing page renders a grid of politician cards, sorted by score, with cursor-based pagination. No filters, no search. This is sufficient to validate the hypothesis that users engage with and navigate from the listing.

### User Flow

```
/ (homepage) → /politicos
  → Grid of 20 politician cards (sorted by score DESC)
  → [Next page] cursor → next 20 cards
  → Click card → /politicos/{slug} (RF-007)
```

### Card Data Fields

| Field | Source | Notes |
|-------|--------|-------|
| Photo | `politicians.photo_url` | Nullable — show SVG placeholder if null |
| Full name | `politicians.name` | Full name as from government source |
| Party | `politicians.party` | Party abbreviation (e.g., PT, PL) |
| State (UF) | `politicians.state` | 2-char UF |
| Tenure start | `politicians.tenure_start_date` | TBD — see open questions |
| Overall score | `integrity_scores.overall_score` | 0-100 integer |

---

## Technical Approach

**Feasibility:** HIGH

### Architecture Notes

- **Rendering:** Next.js 15 Server Component with ISR (`revalidate: 3600` — 1 hour, same as RF-007)
- **Data fetch:** Server Component calls Fastify API `GET /api/politicians` — no client-side fetch on initial load
- **API endpoint:** `GET /api/politicians?cursor={id}&limit=20&sort=score_desc` (new endpoint required)
- **Database query:** JOIN `public_data.politicians` + `public_data.integrity_scores` on `politician_id`, WHERE `active = true`, ORDER BY `overall_score DESC`, cursor via `(overall_score, id)` composite for stable pagination
- **Indexes used:** `idx_scores_overall` (pre-existing), `idx_politicians_active` (pre-existing)
- **Photo fallback:** `<img>` with `onError` fallback OR Next.js `<Image>` with placeholder — decision at implementation
- **URL state:** Query params `?cursor=X` for pagination; `?role=X&state=X` for filters (Phase 2+)
- **No auth required:** `api_reader` role (SELECT only on `public_data`) — consistent with no-auth MVP

### API Contract — `GET /api/politicians`

```typescript
// Query params (Zod-validated)
type ListPoliticiansQuery = {
  cursor?: string       // opaque cursor (encoded overall_score + id)
  limit?: number        // default 20, max 100
  role?: 'deputado' | 'senador'     // Phase 2
  state?: string        // 2-char UF, Phase 3
  search?: string       // min 2 chars, Phase 4
}

// Response
type ListPoliticiansResponse = {
  data: PoliticianCard[]
  pagination: {
    nextCursor: string | null
    hasMore: boolean
    total: number           // approximate count for display
  }
}

type PoliticianCard = {
  id: string
  slug: string
  name: string
  party: string
  state: string
  role: 'deputado' | 'senador'
  photoUrl: string | null
  tenureStartDate: string | null  // ISO date
  overallScore: number           // 0-100
}
```

### Database Query

```sql
-- Phase 1: base listing (no filters)
SELECT
  p.id, p.slug, p.name, p.party, p.state, p.role,
  p.photo_url, p.tenure_start_date,
  s.overall_score
FROM public_data.politicians p
JOIN public_data.integrity_scores s ON s.politician_id = p.id
WHERE p.active = true
  AND (s.overall_score, p.id) < (:cursor_score, :cursor_id)  -- cursor pagination
ORDER BY s.overall_score DESC, p.id DESC
LIMIT 21  -- fetch 21 to determine hasMore
```

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `tenure_start_date` field not in politicians table | MEDIUM | Check Camara/Senado API; may need to derive from candidacies.election_year |
| Photo URLs expire or return 404 | HIGH | Client-side `onError` fallback + consider proxying via Cloudflare Images future |
| Cursor pagination edge case when scores tie | MEDIUM | Composite cursor (score, id) handles ties deterministically |
| ISR stale data on first load | LOW | 1-hour revalidation; data freshness badge (RF-014) sets expectations |
| LCP regression from unoptimized images | HIGH | Use Next.js `<Image>` with `sizes`, `priority` on above-fold cards |

### Domain Rules Checklist

- [x] DR-002: No sorting by party, state, or role — only by score (neutral)
- [x] DR-003: All displayed data sourced from government APIs
- [x] DR-006: No negative labels ("worst politicians") — listing simply shows score values
- [x] DR-001: `exclusion_flag` is NOT displayed on the card — only visible on profile page (RF-007)
- [x] DR-005: No CPF anywhere near this feature

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Base Listing | API endpoint + Next.js listing page with cards and cursor pagination | complete | - | - | `.claude/PRPs/plans/completed/rf-001-politician-catalog-listing.plan.md` |
| 2 | Role Filter (RF-002) | Add `role` filter to API + UI dropdown | pending | with 3 | 1 | - |
| 3 | State Filter (RF-003) | Add `state` filter to API + UI dropdown | pending | with 2 | 1 | - |
| 4 | Name Search (RF-015) | Add `search` param to API + search input (tsvector) | pending | - | 2, 3 | - |

### Phase Details

**Phase 1: Base Listing**
- **Goal:** Users can browse all active politicians sorted by score with pagination
- **Scope:**
  - `packages/shared/`: `PoliticianCard` type, `ListPoliticiansResponse` type
  - `apps/api/`: `GET /api/politicians` route with Zod validation + Drizzle query
  - `apps/web/`: `/app/politicos/page.tsx` Server Component + `PoliticianCard` component + `PaginationControls` component
  - Playwright E2E: listing loads, card displays 6 fields, next page works
- **Success signal:** `pnpm test` passes, Lighthouse LCP < 2s on localhost, cards display all 6 fields

**Phase 2: Role Filter (RF-002)**
- **Goal:** Users can filter listing to deputados or senadores only
- **Scope:**
  - `apps/api/`: add `role` query param to existing endpoint
  - `apps/web/`: `RoleFilterDropdown` component, URL state management via `searchParams`
  - Vitest: filter correctly scopes query; E2E: filter applies and URL updates
- **Success signal:** Selecting "Senador" returns max 81 results, URL reflects `?role=senador`

**Phase 3: State Filter (RF-003)**
- **Goal:** Users can filter by Brazilian state (UF), combinable with role filter
- **Scope:**
  - `apps/api/`: add `state` query param to existing endpoint
  - `apps/web/`: `StateFilterDropdown` with all 27 UFs + "Todos", empty state message
  - E2E: combined role + state filter narrows results correctly
- **Success signal:** Empty state shown when no results; URL reflects combined filters

**Phase 4: Name Search (RF-015)**
- **Goal:** Users can search politicians by name using full-text search
- **Scope:**
  - `apps/api/`: add `search` query param, tsvector FTS query via Drizzle
  - `apps/web/`: `SearchInput` component, debounced 300ms, min 2 chars
  - Performance: search response < 200ms at p95
- **Success signal:** "Jose" matches "José", diacritics handled, response < 200ms

### Parallelism Notes

Phases 2 and 3 can be implemented in parallel in separate git worktrees — they touch the same API endpoint (adding different query params) but different UI components. They must both complete before Phase 4, which depends on the full filter+search parameter surface being stable.

---

## Compliance Notes

| Requirement | Status |
|-------------|--------|
| LGPD Art. 7 IX | No personal data displayed on listing (no CPF, no exclusion details) |
| LAI | All data from public government sources |
| WCAG 2.1 AA | Cards require keyboard navigation, `alt` on images, 4.5:1 contrast |
| Marco Civil | No user data collected — no auth, no tracking cookies |

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Pagination style | Cursor-based | Offset, infinite scroll | SEO indexability of page 2+; cache-deterministic; PRD AC #4 |
| Rendering | ISR (1h revalidate) | SSR per request, CSR | LCP < 2s requirement; daily data refresh cadence makes 1h TTL acceptable |
| Data access | Fastify API → public_data | Next.js direct DB | Import boundary rule: web cannot import db schemas (CLAUDE.md) |
| Image handling | Next.js `<Image>` + onError fallback | `<img>` only, Cloudflare Images | Performance (auto-sizing), built-in lazy load, future optimization path |
| Sort default | overall_score DESC | Alphabetical, by state | Reinforces positive platform framing; users arrive expecting "best first" |

---

## Research Summary

**Domain Context**
- 594 politicians total (513 deputados + 81 senadores) — small dataset; full listing is fast
- Data from Camara API and Senado API populates the listing; ingestion runs daily at 02:00-02:15 UTC
- Composite cursor `(overall_score, id)` required because multiple politicians may share identical scores

**Technical Context**
- All required indexes pre-planned in ER.md (`idx_scores_overall`, `idx_politicians_active`, `idx_politicians_role`, `idx_politicians_state`)
- `tenure_start_date` field is an open question — not explicitly in `politicians` table in ER.md; may need to be added or derived from `candidacies`
- No existing frontend code — greenfield implementation

---

*Generated: 2026-02-28*
*Status: DRAFT — open questions need resolution before Phase 1 implementation*
