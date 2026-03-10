# Product Requirements Document — Political Authority Highlighter

> **Version:** 1.2 | **Status:** Active | **Last Updated:** 2026-03-09
> **Stack reference:** [ARCHITECTURE.md](./ARCHITECTURE.md)
> **ER model:** [ER.md](./ER.md)

---

## 1. Product Overview

### 1.1 Vision & Problem Statement

**Vision:** Visibility for politicians who serve with integrity — highlighting those who truly work for Brazilian society.

**Problem:** Brazilian citizens lack easy access to consolidated, unbiased data about which politicians are actually doing their job well. Existing government portals are fragmented across multiple agencies (Camara, Senado, TSE, CGU, TCU, Portal da Transparencia), each with different interfaces, data formats, and levels of usability. No single platform cross-references these sources to produce a unified, actionable integrity assessment. Citizens who want to make informed voting decisions must manually navigate 6+ government websites, interpret raw legislative data, and have no way to assess anti-corruption records without specialized legal knowledge.

### 1.2 Target Users & Personas

| Persona | Description | Primary Need |
|---------|-------------|--------------|
| Engaged Citizen | Brazilian voter (18-45), digitally literate, uses social media for news | Quick integrity assessment of their representatives before elections |
| Journalist | Investigative reporter covering politics | Consolidated data source for fact-checking and story leads |
| Civic Educator | Teacher, NGO worker, or political science student | Structured data for educational content about political accountability |
| Casual Browser | Citizen arriving via social media share or search engine | Understand a specific politician's track record in under 60 seconds |

**Market:** B2C — Brazilian citizens (estimated addressable market: 150M+ eligible voters).

### 1.3 Unique Value Proposition

| Differentiator | Political Authority Highlighter | Government Portals | Politize | Atlas Politico |
|---------------|-------------------------------|-------------------|----------|----------------|
| Unified cross-source data | 6 sources consolidated | Single source per portal | Editorial content | Polling data |
| Integrity score | Composite 0-100, documented methodology | None | None | None |
| Anti-corruption cross-reference | Silent binary exclusion from CEIS/CNEP/CEAF/CEPIM/TCU/CGU | Separate portals per agency | None | None |
| Political neutrality | Algorithmic, uniform scoring (DR-002) | N/A | Editorial bias possible | Polling bias possible |
| Positive framing | Highlights integrity, does not expose negatives (DR-006) | Raw data, no framing | Mixed | Neutral |

### 1.4 Business Model & Monetization

**Model:** Freemium

- **Free tier (MVP):** Full access to all politician profiles, scores, and legislative data.
- **Future premium considerations (post-MVP):** API access for researchers, advanced analytics, bulk data exports, ad-free experience.
- **Revenue timeline:** No monetization in MVP. Focus on user acquisition and data quality. Monetization strategy to be defined after reaching 100k MAU.

### 1.5 Success Metrics (KPIs)

| Metric | Target (Launch) | Target (12 months) | Measurement Method |
|--------|----------------|--------------------|--------------------|
| Monthly Active Users (MAU) | 1k-50k | 50k-500k | Vercel Analytics / Cloudflare Analytics |
| Politicians Cataloged with Score | 594 (513 deputados + 81 senadores) | 594 + historical data | Database query on `politicians` table |
| User Engagement (pages/session) | >= 3 | >= 5 | Vercel Analytics |
| Data Freshness | Daily sync for Camara/Senado | Daily sync for all REST sources | `data_source_status` table monitoring |
| SEO Organic Traffic Share | >= 40% | >= 60% | Search Console |
| Core Web Vitals (LCP) | < 2.0s | < 1.5s | Lighthouse CI |
| API Availability | 99.5% uptime | 99.5% uptime | UptimeRobot |

---

## 2. Functional Requirements

### 2.1 Core Features — MVP

