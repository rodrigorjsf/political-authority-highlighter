# Plan: RF-008 — Profile Section: Bills (Projetos de Lei)

## Summary

Add a paginated Bills tab at `/politicos/[slug]/projetos` displaying all legislative bills authored or co-authored by the politician. Requires: a new `public_data.bills` DB table with migration, a complete API stack (TypeBox schema → repository → service → route), and a web page with ISR caching and cursor-based pagination. The entire implementation mirrors the existing pagination patterns from the politician listing (RF-001) and profile overview (RF-007) exactly.

## User Story

As a citizen who has clicked a politician's profile card,
I want to see the bills that politician has authored or co-authored,
So that I can evaluate their legislative activity and make an informed decision before the election.

## Problem Statement

The "Projetos de Lei" tab link on every politician profile (`/politicos/[slug]/projetos`) returns 404 because neither the route nor the data layer exist. Citizens who click the tab hit a dead end.

## Solution Statement

Create the complete data layer for bills (DB table, Drizzle schema, migration, TypeBox schemas, repository, service, route) then connect it to a new Next.js ISR page that displays a paginated list of bills with cursor navigation. Uses keyset pagination on `(submission_date DESC, id DESC)`, matching the politician listing pattern.

## Metadata

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Type             | NEW_CAPABILITY                                                     |
| Complexity       | MEDIUM                                                             |
| Systems Affected | packages/shared, packages/db, apps/api, apps/web                   |
| Dependencies     | RF-007 complete (profile page structure must exist)                |
| Estimated Tasks  | 15                                                                 |

---

## UX Design

### Before State

```
╔══════════════════════════════════════════════════════════════╗
║  /politicos/joao-silva-sp/projetos                           ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║   404 — This page could not be found                         ║
║                                                              ║
║   PAIN: User clicks "Projetos de Lei" tab from profile,      ║
║         hits dead end, bounces back or leaves app.           ║
╚══════════════════════════════════════════════════════════════╝
```

### After State

