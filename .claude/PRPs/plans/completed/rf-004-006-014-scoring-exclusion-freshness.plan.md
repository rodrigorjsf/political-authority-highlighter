# Feature: Scoring Engine + Anti-Corruption Exclusion + Data Freshness (RF-004, RF-006, RF-014)

## Summary

Wire the already-implemented scoring engine into the pipeline orchestrator, complete the exclusion detection chain (TCU/CGU records → exclusion_flag → profile notice), move `data_source_status` from `internal_data` to `public` schema so `api_reader` can serve it, and create the `/api/v1/sources` endpoint + `/fontes` web page. Most of the hard work (engine functions, service, publisher, adapters, ExclusionNotice component) already exists — this phase connects all the wiring.

## User Story

As a Brazilian citizen viewing a politician's profile,
I want to see a real integrity score with its breakdown, an anti-corruption notice when applicable, and when the data was last updated,
So that I can trust the platform's data and understand what drives the score.

## Problem Statement

The pipeline runs and ingests data, but `scorePolitician()` is never called — scores remain from seed data. Exclusion detection adapters (TCU, CGU) fetch data but their output is never stored. `data_source_status` table exists in the DB but nothing writes to it, and `api_reader` cannot read it (it is in `internal_data`). No `/fontes` page exists for citizens to see data source freshness.

## Solution Statement

**8 wiring tasks, 0 new algorithms.** Move `data_source_status` to `public` schema (new migration). Add `.returning()` to `upsertPolitician`, add `upsertExclusionRecord` + `upsertDataSourceStatus` to publisher. Wire scoring call + exclusion detection + status updates into orchestrator. Add `GET /api/v1/sources` (new schema/repo/service/route). Create shared `DataSourceStatus` type. Add `fetchSources()` to api-client. Create `/fontes` page following `metodologia/page.tsx` pattern.

## Metadata

| Field            | Value |
|------------------|-------|
| Type             | ENHANCEMENT (wiring) |
| Complexity       | MEDIUM |
| Systems Affected | pipeline, db, api, shared, web |
| Dependencies     | Phase 7 (pipeline bootstrapped — complete ✓) |
| Estimated Tasks  | 16 |

---

## UX Design

### Before State

```
╔══════════════════════════════════════════════════════════════════╗
║                         BEFORE STATE                             ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌──────────────┐    Pipeline runs     ┌───────────────┐        ║
║  │ pg-boss job  │ ──────────────────► │ upsertPolitician│       ║
║  │ (daily cron) │                     │ (void return)  │        ║
║  └──────────────┘                     └───────────────┘        ║
║         │                                                        ║
║         │  TCU/CGU adapters fetch data                          ║
║         │  but output is DISCARDED                              ║
║         │                                                        ║
║         ▼                                                        ║
║  ┌──────────────┐    data_source_status table exists but        ║
║  │  No scoring  │    NOTHING WRITES to it                       ║
║  │  No exclusion│    api_reader has NO ACCESS to internal_data  ║
║  │  No status   │                                               ║
║  └──────────────┘                                               ║
║                                                                  ║
║  Profile page: shows SEED DATA scores (fixed numbers)           ║
║  /fontes page: DOES NOT EXIST (404)                             ║
║  Exclusion notice: never shown (exclusion_flag always false)    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### After State

```
╔══════════════════════════════════════════════════════════════════╗
║                          AFTER STATE                             ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌──────────────┐    Pipeline runs     ┌───────────────┐        ║
║  │ pg-boss job  │ ──────────────────► │upsertPolitician│        ║
║  │ (daily cron) │                     │ .returning(id) │        ║
║  └──────────────┘                     └──────┬────────┘        ║
║                                              │ id              ║
║                                              ▼                  ║
║                                    ┌─────────────────┐         ║
║                                    │ scorePolitician  │         ║
║                                    │ (real computed   │         ║
║                                    │  score written)  │         ║
║                                    └─────────────────┘         ║
║                                                                  ║
║  ┌──────────────────────────────────────────────────────┐       ║
║  │  Exclusion Detection Chain (TCU, CGU)                │       ║
║  │  fetch → match CPF → upsertExclusionRecord           │       ║
║  │  → updateExclusionFlag → score picks it up           │       ║
║  └──────────────────────────────────────────────────────┘       ║
║                                                                  ║
║  ┌──────────────────────────────────────────────────────┐       ║
║  │  upsertDataSourceStatus writes to public.data_source_status  ║
║  │  → api_reader can read it → /api/v1/sources responds │       ║
║  └──────────────────────────────────────────────────────┘       ║
║                                                                  ║
║  Profile: real score + exclusion notice when applicable         ║
║  /fontes: shows all 6 sources with last sync + record count     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/politicos/[slug]` | Seed data scores (fixed) | Real computed scores | Score reflects actual bills/votes/expenses |
| `/politicos/[slug]` | ExclusionNotice never shown | Shown when exclusion_flag=true | Anti-corruption data trust |
| `/fontes` | 404 | Page listing 6 sources with sync times | Transparency about data recency |
| `/api/v1/sources` | 404 | JSON array of source status | Enables /fontes page and future uses |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `apps/pipeline/src/publisher/index.ts` | all | Pattern to MODIFY — add .returning(), add 2 new methods |
| P0 | `apps/pipeline/src/orchestrator.ts` | all | Pattern to MODIFY — wire scoring + exclusion + status |
| P0 | `apps/pipeline/src/services/scoring.service.ts` | all | `scorePolitician(db, id)` signature to CALL |
| P0 | `packages/db/src/internal-schema.ts` | 105-116 | `dataSourceStatus` definition to MOVE to public schema |
| P0 | `packages/db/src/public-schema.ts` | all | Where to ADD dataSourceStatus table |
| P1 | `apps/api/src/routes/bills.route.ts` | all | Route pattern to COPY for sources route |
| P1 | `apps/api/src/services/bill.service.ts` | all | Service factory pattern to COPY |
| P1 | `apps/api/src/schemas/bill.schema.ts` | all | TypeBox schema pattern to COPY |
| P1 | `apps/api/src/repositories/bill.repository.ts` | all | Repository pattern to COPY |
| P1 | `apps/api/src/app.ts` | all | Where to REGISTER new route |
| P2 | `apps/web/src/app/metodologia/page.tsx` | all | ISR page pattern to COPY for /fontes |
| P2 | `apps/web/src/lib/api-client.ts` | all | Where to ADD fetchSources() |
| P2 | `packages/db/migrations/0007_add_committees.sql` | all | SQL pattern to COPY for new migration |
| P2 | `apps/pipeline/src/matching/cpf.ts` | all | matchPoliticiansByCPF signature for exclusion wiring |
| P2 | `apps/pipeline/src/transformers/tcu.ts` | all | transformTCUExclusion signature |

---

## Patterns to Mirror

**PUBLISHER_RETURNING (how to get id after upsert):**

```typescript
// SOURCE: apps/pipeline/src/publisher/index.ts:29-47 (current pattern — MODIFY this)
// CURRENT: returns Promise<void>
// CHANGE: add .returning({ id: politicians.id }) and return the id