| ID | Title | Description | Acceptance Criteria |
|----|-------|-------------|---------------------|
| RF-001 | Politician Catalog Listing | Display politician cards with photo, name, party, state, tenure start date, and integrity score in a grid/list layout | 1. Each card displays photo (fallback placeholder if unavailable), full name, party abbreviation, state (UF), tenure start date, and score (0-100). 2. Cards are sorted by score descending by default. 3. Page loads with LCP < 2s. 4. Listing supports cursor-based pagination (20 items per page). |
| RF-002 | Filter by Political Role | Allow users to filter the catalog by political role (deputado federal, senador) | 1. Dropdown or toggle with options: "Todos", "Deputado Federal", "Senador". 2. Filter applies immediately and updates the listing. 3. URL reflects filter state for shareability. 4. Filter persists across pagination. |
| RF-003 | Filter by State (UF) | Allow users to filter politicians by Brazilian state | 1. Dropdown with all 27 UFs (26 states + DF) plus "Todos". 2. Combinable with role filter (RF-002). 3. URL reflects filter state. 4. Empty state message when no results match. |
| RF-004 | Integrity Score Calculation | Compute a composite integrity score (0-100) for each politician based on 4 weighted dimensions | 1. Score = transparency (0-25) + legislative activity (0-25) + expense transparency (0-25) + anti-corruption (0-25). 2. Weights are uniform (0.25 each) per DR-002. 3. Score recalculated after each ingestion cycle. 4. Score version tracked via `methodology_version`. 5. Anti-corruption component is binary: 25 (no exclusion records) or 0 (any exclusion record exists). |
| RF-005 | Score Methodology Transparency Page | Dedicated page explaining how scores are calculated | 1. Page accessible at `/metodologia`. 2. Documents all 4 score components with formulas. 3. Lists all 6 data sources with official links. 4. Explains the anti-corruption component without revealing specifics (per DR-001). 5. Displays current `methodology_version`. 6. Page is SSG with 7-day cache. |
| RF-006 | Anti-Corruption Exclusion Filter | Silently incorporate anti-corruption data into scores without exposing details | 1. If ANY exclusion record exists for a politician, anti-corruption score component = 0. 2. Only a boolean `exclusion_flag` crosses from internal to public schema. 3. No exclusion record details, source names, or dates are ever exposed in API responses or UI. 4. Frontend displays generic message: "Information from anti-corruption databases affected this score." 5. No API endpoint or parameter can retrieve exclusion details. |
| RF-007 | Detailed Politician Profile — Overview | Profile page with summary, current score breakdown, and navigation to detail sections | 1. Page at `/politicos/{slug}`. 2. Displays: photo, name, party, state, role, tenure start, bio summary. 3. Shows overall score with visual breakdown of 4 components. 4. Shows data freshness indicator (RF-014). 5. Navigation tabs/links to bills, votes, expenses, proposals, agenda sections. 6. SSG/ISR with 1-hour revalidation. |
| RF-008 | Profile Section — Legislative Projects and Bills | List of bills authored or co-authored by the politician | 1. Paginated list (20 per page) sorted by date descending. 2. Each entry shows: title, bill type, number, year, status, date introduced. 3. Link to official source URL for each bill. 4. Empty state when no bills are available. |
| RF-009 | Profile Section — Voting Record | Voting history for the politician | 1. Paginated list (20 per page) sorted by session date descending. 2. Each entry shows: session date, matter description, vote cast (sim/nao/abstencao/ausente), session result. 3. Vote participation rate displayed as summary statistic. 4. Link to source URL when available. |
| RF-010 | Profile Section — Proposals | Proposals submitted by the politician | 1. Paginated list (20 per page) sorted by date descending. 2. Each entry shows: type, number, date, summary, status. 3. Link to official source URL. |
| RF-011 | Profile Section — Agenda and Activities | Committee memberships and activities | 1. List of current and past committee memberships. 2. Each entry shows: committee name, role, start date, end date. 3. Sorted by start date descending (current memberships first). |
| RF-012 | Profile Section — Public Expenses | Parliamentary expenses (CEAP/CEAPS) | 1. Grouped by year and month. 2. Each entry shows: category, supplier, amount (BRL), document number. 3. Summary totals per year. 4. Link to source URL for each expense. 5. Amount formatted as Brazilian Real (R$ X.XXX,XX). |
| RF-013 | Data Ingestion Pipeline | Automated pipeline ingesting data from 6 government sources on schedule | 1. Camara API: daily at 02:00 UTC. 2. Senado API: daily at 02:15 UTC. 3. Portal da Transparencia: daily at 02:30 UTC. 4. TSE: weekly on Sunday 03:00 UTC. 5. TCU CADIRREG: weekly on Wednesday 03:00 UTC. 6. CGU-PAD: monthly on 1st at 04:00 UTC. 7. Each adapter handles source-specific pagination, rate limiting, and format parsing. 8. Retry policy: 3 attempts with exponential backoff (1m, 5m, 15m). 9. Raw data stored in `internal_data.raw_source_data`. 10. All operations are idempotent (DR-007). |
| RF-014 | Data Freshness Indicator | Display when data was last updated for each source | 1. Badge or timestamp on politician profiles showing last sync time. 2. Dedicated `/fontes` page showing status of all 6 sources. 3. Each source shows: last successful run, records processed, status (success/partial/failed). 4. Data read from `data_source_status` table. |
| RF-015 | Search Politician by Name | Full-text search for politicians by name | 1. Search input field on the listing page. 2. Uses PostgreSQL `tsvector` full-text search. 3. Response time < 200ms. 4. Handles diacritics (e.g., "Jose" matches "Jose"). 5. Minimum 2 characters to trigger search. 6. Results ranked by relevance. |
| RF-016 | Responsive Mobile Web Layout | Mobile-first responsive design | 1. All pages render correctly on viewports 320px-2560px. 2. No horizontal scrolling on mobile. 3. Touch-friendly filter controls (minimum 44px tap targets). 4. Politician cards stack vertically on mobile, grid on desktop. 5. No native mobile app (responsive web only). |
| RF-017 | SEO and Social Sharing Metadata | OpenGraph, Twitter Card, and JSON-LD structured data | 1. Every politician profile page has unique `og:title`, `og:description`, `og:image`. 2. JSON-LD `Person` schema for politician pages. 3. Canonical URLs on all pages. 4. Dynamic sitemap.xml listing all politician profile URLs. 5. robots.txt allowing full crawling. |