```
╔══════════════════════════════════════════════════════════════╗
║  /politicos/joao-silva-sp/projetos                           ║
╠══════════════════════════════════════════════════════════════╣
║  ← João Silva (link back to /politicos/joao-silva-sp)        ║
║                                                              ║
║  Projetos de Lei — João Silva (PL-SP)                        ║
║                                                              ║
║  ┌────────┬──────────────────────────┬──────────┬──────────┐ ║
║  │ PL 123/│ Dispõe sobre a criação   │ Em       │ 2024-03  ║ ║
║  │ 2024   │ de...                    │ tramit.  │          ║ ║
║  │ PEC 07/│ Altera a Constituição    │ Aprovado │ 2023-11  ║ ║
║  │ 2023   │ Federal para...          │          │          ║ ║
║  │ ...    │ ...                      │ ...      │ ...      ║ ║
║  └────────┴──────────────────────────┴──────────┴──────────┘ ║
║                                                              ║
║  Nenhum projeto encontrado.   ← empty state if no bills      ║
║                                                              ║
║  [← Início]  [Próxima →]      ← cursor pagination           ║
╚══════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| Profile tab "Projetos de Lei" | 404 | Paginated bill list | Citizens can read legislative record |
| `GET /api/v1/politicians/:slug/bills` | 404 | JSON bills list + cursor | Enables web + future integrations |
| `/politicos/[slug]/projetos` | Not found | ISR page, revalidate=3600 | Indexed by Google, discoverable |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `apps/api/src/repositories/politician.repository.ts` | all | MIRROR cursor pagination pattern exactly |
| P0 | `apps/api/src/services/politician.service.ts` | all | MIRROR encodeCursor/decodeCursor + factory pattern |
| P0 | `apps/api/src/routes/politicians.route.ts` | all | MIRROR route factory with TypeBox + cache headers |
| P0 | `packages/db/src/public-schema.ts` | all | MIRROR table definition pattern + FK syntax |
| P0 | `packages/db/migrations/public/0001_initial.sql` | all | MIRROR SQL migration format exactly |
| P1 | `apps/api/src/app.ts` | all | Shows exact DI wiring pattern to extend |
| P1 | `apps/api/src/schemas/politician.schema.ts` | all | MIRROR TypeBox schema definitions |
| P1 | `apps/api/src/schemas/common.schema.ts` | all | `CursorPaginationSchema` — do NOT redefine |
| P1 | `apps/web/src/lib/api-client.ts` | all | MIRROR apiFetch pattern + ISR tags |
| P1 | `apps/web/src/app/politicos/page.tsx` | all | MIRROR pagination link pattern (baseParams) |
| P1 | `apps/web/src/app/politicos/[slug]/page.tsx` | all | MIRROR: params as Promise, try/catch for 404 |
| P2 | `apps/api/src/services/politician.service.test.ts` | all | MIRROR test factory pattern for bill tests |
| P2 | `packages/shared/src/types/politician.ts` | all | MIRROR interface definition style |
| P2 | `packages/shared/src/index.ts` | all | MIRROR re-export pattern |

---

## Patterns to Mirror

**NAMING_CONVENTION:**

```typescript
// SOURCE: apps/api/src/repositories/politician.repository.ts:58-113
// COPY THIS PATTERN for bill repository:
export function createBillRepository(db: PublicDb): {
  selectByPoliticianSlug: (slug: string, filters: BillListFilters) => Promise<BillRow[]>
} { ... }
export type BillRepository = ReturnType<typeof createBillRepository>
```

**CURSOR_ENCODING:**

```typescript
// SOURCE: apps/api/src/services/politician.service.ts:4-19
// COPY THIS PATTERN for bill cursor:
interface BillCursor {
  submissionDate: string   // ISO date 'YYYY-MM-DD'
  billId: string           // UUID
}
function encodeCursor(cursor: BillCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}
function decodeCursor(encoded: string): BillCursor {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as BillCursor
  } catch {
    throw new Error('Invalid cursor')
  }
}
```

**DRIZZLE_TABLE:**

```typescript
// SOURCE: packages/db/src/public-schema.ts:71-90 (integrityScores table)
// COPY THIS PATTERN for bills table:
export const bills = publicData.table(
  'bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    externalId: varchar('external_id', { length: 100 }).notNull(),
    // ... other fields
  },
  (table) => [
    index('idx_bills_politician').on(table.politicianId),
    index('idx_bills_pagination').on(table.politicianId, table.submissionDate, table.id),
  ],
)
```

**DRIZZLE_CURSOR_QUERY:**

```typescript
// SOURCE: apps/api/src/repositories/politician.repository.ts:72-88
// COPY THIS PATTERN for (date DESC, id DESC) cursor:
if (filters.cursor !== undefined) {
  const { submissionDate, billId } = filters.cursor
  const cursorCondition = or(
    lt(bills.submissionDate, submissionDate),
    and(
      eq(bills.submissionDate, submissionDate),
      lt(bills.id, billId),
    ),
  )
  if (cursorCondition !== undefined) {
    conditions.push(cursorCondition)
  }
}
```

**ROUTE_FACTORY:**

```typescript
// SOURCE: apps/api/src/routes/politicians.route.ts:21-47
// COPY THIS PATTERN for bills route:
export function createBillsRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get<{ Params: PoliticianParams; Querystring: BillListQuery }>(
      '/politicians/:slug/bills',
      { schema: { params: PoliticianParamsSchema, querystring: BillListQuerySchema, response: { 200: BillListResponseSchema } } },
      async (request, reply) => {
        const { slug } = request.params
        const result = await deps.billService.findByPoliticianSlug(slug, request.query)
        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')
        return result
      },
    )
  }
}
```

**APP_WIRING:**

```typescript
// SOURCE: apps/api/src/app.ts:33-39
// ADD AFTER politician wiring:
const billRepository = createBillRepository(db)
const billService = createBillService(billRepository)
void app.register(createBillsRoute({ billService }), { prefix: '/api/v1' })
```

**WEB_FETCH:**

```typescript
// SOURCE: apps/web/src/lib/api-client.ts:56-64
// COPY THIS PATTERN for bills:
export async function fetchPoliticianBills(
  slug: string,
  filters: BillFilters = {},
): Promise<BillListResponse> {
  const params = new URLSearchParams()
  if (filters.cursor !== undefined) params.set('cursor', filters.cursor)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  return apiFetch<BillListResponse>(
    `/politicians/${encodeURIComponent(slug)}/bills?${params.toString()}`,
    { next: { revalidate: 300, tags: [`politician-${slug}-bills`] } },
  )
}
```

**PAGINATION_LINKS:**

```typescript
// SOURCE: apps/web/src/app/politicos/page.tsx:85-102
// COPY THIS PATTERN for bills page pagination:
<nav className="mt-8 flex justify-center gap-4" aria-label="Paginação">
  {cursor !== undefined && (
    <Link href={`/politicos/${slug}/projetos`} className="...">← Início</Link>
  )}
  {result.cursor !== null && (
    <Link href={`/politicos/${slug}/projetos?cursor=${result.cursor}`} className="...">Próxima →</Link>
  )}
</nav>
```

**PAGE_PARAMS_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/[slug]/page.tsx:58-71
// COPY THIS PATTERN — params is a Promise in Next.js 15:
export default async function BillsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ cursor?: string | string[] | undefined }>
}): Promise<React.JSX.Element> {
  const { slug } = await params
  const sp = await searchParams
  const cursor = typeof sp['cursor'] === 'string' ? sp['cursor'] : undefined
  // ...
}
```

**TEST_FACTORY:**

```typescript
// SOURCE: apps/api/src/services/politician.service.test.ts:24-31
// COPY THIS PATTERN for bill tests:
function buildRepository(rows: BillRow[] = []): BillRepository {
  return {
    selectByPoliticianSlug: vi.fn().mockResolvedValue(rows),
  }
}
```

**ESM_IMPORTS:**

```typescript
// SOURCE: apps/api/src/app.ts:7-11
// ALL relative imports in apps/api/src/ use .js extension:
import { createBillRepository } from './repositories/bill.repository.js'
import { createBillService } from './services/bill.service.js'
import { createBillsRoute } from './routes/bills.route.js'
```

**RELATIVE_IMPORTS_WEB:**