async upsertPolitician(data: PoliticianUpsert): Promise<{ id: string }> {
  const [result] = await db
    .insert(politicians)
    .values(data)
    .onConflictDoUpdate({
      target: politicians.externalId,
      set: { /* same as now */ updatedAt: sql`now()` },
    })
    .returning({ id: politicians.id })

  if (result === undefined) throw new Error(`Failed to upsert politician: ${data.externalId}`)
  logger.debug({ externalId: data.externalId }, 'Upserted politician')
  return result
},
```

**PUBLISHER_METHOD_NEW (pattern for new methods — mirror existing):**

```typescript
// SOURCE: apps/pipeline/src/publisher/index.ts:138-145 (updateExclusionFlag — same pattern)
async upsertExclusionRecord(data: ExclusionRecordUpsert): Promise<void> {
  await db
    .insert(exclusionRecords)
    .values(data)
    .onConflictDoNothing() // idempotent — same record = same hash = same upsert
  logger.debug({ politicianId: data.politicianId, source: data.source }, 'Upserted exclusion record')
},

async upsertDataSourceStatus(source: string, recordCount: number): Promise<void> {
  await db
    .insert(dataSourceStatus)
    .values({ source, recordCount, status: 'synced', lastSyncAt: sql`now()` })
    .onConflictDoUpdate({
      target: dataSourceStatus.source,
      set: { recordCount, status: 'synced', lastSyncAt: sql`now()`, updatedAt: sql`now()` },
    })
  logger.debug({ source, recordCount }, 'Updated data source status')
},
```

**PUBLISHER_INTERFACE (update to include new methods):**

```typescript
// SOURCE: apps/pipeline/src/publisher/index.ts:7-23 (current Publisher interface)
// ADD to interface:
export interface Publisher {
  upsertPolitician(data: PoliticianUpsert): Promise<{ id: string }>  // CHANGE return type
  // ... existing methods ...
  upsertExclusionRecord(data: ExclusionRecordUpsert): Promise<void>   // ADD
  upsertDataSourceStatus(source: string, recordCount: number): Promise<void>  // ADD
}
```

**ORCHESTRATOR_SCORING_WIRE:**

```typescript
// SOURCE: apps/pipeline/src/orchestrator.ts:32-35 (current CAMARA case)
// CURRENT:
const { id } = await publisher.upsertPolitician(p)
await scorePolitician(db, id)

// Note: scorePolitician import must be added to orchestrator.ts imports
```

**ORCHESTRATOR_EXCLUSION_WIRE:**

```typescript
// SOURCE: apps/pipeline/src/orchestrator.ts:58-68 (current TCU/CGU cases)
// REPLACE stub with real detection:
case DataSource.TCU: {
  const identifiers = await db.select({ cpfHash: politicianIdentifiers.cpfHash, politicianId: politicianIdentifiers.politicianId }).from(politicianIdentifiers)
  const cpfHashes = identifiers.map(({ cpfHash }) => cpfHash)
  const exclusionMap = await adapters.fetchTCUExclusionsBatch(cpfHashes)
  for (const { cpfHash, politicianId } of identifiers) {
    const records = exclusionMap.get(cpfHash) ?? []
    for (const raw of records) {
      const exclusion = transformTCUExclusion(raw, politicianId, cpfHash)
      await publisher.upsertExclusionRecord(exclusion)
    }
    const hasExclusions = records.length > 0
    if (hasExclusions) {
      await publisher.updateExclusionFlag(politicianId, true)
    }
  }
  recordsProcessed = exclusionMap.size
  break
}
```

**API_ROUTE_PATTERN:**

```typescript
// SOURCE: apps/api/src/routes/bills.route.ts:15-42 (COPY this pattern)
export function createSourcesRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get('/sources', {
      schema: { response: { 200: SourceListResponseSchema } },
    }, async (_request, reply) => {
      const result = await deps.sourceService.findAll()
      void reply.header('Cache-Control', 'public, max-age=60, s-maxage=300')
      return result
    })
  }
}
```

**API_SERVICE_PATTERN (no cursor needed — small fixed list):**

```typescript
// SOURCE: apps/api/src/services/bill.service.ts:42-71 (COPY factory pattern)
export function createSourceService(repository: SourceRepository): {
  findAll: () => Promise<SourceListResponseDto>
} {
  return {
    async findAll(): Promise<SourceListResponseDto> {
      const rows = await repository.selectAll()
      return { data: rows.map(toSourceDto) }
    },
  }
}
export type SourceService = ReturnType<typeof createSourceService>
```

**API_TYPEBOX_SCHEMA:**

```typescript
// SOURCE: apps/api/src/schemas/bill.schema.ts:14-33 (COPY TypeBox pattern)
export const SourceStatusSchema = Type.Object({
  source: Type.String(),
  lastSyncAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  recordCount: Type.Integer({ minimum: 0 }),
  status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('syncing'),
    Type.Literal('synced'),
    Type.Literal('failed'),
  ]),
  updatedAt: Type.String({ format: 'date-time' }),
})
export type SourceStatusDto = Static<typeof SourceStatusSchema>

export const SourceListResponseSchema = Type.Object({
  data: Type.Array(SourceStatusSchema),
})
export type SourceListResponseDto = Static<typeof SourceListResponseSchema>
```

**WEB_PAGE_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/metodologia/page.tsx (COPY this structure for /fontes)
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Fontes de Dados | Autoridade Política',
  description: 'Status de sincronização das 6 fontes de dados governamentais.',
}

export default async function FontesPage(): Promise<React.JSX.Element> {
  const { data: sources } = await fetchSources()
  return ( /* render table of sources */ )
}
```