### 2.2 Post-MVP Features

| ID | Title | Phase | Description |
|----|-------|-------|-------------|
| RF-POST-001 | Politician Comparison | Post-MVP | Side-by-side comparison of 2-3 politicians' scores and activity |
| RF-POST-002 | Alert Subscriptions | Post-MVP | Email or push notifications when a politician's score changes significantly |
| RF-POST-003 | Public API | Post-MVP | Documented REST API for researchers and civic tech developers |
| RF-POST-004 | Comments / Social Features | Post-MVP | User-generated comments or reactions on politician profiles |

### 2.3 Primary User Journeys

**Journey 1: Discover and Assess a Politician (Search Flow)**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | User arrives via Google search for "deputado [name] integridade" | SSG/ISR page loads in < 2s with full politician profile |
| 2 | User views integrity score breakdown | Score displayed with 4 components, methodology link available |
| 3 | User clicks "Projetos de Lei" tab | Paginated list of authored bills loads |
| 4 | User clicks "Despesas" tab | Expense breakdown by year/month loads |
| 5 | User shares profile URL on social media | OpenGraph metadata generates rich preview card |

**Journey 2: Browse and Filter Politicians (Discovery Flow)**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | User navigates to politician listing page | Grid of politician cards loads with default sort by score |
| 2 | User selects "Senador" from role filter | Listing updates to show only senators (81 maximum) |
| 3 | User selects "SP" from state filter | Listing narrows to senators from Sao Paulo |
| 4 | User types a name in the search field | Full-text search returns matching politicians in < 200ms |
| 5 | User clicks a politician card | Navigates to detailed profile page |

**Journey 3: Understand the Methodology (Trust Flow)**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | User sees a score and wonders how it is calculated | "How is this score calculated?" link visible near score display |
| 2 | User clicks methodology link | Methodology page loads with full formula documentation |
| 3 | User checks data sources section | All 6 sources listed with official government links |
| 4 | User checks data freshness on `/fontes` | All sources show last sync time and status |

### 2.4 Explicitly Out of Scope

| Item | Rationale |
|------|-----------|
| Politician Comparison | Adds UI complexity; defer to post-MVP after validating core usage patterns |
| Alert Subscriptions | Requires user accounts and notification infrastructure; incompatible with MVP's no-auth model |
| Public API | API exists internally but public documentation, rate limiting tiers, and API keys are deferred |
| Comments / Social Features | Requires user authentication, moderation, and abuse prevention; high operational burden for MVP |

---

## 3. Non-Functional Requirements