```typescript
// SOURCE: apps/web/src/app/politicos/[slug]/page.tsx:5
// Web app uses relative imports (no @/ alias):
import { fetchPoliticianBySlug, fetchPoliticianBills } from '../../../../lib/api-client'
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `packages/shared/src/types/bill.ts` | CREATE | Domain types: Bill, BillFilters, BillListResponse |
| `packages/shared/src/index.ts` | UPDATE | Export Bill types |
| `packages/db/src/public-schema.ts` | UPDATE | Add `bills` Drizzle table + export |
| `packages/db/migrations/public/0003_add_bills.sql` | CREATE | SQL migration for bills table |
| `apps/api/src/schemas/bill.schema.ts` | CREATE | TypeBox: BillSchema, BillListResponseSchema, BillListQuerySchema |
| `apps/api/src/repositories/bill.repository.ts` | CREATE | `selectByPoliticianSlug` with cursor pagination |
| `apps/api/src/services/bill.service.ts` | CREATE | `findByPoliticianSlug` with encodeCursor/decodeCursor |
| `apps/api/src/routes/bills.route.ts` | CREATE | `GET /politicians/:slug/bills` |
| `apps/api/src/app.ts` | UPDATE | Wire bill DI: repo → service → route |
| `apps/web/src/lib/api-types.ts` | UPDATE | Re-export Bill, BillFilters, BillListResponse |
| `apps/web/src/lib/api-client.ts` | UPDATE | Add fetchPoliticianBills |
| `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | CREATE | ISR bills tab page |
| `apps/web/src/app/politicos/[slug]/projetos/loading.tsx` | CREATE | Skeleton matching bills page layout |
| `apps/api/src/services/bill.service.test.ts` | CREATE | 5 unit tests for bill service |

---

## NOT Building (Scope Limits)

- **Filter by bill status or type** — PRD specifies pagination only; no filter UI in RF-008
- **Bills count/summary badge** on profile overview — deferred to later polish
- **Individual bill detail page** — not in RF-008 scope; `sourceUrl` links to official source
- **Full-text search within bills** — post-MVP
- **generateStaticParams for bills pages** — not needed; ISR handles on-demand; profile page already pre-generates the top 100 slugs, so ISR has the parent cached

---

## Step-by-Step Tasks

### Task 1: CREATE `packages/shared/src/types/bill.ts`

- **ACTION**: CREATE shared type definitions for bills
- **IMPLEMENT**: Three interfaces following the politician.ts style

```typescript
/** A legislative bill authored or co-authored by a politician (RF-008). */
export interface Bill {
  id: string
  externalId: string
  source: 'camara' | 'senado'
  title: string
  billType: string    // 'PL', 'PEC', 'PDL', 'PLV', etc.
  billNumber: string
  billYear: number
  status: string
  submissionDate: string  // ISO date 'YYYY-MM-DD'
  sourceUrl: string | null
}

export interface BillFilters {
  cursor?: string
  limit?: number
}

export interface BillListResponse {
  data: Bill[]
  cursor: string | null
}
```

- **MIRROR**: `packages/shared/src/types/politician.ts:1-15` (interface style, JSDoc, no external imports)
- **GOTCHA**: `packages/shared` has zero external dependencies — no imports from other packages allowed
- **VALIDATE**: `pnpm --filter @pah/shared typecheck`

### Task 2: UPDATE `packages/shared/src/index.ts`

- **ACTION**: ADD Bill type exports to the existing re-export file
- **IMPLEMENT**: Add a new export statement alongside the politician types

```typescript
export type { Bill, BillFilters, BillListResponse } from './types/bill.js'
```

- **MIRROR**: `packages/shared/src/index.ts:1-6` — follows `.js` extension convention
- **GOTCHA**: Use `.js` extension on the import path (ESM convention for TypeScript)
- **VALIDATE**: `pnpm --filter @pah/shared typecheck`

### Task 3: UPDATE `packages/db/src/public-schema.ts`

- **ACTION**: ADD `bills` table definition at the end of the file
- **IMPLEMENT**: Table definition following `integrityScores` pattern

```typescript
export const bills = publicData.table(
  'bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    externalId: varchar('external_id', { length: 100 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(), // 'camara' | 'senado'
    title: text('title').notNull(),
    billType: varchar('bill_type', { length: 20 }).notNull(), // 'PL', 'PEC', etc.
    billNumber: varchar('bill_number', { length: 20 }).notNull(),
    billYear: smallint('bill_year').notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    submissionDate: date('submission_date').notNull(),  // NOT NULL - use CURRENT_DATE as default in seed
    sourceUrl: varchar('source_url', { length: 500 }),  // nullable
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_bills_politician').on(table.politicianId),
    // Composite index for keyset pagination (politician_id, date DESC, id DESC)
    index('idx_bills_pagination').on(table.politicianId, table.submissionDate, table.id),
  ],
)
```

- **MIRROR**: `packages/db/src/public-schema.ts:71-90` (integrityScores table pattern)
- **IMPORTS needed**: `date` from `drizzle-orm/pg-core` (if not already imported)
- **GOTCHA**: The `bills` table must be defined AFTER `politicians` because it has a `references(() => politicians.id)` FK. Currently `politicians` is at line 22 and `integrityScores` is at line 71 — add `bills` after line 90.
- **GOTCHA**: `index()` takes name as first arg, then `.on(columns...)` — NOT `.using('gin', col)` which is only for GIN indexes
- **GOTCHA**: `smallint` from Drizzle returns numeric values that may need `Number()` coercion in the repository — same as `overallScore` pattern
- **VALIDATE**: `pnpm --filter @pah/db typecheck`

### Task 4: CREATE `packages/db/migrations/public/0003_add_bills.sql`

- **ACTION**: CREATE SQL migration for the bills table
- **IMPLEMENT**: Match exactly the format of `0001_initial.sql`