**TEST_PATTERN (service test):**

```typescript
// SOURCE: apps/api/src/services/politician.service.test.ts:9-31 (COPY mock pattern)
function buildRepository(rows: SourceStatusRow[] = []): SourceRepository {
  return {
    selectAll: vi.fn().mockResolvedValue(rows),
  }
}
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `packages/db/migrations/0008_add_data_source_status.sql` | CREATE | Move data_source_status to public schema (api_reader access) |
| `packages/db/src/public-schema.ts` | UPDATE | ADD dataSourceStatus table definition |
| `packages/db/src/internal-schema.ts` | UPDATE | REMOVE dataSourceStatus table (now in public schema) |
| `apps/pipeline/src/publisher/index.ts` | UPDATE | `.returning()` on upsertPolitician; add upsertExclusionRecord, upsertDataSourceStatus |
| `apps/pipeline/src/orchestrator.ts` | UPDATE | Wire scorePolitician, exclusion detection, data_source_status updates |
| `packages/shared/src/types/source.ts` | CREATE | DataSourceStatus interface |
| `packages/shared/src/index.ts` | UPDATE | Export DataSourceStatus type |
| `apps/api/src/schemas/source.schema.ts` | CREATE | TypeBox request/response schemas |
| `apps/api/src/repositories/source.repository.ts` | CREATE | Drizzle query against public.data_source_status |
| `apps/api/src/services/source.service.ts` | CREATE | Business logic + DTO mapping |
| `apps/api/src/routes/sources.route.ts` | CREATE | GET /api/v1/sources route |
| `apps/api/src/app.ts` | UPDATE | Register sources route + inject deps |
| `apps/web/src/lib/api-client.ts` | UPDATE | ADD fetchSources() function |
| `apps/web/src/app/fontes/page.tsx` | CREATE | /fontes SSG page (revalidate=3600) |
| `apps/pipeline/src/publisher/publisher.test.ts` | CREATE | Tests for new publisher methods |
| `apps/api/src/services/source.service.test.ts` | CREATE | Unit tests for source service |

---

## NOT Building (Scope Limits)

- **Real-time status updates**: `data_source_status` shows last completed sync, not live "syncing" state. Setting `status: 'syncing'` before each run requires a separate pre-flight update — deferred to post-MVP
- **Error details in /fontes**: When a pipeline job fails, the error message stays in `internal_data.ingestion_logs`, not surfaced on /fontes (DR-006 audit log protection)
- **Vercel ISR revalidation trigger**: The pipeline can trigger `revalidatePath('/fontes')` after sync — this is deferred; the `revalidate=3600` TTL is sufficient for MVP
- **Per-source transparency score**: `computeTransparencyScore(6)` always returns 25 — computing real per-politician source coverage is not part of this phase

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

---

### Task 1: CREATE `packages/db/migrations/0008_add_data_source_status.sql`

- **ACTION**: CREATE SQL migration moving `data_source_status` from `internal_data` to `public` schema
- **IMPLEMENT**:

  ```sql
  -- Move data_source_status from internal_data to public schema
  -- api_reader needs SELECT access; source status is non-sensitive (LAI compliant)
  DROP TABLE IF EXISTS internal_data.data_source_status;

  CREATE TABLE IF NOT EXISTS public.data_source_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) UNIQUE NOT NULL,
    last_sync_at TIMESTAMPTZ,
    record_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Seed initial rows for all 6 sources so the /fontes page shows something
  INSERT INTO public.data_source_status (source, status) VALUES
    ('camara', 'pending'),
    ('senado', 'pending'),
    ('transparencia', 'pending'),
    ('tse', 'pending'),
    ('tcu', 'pending'),
    ('cgu', 'pending')
  ON CONFLICT (source) DO NOTHING;

  -- Grant read access to api_reader role
  GRANT SELECT ON TABLE public.data_source_status TO api_reader;
  ```

- **MIRROR**: `packages/db/migrations/0007_add_committees.sql` — copy `CREATE TABLE IF NOT EXISTS` style
- **GOTCHA**: Do NOT use `CONSTRAINT` syntax for `UNIQUE` — use inline `UNIQUE` as shown in other migrations; the `api_reader` GRANT is critical otherwise the API cannot read this table
- **VALIDATE**: `pnpm --filter @pah/db migrate` (or apply manually against local DB)

---

### Task 2: UPDATE `packages/db/src/public-schema.ts`

- **ACTION**: ADD `dataSourceStatus` table definition at end of file
- **IMPLEMENT**:

  ```typescript
  // SOURCE: packages/db/src/internal-schema.ts:105-116 (exact same shape, different schema)
  // Add after the `expenses` table definition

  import { integer } from 'drizzle-orm/pg-core'  // already imported — just confirm

  /**
   * Data freshness metadata per government source.
   * Moved to public schema so api_reader can serve it via GET /api/v1/sources.
   * Non-sensitive: only source names, sync timestamps, record counts, status.
   */
  export const dataSourceStatus = publicData.table('data_source_status', {
    id: uuid('id').primaryKey().defaultRandom(),
    source: varchar('source', { length: 50 }).unique().notNull(),
    lastSyncAt: timestamp('last_sync_at'),
    recordCount: integer('record_count').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // 'pending' | 'syncing' | 'synced' | 'failed'
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  })
  ```

- **IMPORTS**: `integer` — check if already imported at top of file. If not, add to the existing import from `drizzle-orm/pg-core`
- **GOTCHA**: `publicData` is the schema object (from `pgSchema('public')`); use `publicData.table(...)` not `pgTable(...)`
- **VALIDATE**: `pnpm --filter @pah/db typecheck`

---

### Task 3: UPDATE `packages/db/src/internal-schema.ts`

- **ACTION**: REMOVE `dataSourceStatus` table definition (lines 101-116)
- **IMPLEMENT**: Delete the `dataSourceStatus` export and its comment block
- **GOTCHA**: Also remove `integer` from imports if it is only used by `dataSourceStatus`. Check if other tables in internal-schema.ts use `integer` (yes — `ingestionLogs.recordsProcessed` uses it, so KEEP the import)
- **VALIDATE**: `pnpm --filter @pah/db typecheck`

---

### Task 4: UPDATE `apps/pipeline/src/publisher/index.ts`

- **ACTION**: Three changes — (1) modify `upsertPolitician` to return `{ id: string }`, (2) add `upsertExclusionRecord`, (3) add `upsertDataSourceStatus`
- **IMPORTS TO ADD**:

  ```typescript
  import { exclusionRecords, dataSourceStatus } from '@pah/db/public-schema'
  // NOTE: exclusionRecords is in internal_data, dataSourceStatus moves to public
  // The pipeline uses PipelineDb which has access to both schemas
  // After Task 2/3: import exclusionRecords from internal-schema, dataSourceStatus from public-schema
  import { exclusionRecords } from '@pah/db/internal-schema'
  import { dataSourceStatus } from '@pah/db/public-schema'
  import type { ExclusionRecordUpsert } from '../types.js'
  ```

- **CHANGE 1 — upsertPolitician return type**:

  ```typescript
  // Change interface method signature:
  upsertPolitician(data: PoliticianUpsert): Promise<{ id: string }>  // was Promise<void>

  // Change implementation — add .returning() chain:
  async upsertPolitician(data: PoliticianUpsert): Promise<{ id: string }> {
    const [result] = await db
      .insert(politicians)
      .values(data)
      .onConflictDoUpdate({
        target: politicians.externalId,
        set: {
          name: data.name,
          slug: data.slug,
          state: data.state,
          party: data.party,
          role: data.role,
          photoUrl: data.photoUrl,
          tenureStartDate: data.tenureStartDate,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: politicians.id })
    if (result === undefined) throw new Error(`Failed to upsert politician ${data.externalId}`)
    logger.debug({ externalId: data.externalId }, 'Upserted politician')
    return result
  },
  ```

- **CHANGE 2 — add upsertExclusionRecord**:

  ```typescript
  async upsertExclusionRecord(data: ExclusionRecordUpsert): Promise<void> {
    await db
      .insert(exclusionRecords)
      .values({
        politicianId: data.politicianId,
        source: data.source,
        cpfHash: data.cpfHash,
        exclusionType: data.exclusionType,
        recordDate: data.recordDate,
        recordUrl: data.recordUrl,
      })
      .onConflictDoNothing()
    logger.debug({ politicianId: data.politicianId, source: data.source }, 'Upserted exclusion record')
  },
  ```

- **CHANGE 3 — add upsertDataSourceStatus**:

  ```typescript
  async upsertDataSourceStatus(source: string, recordCount: number): Promise<void> {
    await db
      .insert(dataSourceStatus)
      .values({ source, recordCount, status: 'synced', lastSyncAt: sql`now()` })
      .onConflictDoUpdate({
        target: dataSourceStatus.source,
        set: {
          recordCount,
          status: 'synced',
          lastSyncAt: sql`now()`,
          updatedAt: sql`now()`,
        },
      })
    logger.debug({ source, recordCount }, 'Updated data source status')
  },
  ```

- **GOTCHA**: `noUncheckedIndexedAccess` — `[result]` destructuring gives `T | undefined`; the undefined guard is required (see the throw). The `onConflictDoNothing()` for exclusion records: check if there's a unique constraint on `(politician_id, source, cpf_hash)` in the migration — if not, this is fine as a safety fallback; add `ON CONFLICT DO NOTHING` works without a constraint (it simply won't prevent duplicates — add a unique constraint to the exclusion_records table if deduplication is critical; for MVP this is fine)
- **VALIDATE**: `pnpm --filter @pah/pipeline typecheck`

---

### Task 5: UPDATE `apps/pipeline/src/orchestrator.ts`

- **ACTION**: Wire scoring, exclusion detection, and status updates into `runPipeline`
- **IMPORTS TO ADD**:

  ```typescript
  import { scorePolitician } from './services/scoring.service.js'
  import { matchPoliticiansByCPF } from './matching/cpf.js'
  import { transformTCUExclusion } from './transformers/tcu.js'
  import { transformCGUExclusion } from './transformers/cgu.js'
  import { politicianIdentifiers } from '@pah/db/internal-schema'
  ```

- **CHANGE CAMARA case** — add scoring after upsert and status update at end:

  ```typescript
  case DataSource.CAMARA: {
    const deputies = await adapters.fetchCamaraDeputies()
    const transformed = deputies.map(transformCamaraDeputy)
    for (const p of transformed) {
      const { id } = await publisher.upsertPolitician(p)
      await scorePolitician(db, id)
    }
    recordsProcessed = transformed.length
    await publisher.upsertDataSourceStatus(source, recordsProcessed)
    break
  }
  ```

- **CHANGE SENADO case** — same pattern:

  ```typescript
  case DataSource.SENADO: {
    const senadores = await adapters.fetchSenadores()
    const transformed = senadores.map(transformSenador)
    for (const p of transformed) {
      const { id } = await publisher.upsertPolitician(p)
      await scorePolitician(db, id)
    }
    recordsProcessed = transformed.length
    await publisher.upsertDataSourceStatus(source, recordsProcessed)
    break
  }
  ```

- **CHANGE TCU case** — wire exclusion detection:

  ```typescript
  case DataSource.TCU: {
    const identifiers = await db
      .select({ cpfHash: politicianIdentifiers.cpfHash, politicianId: politicianIdentifiers.politicianId })
      .from(politicianIdentifiers)
    const cpfHashes = identifiers.map(({ cpfHash }) => cpfHash)
    if (cpfHashes.length > 0) {
      const exclusionMap = await adapters.fetchTCUExclusionsBatch(cpfHashes)
      for (const { cpfHash, politicianId } of identifiers) {
        const records = exclusionMap.get(cpfHash) ?? []
        for (const raw of records) {
          const exclusion = transformTCUExclusion(raw, politicianId, cpfHash)
          await publisher.upsertExclusionRecord(exclusion)
        }
        if (records.length > 0) {
          await publisher.updateExclusionFlag(politicianId, true)
        }
      }
      recordsProcessed = exclusionMap.size
    }
    await publisher.upsertDataSourceStatus(source, recordsProcessed)
    break
  }
  ```

- **CHANGE CGU case** — fetch, match, store exclusions:

  ```typescript
  case DataSource.CGU: {
    const exclusions = await adapters.fetchCGUExclusions()
    const identifiers = await db
      .select({ cpfHash: politicianIdentifiers.cpfHash, politicianId: politicianIdentifiers.politicianId })
      .from(politicianIdentifiers)
    const cpfHashSet = new Set(identifiers.map(({ cpfHash }) => cpfHash))
    for (const raw of exclusions) {
      const cpfHash = raw.CPF_HASH  // CGU exclusion already has normalized cpf hash
      if (!cpfHashSet.has(cpfHash)) continue
      const identifier = identifiers.find(({ cpfHash: h }) => h === cpfHash)
      if (identifier === undefined) continue
      const exclusion = transformCGUExclusion(raw, identifier.politicianId, cpfHash)
      await publisher.upsertExclusionRecord(exclusion)
      await publisher.updateExclusionFlag(identifier.politicianId, true)
    }
    recordsProcessed = exclusions.length
    await publisher.upsertDataSourceStatus(source, recordsProcessed)
    break
  }
  ```

- **CHANGE TRANSPARENCIA case** — add status update (fetching still deferred):

  ```typescript
  case DataSource.TRANSPARENCIA: {
    logger.info('Transparencia source requires politician IDs — skipping standalone run')
    await publisher.upsertDataSourceStatus(source, 0)
    break
  }
  ```

- **CHANGE TSE case** — add status update:

  ```typescript
  case DataSource.TSE: {
    const candidates = await adapters.fetchTSECandidates(new Date().getFullYear())
    recordsProcessed = candidates.length
    logger.info({ count: candidates.length }, 'TSE candidates fetched for matching')
    await publisher.upsertDataSourceStatus(source, recordsProcessed)
    break
  }
  ```

- **GOTCHA 1**: `noUncheckedIndexedAccess` — use `.find()` not `identifiers[i]` for CPF lookups; the `identifier` guard is required. **GOTCHA 2**: CGU exclusion format — check `transformers/cgu.ts` to confirm field names; the `CPF_HASH` field name is a placeholder, check actual CGU raw type. **GOTCHA 3**: Scoring in CAMARA/SENADO runs per-politician (sequential) — for 594 politicians this may be slow; this is acceptable for MVP (daily cron job). **GOTCHA 4**: `identifiers` may be empty (no CPF data yet); add `if (cpfHashes.length > 0)` guard as shown
- **VALIDATE**: `pnpm --filter @pah/pipeline typecheck && pnpm --filter @pah/pipeline test`

---

### Task 6: CREATE `apps/pipeline/src/publisher/publisher.test.ts`

- **ACTION**: CREATE unit tests for the new publisher methods
- **IMPLEMENT**: Test `upsertPolitician` returning id, `upsertExclusionRecord`, `upsertDataSourceStatus`
- **MIRROR**: `apps/pipeline/src/scoring/engine.test.ts` for test structure
- **PATTERN**:

  ```typescript
  import { describe, it, expect, vi } from 'vitest'
  import type { PipelineDb } from '@pah/db/clients'

  // Build a stub db that returns controlled results
  function buildMockDb(returning: { id: string }): Pick<PipelineDb, 'insert'> {
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([returning]),
        }),
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    })
    return { insert: mockInsert } as unknown as Pick<PipelineDb, 'insert'>
  }

  describe('createPublisher', () => {
    describe('upsertPolitician', () => {
      it('returns the upserted politician id', async () => { ... })
      it('throws when db returns no rows', async () => { ... })
    })
    describe('upsertExclusionRecord', () => {
      it('calls insert on exclusion_records table', async () => { ... })
    })
    describe('upsertDataSourceStatus', () => {
      it('calls upsert on data_source_status with synced status', async () => { ... })
    })
  })
  ```

- **GOTCHA**: `PipelineDb` is complex — use `as unknown as PipelineDb` in test factories (allowed per CLAUDE.md)
- **VALIDATE**: `pnpm --filter @pah/pipeline test`

---

### Task 7: CREATE `packages/shared/src/types/source.ts`

- **ACTION**: CREATE shared type for data source status (used by both API DTOs and web)
- **IMPLEMENT**:

  ```typescript
  export interface DataSourceStatus {
    source: string
    lastSyncAt: string | null
    recordCount: number
    status: 'pending' | 'syncing' | 'synced' | 'failed'
    updatedAt: string
  }

  export interface SourceListResponse {
    data: DataSourceStatus[]
  }
  ```

- **MIRROR**: `packages/shared/src/types/politician.ts` — export interface style
- **VALIDATE**: `pnpm --filter @pah/shared typecheck`

---

### Task 8: UPDATE `packages/shared/src/index.ts`

- **ACTION**: ADD export for new DataSourceStatus type
- **IMPLEMENT**: Add `export type { DataSourceStatus, SourceListResponse } from './types/source.js'`
- **GOTCHA**: Use `export type` (not `export`) — type-only re-exports work correctly in Next.js webpack; value re-exports from submodules can fail (see project MEMORY.md)
- **VALIDATE**: `pnpm --filter @pah/shared typecheck`

---

### Task 9: CREATE `apps/api/src/schemas/source.schema.ts`

- **ACTION**: CREATE TypeBox schemas for `GET /api/v1/sources` response
- **IMPLEMENT**:

  ```typescript
  import { Type, type Static } from '@sinclair/typebox'

  export const SourceStatusSchema = Type.Object({
    source: Type.String(),
    lastSyncAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    recordCount: Type.Integer({ minimum: 0 }),
    status: Type.Union([
      Type.Literal('pending'),
      Type.Literal('syncing'),
      Type.Literal('synced'),
      Type.Literal('failed'),
    ]),
    updatedAt: Type.String({ format: 'date-time' }),
  })
  export type SourceStatusDto = Static<typeof SourceStatusSchema>

  export const SourceListResponseSchema = Type.Object({
    data: Type.Array(SourceStatusSchema),
  })
  export type SourceListResponseDto = Static<typeof SourceListResponseSchema>
  ```

- **MIRROR**: `apps/api/src/schemas/bill.schema.ts:14-33` — same TypeBox pattern
- **GOTCHA**: `lastSyncAt` must be `Type.Union([String, Null])` not `Type.Optional(Type.String())` — the DB column is nullable, not optional in the response
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 10: CREATE `apps/api/src/repositories/source.repository.ts`

- **ACTION**: CREATE repository querying `public.data_source_status`
- **IMPLEMENT**:

  ```typescript
  import { asc } from 'drizzle-orm'
  import { dataSourceStatus } from '@pah/db/public-schema'
  import type { PublicDb } from '@pah/db/clients'

  export type SourceStatusRow = typeof dataSourceStatus.$inferSelect

  export function createSourceRepository(db: PublicDb): {
    selectAll: () => Promise<SourceStatusRow[]>
  } {
    return {
      async selectAll(): Promise<SourceStatusRow[]> {
        return db
          .select()
          .from(dataSourceStatus)
          .orderBy(asc(dataSourceStatus.source))
      },
    }
  }

  export type SourceRepository = ReturnType<typeof createSourceRepository>
  ```

- **MIRROR**: `apps/api/src/repositories/bill.repository.ts` — factory function + `$inferSelect` type export
- **GOTCHA**: Import `dataSourceStatus` from `@pah/db/public-schema` (after Task 2 moves it there), NOT from internal-schema. The API `buildApp()` uses `createPublicDb()` — this is correct, `api_reader` now has `SELECT` on `public.data_source_status` from the migration GRANT
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 11: CREATE `apps/api/src/services/source.service.ts`

- **ACTION**: CREATE service for source status queries
- **IMPLEMENT**:

  ```typescript
  import type { SourceRepository, SourceStatusRow } from '../repositories/source.repository.js'
  import type { SourceStatusDto, SourceListResponseDto } from '../schemas/source.schema.js'

  function toSourceDto(row: SourceStatusRow): SourceStatusDto {
    return {
      source: row.source,
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
      recordCount: row.recordCount,
      status: row.status as SourceStatusDto['status'],
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  export function createSourceService(repository: SourceRepository): {
    findAll: () => Promise<SourceListResponseDto>
  } {
    return {
      async findAll(): Promise<SourceListResponseDto> {
        const rows = await repository.selectAll()
        return { data: rows.map(toSourceDto) }
      },
    }
  }

  export type SourceService = ReturnType<typeof createSourceService>
  ```

- **MIRROR**: `apps/api/src/services/bill.service.ts:42-71` — factory function pattern
- **GOTCHA**: `row.status` is `string` from Drizzle (varchar) — cast via `as SourceStatusDto['status']` is acceptable here because the DB CHECK constraint enforces valid values. This is one of the permitted type assertions (narrowing known-good DB data). Alternatively use a type guard
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 12: CREATE `apps/api/src/routes/sources.route.ts`

- **ACTION**: CREATE `GET /api/v1/sources` route
- **IMPLEMENT**:

  ```typescript
  import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
  import { SourceListResponseSchema } from '../schemas/source.schema.js'
  import type { SourceService } from '../services/source.service.js'

  interface RouteDeps {
    sourceService: SourceService
  }

  export function createSourcesRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
    // eslint-disable-next-line @typescript-eslint/require-await
    return async (app) => {
      app.get('/sources', {
        schema: { response: { 200: SourceListResponseSchema } },
      }, async (_request, reply) => {
        const result = await deps.sourceService.findAll()
        void reply.header('Cache-Control', 'public, max-age=60, s-maxage=300')
        return result
      })
    }
  }
  ```

- **MIRROR**: `apps/api/src/routes/bills.route.ts:15-42` — exact same `FastifyPluginAsyncTypebox` pattern
- **GOTCHA**: The `eslint-disable` comment for `require-await` is needed — this is the established pattern in the codebase (see bills.route.ts:16)
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 13: UPDATE `apps/api/src/app.ts`

- **ACTION**: Register the sources route and inject its dependencies
- **IMPLEMENT**: Add imports and registration following the exact same pattern as other routes:

  ```typescript
  // ADD imports (after existing imports):
  import { createSourceRepository } from './repositories/source.repository.js'
  import { createSourceService } from './services/source.service.js'
  import { createSourcesRoute } from './routes/sources.route.js'

  // ADD in buildApp() after existing repository/service creation:
  const sourceRepository = createSourceRepository(db)
  const sourceService = createSourceService(sourceRepository)

  // ADD route registration:
  void app.register(createSourcesRoute({ sourceService }), { prefix: '/api/v1' })
  ```

- **MIRROR**: `apps/api/src/app.ts:6-71` — follow exact same injection pattern as billRepository/billService
- **VALIDATE**: `pnpm --filter @pah/api typecheck && pnpm --filter @pah/api test`

---

### Task 14: CREATE `apps/api/src/services/source.service.test.ts`

- **ACTION**: CREATE unit tests for the source service
- **IMPLEMENT**:

  ```typescript
  import { describe, it, expect, vi } from 'vitest'
  import { createSourceService } from './source.service.js'
  import type { SourceRepository, SourceStatusRow } from '../repositories/source.repository.js'

  function buildSourceRow(overrides: Partial<SourceStatusRow> = {}): SourceStatusRow {
    return {
      id: 'test-uuid',
      source: 'camara',
      lastSyncAt: null,
      recordCount: 0,
      status: 'pending',
      createdAt: new Date('2026-03-11'),
      updatedAt: new Date('2026-03-11'),
      ...overrides,
    }
  }

  function buildRepository(rows: SourceStatusRow[] = []): SourceRepository {
    return { selectAll: vi.fn().mockResolvedValue(rows) }
  }

  describe('createSourceService', () => {
    describe('findAll', () => {
      it('returns empty data array when no rows', async () => {
        const service = createSourceService(buildRepository([]))
        const result = await service.findAll()
        expect(result).toEqual({ data: [] })
      })

      it('maps rows to DTOs with ISO dates', async () => {
        const syncAt = new Date('2026-03-10T02:00:00Z')
        const service = createSourceService(
          buildRepository([buildSourceRow({ source: 'camara', lastSyncAt: syncAt, status: 'synced', recordCount: 594 })])
        )
        const result = await service.findAll()
        expect(result.data[0]).toMatchObject({
          source: 'camara',
          lastSyncAt: '2026-03-10T02:00:00.000Z',
          recordCount: 594,
          status: 'synced',
        })
      })

      it('maps null lastSyncAt to null in DTO', async () => {
        const service = createSourceService(buildRepository([buildSourceRow({ lastSyncAt: null })]))
        const result = await service.findAll()
        expect(result.data[0]?.lastSyncAt).toBeNull()
      })
    })
  })
  ```

- **MIRROR**: `apps/api/src/services/politician.service.test.ts` — builder + vi.fn() pattern
- **VALIDATE**: `pnpm --filter @pah/api test`

---

### Task 15: UPDATE `apps/web/src/lib/api-client.ts`

- **ACTION**: ADD `fetchSources()` function
- **IMPLEMENT**: Add after the last existing fetch function:

  ```typescript
  // ADD import at top (type-only):
  import type { SourceListResponse } from '@pah/shared'

  // ADD function:
  export async function fetchSources(): Promise<SourceListResponse> {
    return apiFetch<SourceListResponse>('/sources', {
      next: { revalidate: 3600, tags: ['sources'] },
    })
  }
  ```

- **MIRROR**: `apps/web/src/lib/api-client.ts` — follow existing `fetchPoliticians` / `fetchBills` pattern
- **GOTCHA**: `revalidate: 3600` in `next` options — this is the ISR revalidation interval; the `/fontes` page also sets `export const revalidate = 3600` which means the page itself caches for 1 hour; the API route also has `Cache-Control: max-age=60, s-maxage=300` so the data should be reasonably fresh
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 16: CREATE `apps/web/src/app/fontes/page.tsx`

- **ACTION**: CREATE the `/fontes` page showing data source status
- **IMPLEMENT**:

  ```typescript
  import type { Metadata } from 'next'
  import { fetchSources } from '@/lib/api-client'
  import type { DataSourceStatus } from '@pah/shared'

  export const revalidate = 3600

  export const metadata: Metadata = {
    title: 'Fontes de Dados | Autoridade Política',
    description: 'Status de sincronização das seis fontes de dados governamentais utilizadas na plataforma.',
  }

  const SOURCE_LABELS: Record<string, string> = {
    camara: 'Câmara dos Deputados',
    senado: 'Senado Federal',
    transparencia: 'Portal da Transparência',
    tse: 'TSE — Dados Abertos',
    tcu: 'TCU CADIRREG',
    cgu: 'CGU-PAD',
  }

  const SOURCE_URLS: Record<string, string> = {
    camara: 'https://dadosabertos.camara.leg.br',
    senado: 'https://legis.senado.leg.br/dadosabertos',
    transparencia: 'https://portaldatransparencia.gov.br',
    tse: 'https://dadosabertos.tse.jus.br',
    tcu: 'https://portal.tcu.gov.br',
    cgu: 'https://portaldatransparencia.gov.br/download-de-dados',
  }

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Aguardando',
    syncing: 'Sincronizando',
    synced: 'Sincronizado',
    failed: 'Falhou',
  }

  function formatDate(dateStr: string | null): string {
    if (dateStr === null) return 'Nunca'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  function SourceRow({ source }: { source: DataSourceStatus }): React.JSX.Element {
    const label = SOURCE_LABELS[source.source] ?? source.source
    const url = SOURCE_URLS[source.source]
    const statusLabel = STATUS_LABELS[source.status] ?? source.status
    return (
      <tr>
        <td>
          {url !== undefined ? (
            <a href={url} target="_blank" rel="noopener noreferrer">{label}</a>
          ) : label}
        </td>
        <td>{formatDate(source.lastSyncAt)}</td>
        <td>{source.recordCount.toLocaleString('pt-BR')}</td>
        <td>{statusLabel}</td>
      </tr>
    )
  }

  export default async function FontesPage(): Promise<React.JSX.Element> {
    const { data: sources } = await fetchSources()
    return (
      <main>
        <h1>Fontes de Dados</h1>
        <p>
          A plataforma utiliza dados públicos de seis fontes governamentais, acessados sob a Lei de Acesso à Informação (LAI).
          Os dados são sincronizados automaticamente conforme a cadência de cada fonte.
        </p>
        <table>
          <thead>
            <tr>
              <th>Fonte</th>
              <th>Última Sincronização</th>
              <th>Registros</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <SourceRow key={source.source} source={source} />
            ))}
          </tbody>
        </table>
        <p>
          <small>Dados atualizados há até 1 hora. Para mais detalhes sobre a metodologia de pontuação, consulte a <a href="/metodologia">página de metodologia</a>.</small>
        </p>
      </main>
    )
  }
  ```

- **MIRROR**: `apps/web/src/app/metodologia/page.tsx` — `export const revalidate`, `metadata`, async Server Component, no client state
- **GOTCHA 1**: DR-002 Political Neutrality — use neutral language, no rankings. The table shows factual sync data. **GOTCHA 2**: `exactOptionalPropertyTypes` — `SOURCE_LABELS[source.source]` returns `string | undefined`; the `?? source.source` fallback handles this correctly. **GOTCHA 3**: Do NOT add party colors or any political judgement to this page. **GOTCHA 4**: The table needs Tailwind classes — check existing pages for the CSS pattern (this plan uses unstyled JSX; implementation should add appropriate Tailwind classes matching the rest of the site)
- **VALIDATE**: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web build`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|-----------|-----------|
| `apps/pipeline/src/publisher/publisher.test.ts` | upsertPolitician returns id; throws on no rows; upsertExclusionRecord calls insert; upsertDataSourceStatus upserts | Publisher changes |
| `apps/api/src/services/source.service.test.ts` | empty response; DTO mapping; null lastSyncAt; date formatting | Source service |