### 3.1 Performance & Scalability

| ID | Requirement | Target | Enforcement |
|----|-------------|--------|-------------|
| RNF-PERF-001 | Largest Contentful Paint (LCP) | < 2.0s on 4G connection | Lighthouse CI in GitHub Actions; SSG/ISR + Cloudflare CDN |
| RNF-PERF-002 | First Contentful Paint (FCP) | < 1.5s | Server Components (zero client JS for data display) |
| RNF-PERF-003 | Cumulative Layout Shift (CLS) | < 0.1 | Fixed-dimension image placeholders |
| RNF-PERF-004 | API response time (p95) | < 300ms | Pre-computed data + PostgreSQL indexed queries + CDN cache |
| RNF-PERF-005 | API response time (p50) | < 100ms | Connection pooling + in-memory LRU for hot profiles |
| RNF-PERF-006 | Search response time | < 200ms | PostgreSQL GIN index on `tsvector` column |
| RNF-PERF-007 | Time to First Byte (TTFB) | < 500ms | Vercel edge + stale-while-revalidate |
| RNF-SCALE-001 | Launch capacity | 50k MAU / 500 concurrent | Supabase Free + Vercel Free + Cloudflare CDN |
| RNF-SCALE-002 | 12-month capacity | 500k MAU / 5000 concurrent | Supabase Pro + Vercel Pro + Supavisor pooling |

### 3.2 Security

| ID | Requirement | Implementation |
|----|-------------|----------------|
| RNF-SEC-001 | HTTPS everywhere | Cloudflare TLS 1.3 termination, Full (Strict) mode to origin |
| RNF-SEC-002 | CPF encryption at rest | AES-256-GCM in application layer, key in environment secret (ADR-007) |
| RNF-SEC-003 | CPF hash for matching | SHA-256 hash for cross-source matching without decryption |
| RNF-SEC-004 | Exclusion data isolation | PostgreSQL schema RBAC: `api_reader` role (Supabase) has zero access to `internal_data` schema (ADR-001) |
| RNF-SEC-005 | API rate limiting | `@fastify/rate-limit`: 100 req/min per IP |
| RNF-SEC-006 | Input validation | Zod schemas on all API query parameters |
| RNF-SEC-007 | SQL injection prevention | Drizzle ORM parameterized queries; no raw SQL in API layer |
| RNF-SEC-008 | Security headers | Helmet.js: CSP, X-Frame-Options, X-Content-Type-Options |
| RNF-SEC-009 | CORS restriction | Restricted to `autoridade-politica.com.br` and `localhost` |
| RNF-SEC-010 | Dependency auditing | `npm audit` in CI, Dependabot enabled |
| RNF-SEC-011 | Content-Security-Policy on frontend | Static CSP via `next.config.ts` `headers()`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self'; connect-src 'self' {NEXT_PUBLIC_API_URL}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`. Deploy with `Content-Security-Policy-Report-Only` first, enforce after validation. Nonces NOT used (incompatible with ISR per ADR-002). |
| RNF-SEC-012 | Client bundle sensitive data prevention | `import 'server-only'` in all `packages/db/src/` files. ESLint `no-restricted-imports` forbidding `@pah/db`, `pg`, `drizzle-orm` in `apps/web/`. CI post-build grep on `.next/static/chunks/` for forbidden patterns (`drizzle-orm`, `DATABASE_URL`, `CPF_ENCRYPTION_KEY`). Only `NEXT_PUBLIC_API_URL` may use `NEXT_PUBLIC_` prefix. |
| RNF-SEC-013 | API response rendering safety | All government-sourced text fields rendered via React JSX auto-escaping only. No `innerHTML` or `dangerouslySetInnerHTML` except JSON-LD `<script>` tags with `JSON.stringify()` sanitized data. Pipeline transformers strip HTML tags from government source text before storing in `public`. |
| RNF-SEC-014 | Error message sanitization | No server stack traces, database table names, internal URLs, or SQL query text in any user-facing error response. API returns RFC 7807 ProblemDetail with generic messages. Frontend `error.tsx` boundary shows user-friendly message only. Error `digest` property used for server-side correlation without exposing internals. |
| RNF-SEC-015 | Future authentication token security | When authentication is implemented post-MVP: tokens stored in httpOnly Secure SameSite=Strict cookies only (never localStorage/sessionStorage). CSRF protection via double-submit cookie or Synchronizer Token pattern. JWT signed with RS256 minimum. Token rotation on privilege escalation. Session expiry <= 24 hours with sliding window. |
| RNF-SEC-016 | Subresource Integrity for external scripts | Any external script added to the frontend must include `integrity` and `crossorigin` attributes. No external scripts permitted without SRI hashes. MVP has zero external scripts (no analytics, no third-party widgets). |
| RNF-SEC-017 | Security testing in CI | `pnpm audit --audit-level=high` must pass. Post-build client bundle scan for forbidden patterns (server-only modules, secret variable names). Secret pattern regex scan on all staged files pre-commit. |