```sql
-- 0003_add_bills.sql — public_data schema: bills (RF-008)

CREATE TABLE IF NOT EXISTS public_data.bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id   UUID NOT NULL REFERENCES public_data.politicians(id),
  external_id     VARCHAR(100) NOT NULL,
  source          VARCHAR(20) NOT NULL,
  title           TEXT NOT NULL,
  bill_type       VARCHAR(20) NOT NULL,
  bill_number     VARCHAR(20) NOT NULL,
  bill_year       SMALLINT NOT NULL,
  status          VARCHAR(50) NOT NULL,
  submission_date DATE NOT NULL,
  source_url      VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (politician_id, external_id)  -- unique per politician+source combo
);

-- Index for politician lookup
CREATE INDEX IF NOT EXISTS idx_bills_politician
  ON public_data.bills(politician_id);

-- Composite index for stable DESC cursor pagination (politician_id, date DESC, id DESC)
CREATE INDEX IF NOT EXISTS idx_bills_pagination
  ON public_data.bills(politician_id, submission_date DESC, id DESC);
```

- **MIRROR**: `packages/db/migrations/public/0001_initial.sql` (TIMESTAMPTZ, IF NOT EXISTS, comments)
- **GOTCHA**: Use `TIMESTAMPTZ` (not `TIMESTAMP`) for created_at/updated_at — same as politicians table
- **GOTCHA**: Unique constraint is `(politician_id, external_id)` — a bill external_id is only unique within a politician's bills, not globally (different politicians could theoretically have the same external_id from different sources)
- **VALIDATE**: File exists with valid SQL (no type-check step needed for migration files)

### Task 5: CREATE `apps/api/src/schemas/bill.schema.ts`

- **ACTION**: CREATE TypeBox schemas for bills endpoints
- **IMPLEMENT**:

```typescript
import { Type, type Static } from '@sinclair/typebox'
import { PoliticianParamsSchema, type PoliticianParams } from './politician.schema.js'

// Re-export params schema — bills use the same :slug param
export { PoliticianParamsSchema, type PoliticianParams }

export const BillListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
  cursor: Type.Optional(
    Type.String({ description: 'Opaque base64url cursor from previous response' }),
  ),
})
export type BillListQuery = Static<typeof BillListQuerySchema>

export const BillSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.String(),
  source: Type.String(),
  title: Type.String(),
  billType: Type.String(),
  billNumber: Type.String(),
  billYear: Type.Integer(),
  status: Type.String(),
  submissionDate: Type.String({ format: 'date' }),
  sourceUrl: Type.Union([Type.String(), Type.Null()]),
})
export type BillDto = Static<typeof BillSchema>

export const BillListResponseSchema = Type.Object({
  data: Type.Array(BillSchema),
  cursor: Type.Union([Type.String(), Type.Null()]),
})
export type BillListResponseDto = Static<typeof BillListResponseSchema>
```

- **MIRROR**: `apps/api/src/schemas/politician.schema.ts:1-44` (TypeBox patterns, `Type.Union([Type.String(), Type.Null()])` for nullable)
- **GOTCHA**: `PoliticianParamsSchema` is already defined — import from `./politician.schema.js` rather than redefining
- **GOTCHA**: Use `.js` extension on all relative imports
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

### Task 6: CREATE `apps/api/src/repositories/bill.repository.ts`

- **ACTION**: CREATE repository factory with cursor pagination
- **IMPLEMENT**: Factory function with `selectByPoliticianSlug` method

```typescript
import { eq, and, lt, or, desc } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { bills, politicians } from '@pah/db/public-schema'

export interface BillRow {
  id: string
  externalId: string
  source: string
  title: string
  billType: string
  billNumber: string
  billYear: number
  status: string
  submissionDate: string  // Drizzle returns date as string 'YYYY-MM-DD'
  sourceUrl: string | null
}

export interface BillListFilters {
  limit: number
  cursor?: { submissionDate: string; billId: string } | undefined
}

export function createBillRepository(db: PublicDb): {
  selectByPoliticianSlug: (slug: string, filters: BillListFilters) => Promise<BillRow[]>
} {
  return {
    async selectByPoliticianSlug(slug: string, filters: BillListFilters): Promise<BillRow[]> {
      // First look up politician by slug to get their id
      // Then query bills with that politician_id
      // (avoids a correlated subquery, which Drizzle handles cleanly with join)
      const conditions: ReturnType<typeof eq>[] = []

      if (filters.cursor !== undefined) {
        const { submissionDate, billId } = filters.cursor
        const cursorCondition = or(
          lt(bills.submissionDate, submissionDate),
          and(eq(bills.submissionDate, submissionDate), lt(bills.id, billId)),
        )
        if (cursorCondition !== undefined) {
          conditions.push(cursorCondition as ReturnType<typeof eq>)
        }
      }

      const rows = await db
        .select({
          id: bills.id,
          externalId: bills.externalId,
          source: bills.source,
          title: bills.title,
          billType: bills.billType,
          billNumber: bills.billNumber,
          billYear: bills.billYear,
          status: bills.status,
          submissionDate: bills.submissionDate,
          sourceUrl: bills.sourceUrl,
        })
        .from(bills)
        .innerJoin(politicians, eq(bills.politicianId, politicians.id))
        .where(
          and(
            eq(politicians.slug, slug),
            eq(politicians.active, true),
            ...conditions,
          ),
        )
        .orderBy(desc(bills.submissionDate), desc(bills.id))
        .limit(filters.limit + 1)

      return rows.map((row) => ({
        ...row,
        sourceUrl: row.sourceUrl ?? null,
        billYear: Number(row.billYear),
      }))
    },
  }
}

export type BillRepository = ReturnType<typeof createBillRepository>
```