### Edge Cases Checklist

- [ ] `upsertPolitician` returns `undefined` from DB (throwing new Error is the correct handling)
- [ ] `politicianIdentifiers` table is empty (no CPF data yet) — TCU/CGU cases must guard with `if (cpfHashes.length > 0)`
- [ ] `data_source_status` table has no rows yet (returns empty array from API — `/fontes` shows empty table gracefully)
- [ ] `fetchSources()` throws `ApiError` — Next.js error boundary handles it
- [ ] CGU exclusion row has no matching politician CPF — `continue` guard handles it
- [ ] `scorePolitician` throws for a missing politician — this should propagate and fail the pipeline job (pg-boss handles retry)

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm --filter @pah/db typecheck
pnpm --filter @pah/pipeline typecheck
pnpm --filter @pah/api typecheck
pnpm --filter @pah/web typecheck
pnpm lint
```

**EXPECT**: Exit 0, no errors or warnings

### Level 2: UNIT_TESTS

```bash
pnpm --filter @pah/pipeline test
pnpm --filter @pah/api test
```

**EXPECT**: All tests pass including new publisher.test.ts and source.service.test.ts

### Level 3: FULL_SUITE

```bash
pnpm test && pnpm --filter @pah/web build
```

**EXPECT**: All tests pass, Next.js build produces no errors

### Level 4: DATABASE_VALIDATION

After running migration `0008_add_data_source_status.sql`:

```sql
-- Verify table exists in public schema
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name = 'data_source_status';
-- Expected: table_schema = 'public'

