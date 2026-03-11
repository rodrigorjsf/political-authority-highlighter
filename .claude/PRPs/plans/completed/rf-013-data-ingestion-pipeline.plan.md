# Feature: Data Ingestion Pipeline (RF-013)

## Summary

Bootstrap a production data ingestion pipeline that fetches politician data from 6 Brazilian government sources (Camara, Senado, Portal da Transparencia, TSE, TCU, CGU), transforms into unified domain types, encrypts/hashes sensitive CPF data, and publishes to PostgreSQL via idempotent upserts. Scheduled via pg-boss with per-source singleton job policies. Provides real data foundation for integrity scoring and platform launch.

## User Story

As a **Cidadão Engajado**
I want to **see politician data fetched from authoritative government sources (not seed data)**
So that **I can trust the platform integrity scores and voting records**

## Problem Statement

The platform currently displays seed data only. All `integrity_scores` rows are synthetic; no bills, votes, expenses, or proposals exist in the database. Without real government data:

- Platform has zero credibility ("why should I trust this score?")
- Profile pages bounce users (no detail data to explore)
- KPI failure: average session depth < 1 page

Legislation requires data from LAI (Lei de Acesso a Informacao) — the pipeline must fetch and normalize from 6+ sources with different formats, rate limits, and authentication methods.

## Solution Statement

Implement modular data pipeline with:

1. **Adapter layer** — one module per source; handles auth, rate limits, format parsing
2. **Transformer layer** — normalize each source to shared domain types
3. **Publisher layer** — atomic writes via Drizzle ORC upserts to public schema
4. **Internal schema** — audit trail (raw_source_data, exclusion_records, politician_identifiers, ingestion_logs, data_source_status)
5. **Scheduler** — pg-boss with 6 independent queues, one per source
6. **Scoring engine** — pure function combining 4 components into 0-100 score
7. **Exclusion detection** — queries anti-corruption databases, sets `exclusion_flag` boolean only

**Key constraint**: Pipeline must be idempotent — running twice produces identical data state.

---

## Metadata

| Field            | Value                                             |
| ---------------- | ------------------------------------------------- |
| Type             | NEW_CAPABILITY (foundational platform enabler)    |
| Complexity       | HIGH (6 adapters × 3 layers, scheduling, crypto)  |
| Systems Affected | db schema, pipeline app, API (no changes), web UI |
| Dependencies     | pg-boss@10, postgres-js, axios, csv-parse, fast-xml-parser |
| Estimated Tasks  | 28 atomic tasks (adapters + engine + scheduler)   |

---

## UX Design

### Before State

```
┌─────────────────────────────────────────────────────────────────┐
│                    LISTING PAGE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ João Silva (SP)  │  │ Maria Santos (RJ)│  │ etc...       │  │
│  │ Score: 72        │  │ Score: 58        │  │              │  │
│  │ [Click → 404]    │  │ [Click → 404]    │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                 │
│  USER_FLOW:                                                     │
│    1. User clicks politician card                              │
│    2. [DEAD END] No profile page exists                        │
│    3. User bounces or returns to listing                       │
│                                                                 │
│  DATA_FLOW:                                                     │
│    PostgreSQL (seed data only)                                 │
│      └─ integrity_scores table: synthetic values only          │
│      └─ bills/votes/expenses tables: empty                     │
│                                                                 │
│  PAIN_POINT:                                                    │
│    - All scores are fake; no real government data              │
│    - No bills, votes, or expenses visible                      │
│    - Platform has zero credibility                             │
│    - Session depth: 1 page (fail KPI ≥ 3 pages)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### After State

```
┌─────────────────────────────────────────────────────────────────┐
│                    LISTING PAGE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ João Silva (SP)  │  │ Maria Santos (RJ)│  │ etc...       │  │
│  │ Score: 72        │  │ Score: 58        │  │              │  │
│  │ [Click → Profile]│  │ [Click → Profile]│  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                               │                                 │
│                               ▼                                 │
│        ┌────────────────────────────────────┐                   │
│        │    POLITICIAN PROFILE PAGE          │                   │
│        ├────────────────────────────────────┤                   │
│        │ João Silva | PL | SP | Deputado    │                   │
│        │ Score: 72/100                      │                   │
│        │ ├─ Transparency: 18/25             │                   │
│        │ ├─ Legislative: 22/25 (8 bills)    │                   │
│        │ ├─ Financial: 20/25 (1200 exp.)    │                   │
│        │ └─ Anti-corruption: 12/25          │                   │
│        │                                    │                   │
│        │ [Bills] [Votes] [Expenses] [...]   │                   │
│        │                                    │                   │
│        │ Bills Tab:                         │                   │
│        │ ├─ PL-2024/1200: Climate Bill      │                   │
│        │ ├─ PL-2024/0850: Infrastructure    │                   │
│        │ └─ 8 more bills...                 │                   │
│        │                                    │                   │
│        └────────────────────────────────────┘                   │
│                               │                                 │
│                               ▼                                 │
│              ┌─────────────────────────────┐                    │
│              │ User explores bills section  │                   │
│              │ Clicks official Camara link │                   │
│              │ [Success] Engaged session    │                   │
│              └─────────────────────────────┘                    │
│                                                                 │
│  USER_FLOW:                                                     │
│    1. User clicks politician card                              │
│    2. Profile page loads with real government data             │
│    3. User explores 2-3 detail sections                        │
│    4. User clicks official source links for verification       │
│    5. [Success] Session depth: 3+ pages, user engaged          │
│                                                                 │
│  DATA_FLOW:                                                     │
│    6 Government APIs (scheduled daily)                         │
│      ├─ Camara API (bills, votes, proposals)                   │
│      ├─ Senado API (bills, votes, proposals)                   │
│      ├─ Portal da Transparencia (expenses, assets)             │
│      ├─ TSE (election history, candidates)                     │
│      ├─ TCU CADIRREG (administrative penalties)                │
│      └─ CGU-PAD (corruption exclusions)                        │
│            │                                                    │
│            ▼                                                    │
│    Transform to shared types (Politician, Bill, Vote, etc.)    │
│            │                                                    │
│            ▼                                                    │
│    Encrypt CPF (AES-256-GCM) + Hash (SHA-256)                  │
│            │                                                    │
│            ▼                                                    │
│    Detect exclusions (anti-corruption matches)                 │
│            │                                                    │
│            ▼                                                    │
│    Compute integrity score (pure function)                     │
│            │                                                    │
│            ▼                                                    │
│    Idempotent upserts to PostgreSQL                            │
│            │                                                    │
│            ▼                                                    │
│    PostgreSQL (real government data)                           │
│      ├─ politicians: 594 rows (real CPF matches)              │
│      ├─ integrity_scores: 594 with real 4-component scores    │
│      ├─ bills: 5000+ real bills from Camara+Senado            │
│      ├─ votes: 10000+ real voting records                      │
│      ├─ expenses: 50000+ real parliamentary expenses           │
│      ├─ proposals: real proposals from both houses             │
│      ├─ committees: real committee memberships                 │
│      └─ internal_data: audit trail (raw_source_data, etc.)    │
│                                                                 │
│  VALUE_ADD:                                                     │
│    - Platform credibility: real government data                │
│    - User engagement: 3+ pages per session (✓ KPI)             │
│    - Transparency: full audit trail in internal_data schema    │
│    - LGPD compliance: CPF never exposed, only encrypted        │
│    - Political neutrality: uniform scoring methodology         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Interaction Changes

| Location                    | Before                          | After                                 | User Impact                        |
| ----------------------- | -------- | -------------------|-----|
| `/politicos/[slug]` | 404 Not Found | Profile page with real data | Can now explore politician details |
| `GET /api/v1/politicians/:slug` | Returns null or empty | Returns full profile object | API serves complete politician data |
| `GET /api/v1/politicians/:slug/bills` | Route 404 | Paginated real bills from Camara/Senado | User can browse legislative activity |
| `GET /api/v1/politicians/:slug/votes` | Route 404 | Paginated real votes | User sees voting participation |
| `GET /api/v1/politicians/:slug/expenses` | Route 404 | Paginated real CEAP expenses | User sees spending transparency |
| `integrity_scores.overall_score` | Synthetic 50-70 | Real computed score | Score is now trustworthy |
| Database `internal_data` schema | Empty stub | Full audit trail | Pipeline transparency for developers |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files BEFORE starting tasks:**