- **MIRROR**: `apps/api/src/repositories/politician.repository.ts:58-113` (`selectWithFilters` pattern)
- **GOTCHA**: `conditions` array TypeScript inference may need explicit typing — use `SQL<unknown>[]` or cast. Look at how politician repo handles the `conditions` array.
- **GOTCHA**: `or()` in Drizzle returns `SQL<unknown> | undefined` when called with 2 args — must guard against `undefined` before pushing to conditions. Mirror exact pattern from politician repo lines 83-87.
- **GOTCHA**: `billYear` is `smallint` in DB — Drizzle may return it as number already, but use `Number()` to be safe (same as overallScore in politician repo)
- **GOTCHA**: `submissionDate` is a `date` column — Drizzle returns it as a string in 'YYYY-MM-DD' format (NOT a Date object) when using `postgres-js` driver
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

### Task 7: CREATE `apps/api/src/services/bill.service.ts`

- **ACTION**: CREATE service factory with cursor encode/decode
- **IMPLEMENT**: Mirrors `politician.service.ts` structure exactly

```typescript
import type { BillRepository } from '../repositories/bill.repository.js'
import type { BillDto, BillListResponseDto } from '../schemas/bill.schema.js'
import type { BillRow } from '../repositories/bill.repository.js'

interface BillCursor {
  submissionDate: string
  billId: string
}

function encodeCursor(cursor: BillCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

function decodeCursor(encoded: string): BillCursor {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as BillCursor
  } catch {
    throw new Error('Invalid cursor')
  }
}

function toBillDto(row: BillRow): BillDto {
  return {
    id: row.id,
    externalId: row.externalId,
    source: row.source,
    title: row.title,
    billType: row.billType,
    billNumber: row.billNumber,
    billYear: row.billYear,
    status: row.status,
    submissionDate: row.submissionDate,
    sourceUrl: row.sourceUrl,
  }
}

export interface FindBillsInput {
  limit: number
  cursor?: string | undefined
}

export function createBillService(repository: BillRepository): {
  findByPoliticianSlug: (slug: string, input: FindBillsInput) => Promise<BillListResponseDto>
} {
  return {
    async findByPoliticianSlug(slug: string, input: FindBillsInput): Promise<BillListResponseDto> {
      const decodedCursor = input.cursor !== undefined ? decodeCursor(input.cursor) : undefined

      const rows = await repository.selectByPoliticianSlug(slug, {
        limit: input.limit,
        cursor: decodedCursor,
      })

      const hasMore = rows.length > input.limit
      const data = hasMore ? rows.slice(0, input.limit) : rows

      const lastRow = data.at(-1)
      const nextCursor =
        hasMore && lastRow !== undefined
          ? encodeCursor({ submissionDate: lastRow.submissionDate, billId: lastRow.id })
          : null

      return { data: data.map(toBillDto), cursor: nextCursor }
    },
  }
}

export type BillService = ReturnType<typeof createBillService>
```

- **MIRROR**: `apps/api/src/services/politician.service.ts:1-109` — every function mirrors existing patterns
- **GOTCHA**: Use `.at(-1)` not `data[data.length - 1]` — `noUncheckedIndexedAccess` requires `.at()` for array indexing
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

### Task 8: CREATE `apps/api/src/routes/bills.route.ts`

- **ACTION**: CREATE Fastify route file for bills
- **IMPLEMENT**: Route factory following `politicians.route.ts` pattern

```typescript
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  PoliticianParamsSchema,
  BillListQuerySchema,
  BillListResponseSchema,
  type PoliticianParams,
  type BillListQuery,
} from '../schemas/bill.schema.js'
import type { BillService } from '../services/bill.service.js'

interface RouteDeps {
  billService: BillService
}

export function createBillsRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get<{ Params: PoliticianParams; Querystring: BillListQuery }>(
      '/politicians/:slug/bills',
      {
        schema: {
          params: PoliticianParamsSchema,
          querystring: BillListQuerySchema,
          response: { 200: BillListResponseSchema },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const { limit = 20, cursor } = request.query

        const result = await deps.billService.findByPoliticianSlug(slug, {
          limit,
          cursor,
        })

        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')

        return result
      },
    )
  }
}
```