-- Verify api_reader can select
SET ROLE api_reader;
SELECT * FROM public.data_source_status;
-- Expected: 6 rows (one per source), status = 'pending'
```

### Level 5: BROWSER_VALIDATION

- `/fontes` — page loads with table of 6 sources (pending status initially)
- After pipeline run — sources show `synced` status and record counts
- `/politicos/[slug]` — score reflects actual DB values; ExclusionNotice shown for politicians with exclusion records

### Level 6: MANUAL_VALIDATION

1. Run `pnpm --filter @pah/api dev` and `curl http://localhost:3001/api/v1/sources`
2. Expected: `{"data":[{"source":"camara","lastSyncAt":null,...},...]}`
3. Trigger a pipeline run for one source, verify `data_source_status` updates
4. Verify score changes in `public.integrity_scores` after pipeline run

---

## Acceptance Criteria

- [ ] `GET /api/v1/sources` returns HTTP 200 with array of 6 source objects
- [ ] `/fontes` page renders table of 6 government sources with correct labels in Portuguese
- [ ] Pipeline CAMARA/SENADO cases call `scorePolitician` after each `upsertPolitician`
- [ ] Pipeline TCU case writes exclusion records to `internal_data.exclusion_records`
- [ ] Pipeline TCU case sets `exclusion_flag = true` on matched politicians
- [ ] `data_source_status` is updated after each pipeline source completes (recordCount + lastSyncAt)
- [ ] `ExclusionNotice` renders on profile page for politicians with `exclusion_flag = true`
- [ ] Level 1-3 validation commands pass with exit 0
- [ ] No `any` types introduced
- [ ] No CPF values in any API response or log message