### 3.3 Availability & Reliability

| Aspect | Target | Strategy |
|--------|--------|----------|
| SLA | 99.5% uptime (~3.6 hours downtime/month) | Supabase managed platform, Vercel edge |
| RPO (Recovery Point Objective) | 24 hours | Supabase automatic daily backups (Free tier). PITR available on Pro tier if needed. |
| RTO (Recovery Time Objective) | 1 hour | Restore from daily backup via Supabase dashboard. Supplementary pg_dump via GitHub Actions for additional safety. |
| Data Reconstructability | Full | All source data is public and re-fetchable from government APIs |
| Failover | Managed | Supabase internal failover mechanisms |
| Monitoring | 5-minute checks | UptimeRobot free tier on `/health` endpoint; email/Telegram alerts |

### 3.4 Observability

| Aspect | Implementation | Detail |
|--------|---------------|--------|
| Structured Logging | Pino 9.x (JSON) | Fields: timestamp, level, requestId, method, path, statusCode, duration, userAgent |
| Pipeline Logging | Pino 9.x (JSON) | Fields: jobId, sourceName, recordsProcessed, errorsCount |
| Log Retention | 7 days on disk | logrotate; no external log service in MVP |
| Uptime Monitoring | UptimeRobot Free | 50 monitors, 5-minute interval checks |
| Frontend Analytics | Vercel built-in | Page views, Core Web Vitals |
| Database Monitoring | pg_stat_statements | Slow query detection |
| Pipeline Monitoring | pg-boss dead letter queue | Daily check for permanently failed jobs |
| Alerting | UptimeRobot | Email/Telegram on API downtime |

### 3.5 Compliance

#### 3.5.1 LGPD (Lei Geral de Protecao de Dados)

| LGPD Principle | Implementation |
|----------------|---------------|
| Legal Basis | Art. 7, IX — legitimate interest. Legitimate Interest Assessment (LIA) documented. Public officials' data processed under public interest basis. |
| Data Minimization | Public schema contains no personal identifiers (CPF, birth date). Only publicly available information from government sources. |
| Purpose Limitation | CPFs used solely for cross-source identity matching during batch ingestion. Never displayed, never transmitted via API. |
| Security Safeguards | CPF encrypted at rest (AES-256-GCM), schema-level isolation (ADR-001), role-based database access control. |
| Transparency | Methodology page documents all data sources, scoring logic, and data handling practices. |
| Data Subject Rights | Platform processes only public officials' publicly available government data. No end-user personal data collected (no authentication in MVP). |

#### 3.5.2 LAI (Lei de Acesso a Informacao)

All 6 data sources are publicly available government datasets published under Brazil's Freedom of Information Act. The platform acts as an aggregator and does not access any restricted or classified information.

#### 3.5.3 Marco Civil da Internet

| Requirement | Implementation |
|-------------|---------------|
| Data storage | No user data stored in MVP (no authentication). Server logs retained 7 days. |
| Content responsibility | Platform displays only government-sourced factual data; no user-generated content in MVP. |
| Privacy by design | No tracking cookies, no third-party analytics beyond Vercel built-in (anonymized). |

#### 3.5.4 Lei da Ficha Limpa (Complementary Law 135/2010)

The platform does not determine electoral eligibility. The anti-corruption exclusion filter (RF-006) uses the same public databases referenced by the Ficha Limpa law but does not make legal judgments. The silent exclusion approach (DR-001) ensures the platform does not publicly accuse any politician — it only reflects the absence or presence of records in official government databases through a reduced score component.

### 3.6 Accessibility

