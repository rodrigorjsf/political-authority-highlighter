---
name: project-guardian
description: Guardian skill that enforces PRD compliance during development. Use when implementing any feature, creating endpoints, or modifying UI.
---

# Project Guardian — PRD Compliance Enforcement

## Purpose

This skill ensures all development work aligns with the PRD (v1.1) for **Political Authority Highlighter**. It prevents scope creep, enforces domain rules, and maintains architectural integrity.

## When to Trigger

- Before implementing ANY new feature or endpoint
- Before modifying the database schema
- Before adding new UI components or pages
- Before adding infrastructure components
- Before modifying the scoring algorithm

## Feature Validation Checklist

### 1. Is this feature in the MVP scope?

Valid MVP features (RF-001 through RF-017):

- RF-001: Politician Catalog Listing (cards with photo, party, tenure, score)
- RF-002: Filter by Political Role (deputado, senador, etc.)
- RF-003: Filter by State (UF)
- RF-004: Integrity Score Calculation (0-100, composite)
- RF-005: Score Methodology Transparency Page
- RF-006: Anti-Corruption Exclusion Filter (silent, binary)
- RF-007: Detailed Politician Profile - Overview
- RF-008: Profile Section - Legislative Projects and Bills
- RF-009: Profile Section - Voting Record
- RF-010: Profile Section - Proposals
- RF-011: Profile Section - Agenda and Activities
- RF-012: Profile Section - Public Expenses
- RF-013: Data Ingestion Pipeline
- RF-014: Data Freshness Indicator
- RF-015: Search Politician by Name
- RF-016: Responsive Mobile Web Layout
- RF-017: SEO and Social Sharing Metadata

**REJECT** if the feature is in the out-of-scope list:

- Comparison between politicians
- Alerts and notifications
- Public API for third parties
- Comments, reactions, or social interaction
- User registration/authentication
- Payment processing
- Native mobile apps
- Historical trend analysis
- Vereadores (municipal council members)
- News/social media integration
- Manual data entry or editorial content
- **Any feature that exposes corruption data**

### 2. Domain Rules Compliance

For every code change, verify against ALL domain rules:

| Rule | Check |
|------|-------|
| DR-001: SilentExclusionInvariant | Does this change expose any corruption data in API responses, UI, logs, or error messages? |
| DR-002: PoliticalNeutralityInvariant | Does this change treat all parties/states/roles uniformly? No party colors in UI? |
| DR-003: PublicDataOnlyRule | Does every data point have a `source_id` from whitelisted government APIs? |
| DR-004: DataAvailabilityScoreCorrelation | Does the score formula include the data coverage multiplier? |
| DR-005: CPFNonExposureRule | Is CPF absent from API responses, frontend code, URL params, and accessible logs? |
| DR-006: NoRetaliationDesignRule | Does this create any "worst politicians" list, lowest-score sort, or negative ranking? |
| DR-007: IngestionIdempotencyRule | Are database writes idempotent (upserts)? Are transactions used? |
| DR-008: FrontendSecurityFirstInvariant | Does this change introduce any data exposure, injection, or trust boundary violation in the frontend? |

### 3. Critical Constraints

| Constraint | Verification |
|-----------|-------------|
| CC-001: Political Neutrality | Score methodology identical across all parties. No editorializing. |
| CC-002: Corruption Never Exposed | No endpoint, page, or log reveals exclusion reasons. |
| CC-003: No Retaliation | No feature enables creating hit lists or targeting politicians. |
| CC-004: Public Data Only | All data traceable to official government source with URL. |
| CC-005: CPF Confidential | CPF encrypted at rest, never in public interface. |
| CC-006: Budget Ceiling | Infrastructure change keeps total under $100/month. |

### 4. Endpoint Security Check

For any new API endpoint:

- [ ] Does it only query the `public_data` schema?
- [ ] Does it use the `api_reader` database role?
- [ ] Does it have a TypeBox response schema (no field leakage)?
- [ ] Does it set appropriate Cache-Control headers?
- [ ] Does it have rate limiting applied?
- [ ] Does it NEVER return CPF, exclusion records, or corruption indicators?

### 5. UI Neutrality Check

For any UI change:

- [ ] Uses neutral color palette (no party colors)?
- [ ] Presents data factually without qualitative judgment?
- [ ] Default sort is by highest score (never by lowest)?
- [ ] No "worst" or "bottom" ranking visible?
- [ ] Mobile responsive (320px minimum)?
- [ ] Accessibility: semantic HTML, aria labels, WCAG 2.1 AA?

### 6. Budget Impact Assessment

For infrastructure changes:

- [ ] Current monthly cost: calculate
- [ ] New monthly cost: calculate
- [ ] Total stays under $100/month?
- [ ] Is there a cheaper alternative?

### 7. Frontend Security Check

For any frontend change, verify DR-008 compliance:

- [ ] Content-Security-Policy header defined in `next.config.ts`? (RNF-SEC-011)
- [ ] No `@pah/db`, `pg`, or `drizzle-orm` imports in `apps/web/` code? (RNF-SEC-012)
- [ ] No `NEXT_PUBLIC_` variables except `NEXT_PUBLIC_API_URL`? (RNF-SEC-012)
- [ ] All API response text rendered via JSX auto-escaping (no innerHTML)? (RNF-SEC-013)
- [ ] `dangerouslySetInnerHTML` only in JSON-LD `<script>` tags with `JSON.stringify()`? (RNF-SEC-013)
- [ ] Error boundaries show generic user messages only (no stack traces, no table names)? (RNF-SEC-014)
- [ ] No external scripts without `integrity` and `crossorigin` attributes? (RNF-SEC-016)
- [ ] `import 'server-only'` present in all `packages/db/src/` files? (RNF-SEC-012)

## Violation Response

If any check fails:

1. STOP implementation
2. Document the violation
3. Propose a compliant alternative
4. Get explicit approval before proceeding

## Changelog

| Date | PRD Version | Summary |
|------|-------------|---------|
| 2026-02-28 | 1.0 | Initial guardian skill |
| 2026-03-07 | 1.1 | Add Frontend Security Check (section 7) for DR-008 enforcement |
