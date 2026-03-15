---
name: project-domain-rules
description: Domain rule enforcement for Political Authority Highlighter. Use when writing business logic, scoring algorithms, data ingestion, or API endpoints.
---

# Domain Rules Enforcement

## Purpose

Enforces the 8 domain rules (DR-001 through DR-008) that define the core business invariants of the platform. These rules are NON-NEGOTIABLE.

---

## DR-001: SilentExclusionInvariant

**Rule:** Politicians with active exclusion records remain visible in all public-facing queries. Their anticorruption score component is zeroed (0/25), and a generic notice indicates that anti-corruption data affected the score. The platform NEVER exposes exclusion record details (source name, date, record type, reason) — only the boolean `exclusion_flag` crosses the schema boundary.

**How it works in the codebase:**

1. `exclusion_flag` boolean on `public.politicians` and `public.integrity_scores` — set by pipeline
2. API listing endpoint (`/politicians`) omits `exclusion_flag` from response (not a filter)
3. API profile endpoint (`/politicians/:slug`) includes `exclusion_flag` as boolean
4. Frontend `ExclusionNotice` component renders a generic message when `exclusionFlag === true`
5. Methodology page explains the binary scoring: 25 if clean, 0 if any record exists

### Code Review Checklist

- [ ] No API endpoint returns `exclusion_records`, `corruption_indicator`, or exclusion details
- [ ] No API error message mentions exclusion reasons (e.g., "politician excluded due to...")
- [ ] No UI element shows exclusion source names, dates, record types, or counts
- [ ] No log at INFO level or below contains exclusion reasons (DEBUG only, in pipeline)
- [ ] Public queries do NOT filter out excluded politicians — they remain visible with lowered scores
- [ ] The `internal_data` schema is not imported in any `apps/api/` file
- [ ] `exclusion_flag` is omitted from listing response schema, included only in profile response
- [ ] Frontend exclusion notice uses only the generic message (no record details)

### Anti-patterns to REJECT

```typescript
// BAD: Leaks exclusion details
return { politician, isExcluded: true, reason: "CEIS sanction" }

// BAD: Implies politician is removed
return { error: "This politician has been excluded from the platform" }

// BAD: Count reveals exclusion numbers
return { total: 513, excluded: 47, visible: 466 }

// BAD: Filters excluded politicians from public queries
.where(eq(politicians.exclusionFlag, false))

// BAD: Shows exclusion source in UI
<p>Excluído por registro no CEIS em 2024-01-15</p>

// GOOD: Generic notice without details
<ExclusionNotice /> // "Informações de bases públicas de anticorrupção influenciaram este componente"
```

---

## DR-002: PoliticalNeutralityInvariant

**Rule:** The platform must NEVER exhibit political bias. Score methodology is identical across all parties, roles, and states. No editorializing.

> For the **UI implementation** of color neutrality, **REQUIRED SUB-SKILL:** `web-frontend-design`
> (section 1 — Design Token Enforcement defines the approved neutral palette and explicitly forbids
> party-associated colors).

### Code Review Checklist

- [ ] Score algorithm has NO party-specific logic (no `if party === 'PT'`)
- [ ] Score weights are the same for all politicians regardless of party/state/role
- [ ] UI uses neutral colors (no red/blue party associations) → see `web-frontend-design` token palette
- [ ] Vote descriptions are factual (no "voted against the people" editorializing)
- [ ] No hardcoded party names in scoring or display logic
- [ ] Default sort is by score descending (not by party or ideology)
- [ ] No "recommended" or "featured" politician sections

### Anti-patterns to REJECT

```typescript
// BAD: Party-specific scoring
if (politician.party === 'PSOL') score += 10

// BAD: Editorializing votes
{ description: "Voted against workers' rights" }

// BAD: Party color in UI
<Badge color={getPartyColor(politician.party)}>

// BAD: Ideology-based grouping
<Tab label="Left Wing" /> <Tab label="Right Wing" />
```

---

## DR-003: PublicDataOnlyRule

**Rule:** Every data point displayed and every score input must originate from a publicly available, verifiable government source.

### Code Review Checklist

- [ ] Every database record has a `source_url` or `source_id` field
- [ ] Ingestion pipeline only fetches from whitelisted URLs
- [ ] No manual data entry forms for politician records
- [ ] No news articles, social media, or blog references as data sources
- [ ] Score inputs are traceable to specific API endpoints or CSV datasets

### Whitelisted Sources

| Source | Domain |
|--------|--------|
| Camara dos Deputados | `dadosabertos.camara.leg.br` |
| Senado Federal | `legis.senado.leg.br` |
| Portal da Transparencia | `api.portaldatransparencia.gov.br` |
| TSE | `dadosabertos.tse.jus.br`, `cdn.tse.jus.br` |
| TCU | `dados-abertos.apps.tcu.gov.br`, `contas.tcu.gov.br` |
| CGU | `dadosabertos-download.cgu.gov.br` |

---

## DR-004: DataAvailabilityScoreCorrelation

**Rule:** A politician's maximum achievable score is proportional to available public data. Less data = lower ceiling. Zero data = score of 0.

### Code Review Checklist