| ID | Requirement | Standard |
|----|-------------|----------|
| RNF-A11Y-001 | WCAG 2.1 Level AA compliance | All pages pass automated accessibility audit (axe-core) |
| RNF-A11Y-002 | Keyboard navigation | All interactive elements reachable and operable via keyboard |
| RNF-A11Y-003 | Screen reader compatibility | Semantic HTML, ARIA labels on dynamic content |
| RNF-A11Y-004 | Color contrast | Minimum 4.5:1 contrast ratio for text |
| RNF-A11Y-005 | Touch targets | Minimum 44x44px on mobile |

### 3.7 Cost

| ID | Constraint | Target |
|----|-----------|--------|
| RNF-COST-001 | Monthly infrastructure budget | < $100/month across all environments |
| RNF-COST-002 | MVP monthly cost | ~$1.50/month (Supabase Free $0 + Vercel Free $0 + domain ~$1.50) |
| RNF-COST-003 | 12-month projected cost | ~$47/month at 500k MAU (Supabase Pro $25 + Vercel Pro $20 + domain $1.50) |

---

## 4. Domain Model

### 4.1 Domain Rules

| ID | Name | Rule | Enforcement |
|----|------|------|-------------|
| DR-001 | SilentExclusionInvariant | Anti-corruption exclusion data (source, type, dates, details) MUST never be exposed through any public interface. Only a boolean `exclusion_flag` may cross from `internal_data` to `public` schema. | PostgreSQL RBAC: `api_reader` role has zero grants on `internal_data` schema. API layer has no import path to internal schema types. Code-level: ESLint import boundary rules. |
| DR-002 | PoliticalNeutralityInvariant | All scoring dimensions MUST use uniform weights (0.25 each). No manual adjustment, editorial override, or politician-specific weighting is permitted. The algorithm treats all politicians identically regardless of party, state, or role. | Score calculator enforces equal weights. No admin interface exists to modify weights. Weight values defined as constants, not configuration. |
| DR-003 | PublicDataOnlyRule | All data displayed on the platform MUST originate from verifiable government data sources. No crowd-sourced, editorial, or unverified data is permitted. | Every record in `public` schema has a `source_url` pointing to the official government source. Ingestion pipeline only accepts data from the 6 registered sources. |
| DR-004 | DataAvailabilityScoreCorrelation | A politician's maximum achievable score is proportional to the data available about them. Politicians with data from more sources can achieve higher transparency scores. Politicians with sparse data receive lower scores in the transparency component, not penalties in other components. | Transparency score component (0-25) calculated as: (sources with data / total possible sources) * 25. Other components use available data without penalizing missing sources. |
| DR-005 | CPFNonExposureRule | CPF numbers MUST never appear in any public-facing interface, API response, log file, error message, or URL. CPFs exist only in `internal_data.politician_identifiers` as encrypted bytes and SHA-256 hashes. | CPF stored as AES-256-GCM encrypted `bytea` and SHA-256 hash in `internal_data` schema only. Pipeline code handles CPF in memory only during ingestion. Structured logging configured to redact any 11-digit numeric patterns. |
| DR-006 | NoRetaliationDesignRule | The platform MUST highlight positive integrity indicators. It MUST NOT expose negative details that could enable targeted retaliation against specific politicians. A low score is permissible; exposing the specific reasons from anti-corruption databases is not. | Silent exclusion pattern (ADR-004): anti-corruption component is 0 or 25, with no details. UI displays only "Information from anti-corruption databases affected this score." No drill-down into exclusion records. |
| DR-007 | IngestionIdempotencyRule | Running the same ingestion job multiple times with the same source data MUST produce identical database state. No duplicate records, no score drift, no side effects. | Upsert operations keyed on `(source, external_id)`. Idempotency keys on `exclusion_records`. Score calculation is a pure function of current data state. `raw_source_data` deduplication via source + external_id. |
| DR-008 | FrontendSecurityFirstInvariant | The frontend layer must never be a vector for data exposure, injection, or trust boundary violation. All frontend code changes must satisfy: (1) no server-only modules in client bundles, (2) no sensitive data in `NEXT_PUBLIC_` variables, (3) CSP headers enforced at the edge, (4) government-sourced text rendered via JSX auto-escaping only, (5) error boundaries show generic user messages only, (6) no external scripts without SRI. | Build-time: `server-only` import guard + ESLint import boundaries. CI: client bundle forbidden-pattern scan + `pnpm audit`. Runtime: CSP headers via `next.config.ts`. Code review: project-guardian checklist. |