| Priority | File                                                   | Lines    | Why Read This                                          |
| -------- | ------------------------------------------------------ | -------- | ------------------------------------------------------ |
| P0       | `packages/db/src/clients.ts`                           | 1-37     | Database client patterns; `createPipelineDb()` contract |
| P0       | `packages/db/src/public-schema.ts`                     | 23-228   | All 7 public tables; Drizzle column definitions         |
| P0       | `apps/api/src/repositories/politician.repository.ts`   | 48-157   | Keyset pagination pattern to MIRROR exactly            |
| P0       | `apps/api/src/services/politician.service.ts`          | 9-19     | Cursor encode/decode pattern; COPY exactly             |
| P0       | `CLAUDE.md`                                            | 320-350  | Critical Domain Rules (DR-001 through DR-006)          |
| P1       | `apps/api/src/app.ts`                                  | 28-89    | Dependency injection pattern; env validation           |
| P1       | `apps/api/src/hooks/error-handler.ts`                  | 1-62     | Custom error class pattern                             |
| P1       | `.env.example`                                         | 1-26     | All environment variables used by pipeline             |
| P1       | `apps/api/CLAUDE.md`                                   | 458-480  | Drizzle upsert pattern (onConflictDoUpdate)           |
| P2       | `apps/api/src/services/expense.service.ts`             | 59-71    | Numeric type conversion (string → number)              |

**External Documentation:**