- [ ] Score formula includes `data_coverage_ratio` multiplier
- [ ] `data_coverage_ratio = data_points_found / data_points_expected_for_role`
- [ ] A politician with no data gets score = 0 (not null, not "N/A")
- [ ] Expected data points are defined per role type
- [ ] Coverage ratio is stored and displayed for transparency

### Formula Verification

```
final_score = raw_dimensional_score * data_coverage_ratio

Where:
  raw_dimensional_score = weighted sum of (legislative + participation + expense_transparency + proposal_advancement)
  data_coverage_ratio = found_data_points / expected_data_points_for_role
  0.0 <= data_coverage_ratio <= 1.0
```

---

## DR-005: CPFNonExposureRule

**Rule:** CPF numbers must NEVER appear in any public-facing interface, API response, URL, or accessible log.

### Code Review Checklist

- [ ] No CPF in API response bodies (check TypeBox response schemas)
- [ ] No CPF in URL query parameters or path segments
- [ ] No CPF in frontend source code or environment variables
- [ ] No CPF in log messages at any level accessible to non-admins
- [ ] CPF stored encrypted (AES-256-GCM) in `internal_data.politician_identifiers`
- [ ] CPF matching uses SHA-256 hash, never decrypted value
- [ ] Encryption key is an environment variable, never in code

### Detection Patterns

Search for these patterns and REJECT if found in public-facing code:

```
/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/  # CPF format
/cpf/i                            # CPF variable names (in API/frontend)
/politician_identifiers/          # Internal table reference in API
```

---

## DR-006: NoRetaliationDesignRule

**Rule:** The platform must not enable retaliation or persecution. It highlights positives; it does not expose negatives.

### Code Review Checklist

- [ ] No "worst politicians" or "bottom scores" feature
- [ ] No ascending sort by score (lowest first) in any endpoint or UI
- [ ] No "corruption details" page or section
- [ ] No comparison features that could rank parties negatively
- [ ] Score floor is 0 (never negative)
- [ ] Platform messaging emphasizes "highlighting integrity" not "exposing corruption"

### Anti-patterns to REJECT

```typescript
// BAD: Reverse sorting enables hit lists
orderBy: asc(integrityScores.overallScore)

// BAD: Negative framing
<h2>Politicians with Lowest Scores</h2>

// BAD: Comparison enables attacks
<ComparisonTable politician1={a} politician2={b} />
```

---

## DR-007: IngestionIdempotencyRule

**Rule:** Running the same ingestion job twice with the same data produces the same database state. Partial failures must not corrupt existing data.

### Code Review Checklist

- [ ] All inserts use `ON CONFLICT DO UPDATE` (upsert) with natural keys
- [ ] Ingestion wrapped in database transactions
- [ ] Failed jobs roll back entirely (no partial state)
- [ ] Existing data preserved on ingestion failure
- [ ] Natural keys defined per entity (source + external_id)

### Pattern

```typescript
// GOOD: Idempotent upsert
await db.insert(politicians)
  .values(data)
  .onConflictDoUpdate({
    target: politicians.externalId,
    set: { ...updatedFields, updatedAt: sql`now()` }
  })

// BAD: Non-idempotent insert
await db.insert(politicians).values(data) // Fails on duplicate, or creates duplicates
```

---

## DR-008: FrontendSecurityFirstInvariant

**Rule:** The frontend layer must never be a vector for data exposure, injection, or trust boundary violation.

### Code Review Checklist

- [ ] No `@pah/db`, `pg`, `drizzle-orm`, `pg-boss` imports in any `apps/web/` file
- [ ] No `NEXT_PUBLIC_` environment variables except `NEXT_PUBLIC_API_URL`
- [ ] CSP header defined in `next.config.ts` via `headers()` function
- [ ] `import 'server-only'` present in `packages/db/src/public-schema.ts`, `internal-schema.ts`, `clients.ts`, `migrate.ts`
- [ ] All government-sourced text rendered via JSX auto-escaping (never innerHTML)
- [ ] `dangerouslySetInnerHTML` used ONLY for JSON-LD `<script type="application/ld+json">` with `JSON.stringify()` data
- [ ] Error boundaries (`error.tsx`) show generic messages -- no stack traces, no DB table names, no internal URLs
- [ ] No external `<script>` tags without `integrity` and `crossorigin` attributes
- [ ] API error responses from `api-client.ts` do not expose raw error body to users

### Anti-patterns to REJECT

```typescript
// BAD: Importing database module in frontend
import { politicians } from '@pah/db/public-schema'

// BAD: Exposing secrets via NEXT_PUBLIC_
NEXT_PUBLIC_DATABASE_URL=postgres://...

// BAD: Rendering unsanitized HTML from API
<div dangerouslySetInnerHTML={{ __html: bill.summary }} />

// BAD: Leaking error details to users
catch (error) { return <p>{error.message}: {error.stack}</p> }

// BAD: External script without SRI
<script src="https://cdn.example.com/analytics.js" />
```

---

## Changelog

| Date | PRD Version | Summary |
|------|-------------|---------|
| 2026-02-28 | 1.0 | Initial domain rules enforcement skill |
| 2026-03-07 | 1.1 | Add DR-008 FrontendSecurityFirstInvariant |
| 2026-03-09 | 1.2 | Schema rename public_data→public |
| 2026-03-15 | 1.2 | Fix DR-001: politicians stay visible with zeroed anticorruption score, not removed from queries |