### 4.2 Ubiquitous Language (Glossary)

| Term | Definition | Synonyms to Avoid |
|------|------------|--------------------|
| Politician | An elected official currently or recently holding a federal legislative position (deputado federal or senador) in Brazil | Candidate (only during elections), representative (ambiguous) |
| Integrity Score | A composite numeric value (0-100) measuring a politician's transparency, legislative activity, expense regularity, and absence from anti-corruption databases | Rating, grade, rank (these imply editorial judgment) |
| Score Component | One of four dimensions contributing to the integrity score: transparency, legislative, financial, anti-corruption | Pillar, category, factor |
| Exclusion Flag | A boolean value (`true`/`false`) in the public schema indicating whether anti-corruption database records exist for a politician. The only data that crosses the schema boundary. | Corruption flag (too explicit), blacklist (offensive), ban |
| Exclusion Record | A row in `internal_data.exclusion_records` containing details of a politician's presence in anti-corruption databases (CEIS, CNEP, CEAF, CEPIM, TCU, CGU). Never exposed publicly. | Corruption record, sanction, penalty |
| Silent Exclusion | The design pattern where anti-corruption data affects the score but its details are never exposed through any public interface | Hidden flag, secret filter |
| Data Source | One of 6 official Brazilian government data providers: Camara API, Senado API, Portal da Transparencia, TSE, TCU CADIRREG, CGU-PAD | Feed, API (too generic), provider |
| Ingestion Pipeline | The batch processing system that fetches, transforms, matches, scores, and publishes data from all 6 sources on scheduled cadences | ETL, sync job, cron job (too generic) |
| Public Schema | The PostgreSQL schema (`public`) accessible by the API. Contains only non-sensitive, publicly verifiable data. | Main schema, API schema |
| Internal Schema | The PostgreSQL schema (`internal_data`) accessible only by the pipeline. Contains CPFs, exclusion records, and raw source data. | Private schema, secret schema (implies wrongdoing) |
| Tenure | The period during which a politician holds their current elected position | Mandate (Portuguese calque), term |
| CEAP/CEAPS | Cota para Exercicio da Atividade Parlamentar — the parliamentary expense allowance system for deputados (CEAP) and senadores (CEAPS) | Parliamentary expenses, quota |

---

## 5. External Integrations

| System | Type | Protocol | Auth Method | Rate Limit | Cadence | Official Docs |
|--------|------|----------|-------------|------------|---------|---------------|
| Camara dos Deputados API | REST API | HTTPS, JSON | None (public) | No published limit | Daily | <https://dadosabertos.camara.leg.br/swagger/api.html> |
| Senado Federal API | REST API | HTTPS, XML/JSON | None (public) | No published limit | Daily | <https://legis.senado.leg.br/dadosabertos/> |
| Portal da Transparencia | REST API | HTTPS, JSON | API key (header) | 90 req/min | Daily | <https://portaldatransparencia.gov.br/api-de-dados> |
| TSE (Tribunal Superior Eleitoral) | Bulk Data | HTTPS, CSV download | None (public) | N/A (bulk) | Weekly | <https://dadosabertos.tse.jus.br/> |
| TCU CADIRREG | REST API | HTTPS, JSON | None (public) | No published limit | Weekly | <https://portal.tcu.gov.br/contas/contas-e-relatorios/> |
| CGU-PAD | Bulk Data | HTTPS, CSV download | None (public) | N/A (bulk) | Monthly | <https://www.gov.br/cgu/pt-br/acesso-a-informacao/dados-abertos> |

### Integration Details