| Source                                        | Section                          | Why Needed                          |
| --------------------------------------------- | -------------------------------- | ----------------------------------- |
| [pg-boss GitHub v10.4.2](https://github.com/timgit/pg-boss/blob/10.4.2/types.d.ts) | `schedule()`, `work()`, `send()` | Job scheduling API for 6 adapters  |
| [Drizzle ORM Upsert Guide](https://orm.drizzle.team/docs/guides/upsert) | `onConflictDoUpdate` patterns | Idempotent upsert for all adapters |
| [csv-parse v6.1.0](https://csv.js.org/parse)  | streaming parser options        | TSE & CGU CSV parsing              |
| [fast-xml-parser v5.4.2](https://github.com/NaturalIntelligence/fast-xml-parser) | `processEntities: false` security | Senado XML parsing (untrusted input) |
| [Node.js crypto API](https://nodejs.org/api/crypto.html) | AES-256-GCM encryption/decryption | CPF encryption (DR-005)            |
| [PostgreSQL numeric type](https://www.postgresql.org/docs/16/datatype.html) | numeric(12,2) handling | Expense amount casting             |

---

## Patterns to Mirror

### PATTERN 1: Database Client Creation

```typescript
// SOURCE: packages/db/src/clients.ts:28-36
// COPY THIS PATTERN for pipeline:

export function createPipelineDb(
  connectionString: string,
  usePooling = false,
): ReturnType<typeof drizzle> {
  const client = postgres(connectionString, { prepare: !usePooling })
  return drizzle(client, { schema: { ...publicSchema, ...internalSchema } })
}
```

**Critical:** Pipeline uses the direct URL (port 5432), NOT the pooler. `usePooling=false` because pg-boss also manages a `pg` connection pool.

### PATTERN 2: Repository Factory Pattern

```typescript
// SOURCE: apps/api/src/repositories/politician.repository.ts:159-165
// COPY THIS PATTERN for all pipeline repositories:

export type PoliticianRepository = ReturnType<typeof createPoliticianRepository>

export function createPoliticianRepository(db: PublicDb): {
  selectWithFilters: (filters: ListFilters) => Promise<PoliticianWithScore[]>
  selectBySlug: (slug: string) => Promise<PoliticianProfileRow | undefined>
} {
  return {
    selectWithFilters: async (filters) => {
      // ...
    },
    selectBySlug: async (slug) => {
      // ...
    },
  }
}
```

**For pipeline publisher:** Create `createPublicSchemaPublisher(db: PipelineDb)` returning object with `upsertPolitician`, `upsertBills`, etc.

### PATTERN 3: Idempotent Upsert

```typescript
// SOURCE: apps/api/CLAUDE.md:458-480
// COPY THIS PATTERN for every public schema write:

await db
  .insert(politicians)
  .values(data)
  .onConflictDoUpdate({
    target: politicians.externalId,  // or [table.source, table.externalId] for composite
    set: {
      name: data.name,
      slug: data.slug,
      updatedAt: sql`now()`,
    },
  })
```

**Key:** `target` must match the UNIQUE constraint in schema. Use `sql\`excluded.column_name\`` to reference excluded row values.

### PATTERN 4: Cursor Encode/Decode

```typescript
// SOURCE: apps/api/src/services/politician.service.ts:9-19
// COPY THIS PATTERN for pagination services:

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

function decodeCursor(encoded: string): Cursor {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as Cursor
  } catch {
    throw new Error('Invalid cursor')
  }
}
```

### PATTERN 5: Service Factory Pattern

```typescript
// SOURCE: apps/api/src/services/politician.service.ts:73-109
// COPY THIS PATTERN for scoring + transformer services:

export type ScoringService = ReturnType<typeof createScoringService>

export function createScoringService(repository: ScoringRepository) {
  return {
    computeIntegrityScore: async (politicianId: string) => {
      // score logic
    },
    computeTransparencyScore: (dataCount: number) => {
      // pure function
    },
  }
}
```

### PATTERN 6: Error Class Pattern

```typescript
// SOURCE: apps/api/src/hooks/error-handler.ts:3-23
// COPY THIS PATTERN for pipeline errors:

export class AdapterError extends Error {
  constructor(
    public readonly source: string,
    public readonly message: string,
  ) {
    super(`${source} adapter failed: ${message}`)
    this.name = 'AdapterError'
  }
}

export class MatchingError extends Error {
  constructor(
    public readonly reason: 'no_cpf' | 'ambiguous' | 'timeout',
  ) {
    super(`CPF matching failed: ${reason}`)
    this.name = 'MatchingError'
  }
}
```

### PATTERN 7: Test Factory Pattern

```typescript
// SOURCE: apps/api/src/services/politician.service.test.ts:9-31
// COPY THIS PATTERN for pipeline unit tests:

function buildPolitician(overrides: Partial<Politician> = {}): Politician {
  return {
    externalId: 'camara-123456',
    slug: 'joao-silva-sp',
    name: 'João Silva',
    party: 'PL',
    state: 'SP',
    role: 'deputado',
    photoUrl: null,
    tenureStartDate: '2023-02-01',
    ...overrides,
  }
}

function buildRepository(rows: Bill[] = []): BillRepository {
  return {
    selectByPoliticianId: vi.fn().mockResolvedValue(rows),
    upsert: vi.fn().mockResolvedValue(undefined),
  }
}
```

### PATTERN 8: Numeric Type Conversion

```typescript
// SOURCE: apps/api/src/services/expense.service.ts:59-71
// COPY THIS PATTERN for any numeric columns:

function toExpenseDto(row: ExpenseRow): ExpenseDto {
  return {
    // ...
    amount: Number(row.amount), // Drizzle returns numeric as string
    // ...
  }
}
```

---

## Files to Change

| File                                      | Action | Justification                                       |
| ----------------------------------------- | ------ | --------------------------------------------------- |
| `packages/db/src/internal-schema.ts`      | UPDATE | Add 5 internal tables (raw_source_data, etc.)       |
| `packages/db/src/public-schema.ts`        | UPDATE | Ensure all 7 tables ready (already mostly exist)    |
| `packages/db/migrations/internal/`        | CREATE | 1 migration file with all internal tables           |
| `apps/pipeline/package.json`              | CREATE | Dependencies: pg-boss, axios, csv-parse, etc.      |
| `apps/pipeline/src/index.ts`              | CREATE | Entry point: initialize db, pg-boss, register jobs |
| `apps/pipeline/src/config/env.ts`         | CREATE | Zod schema for all pipeline environment variables  |
| `apps/pipeline/src/config/logger.ts`      | CREATE | Pino logger configuration                           |
| `apps/pipeline/src/adapters/camara.ts`    | CREATE | Camara REST API adapter                             |
| `apps/pipeline/src/adapters/senado.ts`    | CREATE | Senado REST API adapter (with XML fallback)         |
| `apps/pipeline/src/adapters/transparencia.ts` | CREATE | Portal da Transparencia adapter (rate-limited)     |
| `apps/pipeline/src/adapters/tse.ts`       | CREATE | TSE CSV bulk adapter                                |
| `apps/pipeline/src/adapters/tcu.ts`       | CREATE | TCU CADIRREG adapter                                |
| `apps/pipeline/src/adapters/cgu.ts`       | CREATE | CGU-PAD CSV adapter                                 |
| `apps/pipeline/src/transformers/`         | CREATE | 6 transformer modules (one per source)              |
| `apps/pipeline/src/scoring/engine.ts`     | CREATE | Score calculation pure functions                    |
| `apps/pipeline/src/crypto/cpf.ts`         | CREATE | CPF encryption + hashing utilities                  |
| `apps/pipeline/src/publisher/index.ts`    | CREATE | Idempotent upsert logic for all tables              |
| `apps/pipeline/src/publisher/errors.ts`   | CREATE | Publication error classes                           |
| `apps/pipeline/src/scheduler.ts`          | CREATE | pg-boss queue/schedule registration                |
| `apps/pipeline/src/matching/cpf.ts`       | CREATE | CPF cross-source identity matching                  |
| `apps/pipeline/src/types.ts`              | CREATE | Pipeline-specific types (adapters output types)     |
| `apps/pipeline/Dockerfile.pipeline`       | CREATE | Docker image for pipeline service                   |
| `apps/pipeline/.env.example`              | CREATE | All required env vars for pipeline                  |

---

## NOT Building (Scope Limits)

Explicit exclusions to prevent scope creep:

- **Multi-source data reconciliation** — pipeline handles 1:1 mapping to external ID; conflicts logged but not auto-resolved
- **Real-time streaming** — batch ingestion only, daily cron schedule
- **Admin dashboard** — no UI to manage pipeline runs; only database tables and logs
- **Backfill strategy** — assumes first run; does not include historical backfill logic
- **Duplicate detection** — relies on UNIQUE constraints + `onConflictDoUpdate`; no fuzzy matching beyond CPF/name
- **OG image API** — deferred to RF-017 post-MVP
- **Senado JSON fallback** — supports XML parsing; JSON support added only if XML parsing fails in production

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

### Task 1: CREATE `packages/db/src/internal-schema.ts` (define all tables)

- **ACTION**: Define 5 internal tables in the `internal_data` PostgreSQL schema
- **IMPLEMENT**:
  - `raw_source_data` — audit trail of API responses
  - `exclusion_records` — CPF matches with anti-corruption databases
  - `politician_identifiers` — encrypted CPF mapping
  - `ingestion_logs` — job execution history
  - `data_source_status` — freshness metadata
- **MIRROR**: `packages/db/src/public-schema.ts:23-91` — follow exact same pattern with `pgSchema('internal_data')`, Drizzle column types, indices
- **IMPORTS**:

  ```typescript
  import { pgSchema, uuid, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core'
  ```

- **SCHEMA_DESIGN**:
  - `raw_source_data`: (id, source, external_id, raw_json, fetched_at); UNIQUE(source, external_id)
  - `exclusion_records`: (id, politician_id, source, cpf_hash, exclusion_type, record_date, record_url)
  - `politician_identifiers`: (id, politician_id, cpf_encrypted, cpf_hash); UNIQUE(cpf_hash)
  - `ingestion_logs`: (id, source, job_id, status, records_processed, records_upserted, errors, started_at, completed_at)
  - `data_source_status`: (id, source, last_sync_at, record_count, status)
- **GOTCHA**: Do NOT add foreign keys to public tables in internal schema — `internal_data` is internal-only; linking happens in application code
- **VALIDATE**: `npx tsc --noEmit` — types must compile; `drizzle-kit generate` to verify migration generation

### Task 2: CREATE `packages/db/migrations/internal/0001_create_internal_schema.sql`

- **ACTION**: Create initial internal_data schema migration
- **IMPLEMENT**: DDL for all 5 tables with constraints, indices, and RLS policies
- **MIRROR**: `packages/db/migrations/0001_initial.sql:1-42` — use same SQL style (idempotent, explicit type casting)
- **IMPORTS**: N/A (raw SQL)
- **SCHEMA**:

  ```sql
  CREATE SCHEMA IF NOT EXISTS internal_data;

  CREATE TABLE IF NOT EXISTS internal_data.raw_source_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    raw_json JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source, external_id)
  );

  CREATE INDEX idx_raw_source_data_source_date
    ON internal_data.raw_source_data(source, fetched_at DESC);

  -- ... 4 more tables
  ```

- **GOTCHA**: Enable RLS on internal tables with NO SELECT policy (blocks PostgREST). Only `pipeline_admin` role can read.
- **VALIDATE**: Run migration: `pnpm --filter @pah/db run migrate:dev`; verify tables exist in `internal_data` schema only

### Task 3: CREATE `apps/pipeline/package.json`

- **ACTION**: Initialize pipeline app dependencies
- **IMPLEMENT**:

  ```json
  {
    "name": "@pah/pipeline",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "NODE_ENV=development tsx src/index.ts",
      "start": "NODE_ENV=production node dist/index.js",
      "build": "tsc",
      "lint": "eslint src",
      "test": "vitest",
      "migrate": "pnpm --filter @pah/db run migrate:prod"
    },
    "dependencies": {
      "@pah/db": "workspace:*",
      "@pah/shared": "workspace:*",
      "pg-boss": "^10.4.2",
      "axios": "^1.6.0",
      "fast-xml-parser": "^5.4.2",
      "csv-parse": "^6.1.0",
      "p-limit": "^7.3.0",
      "zod": "^3.22.0",
      "pino": "^8.16.0",
      "pino-pretty": "^10.2.0",
      "dotenv": "^16.0.0"
    },
    "devDependencies": {
      "@types/node": "^20",
      "typescript": "^5.4.0",
      "vitest": "^1.0.0",
      "tsx": "^4.0.0",
      "eslint": "^8.0.0"
    }
  }
  ```

- **MIRROR**: `apps/api/package.json:1-25` — same workspace reference pattern
- **IMPORTS**: N/A (JSON config)
- **KEY**:
  - Pinned `pg-boss@^10.4.2` (not latest v12)
  - CSV/XML parsers included
  - Pino logger same as API
- **VALIDATE**: `pnpm install --filter @pah/pipeline` — all dependencies resolve

### Task 4: CREATE `apps/pipeline/src/config/env.ts`

- **ACTION**: Define and validate pipeline environment variables
- **IMPLEMENT**: Zod schema + runtime parsing
- **MIRROR**: `apps/api/src/config/env.ts:1-16`
- **SCHEMA**:

  ```typescript
  import { z } from 'zod'

  const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    DATABASE_URL_WRITER: z.string().url(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    TRANSPARENCIA_API_KEY: z.string(),
    CPF_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/), // 32 bytes hex
    VERCEL_REVALIDATE_TOKEN: z.string().optional(),
    CRON_SCHEDULE_CAMARA: z.string().default('0 2 * * *'),
    CRON_SCHEDULE_SENADO: z.string().default('0 3 * * *'),
    // ... other source schedules
  })

  export const env = envSchema.parse(process.env)
  ```

- **IMPORTS**: `import { z } from 'zod'`
- **GOTCHA**:
  - `CPF_ENCRYPTION_KEY` must be exactly 64 hex chars (32 bytes) — regex enforces this
  - Fail-fast: `parse()` throws if any variable missing or invalid at startup
- **VALIDATE**: `npx tsc --noEmit`; environment must exist before module loads

### Task 5: CREATE `apps/pipeline/src/config/logger.ts`

- **ACTION**: Configure Pino logger for pipeline
- **IMPLEMENT**:

  ```typescript
  import pino from 'pino'
  import { env } from './env'

  export const logger = pino(
    env.NODE_ENV === 'development'
      ? { level: env.LOG_LEVEL, transport: { target: 'pino-pretty' } }
      : { level: env.LOG_LEVEL },
  )
  ```

- **MIRROR**: `apps/api/src/app.ts:31-39`
- **IMPORTS**: `import pino from 'pino'`
- **VALIDATE**: `npx tsc --noEmit`

### Task 6: CREATE `apps/pipeline/src/types.ts`

- **ACTION**: Define pipeline-specific types (adapter return types)
- **IMPLEMENT**:

  ```typescript
  // Re-export domain types from @pah/shared
  export type { Politician, Bill, Vote, Expense, Proposal, Committee } from '@pah/shared'

  // Adapter return types (raw before transformation)
  export interface CamaraDeputy {
    id: string
    nome: string
    email: string
    // ... other Camara API fields
  }

  export interface SenadorData {
    CodigoSenador: string
    NomeParlamentar: string
    // ... other Senado API fields
  }

  // Pipeline context
  export interface AdapterContext {
    source: 'camara' | 'senado' | 'transparencia' | 'tse' | 'tcu' | 'cgu'
    logger: pino.Logger
    timestamp: Date
  }
  ```

- **IMPORTS**: `export type { ... } from '@pah/shared'`
- **VALIDATE**: `npx tsc --noEmit`

### Task 7: CREATE `apps/pipeline/src/adapters/camara.ts`

- **ACTION**: Build Camara REST API adapter (deputies → Bills/Votes)
- **IMPLEMENT**:

  ```typescript
  import axios from 'axios'
  import { logger } from '../config/logger'

  interface CamaraDeputy {
    id: string
    nome: string
    email: string
    uf: string
    // ... fetch from https://dados.camara.leg.br/api/v2/deputados
  }

  export async function fetchCamaraDeputies(): Promise<CamaraDeputy[]> {
    try {
      const response = await axios.get('https://dados.camara.leg.br/api/v2/deputados', {
        params: { ordem: 'ASC', ordenarPor: 'nome', pagina: 1 },
      })
      return response.data.dados
    } catch (error) {
      logger.error(error, 'Failed to fetch from Camara API')
      throw error
    }
  }

  export async function fetchCamaraDeputyBills(deputyId: string): Promise<any[]> {
    // https://dados.camara.leg.br/api/v2/deputados/{id}/proposicoes
  }
  ```

- **MIRROR**: No existing adapter patterns; follow REST fetch pattern from API clients
- **IMPORTS**: `import axios from 'axios'`
- **GOTCHA**: Camara API paginated; implement cursor loop to fetch all deputies
- **VALIDATE**: Unit test: mock axios, verify return type matching CamaraDeputy interface

### Task 8: CREATE `apps/pipeline/src/adapters/senado.ts`

- **ACTION**: Build Senado REST API adapter with XML fallback
- **IMPLEMENT**:

  ```typescript
  import axios from 'axios'
  import { XMLParser } from 'fast-xml-parser'
  import { logger } from '../config/logger'

  const xmlParser = new XMLParser({
    processEntities: false,  // Security: prevent XXE attacks
    ignoreDeclaration: true,
    ignorePiTags: true,
    trimValues: true,
    isArray: (_name, _jpath, _isLeaf, isAttr) => !isAttr,  // normalize single/array
  })

  export async function fetchSenadoBills(): Promise<any[]> {
    try {
      // Try JSON first: https://legis.senado.leg.br/dadosabertos/materia/pesquisa/json
      const json = await axios.get('https://...')
      return json.data
    } catch {
      // Fallback to XML
      const xml = await axios.get('https://...')
      const parsed = xmlParser.parse(xml.data)
      return parsed.materia || []
    }
  }
  ```

- **MIRROR**: No XML parsing in existing code; follow fast-xml-parser security patterns
- **IMPORTS**: `import { XMLParser } from 'fast-xml-parser'`
- **GOTCHA**:
  - Must use `processEntities: false` for security (CVE-2026-26278, CVE-2026-25896)
  - `isArray` callback required because Senado returns single element as object, multiple as array
- **VALIDATE**: Unit test with fixture XML file; verify no XXE vulnerability

### Task 9: CREATE `apps/pipeline/src/adapters/transparencia.ts`

- **ACTION**: Build Portal da Transparencia adapter with rate limiting (90 req/min)
- **IMPLEMENT**:

  ```typescript
  import axios from 'axios'
  import pLimit from 'p-limit'
  import { env } from '../config/env'
  import { logger } from '../config/logger'

  const transparenciaClient = axios.create({
    baseURL: 'https://api.portaldatransparencia.gov.br/api-de-dados/despesas-do-governo-federal',
    headers: { 'chave-api-dados': env.TRANSPARENCIA_API_KEY },
  })

  const limiter = pLimit(1)  // 1 concurrent + 700ms delay = ~85 req/min

  export async function fetchExpensesByPolitician(cpfHash: string): Promise<any[]> {
    return limiter(async () => {
      await delay(700)  // Rate limit: 90 req/min = 667ms between requests
      const response = await transparenciaClient.get('/despesas', {
        params: { 'filtro[cpfOrdenador]': cpfHash },  // Actually CPF, but hashed for matching
      })
      return response.data
    })
  }

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
  ```

- **MIRROR**: No existing rate-limited adapter; follow p-limit pattern
- **IMPORTS**: `import pLimit from 'p-limit'`
- **GOTCHA**:
  - API key header: `chave-api-dados` (not `Authorization`)
  - 90 req/min limit: 667ms minimum delay between requests
  - Large response payloads: consider streaming
- **VALIDATE**: Integration test with real API key (dev only); verify rate limit enforcement

### Task 10: CREATE `apps/pipeline/src/adapters/tse.ts`

- **ACTION**: Build TSE CSV bulk downloader (elections/candidates)
- **IMPLEMENT**:

  ```typescript
  import fs from 'fs'
  import { parse } from 'csv-parse'
  import axios from 'axios'
  import { logger } from '../config/logger'

  export async function fetchTSEElectionData(): Promise<any[]> {
    const csvUrl = 'https://dadosabertos-download.tse.jus.br/dados_abertos/...'
    const response = await axios.get(csvUrl, { responseType: 'stream' })

    const rows: any[] = []
    return new Promise((resolve, reject) => {
      response.data
        .pipe(
          parse({
            columns: true,
            delimiter: ';',
            encoding: 'latin1',  // TSE uses ISO-8859-1
            skip_empty_lines: true,
            trim: true,
            cast: false,  // NEVER cast: CPF has leading zeros
          }),
        )
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject)
    })
  }
  ```

- **MIRROR**: No CSV parsing in existing code; follow csv-parse streaming pattern
- **IMPORTS**: `import { parse } from 'csv-parse'`
- **GOTCHA**:
  - TSE uses semicolons, ISO-8859-1 encoding
  - CPF columns have leading zeros → never cast to number
  - Large files (>100MB) → must stream, not load into memory
- **VALIDATE**: Unit test with fixture CSV; verify numeric CPF fields remain strings

### Task 11: CREATE `apps/pipeline/src/adapters/tcu.ts`

- **ACTION**: Build TCU CADIRREG REST adapter
- **IMPLEMENT**:

  ```typescript
  import axios from 'axios'
  import { logger } from '../config/logger'

  // TCU CADIRREG: https://portal.tcu.gov.br/contas/api-cadirreg
  export async function fetchTCUExclusions(cpfHash: string): Promise<any[]> {
    try {
      const response = await axios.get('https://api.tcu.gov.br/cadirreg/pesquisa', {
        params: { cpf: cpfHash },  // Verify: does TCU API accept CPF hash?
        timeout: 5000,
      })
      return response.data.registros || []
    } catch (error) {
      logger.warn(error, 'TCU API call failed')
      // Fail gracefully: missing TCU data ≠ platform error
      return []
    }
  }
  ```

- **MIRROR**: Simple REST pattern (no auth needed, retries via axios-retry)
- **IMPORTS**: `import axios from 'axios'`
- **GOTCHA**:
  - TCU API authentication unclear — needs validation against real endpoint before deployment
  - Endpoint URL not confirmed — check `https://portal.tcu.gov.br/contas/api-cadirreg` for current URL
- **VALIDATE**: Integration test deferred (no public TCU sandbox); verify against production endpoint once confirmed

### Task 12: CREATE `apps/pipeline/src/adapters/cgu.ts`

- **ACTION**: Build CGU-PAD CSV adapter (corruption exclusions)
- **IMPLEMENT**:

  ```typescript
  import fs from 'fs'
  import { parse } from 'csv-parse'
  import https from 'https'
  import { logger } from '../config/logger'

  export async function fetchCGUExclusions(): Promise<any[]> {
    // CGU-PAD: https://www.gov.br/cgu/pt-br/acesso-a-informacao/dados-abertos
    const csvUrl = 'https://cdn.portaldatransparencia.gov.br/dataset/servidor-excluido/download/...'

    const rows: any[] = []
    return new Promise((resolve, reject) => {
      https.get(csvUrl, (response) => {
        response
          .pipe(
            parse({
              columns: true,
              delimiter: ',',        // CGU uses commas
              encoding: 'utf-8',     // CGU uses UTF-8 with BOM
              bom: true,
              skip_empty_lines: true,
              trim: true,
              cast: false,
            }),
          )
          .on('data', (row) => rows.push(row))
          .on('end', () => resolve(rows))
          .on('error', reject)
      }).on('error', reject)
    })
  }
  ```

- **MIRROR**: Similar to TSE adapter (CSV streaming)
- **IMPORTS**: `import { parse } from 'csv-parse'`
- **GOTCHA**:
  - CGU-PAD uses commas (vs TSE semicolons) — verify delim before deployment
  - File encoding likely UTF-8 with BOM — `bom: true` strips it
  - Bulk download may change URL seasonally — check CGU portal for current link
- **VALIDATE**: Unit test with fixture CGU CSV; verify BOM stripping works

### Task 13: CREATE `apps/pipeline/src/transformers/index.ts`

- **ACTION**: Export transformer functions (normalize adapter outputs to domain types)
- **IMPLEMENT**:

  ```typescript
  export { transformCamaraDeputy as transformFromCamara } from './camara'
  export { transformSenadoBill as transformFromSenado } from './senado'
  export { transformTransparenciaExpense as transformFromTransparencia } from './transparencia'
  export { transformTSECandidate as transformFromTSE } from './tse'
  export { transformTCUExclusion as transformFromTCU } from './tcu'
  export { transformCGUExclusion as transformFromCGU } from './cgu'
  ```

- **MIRROR**: `apps/api/src/index.ts` — re-export pattern
- **IMPORTS**: Relative imports from transformer files
- **VALIDATE**: `npx tsc --noEmit`

### Task 14: CREATE `apps/pipeline/src/transformers/camara.ts`

- **ACTION**: Transform Camara API output to domain `Politician` and `Bill` types
- **IMPLEMENT**:

  ```typescript
  import { Politician, Bill } from '@pah/shared'
  import type { CamaraDeputy } from '../types'

  export function transformCamaraDeputy(raw: CamaraDeputy): Politician {
    return {
      externalId: String(raw.id),
      source: 'camara' as const,
      name: raw.nome,
      party: raw.siglaPartido,
      state: raw.uf,
      role: 'deputado' as const,
      photoUrl: raw.urlFoto,
      tenureStartDate: raw.dataPosse,
    }
  }

  export function transformCamaraBill(raw: any, politicianId: string): Bill {
    return {
      externalId: String(raw.id),
      source: 'camara' as const,
      politicianId,
      title: raw.ementa,
      number: raw.numero,
      year: raw.ano,
      type: raw.tipo,
      status: raw.statusProposicao.descricao,
      submissionDate: raw.dataApresentacao,
      sourceUrl: `https://www.camara.leg.br/propostas/${raw.id}`,
    }
  }
  ```

- **MIRROR**: DTO mapper pattern from `apps/api/src/services/politician.service.ts:21-33`
- **IMPORTS**: `import type { Politician, Bill } from '@pah/shared'`
- **VALIDATE**: Unit test: mock Camara object, verify all fields mapped correctly

### Task 15: CREATE `apps/pipeline/src/transformers/senado.ts` (+ others)

- **ACTION**: Build transformers for Senado, Transparencia, TSE, TCU, CGU
- **IMPLEMENT**: Identical pattern to Task 14 (one export function per entity type)
- **MIRROR**: Task 14 transformer pattern
- **VALIDATE**: Unit tests for each; verify all fields transformed to shared types

### Task 16: CREATE `apps/pipeline/src/crypto/cpf.ts`

- **ACTION**: Implement CPF encryption + hashing for identity matching
- **IMPLEMENT**:

  ```typescript
  import crypto from 'crypto'
  import { env } from '../config/env'

  const encryptionKey = Buffer.from(env.CPF_ENCRYPTION_KEY, 'hex')  // 32 bytes

  export function encryptCPF(cpf: string): string {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(cpf, 'utf-8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    // Return iv:authTag:encrypted as base64
    return Buffer.concat([iv, authTag, encrypted]).toString('base64')
  }

  export function decryptCPF(encrypted: string): string {
    const buffer = Buffer.from(encrypted, 'base64')
    const iv = buffer.subarray(0, 12)
    const authTag = buffer.subarray(12, 28)
    const ciphertext = buffer.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(ciphertext) + decipher.final('utf-8')
  }

  export function hashCPF(cpf: string): string {
    return crypto.createHash('sha256').update(cpf).digest('hex')
  }
  ```

- **MIRROR**: No existing crypto in codebase; follow Node.js built-in patterns
- **IMPORTS**: `import crypto from 'crypto'`
- **GOTCHA**:
  - IV must be 12 bytes (96 bits) for GCM
  - Always call `getAuthTag()` AFTER `final()`, not before
  - Decryption: `setAuthTag()` BEFORE `update()` and `final()`
  - IV must be unique per encryption (use `randomBytes(12)` always)
- **VALIDATE**: Unit test: encrypt/decrypt round-trip; verify original CPF matches

### Task 17: CREATE `apps/pipeline/src/scoring/engine.ts`

- **ACTION**: Implement pure scoring function (4 components → 0-100 overall)
- **IMPLEMENT**:

  ```typescript
  import type { IntegrityScore } from '@pah/shared'

  export interface ScoreComponents {
    transparencyScore: number    // 0-25
    legislativeScore: number     // 0-25
    financialScore: number       // 0-25
    anticorruptionScore: number  // 0-25 (binary: 25 if clean, 0 if exclusion_flag)
  }

  export function calculateIntegrityScore(components: ScoreComponents): number {
    // DR-002: Equal weights (0.25 each)
    return (
      components.transparencyScore * 0.25 +
      components.legislativeScore * 0.25 +
      components.financialScore * 0.25 +
      components.anticorruptionScore * 0.25
    )
  }

  export function computeTransparencyScore(sourceCount: number): number {
    // 0-25: proportional to data availability (6 sources max)
    return Math.min(25, Math.round((sourceCount / 6) * 25))
  }

  export function computeLegislativeScore(billCount: number, voteCount: number): number {
    // 0-25: proportional to parliamentary activity
    const total = billCount + voteCount
    return Math.min(25, Math.round((total / 100) * 25))  // Assume 100+ items = max score
  }

  export function computeFinancialScore(expenseCount: number): number {
    // 0-25: proportional to available expense records
    return Math.min(25, Math.round((expenseCount / 1000) * 25))  // Assume 1000+ = max
  }

  export function computeAnticorruptionScore(exclusionFlag: boolean): number {
    // 0-25: binary (25 if clean, 0 if excluded)
    return exclusionFlag ? 0 : 25
  }
  ```

- **MIRROR**: No existing scoring logic; follows pure function pattern
- **IMPORTS**: `import type { IntegrityScore } from '@pah/shared'`
- **GOTCHA**: DR-002 enforces equal weights (0.25 each) — no exceptions
- **VALIDATE**: Unit tests for all 4 score functions; verify edge cases (0 items, max items)

### Task 18: CREATE `apps/pipeline/src/matching/cpf.ts`

- **ACTION**: Implement CPF cross-source identity matching
- **IMPLEMENT**:

  ```typescript
  import { hashCPF } from '../crypto/cpf'

  export interface CPFMatch {
    politicianId: string
    cpfHash: string
    sources: string[]  // ['camara', 'senado']
  }

  export function matchPoliticiansByCPF(
    camaraCPFs: Map<string, string>,  // cpf → camaraId
    senadoCPFs: Map<string, string>,  // cpf → senadoId
  ): CPFMatch[] {
    const matches: CPFMatch[] = []
    const cpfIndex = new Map<string, string[]>()  // cpfHash → [sources]

    // Hash all CPFs and build index
    camaraCPFs.forEach((camaraId, cpf) => {
      const hash = hashCPF(cpf)
      cpfIndex.set(hash, [...(cpfIndex.get(hash) || []), 'camara'])
    })

    senadoCPFs.forEach((senadoId, cpf) => {
      const hash = hashCPF(cpf)
      cpfIndex.set(hash, [...(cpfIndex.get(hash) || []), 'senado'])
    })

    // Return matches where CPF appears in multiple sources
    cpfIndex.forEach((sources, hash) => {
      if (sources.length > 1) {
        matches.push({
          politicianId: '',  // Will be filled by publisher
          cpfHash: hash,
          sources,
        })
      }
    })

    return matches
  }
  ```

- **MIRROR**: No existing matching logic; follows pure function pattern
- **IMPORTS**: `import { hashCPF } from '../crypto/cpf'`
- **VALIDATE**: Unit test with mock CPF data; verify cross-source deduplication

### Task 19: CREATE `apps/pipeline/src/publisher/index.ts`

- **ACTION**: Implement idempotent upsert logic for all public schema tables
- **IMPLEMENT**:

  ```typescript
  import { eq, and, sql } from 'drizzle-orm'
  import { politicians, bills, votes, expenses, proposals, committees, integrityScores } from '@pah/db/public-schema'
  import type { PipelineDb } from '@pah/db/clients'
  import type { Politician, Bill, Vote, Expense, Proposal, Committee } from '@pah/shared'
  import { logger } from '../config/logger'

  export interface PublisherDeps {
    db: PipelineDb
  }

  export function createPublisher({ db }: PublisherDeps) {
    return {
      upsertPolitician: async (data: Politician) => {
        const { externalId, ...rest } = data
        await db
          .insert(politicians)
          .values({ externalId, ...rest })
          .onConflictDoUpdate({
            target: politicians.externalId,
            set: { ...rest, updatedAt: sql`now()` },
          })
        logger.debug({ externalId }, 'Upserted politician')
      },

      upsertBills: async (data: Bill[]) => {
        if (data.length === 0) return
        // Chunk for parameter limit
        const chunks = chunk(data, 200)
        for (const chunk of chunks) {
          await db
            .insert(bills)
            .values(chunk)
            .onConflictDoUpdate({
              target: [bills.source, bills.externalId],  // Composite unique
              set: { updatedAt: sql`now()` },
            })
        }
        logger.debug({ count: data.length }, 'Upserted bills')
      },

      // ... upsertVotes, upsertExpenses, etc.
    }
  }

  function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
  ```

- **MIRROR**: Pattern from `apps/api/CLAUDE.md:458-480` (onConflictDoUpdate)
- **IMPORTS**: `import { eq, and, sql } from 'drizzle-orm'` + schema imports
- **GOTCHA**:
  - Use composite `target: [table.source, table.externalId]` for bills (not just id)
  - Chunk large inserts to avoid parameter limit
  - Set `updatedAt: sql\`now()\`` for row versioning
- **VALIDATE**: Unit test: mock db client, verify insert/upsert calls

### Task 20: CREATE `apps/pipeline/src/publisher/errors.ts`

- **ACTION**: Define publication error classes
- **IMPLEMENT**:

  ```typescript
  export class PublicationError extends Error {
    constructor(
      public readonly table: string,
      public readonly reason: 'upsert_failed' | 'constraint_violation' | 'unknown',
      message: string,
    ) {
      super(`Publication to ${table} failed (${reason}): ${message}`)
      this.name = 'PublicationError'
    }
  }

  export class ConflictError extends Error {
    constructor(
      public readonly table: string,
      public readonly externalIds: string[],
    ) {
      super(`Conflict on ${table}: duplicate external_ids`)
      this.name = 'ConflictError'
    }
  }
  ```

- **MIRROR**: `apps/api/src/hooks/error-handler.ts:3-23` — error class pattern
- **IMPORTS**: None (extends Error)
- **VALIDATE**: `npx tsc --noEmit`

### Task 21: CREATE `apps/pipeline/src/scheduler.ts`

- **ACTION**: Register pg-boss queues and cron schedules for 6 adapters
- **IMPLEMENT**:

  ```typescript
  import PgBoss from 'pg-boss'
  import { env } from './config/env'
  import { logger } from './config/logger'

  export async function startScheduler(boss: PgBoss): Promise<void> {
    // Create queues with singleton policy (max 1 active job at a time)
    await boss.createQueue('pipeline:camara', { policy: 'singleton' })
    await boss.createQueue('pipeline:senado', { policy: 'singleton' })
    await boss.createQueue('pipeline:transparencia', { policy: 'singleton' })
    await boss.createQueue('pipeline:tse', { policy: 'singleton' })
    await boss.createQueue('pipeline:tcu', { policy: 'singleton' })
    await boss.createQueue('pipeline:cgu', { policy: 'singleton' })

    // Schedule cron jobs (times in São Paulo timezone)
    await boss.schedule('pipeline:camara', env.CRON_SCHEDULE_CAMARA, null, {
      tz: 'America/Sao_Paulo',
      retryLimit: 3,
    })
    await boss.schedule('pipeline:senado', env.CRON_SCHEDULE_SENADO, null, {
      tz: 'America/Sao_Paulo',
      retryLimit: 3,
    })
    // ... other 4 sources

    logger.info('Pipeline scheduler initialized with 6 sources')
  }

  export async function registerWorkers(
    boss: PgBoss,
    adapters: { camara: Function; senado: Function; /* ... */ },
  ): Promise<void> {
    await boss.work('pipeline:camara', { batchSize: 1 }, async () => {
      await adapters.camara()
    })
    await boss.work('pipeline:senado', { batchSize: 1 }, async () => {
      await adapters.senado()
    })
    // ... other 4 workers

    logger.info('Pipeline workers registered')
  }
  ```

- **MIRROR**: No existing pg-boss usage; follow v10 API from GitHub types
- **IMPORTS**: `import PgBoss from 'pg-boss'`
- **GOTCHA**:
  - `createQueue()` must run before `schedule()` (v10 requirement)
  - `schedule()` uses v10 API (NOT v12's `createSchedule()`)
  - `policy: 'singleton'` prevents concurrent jobs for same queue
  - Timezone: `America/Sao_Paulo` for Brazilian schedules
- **VALIDATE**: Integration test: start scheduler, verify queues created; check pg-boss tables in DB

### Task 22: CREATE `apps/pipeline/src/index.ts`

- **ACTION**: Bootstrap pipeline app (main entry point)
- **IMPLEMENT**:

  ```typescript
  import PgBoss from 'pg-boss'
  import { createPipelineDb } from '@pah/db/clients'
  import { env } from './config/env'
  import { logger } from './config/logger'
  import { startScheduler, registerWorkers } from './scheduler'
  import { createPublisher } from './publisher'
  import * as adapters from './adapters'
  import * as transformers from './transformers'

  async function main() {
    logger.info('Starting pipeline...')

    // Initialize database
    const db = createPipelineDb(env.DATABASE_URL_WRITER)
    const publisher = createPublisher({ db })

    // Initialize job queue
    const boss = new PgBoss(env.DATABASE_URL)
    await boss.start()
    logger.info('pg-boss started')

    // Initialize scheduler
    await startScheduler(boss)
    await registerWorkers(boss, {
      camara: async () => {
        const deputies = await adapters.fetchCamaraDeputies()
        const transformed = deputies.map(transformers.transformFromCamara)
        for (const p of transformed) {
          await publisher.upsertPolitician(p)
        }
      },
      // ... other adapters (5 more)
    })

    logger.info('Pipeline initialized and running')

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Shutting down...')
      await boss.stop()
      process.exit(0)
    })
  }

  main().catch((error) => {
    logger.error(error, 'Pipeline error')
    process.exit(1)
  })
  ```

- **MIRROR**: `apps/api/src/server.ts:1-15` for entry point pattern
- **IMPORTS**: Multiple adapter/transformer imports
- **VALIDATE**: `pnpm --filter @pah/pipeline dev` — should start without errors (connect to real DB)

### Task 23: CREATE `apps/pipeline/src/orchestrator.ts`

- **ACTION**: Implement main pipeline orchestration (fetch → transform → score → publish)
- **IMPLEMENT**:

  ```typescript
  import { createPublisher } from './publisher'
  import type { PipelineDb } from '@pah/db/clients'
  import { logger } from './config/logger'

  export async function runPipeline(
    db: PipelineDb,
    source: 'camara' | 'senado' | 'transparencia' | 'tse' | 'tcu' | 'cgu',
  ) {
    const publisher = createPublisher({ db })
    const startTime = Date.now()

    try {
      logger.info({ source }, 'Starting pipeline for source')

      // Fetch from external API
      const raw = await fetchFromSource(source)
      logger.info({ source, count: raw.length }, 'Fetched raw data')

      // Transform to domain types
      const transformed = raw.map((item) => transformBySource(source, item))
      logger.info({ source, count: transformed.length }, 'Transformed data')

      // Publish to PostgreSQL
      const published = await publishBySource(source, transformed, publisher)
      logger.info({ source, count: published }, 'Published to database')

      const duration = Date.now() - startTime
      logger.info({ source, duration }, 'Pipeline completed successfully')

      return { success: true, recordsProcessed: published }
    } catch (error) {
      logger.error({ source, error }, 'Pipeline failed')
      throw error
    }
  }
  ```

- **MIRROR**: Orchestration pattern from monolithic app architecture
- **IMPORTS**: Publisher, adapters, transformers
- **VALIDATE**: Integration test with real database; verify end-to-end data flow

### Task 24: CREATE `apps/pipeline/tsconfig.json`

- **ACTION**: Configure TypeScript for pipeline app
- **IMPLEMENT**:

  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "./dist",
      "rootDir": "./src"
    },
    "include": ["src"],
    "exclude": ["dist", "node_modules", "**/*.test.ts"]
  }
  ```

- **MIRROR**: `apps/api/tsconfig.json`
- **VALIDATE**: `npx tsc --noEmit` succeeds

### Task 25: CREATE `apps/pipeline/.eslintrc.cjs`

- **ACTION**: Configure ESLint for pipeline app
- **IMPLEMENT**:

  ```javascript
  module.exports = {
    extends: ['../../.eslintrc.cjs'],
    parserOptions: {
      project: './tsconfig.json',
    },
  }
  ```

- **MIRROR**: Root `.eslintrc.cjs`
- **VALIDATE**: `pnpm lint --filter @pah/pipeline` passes

### Task 26: CREATE `apps/pipeline/.env.example`

- **ACTION**: Document all required environment variables
- **IMPLEMENT**:

  ```env
  # Database
  DATABASE_URL=postgresql://user:password@localhost:5432/pah
  DATABASE_URL_WRITER=postgresql://pipeline_admin:password@localhost:5432/pah

  # API Keys & Credentials
  TRANSPARENCIA_API_KEY=your-api-key-here
  CPF_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

  # Scheduler
  CRON_SCHEDULE_CAMARA=0 2 * * *
  CRON_SCHEDULE_SENADO=0 3 * * *
  CRON_SCHEDULE_TRANSPARENCIA=0 4 * * *
  CRON_SCHEDULE_TSE=0 5 * * 0
  CRON_SCHEDULE_TCU=0 6 * * *
  CRON_SCHEDULE_CGU=0 7 * * *

  # Environment
  NODE_ENV=development
  LOG_LEVEL=info
  ```

- **MIRROR**: Root `.env.example`
- **VALIDATE**: File readable, no secrets included

### Task 27: CREATE `apps/pipeline/Dockerfile.pipeline`

- **ACTION**: Build Docker image for pipeline service
- **IMPLEMENT**:

  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app

  COPY package.json pnpm-lock.yaml ./
  RUN npm install -g pnpm && pnpm install --frozen-lockfile

  COPY . .
  RUN pnpm build

  ENV NODE_ENV=production
  CMD ["node", "dist/index.js"]
  ```

- **MIRROR**: No existing Dockerfile; follow Node.js best practices
- **VALIDATE**: `docker build -f apps/pipeline/Dockerfile.pipeline -t pah-pipeline .`

### Task 28: CREATE `apps/pipeline/src/services/scoring.service.ts`

- **ACTION**: Service layer for scoring (wraps pure engine functions)
- **IMPLEMENT**:

  ```typescript
  import { calculateIntegrityScore, computeTransparencyScore, computeLegislativeScore, computeFinancialScore, computeAnticorruptionScore } from '../scoring/engine'
  import { createPublicDb } from '@pah/db/clients'
  import { politicians, bills, votes, expenses, integrityScores } from '@pah/db/public-schema'
  import { eq } from 'drizzle-orm'

  export async function scorePolitician(db: PublicDb, politicianId: string) {
    // Fetch legislator's data from public schema
    const politician = await db.query.politicians.findFirst({ where: eq(politicians.id, politicianId) })
    if (!politician) throw new Error(`Politician ${politicianId} not found`)

    const billCount = await db.query.bills.findMany({ where: eq(bills.politicianId, politicianId) })
    const voteCount = await db.query.votes.findMany({ where: eq(votes.politicianId, politicianId) })
    const expenseCount = await db.query.expenses.findMany({ where: eq(expenses.politicianId, politicianId) })

    // Compute each component
    const transparencyScore = computeTransparencyScore(6)  // All 6 sources have data
    const legislativeScore = computeLegislativeScore(billCount.length, voteCount.length)
    const financialScore = computeFinancialScore(expenseCount.length)
    const anticorruptionScore = computeAnticorruptionScore(politician.exclusionFlag ?? false)

    // Compute overall
    const overallScore = calculateIntegrityScore({
      transparencyScore,
      legislativeScore,
      financialScore,
      anticorruptionScore,
    })

    return { transparencyScore, legislativeScore, financialScore, anticorruptionScore, overallScore }
  }
  ```

- **MIRROR**: Service pattern from `apps/api/src/services/`
- **VALIDATE**: Unit test; verify scoring components used in real service

---

## Testing Strategy

### Unit Tests to Write

| Test File                                           | Test Cases                                 | Validates                    |
| --------------------------------------------------- | ------------------------------------------ | ---------------------------- |
| `src/adapters/*.test.ts`                            | Valid API response, error handling         | Adapter parsing logic        |
| `src/transformers/*.test.ts`                        | Null fields, missing fields, type mapping  | Transformer correctness      |
| `src/scoring/engine.test.ts`                        | Score bounds (0-100), equal weights        | Scoring algorithm            |
| `src/crypto/cpf.test.ts`                            | Encrypt/decrypt round-trip, hash collision | CPF security                 |
| `src/publisher/index.test.ts`                       | Upsert idempotence, conflict handling      | Publisher correctness        |
| `src/matching/cpf.test.ts`                          | Single source, multi-source matches        | CPF matching logic           |

### Edge Cases Checklist

- [ ] Empty dataset from adapter (0 bills)
- [ ] Single item from adapter (1 bill)
- [ ] Missing optional fields (null photoUrl)
- [ ] Invalid date formats
- [ ] CPF with leading zeros (string, never cast to number)
- [ ] Special characters in names (accents, apostrophes)
- [ ] Very large expense amounts (numeric precision)
- [ ] Duplicate external_ids (upsert behavior)
- [ ] Network timeout / API unavailable
- [ ] Rate limit 429 response
- [ ] Malformed XML from Senado (fallback to JSON)
- [ ] CSV encoding issues (ISO-8859-1 vs UTF-8)
- [ ] Politician exists in Camara but not Senado (partial data)
- [ ] Exclusion records in TCU/CGU but not other sources

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
cd apps/pipeline
pnpm lint && pnpm typecheck
# Expect: Exit 0, no errors or warnings
```

### Level 2: UNIT_TESTS

```bash
cd apps/pipeline
pnpm test
# Expect: All tests pass, coverage >= 80% for adapters/transformers
```

### Level 3: FULL_SUITE

```bash
pnpm install
pnpm --filter @pah/pipeline lint && pnpm --filter @pah/pipeline test && pnpm --filter @pah/pipeline build
# Expect: All pass, dist/ directory created with compiled JS
```

### Level 4: DATABASE_VALIDATION

**Start local PostgreSQL (docker-compose.yml):**

```bash
docker-compose up -d postgres
pnpm --filter @pah/db run migrate:dev  # Run migrations
```

**Verify schema creation:**

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'internal_data';
-- Expect: raw_source_data, exclusion_records, politician_identifiers, ingestion_logs, data_source_status

SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Expect: politicians, integrity_scores, bills, votes, expenses, proposals, committees
```

### Level 5: PIPELINE_INTEGRATION_TEST

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/pah
export DATABASE_URL_WRITER=postgresql://user:password@localhost:5432/pah
export TRANSPARENCIA_API_KEY=test-key
export CPF_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

pnpm --filter @pah/pipeline dev  # Start pipeline in dev mode

# In another terminal:
npm install -g wait-for-it
wait-for-it localhost:5432 -- psql -U user -d pah -c "SELECT COUNT(*) FROM public.politicians;"
# Expect: >0 rows (seed data + pipeline results)
```

### Level 6: END-TO-END VALIDATION

1. **Verify data ingestion:**

   ```sql
   SELECT source, COUNT(*) FROM internal_data.raw_source_data GROUP BY source;
   -- Expect: 6 rows (one per adapter)
   ```

2. **Verify politician scoring:**

   ```sql
   SELECT COUNT(*) FROM public.integrity_scores WHERE overall_score > 0;
   -- Expect: 594 (all federal legislators)
   ```

3. **Verify CPF encryption:**

   ```sql
   SELECT COUNT(*) FROM internal_data.politician_identifiers;
   -- Expect: > 0, cpf_encrypted is binary, cpf_hash is hex
   ```

4. **Verify API still works:**

   ```bash
   curl http://localhost:3001/api/v1/politicians?limit=5
   # Expect: 200 OK, 5 politician cards with real data
   ```

---

## Acceptance Criteria

- [ ] All 28 tasks completed in dependency order
- [ ] Level 1 validation (lint + typecheck) passes
- [ ] Level 2 validation (unit tests) passes with ≥ 80% coverage
- [ ] Level 3 validation (full suite) passes
- [ ] Level 4 validation (database schema) passes
- [ ] Level 5 validation (pipeline integration) passes
- [ ] Level 6 validation (end-to-end) confirms 594 politicians scored
- [ ] 6 adapters fetch data from all government sources
- [ ] Transformers normalize to shared `@pah/shared` types
- [ ] CPF encryption/hashing works end-to-end (never exposed in API)
- [ ] Scoring engine implements DR-002 (equal 0.25 weights)
- [ ] Idempotent upserts via Drizzle ORM `onConflictDoUpdate`
- [ ] pg-boss scheduler runs 6 independent cron jobs
- [ ] Exclusion detection sets `exclusion_flag` boolean only (silent exclusion per DR-001)
- [ ] All code mirrors existing codebase patterns (naming, error handling, logging)
- [ ] No integration tests yet (deferred; schema testing sufficient for MVP)

---

## Completion Checklist

- [ ] All tasks completed in dependency order
- [ ] Each task validated immediately after completion
- [ ] Level 1: Static analysis (lint + type-check) passes
- [ ] Level 2: Unit tests pass
- [ ] Level 3: Full test suite + build succeeds
- [ ] Level 4: Database validation passes
- [ ] Level 5: Pipeline integration test passes
- [ ] Level 6: End-to-end validation confirms all 6 adapters working
- [ ] All acceptance criteria met
- [ ] No regressions in API or web tests
- [ ] Code review ready

---

## Risks and Mitigations

| Risk                                          | Likelihood | Impact | Mitigation                                                            |
| --------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------- |
| Senado API returns XML instead of JSON       | MEDIUM     | HIGH   | Build XML parser (fast-xml-parser) as fallback; test both formats     |
| Portal da Transparencia rate limit (90 req/min) | HIGH       | MEDIUM | Implement p-limit(1) + 700ms delay; queue long-running jobs           |
| TSE CSV encoding (ISO-8859-1) mismatch       | MEDIUM     | LOW    | Validate actual file encoding before deployment; support both variants |
| CPF matching fails for name changes           | LOW        | LOW    | Log unmatched IDs; manual review step post-MVP                        |
| pg-boss connection pool exhaustion            | LOW        | HIGH   | Monitor connection usage; adjust pool size if needed                   |
| PostgreSQL numeric type precision loss        | LOW        | MEDIUM | Use `mode: 'string'` in Drizzle; convert to decimal.js for arithmetic |
| Large CSV files (>100MB) timeout              | MEDIUM     | HIGH   | Stream-parse with csv-parse; implement timeout per politician         |
| TCU API authentication not documented         | HIGH       | HIGH   | Validate against real endpoint before implementing; stub for now       |

---

## Notes

**Critical implementation order:**

1. **Database foundation first** (internal schema tables) — all adapters depend on DDL
2. **Adapters second** — independent of each other; can implement in parallel
3. **Transformers with adapters** — one-to-one mapping, testable independently
4. **Publisher third** — depends on all public schema tables being ready
5. **Scoring engine fourth** — pure function, can be tested without database
6. **Scheduler last** — depends on all other layers
7. **End-to-end test with seed database** — verify data flows through all 6 sources

**Deferred decisions:**

- TCU CADIRREG endpoint URL and auth method — needs validation against production
- CGU-PAD CSV exact delimiter and encoding — needs actual file inspection
- Supabase free tier connection limits — verify before deploying to production (may need pooling adjustments)

**Post-MVP enhancements:**

- Senado JSON format once XML parsing is proven stable
- Backfill strategy for historical data (currently first-run only)
- Dashboard to monitor pipeline health (logs, job status, data freshness)
- Alert subscriptions (user-facing; blocked on authentication)

---

*Generated: 2026-03-10*
*Status: READY FOR IMPLEMENTATION*
*Complexity: HIGH (3-week estimate for experienced developer)*
*Blockers: None (all external APIs available, no infrastructure blockers)*
