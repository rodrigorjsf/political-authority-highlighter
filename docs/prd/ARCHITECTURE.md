# Architecture Document: Political Authority Highlighter

**Version:** 1.0.0
**Date:** 2026-02-28
**Status:** Approved for MVP
**Author:** Architecture Review (AI-Assisted)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Stack Selection](#2-stack-selection)
3. [Architecture Pattern](#3-architecture-pattern)
4. [System Architecture Diagram](#4-system-architecture-diagram)
5. [Data Flow](#5-data-flow)
6. [Entity-Relationship Model](#6-entity-relationship-model)
7. [Architecture Decision Records](#7-architecture-decision-records)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Scaling Strategy](#10-scaling-strategy)
11. [Layer Structure](#11-layer-structure)
12. [Cost Breakdown](#12-cost-breakdown)

---

## 1. Executive Summary

The Political Authority Highlighter is a public web platform that surfaces Brazilian politicians demonstrating integrity by cross-referencing 6+ government data sources. The architecture prioritizes:

- **Data isolation**: Two PostgreSQL schemas enforce a hard boundary between public-facing data and internal anti-corruption records.
- **Offline-first scoring**: All integrity scores are pre-computed during batch ingestion, so the public API serves static-like data with sub-300ms latency.
- **SEO performance**: Server-side generated pages via Next.js ensure organic discoverability.
- **Managed Security**: Uses Supabase Row Level Security (RLS) as a second defensive layer on top of schema isolation.
- **Budget efficiency**: The entire stack runs on approximately $25/month infrastructure using Supabase and Vercel.

---

## 2. Stack Selection

### 2.1 Overview Table

| Layer            | Technology          | Version  | Monthly Cost |
|------------------|---------------------|----------|--------------|
| Language         | TypeScript          | 5.4+     | -            |
| Frontend         | Next.js (App Router)| 15.x     | $0 (Vercel)  |
| Backend API      | Fastify             | 5.x      | (Serverless/Supabase Edge) |
| Database         | PostgreSQL (Supabase)| 16.x     | $25 (Pro)    |
| ORM              | Drizzle ORM         | 0.36+    | -            |
| Job Queue        | pg-boss             | 10.x     | -            |
| Validation       | Zod                 | 3.x      | -            |
| Hosting (BE/DB)  | Supabase            | Pro      | $25          |
| Hosting (FE)     | Vercel              | Hobby    | $0           |
| CDN/DNS          | Cloudflare          | Free     | $0           |
| CI/CD            | GitHub Actions      | Free     | $0           |
| Monitoring       | UptimeRobot         | Free     | $0           |

**Estimated total: ~$25/month**

### 2.2 Justification Per Layer

#### TypeScript (Language)

- **Why this product**: Full-stack single language reduces context switching for a solo developer. TypeScript has the strongest AI code generation support of any language (largest training corpus). Type safety catches data mapping bugs between 6+ heterogeneous sources at compile time.
- **Trade-offs**: Slightly slower than Go/Rust for data processing, but the pipeline runs in batch mode where throughput is not the bottleneck.
- **Version**: 5.4+ for `NoInfer` utility type and improved type narrowing.

#### Next.js 15 (Frontend)

- **Why this product**: ISR (Incremental Static Regeneration) is purpose-built for this use case: politician pages are updated daily but need to be instantly available and SEO-indexed. App Router provides server components that eliminate client-side JavaScript for data display pages, achieving LCP < 2s.
- **Trade-offs**: Vercel hobby tier limits to 100GB bandwidth/month. At 50k MAU with ~5 page views averaging 500KB each, that is roughly 125GB. Cloudflare CDN in front handles the overflow by caching static assets.
- **Version**: 15.x (stable App Router, Server Actions, improved caching).

#### Fastify 5 (Backend API)

- **Why this product**: 3-5x faster than Express for JSON serialization, which matters when serving pre-computed politician data. Schema-based validation via JSON Schema aligns with Zod integration. Plugin architecture keeps the codebase modular without NestJS-level ceremony, appropriate for a solo developer.
- **Trade-offs**: Smaller ecosystem than Express/NestJS. Less opinionated structure requires discipline. Mitigated by defining a clear layer structure (see Section 11).
- **Version**: 5.x (stable, ESM-first).

#### PostgreSQL 16 (Supabase)

- **Why this product**: Managed database-as-a-service eliminates operational overhead (backups, patches, scaling). Native schema support (`CREATE SCHEMA`) enables the two-schema isolation requirement. Built-in pooling via Supavisor handles serverless connections. JSONB columns handle heterogeneous raw source data. Full-text search via `tsvector` handles politician name search.
- **Trade-offs**: Higher cost than self-hosting. Fixed monthly cost for Pro tier.
- **Version**: 16.x for improved logical replication and SIMD-accelerated JSON processing.

#### Drizzle ORM 0.36+

- **Why this product**: First-class PostgreSQL schema support (`pgSchema`), allowing type-safe models for both `public` and `internal_data` schemas in separate module boundaries. SQL-like query builder produces predictable queries (critical for performance). Zero runtime overhead compared to Prisma.
- **Trade-offs**: Younger ecosystem than Prisma, fewer guides. Mitigated by strong TypeScript inference and growing community.

#### pg-boss 10 (Job Queue)

- **Why this product**: Uses PostgreSQL as the job storage backend, eliminating Redis infrastructure entirely. Supports cron scheduling, retries with exponential backoff, dead letter queues, and job completion callbacks. Perfect for orchestrating 6+ data source ingestion jobs with different cadences.
- **Trade-offs**: Lower throughput than BullMQ+Redis (hundreds vs thousands of jobs/second). Irrelevant here: the pipeline processes ~700 politicians across 6 sources daily, well under 100 jobs/day.
- **Version**: 10.x (stable, PostgreSQL 16 support).

#### Supabase Pro (Backend/Database Hosting)

- **Why this product**: Managed PostgreSQL, Auth, and Edge Functions in one platform. $25/month Pro tier includes automatic backups, PITR (Point-in-Time Recovery), and generous limits for a solo developer project. Eliminates VPS maintenance.
- **Trade-offs**: More expensive than a raw VPS. Vendor lock-in (partially mitigated by using standard PostgreSQL features).

#### Vercel Hobby (Frontend Hosting)

- **Why this product**: Zero-config deployment for Next.js. Global edge network ensures low latency for Brazilian users. Free tier includes ISR, edge middleware, and analytics. Automatic HTTPS.
- **Trade-offs**: Hobby tier limits: 100GB bandwidth, 100 hours serverless execution, no team features. These limits are adequate for 50k MAU launch. Upgrade to Pro ($20/month) at 200k+ MAU.

#### Cloudflare Free (CDN/DNS/Security)

- **Why this product**: Free CDN with Brazilian PoPs (Sao Paulo, Rio). DDoS protection. Page Rules for aggressive caching of politician data (which changes at most daily). DNS with DNSSEC.
- **Trade-offs**: Free tier has limited WAF rules. Acceptable for a public-data-only platform with no authentication.

---

## 3. Architecture Pattern

**Pattern: Modular Monolith with Pipeline Separation**

```
Rationale:
- Solo developer: one codebase, one deploy unit
- <50k users: no need for service boundaries
- Clear module boundaries prepare for future extraction
- Pipeline and API share the database but have different DB roles
```

The system consists of three logical modules in a single TypeScript monorepo:

| Module       | Responsibility                                     | DB Role         |
|--------------|-----------------------------------------------------|-----------------|
| `web`        | Next.js frontend (SSG/ISR politician pages)         | None (calls API)|
| `api`        | Fastify REST API serving public data                | `api_reader`    |
| `pipeline`   | Data ingestion, transformation, score calculation   | `pipeline_admin`|

The `api_reader` PostgreSQL role has `SELECT` privileges ONLY on the `public` schema. The `pipeline_admin` role has full privileges on both `public` and `internal_data` schemas. This is the **hard security boundary** that enforces Domain Rule DR-001 (silent exclusion).

---

## 4. System Architecture Diagram

```mermaid
flowchart TB
    subgraph Users["Users (Browser)"]
        Browser[Web Browser]
    end

    subgraph Cloudflare["Cloudflare (CDN/DNS/DDoS)"]
        CF_CDN[CDN Edge Cache]
        CF_DNS[DNS]
    end

    subgraph Vercel["Vercel (Free Tier)"]
        NextJS["Next.js 15<br/>App Router<br/>SSG/ISR Pages"]
    end

    subgraph Supabase["Supabase (Pro Tier)"]
        subgraph Edge_Functions["Edge Functions / Fastify"]
            Fastify["Fastify 5 API<br/>/api/v1/*"]
        end

        subgraph DB_Instance["Managed PostgreSQL 16"]
            subgraph Public_Schema["Schema: public"]
                Politicians[(politicians)]
                Scores[(integrity_scores)]
                Bills[(bills / votes)]
                Expenses[(expenses)]
                SourceStatus[(data_source_status)]
            end

            subgraph Internal_Schema["Schema: internal_data"]
                Identifiers[(politician_identifiers<br/>CPF encrypted)]
                Exclusions[(exclusion_records)]
                RawData[(raw_source_data)]
                IngestionLogs[(ingestion_logs)]
            end
        end
    end

    subgraph Pipeline_Runner["Pipeline Runner (GitHub Actions / Local)"]
        PG_Boss["pg-boss<br/>Job Scheduler"]
        Adapters["Source Adapters<br/>(6 adapters)"]
        Transformer["Data Transformer<br/>& Normalizer"]
        Scorer["Score Calculator"]
        Publisher["Schema Publisher"]
    end

    subgraph External["External Data Sources"]
        Camara["Camara API<br/>REST JSON"]
        Senado["Senado API<br/>REST XML/JSON"]
        Transparencia["Portal da Transparencia<br/>REST JSON (API key)"]
        TSE["TSE Open Data<br/>Bulk CSV"]
        TCU["TCU CADIRREG<br/>REST JSON"]
        CGU["CGU-PAD<br/>Bulk CSV"]
    end

    Browser -->|HTTPS| CF_CDN
    CF_CDN -->|Cache MISS| NextJS
    NextJS -->|"REST /api/v1<br/>(HTTPS)"| CF_CDN
    CF_CDN -->|Proxy| Edge_Functions

    Edge_Functions -->|"SELECT only<br/>(Supavisor pool)"| Public_Schema

    Pipeline_Runner -->|"Cron triggers"| Adapters
    Adapters -->|Fetch| Camara
    Adapters -->|Fetch| Senado
    Adapters -->|Fetch| Transparencia
    Adapters -->|Fetch| TSE
    Adapters -->|Fetch| TCU
    Adapters -->|Fetch| CGU
    Adapters -->|Raw data| RawData
    Adapters --> Transformer
    Transformer -->|"Normalized data"| Internal_Schema
    Transformer --> Scorer
    Scorer -->|"Read exclusions"| Internal_Schema
    Scorer -->|"Write scores"| Public_Schema
    Publisher -->|"Write profiles"| Public_Schema
    Scorer --> Publisher

    style Internal_Schema fill:#ff634720,stroke:#ff6347,stroke-width:2px
    style Public_Schema fill:#2e8b5720,stroke:#2e8b57,stroke-width:2px
```

### Text Representation (for non-Mermaid renderers)

```
                          [Browser]
                              |
                          (HTTPS)
                              |
                      [Cloudflare CDN]
                         /        \
                        /          \
              [Vercel/Next.js]    [Hetzner VPS]
              (SSG/ISR pages)         |
                    |           [Fastify API]---SELECT--->[public schema]
                    |                                      - politicians
              calls /api/v1                                - integrity_scores
                                                           - bills, votes
                                                           - expenses, assets

                                [Pipeline Worker]---FULL ACCESS--->[internal_data schema]
                                      |                             - politician_identifiers (CPF)
                                  [pg-boss]                         - exclusion_records
                                      |                             - raw_source_data
                              [Source Adapters]                      - ingestion_logs
                           /    |    |    |    \    \
                      Camara Senado Trans. TSE  TCU  CGU
```

---

## 5. Data Flow

### 5.1 Ingestion Pipeline (Batch - runs daily/weekly/monthly)

```
Step 1: SCHEDULE
  pg-boss cron triggers source-specific jobs:
    - camara-sync:    daily  at 02:00 UTC
    - senado-sync:    daily  at 02:15 UTC
    - transpor-sync:  daily  at 02:30 UTC  (Portal da Transparencia)
    - tse-sync:       weekly on Sunday 03:00 UTC
    - tcu-sync:       weekly on Wednesday 03:00 UTC
    - cgu-sync:       monthly on 1st 04:00 UTC

Step 2: FETCH (Source Adapters)
  Each adapter handles source-specific concerns:
    - Pagination (Camara: 100 items/page)
    - Rate limiting (Portal da Transparencia: 90 req/min)
    - Format parsing (Senado XML, TSE CSV, others JSON)
    - Retry with exponential backoff (3 attempts)
    - Raw response stored in internal_data.raw_source_data

Step 3: TRANSFORM & NORMALIZE
  Raw data is normalized into canonical internal models:
    - Name normalization (diacritics, casing)
    - CPF validation and encryption (AES-256-GCM)
    - CPF hashing (SHA-256) for cross-source matching
    - Date normalization (BR format to ISO 8601)
    - Deduplication via idempotency keys (source + external_id)

Step 4: MATCH & LINK
  Cross-reference records to politician identities:
    - Primary: CPF hash exact match
    - Fallback: name + state + birth_date fuzzy match
    - All matches logged in internal_data.cpf_match_audit

Step 5: SCORE CALCULATION (Offline)
  For each politician, compute integrity_score:
    - Transparency component: data availability across sources (0-25)
    - Legislative component: bill authorship, vote participation (0-25)
    - Financial component: expense regularity, asset declaration (0-25)
    - Anti-corruption component: absence from exclusion lists (0-25)
      * If ANY exclusion_record exists: this component = 0
      * Sets exclusion_flag = true in public schema
    - Overall = weighted sum, normalized to 0-100
    - methodology_version tracks scoring algorithm changes

Step 6: PUBLISH TO PUBLIC SCHEMA
  Pre-computed data written to public:
    - Upsert politicians (name, state, party, role, photo)
    - Upsert integrity_scores with all components
    - Upsert bills, votes, expenses, assets, candidacies
    - Update data_source_status with freshness timestamps

Step 7: REVALIDATION TRIGGER
  After publish, call Vercel on-demand ISR revalidation:
    - POST /api/revalidate?tag=politicians (revalidates listing)
    - POST /api/revalidate?tag=politician-{id} (revalidates profiles)
```

### 5.2 Request Flow (User-facing)

```
Browser -> Cloudflare CDN
  |
  |--> Cache HIT: return cached HTML/JSON (TTL: 1 hour for pages, 5 min for API)
  |
  |--> Cache MISS:
         |
         |--> Static page (SSG): Vercel serves pre-built HTML
         |
         |--> ISR page: Vercel regenerates from API, serves stale while revalidating
         |
         |--> API call: Cloudflare proxies to Hetzner VPS
                |
                Fastify (api_reader role) -> SELECT from public schema
                |
                Response with Cache-Control headers
```

### 5.3 Score Calculation Detail

```
SCORE(politician) =
  transparency_weight  * transparency_score(politician)  +
  legislative_weight   * legislative_score(politician)   +
  financial_weight     * financial_score(politician)      +
  anticorruption_weight * anticorruption_score(politician)

Where default weights: 0.25 each (uniform per DR-002)

transparency_score:
  - Sources with data available / Total possible sources
  - More transparency = higher score (per DR-004)

legislative_score:
  - Bills authored (normalized by tenure length)
  - Vote participation rate
  - Committee membership activity

financial_score:
  - Expense regularity (no anomalous spikes)
  - Asset declaration consistency year-over-year
  - No irregular accounts (TCU CADIRREG)

anticorruption_score:
  - 25 if NO exclusion records exist across CEIS/CNEP/CEAF/CEPIM/TCU/CGU
  - 0 if ANY exclusion record exists (binary, per DR-001)
  - Sets exclusion_flag = true (the ONLY data that crosses to public schema)
```

---

## 6. Entity-Relationship Model

### 6.1 ER Diagram (Mermaid)

```mermaid
erDiagram
    %% ==========================================
    %% PUBLIC SCHEMA (public)
    %% ==========================================

    politicians {
        uuid id PK
        varchar external_id UK "source-specific ID"
        varchar source "camara | senado"
        varchar name
        varchar slug UK "URL-friendly name"
        varchar state "UF (2 chars)"
        varchar party
        varchar role "deputado | senador"
        varchar photo_url
        boolean active
        text bio_summary
        tsvector search_vector "FTS index"
        timestamp created_at
        timestamp updated_at
    }

    integrity_scores {
        uuid id PK
        uuid politician_id FK
        smallint overall_score "0-100"
        smallint transparency_score "0-25"
        smallint legislative_score "0-25"
        smallint financial_score "0-25"
        smallint anticorruption_score "0-25"
        boolean exclusion_flag "silent binary flag"
        varchar methodology_version
        timestamp calculated_at
    }

    score_components {
        uuid id PK
        uuid score_id FK
        varchar component_name
        numeric value
        numeric weight
        varchar source_name
        date source_date
        text explanation
    }

    bills {
        uuid id PK
        uuid politician_id FK
        varchar external_id UK
        varchar title
        text summary
        varchar bill_type
        varchar status
        date presented_at
        varchar url
    }

    votes {
        uuid id PK
        uuid politician_id FK
        varchar session_external_id
        varchar vote_value "sim | nao | abstencao | ausente"
        date session_date
        text session_subject
    }

    expenses {
        uuid id PK
        uuid politician_id FK
        varchar category
        varchar supplier
        numeric value "BRL"
        date expense_date
        varchar document_url
        smallint year
        smallint month
    }

    assets {
        uuid id PK
        uuid politician_id FK
        smallint year
        varchar asset_type
        text description
        numeric value "BRL"
    }

    candidacies {
        uuid id PK
        uuid politician_id FK
        smallint year
        varchar role_sought
        varchar state
        varchar result "eleito | nao_eleito | segundo_turno"
        integer votes_received
    }

    affiliations {
        uuid id PK
        uuid politician_id FK
        varchar party
        date start_date
        date end_date
    }

    data_source_status {
        uuid id PK
        varchar source_name UK
        timestamp last_sync_at
        timestamp last_success_at
        integer records_processed
        varchar status "success | partial | failed"
        text error_message
    }

    politicians ||--o| integrity_scores : "has current"
    politicians ||--o{ score_components : "via scores"
    integrity_scores ||--o{ score_components : "details"
    politicians ||--o{ bills : "authored"
    politicians ||--o{ votes : "cast"
    politicians ||--o{ expenses : "incurred"
    politicians ||--o{ assets : "declared"
    politicians ||--o{ candidacies : "ran in"
    politicians ||--o{ affiliations : "member of"

    %% ==========================================
    %% INTERNAL SCHEMA (internal_data)
    %% ==========================================

    politician_identifiers {
        uuid id PK
        uuid politician_id FK "cross-schema ref"
        bytea cpf_encrypted "AES-256-GCM"
        varchar cpf_hash UK "SHA-256 for lookups"
        varchar tse_id
        varchar camara_id
        varchar senado_id
        varchar full_name_normalized "for fuzzy match"
        date birth_date
    }

    exclusion_records {
        uuid id PK
        uuid identifier_id FK
        varchar source "CEIS | CNEP | CEAF | CEPIM | TCU | CGU"
        varchar record_type
        text description
        date start_date
        date end_date
        jsonb raw_data
        varchar idempotency_key UK "source + external_ref"
        timestamp imported_at
    }

    ingestion_logs {
        uuid id PK
        varchar source_name
        timestamp started_at
        timestamp completed_at
        varchar status "running | success | partial | failed"
        integer records_processed
        integer records_created
        integer records_updated
        integer errors_count
        jsonb error_details
    }

    raw_source_data {
        uuid id PK
        varchar source_name
        uuid ingestion_log_id FK
        jsonb raw_payload
        boolean processed
        timestamp created_at
    }

    cpf_match_audit {
        uuid id PK
        uuid identifier_id FK
        varchar source
        varchar match_type "exact_cpf | fuzzy_name"
        numeric confidence "0.0-1.0"
        timestamp matched_at
    }

    politician_identifiers ||--|| politicians : "identifies"
    politician_identifiers ||--o{ exclusion_records : "has"
    politician_identifiers ||--o{ cpf_match_audit : "matched via"
    ingestion_logs ||--o{ raw_source_data : "produced"
```

### 6.2 Schema Separation Summary

| Aspect | `public` Schema | `internal_data` Schema |
|--------|---------------------|----------------------|
| **DB Role** | `api_reader` (SELECT only) | `pipeline_admin` (ALL) |
| **Contains** | Politician profiles, scores, parliamentary activity | CPFs, exclusion records, raw data, audit logs |
| **Accessed by** | Fastify API, Next.js (via API) | Pipeline worker only |
| **Sensitive data** | None (by design) | CPF (encrypted), corruption records |
| **Cross-schema bridge** | `exclusion_flag` boolean in `integrity_scores` | `politician_id` FK to `public.politicians` |

### 6.3 Key Indexes

```sql
-- public schema
CREATE INDEX idx_politicians_slug ON public.politicians(slug);
CREATE INDEX idx_politicians_state ON public.politicians(state);
CREATE INDEX idx_politicians_party ON public.politicians(party);
CREATE INDEX idx_politicians_role ON public.politicians(role);
CREATE INDEX idx_politicians_search ON public.politicians USING GIN(search_vector);
CREATE INDEX idx_politicians_active ON public.politicians(active) WHERE active = true;
CREATE INDEX idx_scores_politician ON public.integrity_scores(politician_id);
CREATE INDEX idx_scores_overall ON public.integrity_scores(overall_score DESC);
CREATE INDEX idx_bills_politician ON public.bills(politician_id);
CREATE INDEX idx_expenses_politician_year ON public.expenses(politician_id, year, month);

-- internal_data schema
CREATE UNIQUE INDEX idx_identifiers_cpf_hash ON internal_data.politician_identifiers(cpf_hash);
CREATE INDEX idx_exclusions_identifier ON internal_data.exclusion_records(identifier_id);
CREATE UNIQUE INDEX idx_exclusions_idempotency ON internal_data.exclusion_records(idempotency_key);
CREATE INDEX idx_raw_data_unprocessed ON internal_data.raw_source_data(processed) WHERE processed = false;
```

---

## 7. Architecture Decision Records

### ADR-001: Two-Schema PostgreSQL with Role-Based Access Control

**Status:** Accepted
**Date:** 2026-02-28

**Context:**
The system must enforce a hard boundary between public-facing politician data and internal anti-corruption records (exclusion lists, CPFs). Domain rules DR-001 (silent exclusion) and DR-005 (CPF never exposed) require that the public API cannot, under any circumstances, access internal data -- even if the application code has a bug.

**Decision:**
Use a single PostgreSQL 16 instance with two schemas (`public` and `internal_data`) and two database roles:
- `api_reader`: `GRANT SELECT ON ALL TABLES IN SCHEMA public`. No grants on `internal_data`.
- `pipeline_admin`: `GRANT ALL ON ALL TABLES IN SCHEMA public, internal_data`.

The Fastify API connects using `api_reader`. The pipeline worker connects using `pipeline_admin`.

**Alternatives Considered:**
1. **Two separate databases**: Stronger isolation but doubles infrastructure cost and complicates the pipeline (cross-database joins impossible in PostgreSQL). The pipeline would need two connections and manual coordination.
2. **Application-level isolation only**: Using a single role but restricting queries in code. Rejected because a single code bug could leak internal data.
3. **Row-Level Security (RLS)**: Adds complexity without clear benefit over schema-level RBAC for this use case.

**Consequences:**
- Positive: Database-level enforcement means even SQL injection on the API cannot reach internal data.
- Positive: Single database instance keeps infrastructure cost minimal.
- Positive: The pipeline can use cross-schema joins for score calculation.
- Negative: Schema migrations must be managed separately (mitigated by Drizzle's schema support).
- Negative: Cannot use foreign keys across schemas in some setups (mitigated by using `politician_id` as a convention-enforced reference).

**Review Trigger:** If the system moves to multi-node deployment or if a second team needs independent access to internal data.

---

### ADR-002: Static Generation with ISR on Vercel for SEO Performance

**Status:** Accepted
**Date:** 2026-02-28

**Context:**
The platform's primary discovery channel is organic search (Google). Brazilian users searching for politician names must find pre-rendered, fast-loading pages. The system updates data at most daily, so real-time rendering is unnecessary. Performance targets: LCP < 2s, FCP < 1.5s.

**Decision:**
Use Next.js 15 App Router with:
- **Static Site Generation (SSG)** for the politician listing page and top-100 politician profiles at build time.
- **Incremental Static Regeneration (ISR)** with on-demand revalidation for all politician profile pages. The pipeline triggers revalidation after publishing new data.
- **Server Components** by default (zero client JS for data display pages).
- **Client Components** only for interactive elements (search filter, score breakdown toggle).

Deploy on Vercel Hobby tier (free).

**Alternatives Considered:**
1. **Full SSR (server-side rendering)**: Every request hits the API. Unnecessary latency and load for data that changes daily.
2. **Pure SPA (React/Vite)**: No SSR means no SEO. Disqualified by requirement.
3. **Astro**: Excellent for static content but smaller ecosystem and fewer AI training examples than Next.js, reducing development velocity for a solo developer.
4. **Self-hosted Next.js on VPS**: Saves Vercel dependency but requires managing Node.js process, SSL, and edge caching manually. Not worth the ops burden.

**Consequences:**
- Positive: Sub-second page loads from Vercel's edge CDN (Brazilian PoP in Sao Paulo).
- Positive: Zero hosting cost for frontend.
- Positive: Excellent Core Web Vitals scores for SEO ranking.
- Negative: Vercel Hobby bandwidth limit (100GB/month) may be reached at ~200k MAU. Cloudflare CDN in front mitigates by caching static assets.
- Negative: On-demand ISR requires an API endpoint that the pipeline calls, adding a coupling point.

**Review Trigger:** Bandwidth exceeds free tier consistently, or if build times exceed 10 minutes (indicating too many static pages).

---

### ADR-003: pg-boss for Pipeline Orchestration (Eliminating Redis)

**Status:** Accepted
**Date:** 2026-02-28

**Context:**
The data ingestion pipeline must orchestrate 6+ source adapters with different cadences (daily, weekly, monthly), handle retries, and track job status. Traditional solutions include BullMQ (requires Redis), Temporal (too heavy), or cron + custom logic (fragile).

**Decision:**
Use pg-boss 10.x, which stores job queues in PostgreSQL tables. This eliminates Redis from the infrastructure entirely.

Configuration:
- Each source adapter is a named queue: `camara-sync`, `senado-sync`, `transparencia-sync`, `tse-sync`, `tcu-sync`, `cgu-sync`.
- Cron schedules defined in pg-boss configuration.
- Retry policy: 3 attempts with exponential backoff (1m, 5m, 15m).
- Dead letter queue for permanently failed jobs.
- Job completion triggers score recalculation job.

**Alternatives Considered:**
1. **BullMQ + Redis**: Industry standard, higher throughput. Rejected because it adds Redis infrastructure ($3-5/month additional), and throughput is irrelevant for <100 jobs/day.
2. **node-cron + custom state management**: Simpler but no built-in retry, dead letter, or job history. Fragile for a production system.
3. **GitHub Actions scheduled workflows**: Free, but cannot access the VPS database directly. Would require an HTTP trigger endpoint, adding attack surface.

**Consequences:**
- Positive: Single data store (PostgreSQL) for application data AND job queues.
- Positive: ~$5/month saved by eliminating Redis.
- Positive: Job history stored in PostgreSQL, queryable for monitoring.
- Negative: Job throughput limited to ~500/second (PostgreSQL-backed). Irrelevant for this workload.
- Negative: pg-boss tables add ~10-50MB to database size. Negligible on 40GB disk.

**Review Trigger:** If real-time features are added requiring pub/sub or high-throughput messaging.

---

### ADR-004: Silent Exclusion via Boolean Flag Bridge (LGPD Compliance)

**Status:** Accepted
**Date:** 2026-02-28

**Context:**
Brazilian anti-corruption databases (CEIS, CNEP, CEAF, CEPIM) contain sensitive records about politicians' involvement in corruption proceedings. Exposing these details publicly could violate LGPD (Lei Geral de Protecao de Dados) data minimization principles and enable retaliation (violating DR-006). However, the platform must factor corruption data into integrity scores.

**Decision:**
Implement a "silent exclusion" pattern:
1. The pipeline reads exclusion records from internal sources and stores them in `internal_data.exclusion_records`.
2. During score calculation, if ANY exclusion record exists for a politician, the `anticorruption_score` component is set to 0 (out of 25).
3. A boolean `exclusion_flag` is set to `true` in `public.integrity_scores`.
4. The public API and frontend can see that the anticorruption component is 0, but CANNOT see why (no record details, no source names, no dates).
5. The frontend displays this as "Information from anti-corruption databases affected this score" without specifics.

**Alternatives Considered:**
1. **Expose exclusion details publicly**: Provides transparency but risks LGPD violation and retaliation. Rejected per DR-001 and DR-006.
2. **No exclusion data at all**: Safer legally but defeats the product's purpose. Rejected.
3. **Graduated scoring (partial penalty)**: More nuanced but requires subjective weighting of corruption severity. Rejected per DR-002 (political neutrality).

**Consequences:**
- Positive: LGPD data minimization: only a boolean crosses the schema boundary.
- Positive: No retaliation risk: impossible to determine which specific database flagged a politician.
- Positive: Political neutrality: binary flag applied uniformly to all politicians.
- Negative: Users cannot verify WHY a politician's anticorruption score is 0. Mitigated by linking to public government transparency portals where users can search independently.
- Negative: False positives from source data cannot be investigated by users. Mitigated by displaying data freshness and methodology documentation.

**Review Trigger:** Legal review recommends different approach, or if source data quality issues cause significant false positive rates.

---

### ADR-005: Drizzle ORM with Dual Schema Type Safety

**Status:** Accepted
**Date:** 2026-02-28

**Context:**
The codebase must interact with two PostgreSQL schemas (`public`, `internal_data`) with strict type safety to prevent accidental cross-schema queries from the API layer. The ORM must support schema-qualified table references, migrations, and work well with TypeScript and AI-assisted development.

**Decision:**
Use Drizzle ORM with:
- `pgSchema('public')` and `pgSchema('internal_data')` for schema-qualified table definitions.
- Two separate Drizzle client instances: `publicDb` (using `api_reader` connection) and `pipelineDb` (using `pipeline_admin` connection).
- The API module imports ONLY from `src/db/public-schema.ts`. The pipeline module can import from both.
- ESLint rule or import boundary enforcement to prevent API code from importing internal schema types.

**Alternatives Considered:**
1. **Prisma**: Mature, but multi-schema support is limited (requires raw SQL for cross-schema). `prisma generate` creates a single client.
2. **Kysely**: Excellent type safety but less community/AI training data than Drizzle.
3. **Raw SQL with typed helpers**: Maximum control but loses migration tooling and increases development time.

**Consequences:**
- Positive: Compile-time prevention of cross-schema access from the API module.
- Positive: SQL-like query builder produces predictable, optimizable queries.
- Positive: Lightweight (no query engine runtime like Prisma).
- Negative: Must maintain two schema definition files and two migration directories.
- Negative: Cross-schema joins in the pipeline require raw SQL or careful Drizzle configuration.

**Review Trigger:** If Drizzle's cross-schema join support improves, or if the team grows and needs a more opinionated ORM.

---

### ADR-006: Managed Infrastructure with Supabase (BaaS)

**Status:** Accepted
**Date:** 2026-03-08

**Context:**
The initial plan for self-hosting on a VPS required manual management of PostgreSQL, backups, and security patches. As a solo developer, operational simplicity and data reliability (PITR) are higher priorities than absolute minimum cost. Supabase provides a managed PostgreSQL environment with built-in pooling and scaling.

**Decision:**
Migrate all backend infrastructure to Supabase (Pro Tier):
- **Database**: Managed PostgreSQL 16.
- **Pooling**: Supavisor for serverless connection management.
- **Backups**: Automatic daily backups with Point-in-Time Recovery (PITR).
- **Security**: Supabase handles OS hardening and database patches.
- **Pipeline**: Ingestion jobs will run via GitHub Actions or locally, connecting directly to Supabase.

**Alternatives Considered:**
1. **Hetzner VPS (Original Plan)**: Cheapest (~$6/mo) but requires highest operational effort.
2. **AWS RDS**: Very expensive (~$50+/mo) for similar managed features.
3. **Railway/Render**: Good developer experience but database management is less specialized than Supabase.

**Consequences:**
- Positive: Zero database maintenance (managed backups, patches).
- Positive: PITR for high data reliability.
- Positive: Built-in connection pooling for serverless environments (Vercel/Edge).
- Negative: Fixed monthly cost increase (~$25 vs ~$6).
- Negative: Vendor lock-in (partially mitigated by sticking to standard PostgreSQL features and Drizzle ORM).

**Review Trigger:** Monthly active users exceed 500k, or database storage costs grow exponentially.

---

### ADR-007: CPF Encryption Strategy

**Status:** Accepted
**Date:** 2026-02-28

**Context:**
CPF (Cadastro de Pessoas Fisicas) is the Brazilian national ID number, classified as personal data under LGPD. The system needs CPFs to cross-reference politicians across data sources (TSE, Portal da Transparencia, TCU) but must never expose them publicly.

**Decision:**
Implement a two-layer CPF storage strategy:
1. **Encrypted CPF**: AES-256-GCM encryption using a key stored as an environment variable (Docker secret). Stored as `bytea` in `internal_data.politician_identifiers.cpf_encrypted`.
2. **CPF Hash**: SHA-256 hash of the normalized CPF (digits only). Stored as `varchar` in `internal_data.politician_identifiers.cpf_hash`. Used for cross-source matching without decryption.
3. **Encryption in application layer** (not `pgcrypto`): Ensures the encryption key never reaches the database process memory. The pipeline encrypts/decrypts in Node.js using `crypto.createCipheriv`.

**Consequences:**
- Positive: CPF matching works via hash comparison (fast, no decryption needed).
- Positive: Even database compromise does not expose CPFs without the application-layer key.
- Positive: Key rotation possible by re-encrypting (hash remains unchanged).
- Negative: Application-layer encryption means no SQL-level search on CPF. Acceptable because CPF search is only needed during batch ingestion, not API queries.

**Review Trigger:** If regulatory audit requires HSM-backed key management, or if CPF matching requires fuzzy comparison (which would need decryption).

---

## 8. Cross-Cutting Concerns

### 8.1 API Design

```
Base URL: https://api.autoridade-politica.com.br/api/v1

Endpoints:
  GET /politicians                    # List with filters (state, party, role, search, sort)
  GET /politicians/:slug              # Full profile with latest score
  GET /politicians/:slug/bills        # Paginated bills
  GET /politicians/:slug/votes        # Paginated votes
  GET /politicians/:slug/expenses     # Paginated expenses by year
  GET /politicians/:slug/assets       # Declared assets by year
  GET /politicians/:slug/candidacies  # Electoral history
  GET /scores/ranking                 # Top/bottom politicians by score
  GET /sources/status                 # Data freshness indicators
  GET /methodology                    # Scoring methodology documentation

Response format: JSON
Pagination: cursor-based (keyset pagination)
Errors: RFC 7807 Problem Details
Versioning: URL prefix (/api/v1)
Content-Type: application/json; charset=utf-8
```

### 8.2 Error Response Format (RFC 7807)

```json
{
  "type": "https://autoridade-politica.com.br/errors/not-found",
  "title": "Politician not found",
  "status": 404,
  "detail": "No politician with slug 'joao-silva-sp' exists.",
  "instance": "/api/v1/politicians/joao-silva-sp"
}
```

### 8.3 Caching Strategy

| Resource | Cache-Control | CDN TTL | Rationale |
|----------|--------------|---------|-----------|
| Politician list | `public, max-age=300, s-maxage=3600` | 1 hour | Data changes daily |
| Politician profile | `public, max-age=300, s-maxage=3600` | 1 hour | Data changes daily |
| Score ranking | `public, max-age=300, s-maxage=3600` | 1 hour | Data changes daily |
| Source status | `public, max-age=60, s-maxage=300` | 5 min | Should reflect recent syncs |
| Methodology | `public, max-age=86400, s-maxage=604800` | 7 days | Rarely changes |
| Static assets | `public, max-age=31536000, immutable` | 1 year | Content-hashed filenames |

### 8.4 Logging (Structured)

```
Library: Pino 9.x
Format: JSON (structured)
Fields: timestamp, level, requestId (correlation ID), method, path, statusCode, duration, userAgent
Pipeline fields: jobId, sourceName, recordsProcessed, errorsCount

Retention: 7 days on disk (logrotate), no external log service in MVP
```

### 8.5 Security

| Concern | Implementation |
|---------|---------------|
| HTTPS | Cloudflare TLS 1.3 termination, Full (Strict) mode to origin |
| Rate Limiting | Fastify `@fastify/rate-limit`: 100 req/min per IP |
| CORS | Restricted to `autoridade-politica.com.br` and `localhost` |
| Input Validation | Zod schemas on all API query parameters |
| SQL Injection | Drizzle ORM parameterized queries (no raw SQL in API) |
| CPF Protection | AES-256-GCM encryption + SHA-256 hash (see ADR-007) |
| Schema Isolation | PostgreSQL RBAC (see ADR-001) |
| Secrets | Docker secrets / `.env` file with `600` permissions |
| Dependency Audit | `npm audit` in CI, Dependabot enabled |
| Headers | Helmet.js: CSP, X-Frame-Options, X-Content-Type-Options |

### 8.6 LGPD Compliance

| LGPD Principle | Implementation |
|----------------|---------------|
| Data Minimization | Public schema contains no personal identifiers (CPF, birth date). Only public information. |
| Purpose Limitation | CPFs used solely for cross-source matching, never displayed. |
| Security | CPF encrypted at rest (AES-256-GCM), schema isolation, RBAC. |
| Transparency | Methodology page explains data sources, scoring, and data handling. |
| Legal Basis | LAI (Lei de Acesso a Informacao): all source data is public government data. |
| Data Subject Rights | Platform processes only public officials' public data. No user data collected (no auth in MVP). |

### 8.7 Observability (MVP)

```
Uptime Monitoring: UptimeRobot free tier (50 monitors, 5-min checks)
  - API health endpoint: GET /health
  - Frontend: Vercel built-in analytics

Application Metrics (lightweight):
  - Pipeline: job success/failure counts logged to structured logs
  - API: response time percentiles logged per endpoint
  - Database: pg_stat_statements for slow query detection

Alerting:
  - UptimeRobot: email/Telegram on downtime
  - pg-boss: dead letter queue monitoring (daily check)

Future (post-MVP):
  - Grafana Cloud free tier (10k metrics)
  - OpenTelemetry integration
```

---

## 9. Deployment Architecture

### 9.1 Infrastructure Diagram

```
                    Internet
                       |
                   [Cloudflare]
                   DNS + CDN + WAF
                  /              \
                 /                \
        [Vercel Edge]        [Supabase Cloud]
        Next.js 15           Managed Postgres 16
        SSG/ISR pages        Edge Functions
        Free Tier            Pro Tier
```

### 9.2 Development Environment (Docker Compose)

Local development continues to use Docker Compose to provide an environment as close as possible to the Supabase PostgreSQL standard.

```yaml
# docker-compose.yml (simplified)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: authority_highlighter
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./infrastructure/init-schemas.sql:/docker-entrypoint-initdb.d/01-schemas.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://api_reader:***@postgres/authority_highlighter?schema=public
    depends_on:
      postgres: { condition: service_healthy }
    restart: unless-stopped

volumes:
  pgdata:
```

### 9.3 CI/CD Pipeline (GitHub Actions)

Trigger: push to main branch

Steps:
  1. Lint + Type Check (TypeScript)
  2. Unit Tests (Vitest)
  3. Integration Tests (Testcontainers + PostgreSQL)
  4. Apply Migrations: `supabase db push`
  5. Deploy Frontend to Vercel

### 9.4 Backup Strategy

```
Daily at 01:00 UTC (before pipeline runs):
  1. pg_dump --format=custom --compress=9 > backup-$(date +%Y%m%d).dump
  2. Upload to Hetzner Object Storage (S3-compatible)
  3. Retain last 7 daily + 4 weekly backups
  4. Estimated size: <100MB (600 politicians, limited history)
  5. Cost: ~$0.02/month

Recovery:
  1. Provision new VPS (if needed)
  2. pg_restore from latest backup
  3. Re-run pipeline for missing days
  4. All source data is public and re-fetchable
```

---

## 10. Scaling Strategy

### 10.1 Growth Phases

| Phase | MAU | Concurrent | Infrastructure | Monthly Cost |
|-------|-----|-----------|----------------|-------------|
| Launch | 50k | 500 | Current (CX22 + Vercel Free) | ~$7 |
| 6 months | 200k | 2000 | Upgrade to CX32 (3vCPU/8GB), Vercel Pro | ~$30 |
| 12 months | 500k | 5000 | CX42 (4vCPU/16GB), Vercel Pro, read replica | ~$60 |
| 18 months | 1M+ | 10000+ | Evaluate Kubernetes or managed services | ~$100+ |

### 10.2 Scaling Levers (in order of effort)

1. **CDN caching** (zero effort): Increase Cloudflare cache TTLs. Pre-computed data is inherently cacheable.
2. **VPS vertical scaling** (5 minutes): Hetzner allows live resize. CX22 -> CX32 -> CX42.
3. **Vercel upgrade** (instant): Hobby -> Pro ($20/month) for 1TB bandwidth.
4. **PostgreSQL read replica** (1 hour): Add a streaming replica for API reads. Pipeline writes to primary.
5. **API response caching** (2 hours): Add in-memory cache (Node.js LRU) for hot politician profiles.
6. **Separate API VPS** (4 hours): Move API to dedicated VPS, keep pipeline + DB on another.

### 10.3 Why This Scales

The architecture's key insight is that **pre-computed scores make the API essentially a static data server**. A politician's profile changes at most once per day. This means:
- Every response is cacheable for at least 5 minutes.
- No computation at request time (unlike score-on-read).
- PostgreSQL serves simple key-value-like lookups on indexed columns.
- A single 2-vCPU node can handle 5000+ req/sec for cached JSON responses.

---

## 11. Layer Structure

### 11.1 Monorepo Layout

```
political-authority-highlighter/
+-- package.json                    # Workspace root
+-- turbo.json                      # Turborepo config (build orchestration)
+-- docker-compose.yml
+-- .github/
|   +-- workflows/
|       +-- ci.yml                  # Lint, test, build
|       +-- deploy.yml              # Deploy to Hetzner + Vercel
+-- packages/
|   +-- shared/                     # Shared types, utilities, constants
|   |   +-- src/
|   |   |   +-- types/              # Domain types (Politician, Score, etc.)
|   |   |   +-- constants/          # Score weights, source configs
|   |   |   +-- utils/              # Date formatting, slug generation
|   |   +-- package.json
|   +-- db/                         # Database schemas, migrations, clients
|       +-- src/
|       |   +-- public-schema.ts    # Drizzle schema for public
|       |   +-- internal-schema.ts  # Drizzle schema for internal_data
|       |   +-- clients.ts          # publicDb + pipelineDb instances
|       |   +-- migrate.ts          # Migration runner
|       +-- migrations/
|       |   +-- public/             # public migrations
|       |   +-- internal/           # internal_data migrations
|       +-- package.json
+-- apps/
    +-- web/                        # Next.js frontend
    |   +-- src/
    |   |   +-- app/                # App Router pages
    |   |   |   +-- page.tsx                    # Home / politician listing
    |   |   |   +-- politicos/
    |   |   |   |   +-- page.tsx                # Listing with filters
    |   |   |   |   +-- [slug]/
    |   |   |   |       +-- page.tsx            # Politician profile
    |   |   |   |       +-- projetos/page.tsx   # Bills tab
    |   |   |   |       +-- votacoes/page.tsx   # Votes tab
    |   |   |   |       +-- despesas/page.tsx   # Expenses tab
    |   |   |   +-- ranking/page.tsx            # Score ranking
    |   |   |   +-- metodologia/page.tsx        # Methodology
    |   |   |   +-- fontes/page.tsx             # Data sources status
    |   |   |   +-- api/revalidate/route.ts     # ISR revalidation webhook
    |   |   +-- components/
    |   |   |   +-- ui/             # Design system primitives
    |   |   |   +-- politician/     # PoliticianCard, ScoreBreakdown, etc.
    |   |   |   +-- layout/         # Header, Footer, Navigation
    |   |   |   +-- filters/        # SearchBar, StateFilter, PartyFilter
    |   |   +-- lib/
    |   |   |   +-- api-client.ts   # Typed fetch wrapper for backend API
    |   |   |   +-- seo.ts          # OpenGraph, JSON-LD helpers
    |   |   +-- types/
    |   +-- public/
    |   |   +-- og/                 # OpenGraph images
    |   +-- next.config.ts
    |   +-- package.json
    +-- api/                        # Fastify backend API
    |   +-- src/
    |   |   +-- server.ts           # Fastify instance, plugin registration
    |   |   +-- routes/
    |   |   |   +-- politicians.ts  # /api/v1/politicians
    |   |   |   +-- scores.ts       # /api/v1/scores
    |   |   |   +-- sources.ts      # /api/v1/sources
    |   |   |   +-- health.ts       # /health
    |   |   +-- services/
    |   |   |   +-- politician.service.ts
    |   |   |   +-- score.service.ts
    |   |   |   +-- source.service.ts
    |   |   +-- schemas/            # Zod request/response schemas
    |   |   +-- plugins/            # Fastify plugins (cors, rate-limit, etc.)
    |   |   +-- middleware/         # Request logging, error handler
    |   +-- Dockerfile.api
    |   +-- package.json
    +-- pipeline/                   # Data ingestion pipeline
        +-- src/
        |   +-- worker.ts           # pg-boss worker entry point
        |   +-- scheduler.ts        # Cron schedule definitions
        |   +-- adapters/           # Source-specific fetch + parse
        |   |   +-- camara.adapter.ts
        |   |   +-- senado.adapter.ts
        |   |   +-- transparencia.adapter.ts
        |   |   +-- tse.adapter.ts
        |   |   +-- tcu.adapter.ts
        |   |   +-- cgu.adapter.ts
        |   |   +-- base.adapter.ts         # Abstract adapter with retry logic
        |   +-- transformers/               # Normalization logic
        |   |   +-- politician.transformer.ts
        |   |   +-- expense.transformer.ts
        |   |   +-- bill.transformer.ts
        |   +-- matchers/                   # Cross-source identity matching
        |   |   +-- cpf.matcher.ts          # Hash-based CPF matching
        |   |   +-- fuzzy.matcher.ts        # Name + state fallback
        |   +-- scoring/                    # Score calculation engine
        |   |   +-- calculator.ts           # Main score orchestrator
        |   |   +-- components/
        |   |       +-- transparency.ts
        |   |       +-- legislative.ts
        |   |       +-- financial.ts
        |   |       +-- anticorruption.ts
        |   +-- publisher/                  # Writes to public schema
        |   |   +-- publisher.ts
        |   |   +-- revalidator.ts          # Triggers Vercel ISR
        |   +-- crypto/
        |       +-- cpf.ts                  # AES-256-GCM encrypt/decrypt + SHA-256 hash
        +-- Dockerfile.pipeline
        +-- package.json
```

### 11.2 Import Boundaries

```
RULE: apps/api/ may ONLY import from packages/db/public-schema.ts and packages/shared/
RULE: apps/pipeline/ may import from ALL packages/
RULE: apps/web/ may NOT import from packages/db/ (uses HTTP API client)
RULE: packages/db/internal-schema.ts may NOT be imported by apps/api/

Enforcement: ESLint eslint-plugin-import with import/no-restricted-paths
```

---

## 12. Cost Breakdown

### 12.1 MVP Monthly Cost

| Service | Tier | Cost/Month |
|---------|------|-----------|
| Supabase | Pro | $25.00 |
| Vercel | Hobby (Free) | $0.00 |
| Cloudflare | Free | $0.00 |
| GitHub Actions | Free (public repo) | $0.00 |
| UptimeRobot | Free (50 monitors) | $0.00 |
| Domain (.com.br) | Annual, amortized | ~$1.50 |
| **Total** | | **~$26.50** |

### 12.2 12-Month Projected Cost

| Service | Cost/Month |
|---------|-----------|
| Supabase Pro (with add-ons) | $40.00 |
| Vercel Pro | $20.00 |
| Cloudflare | $0.00 |
| Domain | $1.50 |
| **Total** | **~$61.50** |

Still well under the $100/month budget at 500k MAU.

---

## Appendix A: Database Initialization Script

```sql
-- init-schemas.sql (runs on first PostgreSQL start)

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS internal_data;

-- Create roles
CREATE ROLE api_reader WITH LOGIN PASSWORD '${API_READER_PASSWORD}';
CREATE ROLE pipeline_admin WITH LOGIN PASSWORD '${PIPELINE_ADMIN_PASSWORD}';

-- Grant privileges
GRANT USAGE ON SCHEMA public TO api_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO api_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO api_reader;

GRANT USAGE, CREATE ON SCHEMA public TO pipeline_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pipeline_admin;

GRANT USAGE, CREATE ON SCHEMA internal_data TO pipeline_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA internal_data TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA internal_data GRANT ALL ON TABLES TO pipeline_admin;

-- Ensure api_reader has NO access to internal_data
REVOKE ALL ON SCHEMA internal_data FROM api_reader;
REVOKE ALL ON ALL TABLES IN SCHEMA internal_data FROM api_reader;
```

## Appendix B: Compatibility Matrix

| Component A | Component B | Verified Compatible |
|-------------|-------------|-------------------|
| Next.js 15 | Node.js 22 LTS | Yes |
| Fastify 5 | Node.js 22 LTS | Yes |
| Drizzle ORM 0.36 | PostgreSQL 16 | Yes |
| pg-boss 10 | PostgreSQL 16 | Yes |
| Vercel Hobby | Next.js 15 App Router | Yes |
| Turborepo | pnpm workspaces | Yes |
| Cloudflare CDN | Vercel (custom domain) | Yes (proxy mode) |

## Appendix C: Performance Budget

| Metric | Target | Strategy |
|--------|--------|----------|
| LCP | < 2.0s | SSG/ISR + Cloudflare CDN |
| FCP | < 1.5s | Server Components (zero client JS for data) |
| CLS | < 0.1 | Fixed-dimension image placeholders |
| API p50 | < 100ms | Pre-computed data + indexed queries |
| API p95 | < 300ms | Connection pooling + CDN cache |
| Search | < 200ms | PostgreSQL GIN index on tsvector |
| TTFB | < 500ms | Vercel edge + stale-while-revalidate |