| Source | Records | Data Provided | Format Considerations |
|--------|---------|---------------|----------------------|
| Camara API | 513 deputados federais | Bills, votes, expenses (CEAP), committees, personal data | Paginated (100/page), well-structured JSON |
| Senado API | 81 senadores | Bills, votes, expenses (CEAPS), committees | XML primary format, JSON secondary; requires XML parsing fallback |
| Portal da Transparencia | Sanctions lists (CEIS, CNEP, CEAF, CEPIM) | Anti-corruption sanctions and exclusion records | API key required; 90 req/min rate limit; used for exclusion detection |
| TSE | All candidates per election cycle | Candidacies, declared assets, party affiliations | Large CSV files; weekly bulk download; requires CSV parsing |
| TCU CADIRREG | Irregular accounts register | Politicians with irregular accounts judged by TCU | JSON REST; used for exclusion detection |
| CGU-PAD | Disciplinary proceedings | Federal disciplinary proceedings | CSV bulk download; monthly update; used for exclusion detection |

---

## 6. Infrastructure & Environments

### 6.1 Environment Strategy

| Environment | Purpose | Data | Access | Infrastructure |
|-------------|---------|------|--------|----------------|
| Production | Live user-facing platform | Real government data, daily sync | Public (no auth) | Supabase Free (upgrade to Pro when needed) + Vercel Free + Cloudflare |
| Development | Local development and testing | Seed data (subset of real data) | Developer only | Docker Compose on local machine |
| CI | Automated testing in GitHub Actions | Test fixtures, Testcontainers PostgreSQL | GitHub Actions | Ephemeral containers |
| Staging | Pre-production validation (post-MVP) | Copy of production data (anonymized CPFs) | Team only | Separate Supabase Project + Vercel branch |

### 6.2 Data Residency & Geographic Constraints

| Aspect | Detail |
|--------|--------|
| Backend hosting | Supabase Free tier (AWS region: us-east-1 or sa-east-1). Upgrade to Pro when scaling demands. LGPD compliant. |
| Frontend hosting | Vercel Edge Network with Brazilian PoP (Sao Paulo). |
| CDN | Cloudflare with Brazilian PoPs (Sao Paulo, Rio de Janeiro). |
| Database | Supabase Managed Postgres. Contains only public government data in public schema. CPF data (internal schema) stored encrypted. |
| Backups | Supabase Managed (S3-backed). Encrypted at rest. |
| Latency to Brazil | Edge functions and CDN mitigate origin latency. |
| Data sovereignty | All source data originates from Brazilian government. No cross-border data transfer of personal data (CPFs encrypted, never transmitted outside pipeline). |

---

## 7. Research Sources

| Topic | Source | URL | Validated |
|-------|--------|-----|-----------|
| Camara dos Deputados Open Data | Brazilian Chamber of Deputies | <https://dadosabertos.camara.leg.br/> | Yes |
| Senado Federal Open Data | Brazilian Federal Senate | <https://legis.senado.leg.br/dadosabertos/> | Yes |
| Portal da Transparencia API | Brazilian Comptroller General (CGU) | <https://portaldatransparencia.gov.br/api-de-dados> | Yes |
| TSE Open Data | Brazilian Superior Electoral Court | <https://dadosabertos.tse.jus.br/> | Yes |
| TCU Open Data | Brazilian Federal Court of Accounts | <https://portal.tcu.gov.br/> | Yes |
| CGU Open Data | Brazilian Comptroller General | <https://www.gov.br/cgu/pt-br/acesso-a-informacao/dados-abertos> | Yes |
| LGPD Full Text | Brazilian Government | <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm> | Yes |
| LAI Full Text | Brazilian Government | <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm> | Yes |
| Lei da Ficha Limpa | Brazilian Government | <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp135.htm> | Yes |
| Marco Civil da Internet | Brazilian Government | <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm> | Yes |

---

## 8. Evolution History

| Version | Date | Change | Updated Artifacts |
|---------|------|--------|-------------------|
| 1.0 | 2026-02-28 | Initial PRD — 17 functional requirements, 6 data sources, domain model, compliance framework | PRD.md, ARCHITECTURE.md, ER.md |
| 1.1 | 2026-03-07 | Frontend security-first principle — 7 new security NFRs (RNF-SEC-011 to RNF-SEC-017), new domain rule DR-008 (FrontendSecurityFirstInvariant) | PRD.md, project-guardian, project-domain-rules, project-compliance, project-cicd, apps/web/CLAUDE.md |
| 1.2 | 2026-03-09 | Supabase migration update — default to Free tier ($0/month), schema rename `public_data` to `public`, updated cost estimates and backup strategy (daily automatic backups instead of PITR) | PRD.md, ARCHITECTURE.md |