- **MIRROR**: `apps/api/src/routes/politicians.route.ts:21-47` (listing route pattern, NOT the slug route)
- **GOTCHA**: `eslint-disable-next-line @typescript-eslint/require-await` is required before the outer `return async (app) =>` because the outer async function doesn't await anything
- **GOTCHA**: Cache-Control here is `max-age=300, s-maxage=3600` (same as listing, NOT the profile's 86400) because bills data changes more frequently than the profile overview
- **GOTCHA**: `void reply.header(...)` — the `void` discards the Promise to avoid `no-floating-promises`
- **NOTE**: When politician slug is not found, `findByPoliticianSlug` will return `{ data: [], cursor: null }` (empty list) because the INNER JOIN returns zero rows. This is acceptable — no 404 needed for the bills list; if the parent slug doesn't exist, the profile page already handles the 404.
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

### Task 9: UPDATE `apps/api/src/app.ts`

- **ACTION**: ADD bill dependency injection wiring after politician wiring
- **IMPLEMENT**: Three additions to `buildApp()`:
  1. Add imports at the top of the file
  2. Add repo/service creation after line 36 (after `politicianService`)
  3. Add route registration after line 39 (after `createPoliticiansRoute`)

```typescript
// Add imports:
import { createBillRepository } from './repositories/bill.repository.js'
import { createBillService } from './services/bill.service.js'
import { createBillsRoute } from './routes/bills.route.js'

// Add after line 36 (after politicianService):
const billRepository = createBillRepository(db)
const billService = createBillService(billRepository)

// Add after line 39 (after createPoliticiansRoute):
void app.register(createBillsRoute({ billService }), { prefix: '/api/v1' })
```

- **MIRROR**: `apps/api/src/app.ts:7-39` (exact DI pattern)
- **GOTCHA**: All three imports use `.js` extension
- **GOTCHA**: `db` is already created at line 34 — reuse it, do NOT create a second `createPublicDb()`
- **VALIDATE**: `pnpm --filter @pah/api typecheck && pnpm --filter @pah/api lint`

### Task 10: UPDATE `apps/web/src/lib/api-types.ts`

- **ACTION**: ADD Bill type re-exports from `@pah/shared`
- **IMPLEMENT**: Add to existing imports block and re-export block

```typescript
import type {
  PoliticianCard,
  ListPoliticiansResponse,
  PoliticianFilters,
  PoliticianProfile,
  Bill,
  BillFilters,
  BillListResponse,
} from '@pah/shared'

export type {
  PoliticianCard, ListPoliticiansResponse, PoliticianFilters, PoliticianProfile,
  Bill, BillFilters, BillListResponse
}
```

- **MIRROR**: `apps/web/src/lib/api-types.ts:1-9` (existing import+re-export pattern)
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

### Task 11: UPDATE `apps/web/src/lib/api-client.ts`

- **ACTION**: ADD `fetchPoliticianBills` function and import `BillFilters`, `BillListResponse`
- **IMPLEMENT**:

```typescript
// Add to existing imports from './api-types':
import type { ..., BillFilters, BillListResponse } from './api-types'

// Add after fetchPoliticianBySlug:
export async function fetchPoliticianBills(
  slug: string,
  filters: BillFilters = {},
): Promise<BillListResponse> {
  const params = new URLSearchParams()
  if (filters.cursor !== undefined) params.set('cursor', filters.cursor)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  return apiFetch<BillListResponse>(
    `/politicians/${encodeURIComponent(slug)}/bills?${params.toString()}`,
    { next: { revalidate: 300, tags: [`politician-${slug}-bills`] } },
  )
}
```

- **MIRROR**: `apps/web/src/lib/api-client.ts:40-64` (fetchPoliticians + fetchPoliticianBySlug pattern)
- **GOTCHA**: ISR tag uses `politician-${slug}-bills` so on-demand revalidation can target bills specifically
- **GOTCHA**: `revalidate: 300` (5 min) for bills, NOT 3600 — bills are section data, same as listing
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

### Task 12: CREATE `apps/web/src/app/politicos/[slug]/projetos/page.tsx`

- **ACTION**: CREATE the bills tab page — ISR Server Component
- **IMPLEMENT**:

```typescript
export const revalidate = 3600

import Link from 'next/link'
import type { Metadata } from 'next'
import { fetchPoliticianBySlug, fetchPoliticianBills, ApiError } from '../../../../lib/api-client'
import { notFound } from 'next/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const politician = await fetchPoliticianBySlug(slug)
    return {
      title: `Projetos de Lei — ${politician.name} (${politician.party}-${politician.state}) — Autoridade Política`,
    }
  } catch {
    return { title: 'Projetos de Lei — Autoridade Política' }
  }
}

export default async function BillsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<React.JSX.Element> {
  const { slug } = await params
  const sp = await searchParams
  const cursor = typeof sp['cursor'] === 'string' ? sp['cursor'] : undefined

  let politician
  try {
    politician = await fetchPoliticianBySlug(slug)
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  const result = await fetchPoliticianBills(slug, { cursor })

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link
        href={`/politicos/${slug}`}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← {politician.name}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">Projetos de Lei</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {politician.party}-{politician.state}
      </p>

      {/* Bills table */}
      {result.data.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nenhum projeto de lei encontrado.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4">Número</th>
                <th className="pb-3 pr-4">Título</th>
                <th className="pb-3 pr-4">Situação</th>
                <th className="pb-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((bill) => (
                <tr key={bill.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-mono whitespace-nowrap">
                    {bill.sourceUrl !== null ? (
                      <a
                        href={bill.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {bill.billType} {bill.billNumber}/{bill.billYear}
                      </a>
                    ) : (
                      <span>{bill.billType} {bill.billNumber}/{bill.billYear}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">{bill.title}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{bill.submissionDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <nav className="mt-8 flex justify-center gap-4" aria-label="Paginação">
        {cursor !== undefined && (
          <Link
            href={`/politicos/${slug}/projetos`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            ← Início
          </Link>
        )}
        {result.cursor !== null && (
          <Link
            href={`/politicos/${slug}/projetos?cursor=${result.cursor}`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Próxima →
          </Link>
        )}
      </nav>
    </main>
  )
}
```

- **MIRROR**: `apps/web/src/app/politicos/[slug]/page.tsx` (revalidate, generateMetadata, try/catch with ApiError, params as Promise)
- **MIRROR**: `apps/web/src/app/politicos/page.tsx:84-102` (pagination nav pattern)
- **GOTCHA**: Relative imports — `../../../../lib/api-client` (4 levels up from `[slug]/projetos/page.tsx`)
- **GOTCHA**: `params: Promise<{ slug: string }>` — Next.js 15 nested dynamic route params are a Promise, must be awaited
- **GOTCHA**: The `[slug]` from the parent segment IS available in nested routes — Next.js collects all dynamic segments
- **GOTCHA**: `exactOptionalPropertyTypes` — build `BillFilters` conditionally; `cursor` is only added when defined
- **GOTCHA**: `searchParams` is also a Promise in Next.js 15 — must be `await`ed
- **DR-002**: No qualitative labels — display `bill.status` as-is from the API (factual data)
- **VALIDATE**: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web build`

### Task 13: CREATE `apps/web/src/app/politicos/[slug]/projetos/loading.tsx`

- **ACTION**: CREATE loading skeleton matching the bills page layout
- **IMPLEMENT**: Animated skeleton placeholders for table rows

```typescript
export default function BillsLoading(): React.JSX.Element {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted" />

      {/* Title skeleton */}
      <div className="mb-2 h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mb-6 h-4 w-20 animate-pulse rounded bg-muted" />

      {/* Table skeleton — 5 rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-border pb-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </main>
  )
}
```

- **MIRROR**: `apps/web/src/app/politicos/[slug]/loading.tsx` (animate-pulse, bg-muted pattern)
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

### Task 14: CREATE `apps/api/src/services/bill.service.test.ts`

- **ACTION**: CREATE unit tests for the bill service
- **IMPLEMENT**: 5 tests mirroring `politician.service.test.ts:121-176` (findBySlug/findByPoliticianSlug pattern)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createBillService } from './bill.service.js'
import type { BillRepository, BillRow } from '../repositories/bill.repository.js'

function buildRow(overrides: Partial<BillRow> = {}): BillRow {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    externalId: 'PL-123-2024',
    source: 'camara',
    title: 'Dispõe sobre a criação de comitê parlamentar',
    billType: 'PL',
    billNumber: '123',
    billYear: 2024,
    status: 'Em tramitação',
    submissionDate: '2024-03-01',
    sourceUrl: null,
    ...overrides,
  }
}

function buildRepository(rows: BillRow[] = []): BillRepository {
  return {
    selectByPoliticianSlug: vi.fn().mockResolvedValue(rows),
  }
}

describe('createBillService', () => {
  describe('findByPoliticianSlug', () => {
    it('returns empty data and null cursor when repository returns no rows', async () => {
      const service = createBillService(buildRepository([]))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.data).toHaveLength(0)
      expect(result.cursor).toBeNull()
    })

    it('returns rows mapped to BillDto', async () => {
      const row = buildRow()
      const service = createBillService(buildRepository([row]))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
        id: row.id,
        externalId: row.externalId,
        source: row.source,
        title: row.title,
        billType: row.billType,
        billNumber: row.billNumber,
        billYear: row.billYear,
        status: row.status,
        submissionDate: row.submissionDate,
        sourceUrl: row.sourceUrl,
      })
    })

    it('returns null cursor when rows <= limit', async () => {
      const rows = [buildRow(), buildRow({ id: 'other-id', externalId: 'PL-124-2024' })]
      const service = createBillService(buildRepository(rows))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.cursor).toBeNull()
    })

    it('returns non-null cursor and slices data when repository returns limit+1 rows', async () => {
      const rows = [
        buildRow({ id: 'id-1', externalId: 'e1', submissionDate: '2024-03-03' }),
        buildRow({ id: 'id-2', externalId: 'e2', submissionDate: '2024-03-02' }),
        buildRow({ id: 'id-3', externalId: 'e3', submissionDate: '2024-03-01' }),
      ]
      const service = createBillService(buildRepository(rows))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 2 })
      expect(result.data).toHaveLength(2)
      expect(result.cursor).not.toBeNull()
    })

    it('cursor encodes the last item submissionDate and id', async () => {
      const rows = [
        buildRow({ id: 'id-1', externalId: 'e1', submissionDate: '2024-03-03' }),
        buildRow({ id: 'id-2', externalId: 'e2', submissionDate: '2024-03-02' }),
      ]
      const service = createBillService(buildRepository(rows))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 1 })
      expect(result.cursor).not.toBeNull()
      const decoded: unknown = JSON.parse(
        Buffer.from(result.cursor!, 'base64url').toString('utf-8'),
      )
      expect(decoded).toEqual({ submissionDate: '2024-03-03', billId: 'id-1' })
    })
  })
})
```

- **MIRROR**: `apps/api/src/services/politician.service.test.ts:121-176` (factory, buildRow, buildRepository, describe structure)
- **VALIDATE**: `pnpm --filter @pah/api test`

### Task 15: Full Validation Suite

```bash
# Level 1: Static analysis
pnpm --filter @pah/shared typecheck
pnpm --filter @pah/db typecheck
pnpm --filter @pah/api typecheck
pnpm --filter @pah/web typecheck
pnpm lint

# Level 2: Unit tests
pnpm --filter @pah/api test         # expect: 14+ tests pass (9 existing + 5 new bill service tests)
pnpm --filter @pah/web test         # expect: 32 tests still pass (no regressions)

# Level 3: Full suite + build
pnpm --filter @pah/web build        # next build must succeed — [slug]/projetos renders as ISR

# Level 4: Integration (manual with dev server)
# pnpm --filter @pah/web dev
# Visit http://localhost:3000/politicos
# Click any politician card → /politicos/joao-silva-sp
# Click "Projetos de Lei" tab → /politicos/joao-silva-sp/projetos
# Should show bill list (empty if seed data has no bills) or empty state message
```

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|------------|-----------|
| `apps/api/src/services/bill.service.test.ts` | 5 tests: empty list, DTO mapping, null cursor, limit+1 cursor, cursor content | Business logic, cursor encoding |

### Edge Cases Checklist

- [x] Empty bills list for politician → empty state UI + `cursor: null`
- [x] Exactly `limit` rows → no next page → `cursor: null`
- [x] `limit+1` rows → next page exists → cursor encoded correctly
- [x] Invalid cursor string → `decodeCursor` throws `Error('Invalid cursor')` → Fastify returns 400 (TypeBox schema validates cursor as optional string; if passed, service decodes and throws which becomes 500 — acceptable for MVP)
- [x] Politician slug not found → `selectByPoliticianSlug` returns `[]` → empty list (not 404)

---

## Validation Commands

### Level 1: Static Analysis

```bash
pnpm --filter @pah/shared typecheck && pnpm --filter @pah/db typecheck && pnpm --filter @pah/api typecheck && pnpm --filter @pah/web typecheck
pnpm lint
```

**EXPECT**: Exit 0, zero errors

### Level 2: Unit Tests

```bash
pnpm --filter @pah/api test
```

**EXPECT**: All tests pass (9 existing + 5 new = 14 total minimum)

### Level 3: Build

```bash
pnpm --filter @pah/web build
```

**EXPECT**: `next build` succeeds; `/politicos/[slug]/projetos` appears in build output as ISR route

### Level 4: Manual Smoke Test

```bash
# Start API (needs DB)
pnpm --filter @pah/api dev

# In another terminal, call the endpoint:
curl -s 'http://localhost:3001/api/v1/politicians/joao-silva-sp/bills?limit=5' | jq
# Expected: { data: [], cursor: null } (empty — seed data has no bills yet)

# Start web
pnpm --filter @pah/web dev
# Visit: http://localhost:3000/politicos/joao-silva-sp/projetos
# Expected: "Nenhum projeto de lei encontrado." with breadcrumb ← João Silva
```

---

## Acceptance Criteria

- [ ] `GET /api/v1/politicians/:slug/bills?limit=20` returns `{ data: Bill[], cursor: string | null }`
- [ ] Bills are sorted by `submission_date DESC, id DESC` (keyset pagination)
- [ ] `/politicos/[slug]/projetos` renders with ISR (`revalidate = 3600`)
- [ ] "Nenhum projeto de lei encontrado." shown when bill list is empty
- [ ] Pagination links appear when `cursor !== null`
- [ ] "← Início" appears when `cursor` query param is present
- [ ] Breadcrumb links back to `/politicos/[slug]`
- [ ] `source_url` links open in `target="_blank"` with `rel="noopener noreferrer"`
- [ ] `pnpm lint && pnpm typecheck` pass with 0 errors
- [ ] 14+ API unit tests pass, 32+ web unit tests pass (no regressions)
- [ ] `next build` succeeds
- [ ] DR-002 compliance: bill status displayed as-is (factual), no "good/bad" labels

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Drizzle `or()` undefined guard | MEDIUM | HIGH | Mirror exact pattern from `politician.repository.ts:83-87`; guard before pushing |
| `conditions` TypeScript inference issue | MEDIUM | MEDIUM | Cast cursorCondition or use `SQL<unknown>[]` type for the array |
| `date` column returns string not Date | LOW | MEDIUM | Drizzle `postgres-js` driver returns dates as strings; no conversion needed |
| Next.js nested params not available | LOW | HIGH | Confirmed: `[slug]` IS available in `params` for nested routes — test with `await params` |
| Missing `@pah/shared` build after adding bill.ts | LOW | HIGH | Run `pnpm --filter @pah/shared typecheck` before touching API — shared must be built first |
| `exactOptionalPropertyTypes` violations | MEDIUM | LOW | Build `BillFilters = {}` conditionally (same pattern as `PoliticianFilters` in listing page) |

---

## Notes

**Seed data**: The `bills` table will be empty until the pipeline (RF-013) runs. The empty state message and page must be tested with an empty API response. This is by design.

**Migration numbering**: Migrations `0001` and `0002` exist. This is migration `0003`. Do NOT skip numbers.

**Route placement**: Bills live in `bills.route.ts` (separate file from `politicians.route.ts`) because the backend CLAUDE.md explicitly lists `bill.repository.ts` as a separate file and the route convention is one resource per file.

**Cursor uniqueness**: The cursor `{ submissionDate, billId }` assumes that within a given date, bill UUIDs provide a stable sort. This is correct because UUIDs are unique and the ORDER BY clause uses `id DESC` as the tiebreaker.

**Phase 4 and 5 parallelism**: RF-009 (votes) and RF-012 (expenses) follow the identical pattern. After this plan is complete, those two can be implemented in parallel worktrees — each adds an independent DB table and section tab with zero shared state.