---

## Completion Checklist

- [ ] Task 1: Migration `0008_add_data_source_status.sql` created and applied
- [ ] Task 2: `public-schema.ts` updated with `dataSourceStatus`
- [ ] Task 3: `internal-schema.ts` updated (dataSourceStatus removed)
- [ ] Task 4: `publisher/index.ts` updated (returning, upsertExclusionRecord, upsertDataSourceStatus)
- [ ] Task 5: `orchestrator.ts` updated (scoring wired, exclusion detection wired, status updates)
- [ ] Task 6: `publisher.test.ts` created and passing
- [ ] Task 7: `packages/shared/src/types/source.ts` created
- [ ] Task 8: `packages/shared/src/index.ts` updated
- [ ] Task 9: `apps/api/src/schemas/source.schema.ts` created
- [ ] Task 10: `apps/api/src/repositories/source.repository.ts` created
- [ ] Task 11: `apps/api/src/services/source.service.ts` created
- [ ] Task 12: `apps/api/src/routes/sources.route.ts` created
- [ ] Task 13: `apps/api/src/app.ts` updated
- [ ] Task 14: `apps/api/src/services/source.service.test.ts` created and passing
- [ ] Task 15: `apps/web/src/lib/api-client.ts` updated
- [ ] Task 16: `apps/web/src/app/fontes/page.tsx` created
- [ ] Level 1: Static analysis (lint + typecheck) passes all packages
- [ ] Level 2: Unit tests pass
- [ ] Level 3: Full suite + build succeeds
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Scoring 594 politicians sequentially in CAMARA run takes too long | MED | LOW | Each `scorePolitician` is ~5 SQL queries; 594 × 5 = ~3000 queries; at 1ms each = 3s total — acceptable for a cron job |
| `politicianIdentifiers` table empty (no CPF data ingested yet) | HIGH | LOW | Guard with `if (cpfHashes.length > 0)` before TCU batch fetch; returns empty map gracefully |
| `api_reader` GRANT on `data_source_status` not applied in Supabase | MED | HIGH | The migration SQL includes the GRANT; if Supabase strips it, add manually via Supabase Dashboard SQL editor |
| CGU exclusion CPF field name mismatch in `transformers/cgu.ts` | MED | MED | Read `transformers/cgu.ts` before writing orchestrator CGU case to confirm actual field names |
| Drizzle `.returning()` syntax differs in v0.36.4 | LOW | HIGH | Drizzle ORM has supported `.returning()` since v0.23; syntax is stable. Pattern: `.returning({ id: table.id })` returns `Array<{ id: string }>` |

---

## Notes

**Architectural Decision — data_source_status in public schema:**
Moving this table from `internal_data` to `public` is the correct architectural choice. DR-006 protects "exclusion records, CPF matches, audit logs" — source sync timestamps and record counts are operational metadata, not personal data, and are directly relevant to citizens (LAI transparency). The `api_reader` GRANT in the migration enforces the same access pattern as all other public tables.

**Scoring timing:**
Scores update incrementally as each source pipeline runs. A politician scored after the CAMARA run (which loads politician records) will have `legislativeScore=0` until the bills/votes are loaded by subsequent adapters. This is correct behavior — the score improves progressively as more data arrives. For MVP with seed data, scores will immediately reflect real data counts from the DB.

**ExclusionNotice already implemented:**
The component `apps/web/src/components/politician/exclusion-notice.tsx` and its conditional render in `apps/web/src/app/politicos/[slug]/page.tsx:133-137` already exist and work correctly — no web changes are needed for the exclusion notice. The only pipeline-side work is to actually set `exclusion_flag = true` for matched politicians.

**Future:**
After MVP, `computeTransparencyScore()` should use real per-politician source coverage (count how many of 6 sources have data for this politician) instead of the hardcoded `6`. This is a scoring engine enhancement tracked separately.
