# Feature: Profile Section — Expenses (RF-012)

## Summary

Add a paginated parliamentary expenses tab (`/politicos/[slug]/despesas`) to the politician profile. The feature follows the exact same full-stack pattern as the already-completed Bills (RF-008) and Votes (RF-009) sections: DB table → Drizzle repository → Fastify service (cursor encoding) → route handler → Next.js ISR Server Component page. New work specific to this section: (1) a `yearlyTotals` aggregation analogous to the votes `participationRate`, (2) a `formatCurrency` utility in `@pah/shared` that does not yet exist, and (3) a 3-component keyset cursor `{ year, month, expenseId }` because expenses are grouped by year + month.

## User Story

As a Cidadão Engajado
I want to see a politician's CEAP/CEAPS parliamentary expenses (category, supplier, BRL amount, document, source link) on their profile
So that I can understand how they spend their parliamentary quota before forming an opinion

## Problem Statement

The `Despesas` tab link already appears in the profile tab nav (`PROFILE_TABS` at `apps/web/src/app/politicos/[slug]/page.tsx:14`) but navigating to `/politicos/<slug>/despesas` returns a 404. The route, API endpoint, DB table, and shared types do not exist. Citizens who care most about financial transparency (the most-searched transparency data, per PRD) hit a dead end.

## Solution Statement

Create the complete expenses stack in dependency order: shared types + utility → DB migration → API schema → repository → service → route → `app.ts` wiring → Next.js fetch function → page + loading skeleton. Every artifact mirrors the votes section pattern exactly, with two additions: a `yearlyTotals` field in the API response (parallel aggregation query) and a new `formatCurrency` function in `packages/shared`.

## Metadata

| Field            | Value                                                         |
| ---------------- | ------------------------------------------------------------- |
| Type             | NEW_CAPABILITY                                                |
| Complexity       | MEDIUM                                                        |
| Systems Affected | `packages/shared`, `packages/db`, `apps/api`, `apps/web`     |
| Dependencies     | Phase 2 (Profile Overview RF-007) — complete ✓               |
| Estimated Tasks  | 15 tasks                                                      |

---

## UX Design

### Before State

```
╔══════════════════════════════════════════════════════════════════╗
║                         BEFORE STATE                             ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  /politicos/joao-silva-sp                                        ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │  [Foto] João Silva   PT-SP   Score: 72/100              │    ║
║  │  ┌──────────┬──────────┬──────────┬──────────┬────────┐ │    ║
║  │  │ Projetos │ Votações │ Despesas │ Propostas│Atividad│ │    ║
║  │  └──────────┴──────────┴──────────┴──────────┴────────┘ │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║  User clicks "Despesas" tab                                      ║
║                          │                                       ║
║                          ▼                                       ║
║                   ┌─────────────┐                                ║
║                   │   404 Error │  ← Dead end                   ║
║                   └─────────────┘                                ║
║                                                                  ║
║  USER_FLOW: Click Despesas tab → 404 → bounce                   ║
║  PAIN_POINT: No expenses page exists — citizens can't inspect   ║
║              parliamentary quota spending                        ║
║  DATA_FLOW: Tab link → Next.js 404 (no route)                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### After State

```
╔══════════════════════════════════════════════════════════════════╗
║                         AFTER STATE                              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  /politicos/joao-silva-sp/despesas                               ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │  ← João Silva                                           │    ║
║  │  Despesas Parlamentares    PT-SP                        │    ║
║  │                                                         │    ║
║  │  Total 2024: R$ 87.450,00                               │    ║
║  │  Total 2023: R$ 92.113,50                               │    ║
║  │                                                         │    ║
║  │  ┌──────────────┬────────────────┬──────────┬────────┐  │    ║
║  │  │ Categoria    │ Fornecedor     │ Valor    │ Doc    │  │    ║
║  │  ├──────────────┼────────────────┼──────────┼────────┤  │    ║
║  │  │ Passagem Aér.│ GOL Linhas Aér │R$ 2.450,0│ [Link] │  │    ║
║  │  │ Hospedagem   │ Hotel Nacional │R$ 1.200,0│ [Link] │  │    ║
║  │  │ ...          │ ...            │ ...      │ ...    │  │    ║
║  │  └──────────────┴────────────────┴──────────┴────────┘  │    ║
║  │                                                         │    ║
║  │                         [Próxima →]                     │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║  USER_FLOW: Click tab → ISR page loads → see yearly totals       ║
║             → browse expense rows → paginate with cursor         ║
║  VALUE_ADD: Full CEAP spending transparency with BRL formatting  ║
║  DATA_FLOW: URL → Next.js ISR page → apiFetch → Fastify API →   ║
║             Drizzle → PostgreSQL public_data.expenses            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/politicos/[slug]/despesas` | 404 error | ISR expenses page | Citizens can browse CEAP expenses |
| `GET /api/v1/politicians/:slug/expenses` | 404 | Paginated expense list + yearly totals | API consumers get structured expense data |
| `public_data.expenses` table | Does not exist | Created | Pipeline can write real CEAP data |
| `@pah/shared` | No `formatCurrency` | `formatCurrency(n)` → `"R$ 1.234,56"` | All frontend can format BRL consistently |

---

## Mandatory Reading

**CRITICAL: Read these files BEFORE starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | [vote.repository.ts](apps/api/src/repositories/vote.repository.ts) | 1–87 | MIRROR exactly — cursor pattern, `count()` for aggregation, `rows.at(0)` |
| P0 | [vote.service.ts](apps/api/src/services/vote.service.ts) | 1–76 | MIRROR cursor encode/decode, `Promise.all` parallel pattern, slice+cursor |
| P0 | [vote.schema.ts](apps/api/src/schemas/vote.schema.ts) | 1–32 | MIRROR TypeBox schema structure with extra response field |
| P0 | [votes.route.ts](apps/api/src/routes/votes.route.ts) | 1–42 | MIRROR route handler — `eslint-disable` comment required, Cache-Control |
| P0 | [votacoes/page.tsx](apps/web/src/app/politicos/[slug]/votacoes/page.tsx) | 1–139 | MIRROR ISR page — searchParams await, cursor extraction, table, pagination nav |
| P0 | [votacoes/loading.tsx](apps/web/src/app/politicos/[slug]/votacoes/loading.tsx) | 1–27 | MIRROR skeleton — adjust column count (4 columns for expenses) |
| P1 | [public-schema.ts](packages/db/src/public-schema.ts) | 96–144 | MIRROR table definition — bills/votes pattern for expenses |
| P1 | [0004_add_votes.sql](packages/db/migrations/public/0004_add_votes.sql) | 1–24 | MIRROR migration — UNIQUE constraint, two indexes |
| P1 | [app.ts](apps/api/src/app.ts) | 1–69 | MIRROR DI wiring — add expense repo/service/route in same order |
| P1 | [api-client.ts](apps/web/src/lib/api-client.ts) | 93–109 | MIRROR fetchPoliticianVotes → fetchPoliticianExpenses |
| P2 | [vote.ts (shared)](packages/shared/src/types/vote.ts) | 1–22 | MIRROR shared type interface structure |
| P2 | [shared/index.ts](packages/shared/src/index.ts) | 1–8 | Add new exports here |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| [Drizzle ORM numeric column](https://orm.drizzle.team/docs/column-types/pg#numeric) | Numeric type | `numeric` returns `string` in TypeScript — must `Number()` cast |
| [Drizzle ORM select+aggregations](https://orm.drizzle.team/docs/select#aggregations) | `sum()` function | `sum()` returns `string \| null` — cast with `Number(row.total ?? '0')` |
| [Intl.NumberFormat pt-BR](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) | BRL formatting | `new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)` |

---

## Patterns to Mirror

**SCHEMA PATTERN (votes table → expenses table):**

```typescript
// SOURCE: packages/db/src/public-schema.ts:124-144
// COPY THIS PATTERN for the expenses table definition:
export const votes = publicData.table(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    externalId: varchar('external_id', { length: 100 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(),
    // ... domain columns ...
    sourceUrl: varchar('source_url', { length: 500 }), // nullable
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_votes_politician').on(table.politicianId),
    index('idx_votes_pagination').on(table.politicianId, table.sessionDate, table.id),
  ],
)
```

**CURSOR ENCODE/DECODE PATTERN:**

```typescript
// SOURCE: apps/api/src/services/vote.service.ts:4-18
// COPY THIS PATTERN — only change the cursor interface fields:
interface VoteCursor {
  sessionDate: string
  voteId: string
}
function encodeCursor(cursor: VoteCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}
function decodeCursor(encoded: string): VoteCursor {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as VoteCursor
  } catch {
    throw new Error('Invalid cursor')
  }
}
```

**PARALLEL AGGREGATION PATTERN:**

```typescript
// SOURCE: apps/api/src/services/vote.service.ts:50-57
// COPY THIS PATTERN — replace participationRate with yearlyTotals:
const [rateResult, rows] = await Promise.all([
  repository.selectParticipationRate(slug),
  repository.selectByPoliticianSlug(slug, { limit: input.limit, cursor: decodedCursor }),
])
```

**KEYSET CURSOR CONDITION (2-field, from votes — expenses adds a 3rd field):**

```typescript
// SOURCE: apps/api/src/repositories/vote.repository.ts:33-43
// MIRROR THIS PATTERN — expenses cursor has 3 fields (year, month, id):
if (filters.cursor !== undefined) {
  const { sessionDate, voteId } = filters.cursor
  const cursorCondition = or(
    lt(votes.sessionDate, sessionDate),
    and(eq(votes.sessionDate, sessionDate), lt(votes.id, voteId)),
  )
  if (cursorCondition !== undefined) {
    conditions.push(cursorCondition)
  }
}
```

**COUNT AGGREGATION WITH NUMBER() CAST (votes participationRate):**

```typescript
// SOURCE: apps/api/src/repositories/vote.repository.ts:68-83
// PostgreSQL returns bigint counts as strings; Drizzle sum() returns string|null
// For expenses yearlyTotals, use sum() instead of count():
const row = rows.at(0)
return { total: Number(row?.total ?? 0), present: Number(row?.present ?? 0) }
```

**ROUTE HANDLER PATTERN:**

```typescript
// SOURCE: apps/api/src/routes/votes.route.ts:1-42
// COPY THIS PATTERN exactly — note the eslint-disable comment:
export function createVotesRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get<{ Params: PoliticianParams; Querystring: VoteListQuery }>(
      '/politicians/:slug/votes',
      { schema: { params: PoliticianParamsSchema, querystring: VoteListQuerySchema,
          response: { 200: VoteListResponseSchema } } },
      async (request, reply) => {
        const { slug } = request.params
        const { limit = 20, cursor } = request.query
        const result = await deps.voteService.findByPoliticianSlug(slug, { limit, cursor })
        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')
        return result
      },
    )
  }
}
```

**APP.TS DI WIRING PATTERN:**

```typescript
// SOURCE: apps/api/src/app.ts:43-51
// ADD these 3 lines in the same position (after vote lines):
const voteRepository = createVoteRepository(db)
const voteService = createVoteService(voteRepository)
// ...
void app.register(createVotesRoute({ voteService }), { prefix: '/api/v1' })
```

**NEXT.JS PAGE PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/[slug]/votacoes/page.tsx:1-45
// COPY THIS PATTERN — top-of-file revalidate, generateMetadata, searchParams await:
export const revalidate = 3600
// ...
export default async function XxxPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<React.JSX.Element> {
  const { slug } = await params
  const sp = await searchParams
  const cursor = typeof sp['cursor'] === 'string' ? sp['cursor'] : undefined
  // exactOptionalPropertyTypes: build filters conditionally
  const expenseFilters = cursor !== undefined ? { cursor } : {}
```

**API CLIENT FETCH PATTERN:**

```typescript
// SOURCE: apps/web/src/lib/api-client.ts:98-109
// MIRROR fetchPoliticianVotes → fetchPoliticianExpenses:
export async function fetchPoliticianVotes(
  slug: string,
  filters: VoteFilters = {},
): Promise<VoteListResponse> {
  const params = new URLSearchParams()
  if (filters.cursor !== undefined) params.set('cursor', filters.cursor)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  return apiFetch<VoteListResponse>(
    `/politicians/${encodeURIComponent(slug)}/votes?${params.toString()}`,
    { next: { revalidate: 300, tags: [`politician-${slug}-votes`] } },
  )
}
```

**TEST STRUCTURE:**

```typescript
// SOURCE: apps/api/src/services/bill.service.test.ts (pattern to follow)
// describe block → arrange/act/assert, use vi.fn() stubs for repository
describe('createExpenseService', () => {
  it('returns empty yearlyTotals when politician has no expenses', () => {
    // Arrange / Act / Assert
  })
})
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `packages/shared/src/utils/format.ts` | CREATE | `formatCurrency` BRL formatter — does not exist yet |
| `packages/shared/src/types/expense.ts` | CREATE | Domain types `Expense`, `ExpenseFilters`, `ExpenseListResponse` |
| `packages/shared/src/index.ts` | UPDATE | Export new expense types and `formatCurrency` |
| `packages/db/src/public-schema.ts` | UPDATE | Add `expenses` table definition |
| `packages/db/migrations/public/0005_add_expenses.sql` | CREATE | PostgreSQL migration for `public_data.expenses` |
| `apps/api/src/schemas/expense.schema.ts` | CREATE | TypeBox schemas: `ExpenseSchema`, `ExpenseListQuerySchema`, `ExpenseListResponseSchema` |
| `apps/api/src/repositories/expense.repository.ts` | CREATE | `selectByPoliticianSlug` (cursor paginated) + `selectYearlyTotals` (GROUP BY year) |
| `apps/api/src/services/expense.service.ts` | CREATE | Cursor encode/decode, parallel aggregation+pagination, DTO mapping |
| `apps/api/src/services/expense.service.test.ts` | CREATE | Unit tests: yearlyTotals computation, cursor encoding, empty state |
| `apps/api/src/routes/expenses.route.ts` | CREATE | `GET /politicians/:slug/expenses` Fastify route handler |
| `apps/api/src/app.ts` | UPDATE | DI wiring for expense repository/service, route registration |
| `apps/web/src/lib/api-types.ts` | UPDATE | Add `Expense`, `ExpenseFilters`, `ExpenseListResponse` re-exports |
| `apps/web/src/lib/api-client.ts` | UPDATE | Add `fetchPoliticianExpenses` function |
| `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | CREATE | ISR expenses page: yearly totals, table, pagination |
| `apps/web/src/app/politicos/[slug]/despesas/loading.tsx` | CREATE | Pulse skeleton matching final layout |

---

## NOT Building (Scope Limits)

- **Year filter on expenses** — PRD says paginated list, no year-filter dropdown; filter by year is post-MVP
- **Expense chart visualization** — The `expense-chart.tsx` component mentioned in CLAUDE.md is future; only table for MVP
- **Supplier CNPJ/CPF display** — Not in PRD "Shows:" list; omit from schema and UI
- **Expense CSV export** — Post-MVP
- **Seed data for expenses table** — No seed data; page shows empty state until pipeline runs

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable with `pnpm typecheck`.

---

### Task 1: CREATE `packages/shared/src/utils/format.ts`

- **ACTION**: CREATE new utility file with `formatCurrency`
- **IMPLEMENT**:

  ```typescript
  /**
   * Formats a number as Brazilian Real currency (BRL).
   * Output example: R$ 1.234,56
   */
  export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
  }
  ```

- **GOTCHA**: Do NOT add `'use client'` — this is a `packages/shared` utility used server-side in RSC. `Intl.NumberFormat` is available in Node.js 18+.
- **VALIDATE**: `pnpm --filter @pah/shared typecheck`

---

### Task 2: CREATE `packages/shared/src/types/expense.ts`

- **ACTION**: CREATE domain type definitions
- **MIRROR**: `packages/shared/src/types/vote.ts:1-22`
- **IMPLEMENT**:

  ```typescript
  /** A CEAP/CEAPS parliamentary expense record for a politician (RF-012). */
  export interface Expense {
    id: string
    externalId: string
    source: 'camara' | 'senado'
    year: number
    month: number
    category: string          // CEAP expense category (e.g., 'PASSAGEM AÉREA')
    supplierName: string
    amount: number            // BRL value (already parsed from string)
    documentNumber: string | null
    sourceUrl: string | null
  }

  export interface ExpenseFilters {
    cursor?: string
    limit?: number
  }

  export interface ExpenseListResponse {
    data: Expense[]
    cursor: string | null
    yearlyTotals: Array<{ year: number; total: number }>
  }
  ```

- **VALIDATE**: `pnpm --filter @pah/shared typecheck`

---

### Task 3: UPDATE `packages/shared/src/index.ts`

- **ACTION**: ADD exports for expense types and formatCurrency
- **MIRROR**: Existing pattern — each line is a named type export
- **ADD** these two lines to the file:

  ```typescript
  export type { Expense, ExpenseFilters, ExpenseListResponse } from './types/expense.js'
  export { formatCurrency } from './utils/format.js'
  ```

- **GOTCHA**: Use `.js` extension (ESM convention used in all existing exports)
- **VALIDATE**: `pnpm --filter @pah/shared typecheck`

---

### Task 4: UPDATE `packages/db/src/public-schema.ts`

- **ACTION**: ADD `expenses` table after the `votes` table definition (line 144)
- **MIRROR**: `packages/db/src/public-schema.ts:124-144` (votes table)
- **IMPORTS NEEDED**: `numeric` is already imported on line 1 of the file — no new imports needed
- **ADD** after the closing `)`of the `votes` table:

  ```typescript
  /**
   * CEAP/CEAPS parliamentary expenses for a politician (RF-012).
   * Populated by the pipeline from Camara and Senado sources.
   */
  export const expenses = publicData.table(
    'expenses',
    {
      id: uuid('id').primaryKey().defaultRandom(),
      politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
      externalId: varchar('external_id', { length: 100 }).notNull(),
      source: varchar('source', { length: 20 }).notNull(), // 'camara' | 'senado'
      year: smallint('year').notNull(),
      month: smallint('month').notNull(),
      category: varchar('category', { length: 100 }).notNull(),
      supplierName: varchar('supplier_name', { length: 255 }).notNull(),
      amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
      documentNumber: varchar('document_number', { length: 100 }), // nullable
      sourceUrl: varchar('source_url', { length: 500 }), // nullable
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => [
      index('idx_expenses_politician').on(table.politicianId),
      // Composite index for keyset pagination (politician_id, year DESC, month DESC, id DESC)
      index('idx_expenses_pagination').on(
        table.politicianId, table.year, table.month, table.id,
      ),
    ],
  )
  ```

- **GOTCHA**: `numeric` returns `string` in TypeScript from Drizzle — the repository must cast with `Number()`. Do NOT type `amount` as `number` in raw row types.
- **VALIDATE**: `pnpm --filter @pah/db typecheck`

---

### Task 5: CREATE `packages/db/migrations/public/0005_add_expenses.sql`

- **ACTION**: CREATE SQL migration file
- **MIRROR**: `packages/db/migrations/public/0004_add_votes.sql:1-24`
- **IMPLEMENT**:

  ```sql
  -- 0005_add_expenses.sql — public_data schema: expenses (RF-012)

  CREATE TABLE IF NOT EXISTS public_data.expenses (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id    UUID NOT NULL REFERENCES public_data.politicians(id),
    external_id      VARCHAR(100) NOT NULL,
    source           VARCHAR(20) NOT NULL,
    year             SMALLINT NOT NULL,
    month            SMALLINT NOT NULL,
    category         VARCHAR(100) NOT NULL,
    supplier_name    VARCHAR(255) NOT NULL,
    amount           NUMERIC(12,2) NOT NULL,
    document_number  VARCHAR(100),
    source_url       VARCHAR(500),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (politician_id, external_id)
  );

  -- Index for politician lookup
  CREATE INDEX IF NOT EXISTS idx_expenses_politician
    ON public_data.expenses(politician_id);

  -- Composite index for stable DESC cursor pagination (politician_id, year DESC, month DESC, id DESC)
  CREATE INDEX IF NOT EXISTS idx_expenses_pagination
    ON public_data.expenses(politician_id, year DESC, month DESC, id DESC);
  ```

- **VALIDATE**: File can be run manually against dev DB: `psql $DATABASE_URL < packages/db/migrations/public/0005_add_expenses.sql`

---

### Task 6: CREATE `apps/api/src/schemas/expense.schema.ts`

- **ACTION**: CREATE TypeBox schemas
- **MIRROR**: `apps/api/src/schemas/vote.schema.ts:1-32`
- **IMPLEMENT**:

  ```typescript
  import { Type, type Static } from '@sinclair/typebox'
  import { PoliticianParamsSchema, type PoliticianParams } from './politician.schema.js'

  // Re-export params schema — expenses use the same :slug param
  export { PoliticianParamsSchema, type PoliticianParams }

  export const ExpenseListQuerySchema = Type.Object({
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
    cursor: Type.Optional(
      Type.String({ description: 'Opaque base64url cursor from previous response' }),
    ),
  })
  export type ExpenseListQuery = Static<typeof ExpenseListQuerySchema>

  export const ExpenseSchema = Type.Object({
    id: Type.String({ format: 'uuid' }),
    externalId: Type.String(),
    source: Type.String(),
    year: Type.Integer({ minimum: 2000, maximum: 2100 }),
    month: Type.Integer({ minimum: 1, maximum: 12 }),
    category: Type.String(),
    supplierName: Type.String(),
    amount: Type.Number({ minimum: 0 }),
    documentNumber: Type.Union([Type.String(), Type.Null()]),
    sourceUrl: Type.Union([Type.String(), Type.Null()]),
  })
  export type ExpenseDto = Static<typeof ExpenseSchema>

  export const YearlyTotalSchema = Type.Object({
    year: Type.Integer(),
    total: Type.Number({ minimum: 0 }),
  })

  export const ExpenseListResponseSchema = Type.Object({
    data: Type.Array(ExpenseSchema),
    cursor: Type.Union([Type.String(), Type.Null()]),
    yearlyTotals: Type.Array(YearlyTotalSchema),
  })
  export type ExpenseListResponseDto = Static<typeof ExpenseListResponseSchema>
  ```

- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 7: CREATE `apps/api/src/repositories/expense.repository.ts`

- **ACTION**: CREATE Drizzle repository
- **MIRROR**: `apps/api/src/repositories/vote.repository.ts:1-87`
- **IMPLEMENT**:

  ```typescript
  import { eq, and, lt, or, desc, sum } from 'drizzle-orm'
  import type { PublicDb } from '@pah/db/clients'
  import { expenses, politicians } from '@pah/db/public-schema'

  export interface ExpenseRow {
    id: string
    externalId: string
    source: string
    year: number
    month: number
    category: string
    supplierName: string
    amount: string  // Drizzle returns numeric as string — service converts with Number()
    documentNumber: string | null
    sourceUrl: string | null
  }

  export interface ExpenseListFilters {
    limit: number
    cursor?: { year: number; month: number; expenseId: string } | undefined
  }

  /**
   * Repository for public_data.expenses queries.
   * Cursor pagination on (year DESC, month DESC, id DESC) for stable ordering.
   */
  export function createExpenseRepository(db: PublicDb): {
    selectByPoliticianSlug: (slug: string, filters: ExpenseListFilters) => Promise<ExpenseRow[]>
    selectYearlyTotals: (slug: string) => Promise<Array<{ year: number; total: string | null }>>
  } {
    return {
      async selectByPoliticianSlug(
        slug: string,
        filters: ExpenseListFilters,
      ): Promise<ExpenseRow[]> {
        const conditions = [eq(politicians.active, true)]

        if (filters.cursor !== undefined) {
          const { year, month, expenseId } = filters.cursor
          const cursorCondition = or(
            lt(expenses.year, year),
            and(eq(expenses.year, year), lt(expenses.month, month)),
            and(eq(expenses.year, year), eq(expenses.month, month), lt(expenses.id, expenseId)),
          )
          if (cursorCondition !== undefined) {
            conditions.push(cursorCondition)
          }
        }

        const rows = await db
          .select({
            id: expenses.id,
            externalId: expenses.externalId,
            source: expenses.source,
            year: expenses.year,
            month: expenses.month,
            category: expenses.category,
            supplierName: expenses.supplierName,
            amount: expenses.amount,
            documentNumber: expenses.documentNumber,
            sourceUrl: expenses.sourceUrl,
          })
          .from(expenses)
          .innerJoin(politicians, eq(expenses.politicianId, politicians.id))
          .where(and(eq(politicians.slug, slug), ...conditions))
          .orderBy(desc(expenses.year), desc(expenses.month), desc(expenses.id))
          .limit(filters.limit + 1)

        return rows.map((row) => ({
          ...row,
          documentNumber: row.documentNumber ?? null,
          sourceUrl: row.sourceUrl ?? null,
        }))
      },

      async selectYearlyTotals(
        slug: string,
      ): Promise<Array<{ year: number; total: string | null }>> {
        return db
          .select({ year: expenses.year, total: sum(expenses.amount) })
          .from(expenses)
          .innerJoin(politicians, eq(expenses.politicianId, politicians.id))
          .where(and(eq(politicians.slug, slug), eq(politicians.active, true)))
          .groupBy(expenses.year)
          .orderBy(desc(expenses.year))
      },
    }
  }

  export type ExpenseRepository = ReturnType<typeof createExpenseRepository>
  ```

- **GOTCHA 1**: The 3-component `or()` condition `or(lt, and, and)` — Drizzle `or()` can take unlimited args. The `and()` inside handles compound equality.
- **GOTCHA 2**: `sum(expenses.amount)` returns `string | null` (not `number`) — do NOT cast here, let the service handle it.
- **GOTCHA 3**: `noUncheckedIndexedAccess` — use `rows.at(0)` not `rows[0]` when accessing single rows.
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 8: CREATE `apps/api/src/services/expense.service.ts`

- **ACTION**: CREATE service with cursor encoding and parallel queries
- **MIRROR**: `apps/api/src/services/vote.service.ts:1-76`
- **IMPLEMENT**:

  ```typescript
  import type { ExpenseRepository, ExpenseRow } from '../repositories/expense.repository.js'
  import type { ExpenseDto, ExpenseListResponseDto } from '../schemas/expense.schema.js'

  interface ExpenseCursor {
    year: number
    month: number
    expenseId: string
  }

  function encodeCursor(cursor: ExpenseCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url')
  }

  function decodeCursor(encoded: string): ExpenseCursor {
    try {
      return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as ExpenseCursor
    } catch {
      throw new Error('Invalid cursor')
    }
  }

  function toExpenseDto(row: ExpenseRow): ExpenseDto {
    return {
      id: row.id,
      externalId: row.externalId,
      source: row.source,
      year: row.year,
      month: row.month,
      category: row.category,
      supplierName: row.supplierName,
      amount: Number(row.amount),  // numeric string → number
      documentNumber: row.documentNumber,
      sourceUrl: row.sourceUrl,
    }
  }

  export interface FindExpensesInput {
    limit: number
    cursor?: string | undefined
  }

  /** Service for expense queries: cursor encoding, yearly totals, and response shaping. */
  export function createExpenseService(repository: ExpenseRepository): {
    findByPoliticianSlug: (slug: string, input: FindExpensesInput) => Promise<ExpenseListResponseDto>
  } {
    return {
      async findByPoliticianSlug(
        slug: string,
        input: FindExpensesInput,
      ): Promise<ExpenseListResponseDto> {
        const decodedCursor = input.cursor !== undefined ? decodeCursor(input.cursor) : undefined

        // Run yearly totals and paginated query in parallel
        const [totalsResult, rows] = await Promise.all([
          repository.selectYearlyTotals(slug),
          repository.selectByPoliticianSlug(slug, {
            limit: input.limit,
            cursor: decodedCursor,
          }),
        ])

        const yearlyTotals = totalsResult.map((row) => ({
          year: row.year,
          total: Number(row.total ?? '0'),
        }))

        const hasMore = rows.length > input.limit
        const data = hasMore ? rows.slice(0, input.limit) : rows

        const lastRow = data.at(-1)
        const nextCursor =
          hasMore && lastRow !== undefined
            ? encodeCursor({ year: lastRow.year, month: lastRow.month, expenseId: lastRow.id })
            : null

        return { data: data.map(toExpenseDto), cursor: nextCursor, yearlyTotals }
      },
    }
  }

  export type ExpenseService = ReturnType<typeof createExpenseService>
  ```

- **GOTCHA**: `Number(row.amount)` converts Drizzle's `string` numeric to `number`. For null-safe: `Number(row.total ?? '0')` for sum results.
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 9: CREATE `apps/api/src/services/expense.service.test.ts`

- **ACTION**: CREATE unit tests for the expense service
- **MIRROR**: Test structure from `apps/api/src/services/bill.service.test.ts` or `vote.service.test.ts`
- **IMPLEMENT** — test the 3 key behaviors:

  ```typescript
  import { describe, it, expect, vi } from 'vitest'
  import { createExpenseService } from './expense.service.js'
  import type { ExpenseRepository } from '../repositories/expense.repository.js'

  function buildExpenseRow(overrides = {}) {
    return {
      id: 'uuid-1',
      externalId: 'ext-1',
      source: 'camara',
      year: 2024,
      month: 3,
      category: 'PASSAGEM AÉREA',
      supplierName: 'GOL S.A.',
      amount: '1234.56',
      documentNumber: 'NF-001',
      sourceUrl: null,
      ...overrides,
    }
  }

  describe('createExpenseService', () => {
    it('returns empty data and empty yearlyTotals when politician has no expenses', async () => {
      const mockRepository: ExpenseRepository = {
        selectByPoliticianSlug: vi.fn().mockResolvedValue([]),
        selectYearlyTotals: vi.fn().mockResolvedValue([]),
      }
      const service = createExpenseService(mockRepository)
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.data).toHaveLength(0)
      expect(result.cursor).toBeNull()
      expect(result.yearlyTotals).toHaveLength(0)
    })

    it('converts numeric string amount to number in DTO', async () => {
      const mockRepository: ExpenseRepository = {
        selectByPoliticianSlug: vi.fn().mockResolvedValue([buildExpenseRow()]),
        selectYearlyTotals: vi.fn().mockResolvedValue([{ year: 2024, total: '1234.56' }]),
      }
      const service = createExpenseService(mockRepository)
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.data[0]?.amount).toBe(1234.56)
      expect(typeof result.data[0]?.amount).toBe('number')
      expect(result.yearlyTotals[0]?.total).toBe(1234.56)
    })

    it('sets cursor when more rows exist than limit', async () => {
      const rows = Array.from({ length: 21 }, (_, i) =>
        buildExpenseRow({ id: `uuid-${i}`, externalId: `ext-${i}` }),
      )
      const mockRepository: ExpenseRepository = {
        selectByPoliticianSlug: vi.fn().mockResolvedValue(rows),
        selectYearlyTotals: vi.fn().mockResolvedValue([]),
      }
      const service = createExpenseService(mockRepository)
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.data).toHaveLength(20)
      expect(result.cursor).not.toBeNull()
    })

    it('cursor is null when rows fit within limit', async () => {
      const rows = Array.from({ length: 5 }, (_, i) =>
        buildExpenseRow({ id: `uuid-${i}`, externalId: `ext-${i}` }),
      )
      const mockRepository: ExpenseRepository = {
        selectByPoliticianSlug: vi.fn().mockResolvedValue(rows),
        selectYearlyTotals: vi.fn().mockResolvedValue([]),
      }
      const service = createExpenseService(mockRepository)
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.cursor).toBeNull()
    })
  })
  ```

- **VALIDATE**: `pnpm --filter @pah/api test`

---

### Task 10: CREATE `apps/api/src/routes/expenses.route.ts`

- **ACTION**: CREATE Fastify route handler
- **MIRROR**: `apps/api/src/routes/votes.route.ts:1-42`
- **IMPLEMENT**:

  ```typescript
  import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
  import {
    PoliticianParamsSchema,
    ExpenseListQuerySchema,
    ExpenseListResponseSchema,
    type PoliticianParams,
    type ExpenseListQuery,
  } from '../schemas/expense.schema.js'
  import type { ExpenseService } from '../services/expense.service.js'

  interface RouteDeps {
    expenseService: ExpenseService
  }

  export function createExpensesRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
    // eslint-disable-next-line @typescript-eslint/require-await
    return async (app) => {
      app.get<{ Params: PoliticianParams; Querystring: ExpenseListQuery }>(
        '/politicians/:slug/expenses',
        {
          schema: {
            params: PoliticianParamsSchema,
            querystring: ExpenseListQuerySchema,
            response: { 200: ExpenseListResponseSchema },
          },
        },
        async (request, reply) => {
          const { slug } = request.params
          const { limit = 20, cursor } = request.query
          const result = await deps.expenseService.findByPoliticianSlug(slug, { limit, cursor })
          void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')
          return result
        },
      )
    }
  }
  ```

- **GOTCHA**: The `// eslint-disable-next-line @typescript-eslint/require-await` comment is required on the outer `return async (app) =>` — without it, ESLint reports an error because the outer function is `async` with no `await`. Mirror exactly from votes.
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 11: UPDATE `apps/api/src/app.ts`

- **ACTION**: ADD expense DI wiring and route registration (3 lines + 1 import block)
- **MIRROR**: `apps/api/src/app.ts:13-15` and `43-46` and `50-51`
- **ADD** to imports (after vote imports):

  ```typescript
  import { createExpenseRepository } from './repositories/expense.repository.js'
  import { createExpenseService } from './services/expense.service.js'
  import { createExpensesRoute } from './routes/expenses.route.js'
  ```

- **ADD** to DI section (after `voteService` lines):

  ```typescript
  const expenseRepository = createExpenseRepository(db)
  const expenseService = createExpenseService(expenseRepository)
  ```

- **ADD** to routes section (after votes route):

  ```typescript
  void app.register(createExpensesRoute({ expenseService }), { prefix: '/api/v1' })
  ```

- **VALIDATE**: `pnpm --filter @pah/api typecheck && pnpm --filter @pah/api build`

---

### Task 12: UPDATE `apps/web/src/lib/api-types.ts`

- **ACTION**: ADD expense type re-exports
- **MIRROR**: Existing pattern in the file (re-exports from `@pah/shared`)
- **ADD**:

  ```typescript
  export type { Expense, ExpenseFilters, ExpenseListResponse } from '@pah/shared'
  ```

- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 13: UPDATE `apps/web/src/lib/api-client.ts`

- **ACTION**: ADD `fetchPoliticianExpenses` function
- **MIRROR**: `apps/web/src/lib/api-client.ts:98-109` (fetchPoliticianVotes)
- **ADD** after `fetchPoliticianVotes`:

  ```typescript
  /**
   * Fetches paginated expenses for a politician with ISR caching.
   * revalidate: 300 = 5 min
   * tags: ['politician-{slug}-expenses'] = allows targeted on-demand revalidation
   */
  export async function fetchPoliticianExpenses(
    slug: string,
    filters: ExpenseFilters = {},
  ): Promise<ExpenseListResponse> {
    const params = new URLSearchParams()
    if (filters.cursor !== undefined) params.set('cursor', filters.cursor)
    if (filters.limit !== undefined) params.set('limit', String(filters.limit))
    return apiFetch<ExpenseListResponse>(
      `/politicians/${encodeURIComponent(slug)}/expenses?${params.toString()}`,
      { next: { revalidate: 300, tags: [`politician-${slug}-expenses`] } },
    )
  }
  ```

- **ADD** to the imports at the top of the file (alongside VoteFilters, VoteListResponse):

  ```typescript
  import type { ExpenseFilters, ExpenseListResponse } from './api-types'
  ```

- **GOTCHA**: `exactOptionalPropertyTypes` — when calling `fetchPoliticianExpenses(slug, expenseFilters)`, build `expenseFilters` conditionally: `cursor !== undefined ? { cursor } : {}`. Do NOT pass `{ cursor: undefined }`.
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 14: CREATE `apps/web/src/app/politicos/[slug]/despesas/page.tsx`

- **ACTION**: CREATE ISR Server Component for expenses
- **MIRROR**: `apps/web/src/app/politicos/[slug]/votacoes/page.tsx:1-139`
- **IMPLEMENT** (key differences from votes: show `yearlyTotals` section, format with `formatCurrency`, 4 columns in table):

  ```typescript
  export const revalidate = 3600

  import Link from 'next/link'
  import type { Metadata } from 'next'
  import { notFound } from 'next/navigation'
  import { formatCurrency } from '@pah/shared'
  import {
    fetchPoliticianBySlug,
    fetchPoliticianExpenses,
    ApiError,
  } from '../../../../lib/api-client'

  export async function generateMetadata({
    params,
  }: {
    params: Promise<{ slug: string }>
  }): Promise<Metadata> {
    const { slug } = await params
    try {
      const politician = await fetchPoliticianBySlug(slug)
      return {
        title: `Despesas — ${politician.name} (${politician.party}-${politician.state}) — Autoridade Política`,
      }
    } catch {
      return { title: 'Despesas — Autoridade Política' }
    }
  }

  export default async function ExpensesPage({
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

    // exactOptionalPropertyTypes: build filters conditionally
    const expenseFilters = cursor !== undefined ? { cursor } : {}
    const result = await fetchPoliticianExpenses(slug, expenseFilters)

    return (
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Link
          href={`/politicos/${slug}`}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← {politician.name}
        </Link>

        <h1 className="mb-2 text-2xl font-bold">Despesas Parlamentares</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {politician.party}-{politician.state}
        </p>

        {/* Yearly totals summary */}
        {result.yearlyTotals.length > 0 && (
          <div className="mb-6 space-y-1">
            {result.yearlyTotals.map((yt) => (
              <p key={yt.year} className="text-sm">
                Total {yt.year}:{' '}
                <span className="font-medium tabular-nums">{formatCurrency(yt.total)}</span>
              </p>
            ))}
          </div>
        )}

        {result.data.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            Nenhuma despesa encontrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4">Mês/Ano</th>
                  <th className="pb-3 pr-4">Categoria</th>
                  <th className="pb-3 pr-4">Fornecedor</th>
                  <th className="pb-3 pr-4 text-right">Valor</th>
                  <th className="pb-3">Documento</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((expense) => (
                  <tr key={expense.id} className="border-b border-border">
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {String(expense.month).padStart(2, '0')}/{expense.year}
                    </td>
                    <td className="py-3 pr-4">{expense.category}</td>
                    <td className="py-3 pr-4">{expense.supplierName}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-3">
                      {expense.sourceUrl !== null ? (
                        <a
                          href={expense.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {expense.documentNumber ?? 'Ver'}
                        </a>
                      ) : (
                        (expense.documentNumber ?? '—')
                      )}
                    </td>
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
              href={`/politicos/${slug}/despesas`}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              ← Início
            </Link>
          )}
          {result.cursor !== null && (
            <Link
              href={`/politicos/${slug}/despesas?cursor=${result.cursor}`}
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

- **GOTCHA 1**: `expense.documentNumber ?? '—'` — em dash as fallback is cleaner than empty cell
- **GOTCHA 2**: `String(expense.month).padStart(2, '0')` — month display as `03/2024` not `3/2024`
- **GOTCHA 3**: `import { formatCurrency } from '@pah/shared'` — NOT from `'../../../../../lib/utils'` (that file doesn't exist yet and formatCurrency lives in shared)
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 15: CREATE `apps/web/src/app/politicos/[slug]/despesas/loading.tsx`

- **ACTION**: CREATE loading skeleton
- **MIRROR**: `apps/web/src/app/politicos/[slug]/votacoes/loading.tsx:1-27`
- **IMPLEMENT** (5 table rows, 5 columns to match the expenses table):

  ```typescript
  export default function ExpensesLoading(): React.JSX.Element {
    return (
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted" />

        {/* Title skeleton */}
        <div className="mb-2 h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mb-6 h-4 w-20 animate-pulse rounded bg-muted" />

        {/* Yearly totals skeleton */}
        <div className="mb-6 space-y-1">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>

        {/* Table skeleton — 5 rows */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-border pb-3">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </main>
    )
  }
  ```

- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|-----------|-----------|
| `apps/api/src/services/expense.service.test.ts` | empty state, amount number cast, cursor set/unset, yearlyTotals mapping | Service business logic |

### Edge Cases Checklist

- [x] Empty expense list → empty state message "Nenhuma despesa encontrada."
- [x] `cursor` is `undefined` on first page → `expenseFilters = {}` (exactOptionalPropertyTypes)
- [x] `result.cursor === null` → no "Próxima →" link rendered
- [x] `cursor !== undefined` and on first page → "← Início" link rendered
- [x] `expense.documentNumber === null` → show em dash "—"
- [x] `expense.sourceUrl === null` → show plain document number or "—"
- [x] `yearlyTotals` empty → section not rendered (conditional `{result.yearlyTotals.length > 0 && ...}`)
- [x] `amount` string from Drizzle → Number() cast in service → `formatCurrency(number)` in page
- [x] Politician not found → `notFound()` called → Next.js 404 page

---

## Validation Commands

### Level 1: STATIC ANALYSIS

```bash
pnpm --filter @pah/shared typecheck
pnpm --filter @pah/db typecheck
pnpm --filter @pah/api typecheck
pnpm --filter @pah/web typecheck
# Or all at once:
pnpm typecheck
```

**EXPECT**: Exit 0, zero TypeScript errors

```bash
pnpm lint
```

**EXPECT**: Exit 0, zero ESLint errors or warnings

### Level 2: UNIT TESTS

```bash
pnpm --filter @pah/api test
```

**EXPECT**: All tests pass including the new `expense.service.test.ts`

### Level 3: FULL SUITE + BUILD

```bash
pnpm --filter @pah/web build
```

**EXPECT**: `next build` succeeds, no type errors, `/politicos/[slug]/despesas` route included in output

### Level 4: DATABASE VALIDATION

Run migration against local dev DB:

```bash
psql $DATABASE_URL < packages/db/migrations/public/0005_add_expenses.sql
```

Verify in psql:

```sql
\d public_data.expenses
-- Verify: 13 columns, UNIQUE constraint on (politician_id, external_id)
-- Verify: idx_expenses_politician and idx_expenses_pagination indexes exist
```

### Level 5: MANUAL VALIDATION

1. Start API: `pnpm --filter @pah/api dev`
2. Hit endpoint: `curl http://localhost:3001/api/v1/politicians/joao-silva-sp/expenses`
3. **EXPECT**: `{ "data": [], "cursor": null, "yearlyTotals": [] }` (empty — no seed data)
4. Start Next.js: `pnpm --filter @pah/web dev`
5. Navigate to `http://localhost:3000/politicos/joao-silva-sp/despesas`
6. **EXPECT**: Page loads, shows "Nenhuma despesa encontrada.", no 404
7. **EXPECT**: Loading skeleton appears during navigation
8. **EXPECT**: Tab link "Despesas" in profile nav resolves to this page (no 404)

---

## Acceptance Criteria

- [ ] `GET /api/v1/politicians/:slug/expenses` returns `{ data, cursor, yearlyTotals }` with HTTP 200
- [ ] `/politicos/[slug]/despesas` renders correctly (empty state with seed data, no 404)
- [ ] `pnpm typecheck` passes across all 4 packages
- [ ] `pnpm lint` passes (zero warnings)
- [ ] `pnpm --filter @pah/api test` passes (expense.service.test.ts included)
- [ ] `pnpm --filter @pah/web build` succeeds (`next build`)
- [ ] Migration `0005_add_expenses.sql` runs cleanly on empty DB
- [ ] `formatCurrency(1234.56)` returns `"R$ 1.234,56"` (exported from `@pah/shared`)
- [ ] Loading skeleton (`loading.tsx`) renders without errors
- [ ] Empty state message "Nenhuma despesa encontrada." appears when no expenses in DB
- [ ] `yearlyTotals` section hidden when array is empty
- [ ] "← Início" link only appears when `cursor !== undefined` (not on first page)
- [ ] "Próxima →" link only appears when `result.cursor !== null`
- [ ] No `any` types introduced
- [ ] No hardcoded URLs, secrets, or environment-specific values
- [ ] Import boundaries respected (web does NOT import from `@pah/db`)

---

## Completion Checklist

- [ ] Task 1 completed and validated (formatCurrency utility)
- [ ] Task 2 completed and validated (Expense shared types)
- [ ] Task 3 completed and validated (shared/index.ts exports)
- [ ] Task 4 completed and validated (DB schema)
- [ ] Task 5 completed and validated (SQL migration)
- [ ] Task 6 completed and validated (TypeBox schemas)
- [ ] Task 7 completed and validated (repository)
- [ ] Task 8 completed and validated (service)
- [ ] Task 9 completed and validated (service tests pass)
- [ ] Task 10 completed and validated (route handler)
- [ ] Task 11 completed and validated (app.ts wiring)
- [ ] Task 12 completed and validated (api-types.ts)
- [ ] Task 13 completed and validated (api-client.ts)
- [ ] Task 14 completed and validated (expenses page)
- [ ] Task 15 completed and validated (loading skeleton)
- [ ] Level 1: `pnpm typecheck && pnpm lint` pass
- [ ] Level 2: `pnpm --filter @pah/api test` passes
- [ ] Level 3: `pnpm --filter @pah/web build` succeeds
- [ ] Level 4: Migration runs on dev DB
- [ ] Level 5: Manual smoke test — page loads, empty state correct, no 404
- [ ] All acceptance criteria checked

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Drizzle `numeric` returning `string` causes TypeScript errors in service | LOW | MEDIUM | `ExpenseRow.amount` typed as `string`, cast in `toExpenseDto` with `Number()` |
| 3-component cursor `or()` condition produces incorrect results | LOW | HIGH | Unit test the service with 21 rows; verify `limit + 1` pattern slices correctly |
| `formatCurrency` from `@pah/shared` causes RSC bundle issues | LOW | MEDIUM | `Intl.NumberFormat` is Node.js built-in, no browser-only API; no `'use client'` needed |
| `exactOptionalPropertyTypes` error when passing `{ cursor: undefined }` | MEDIUM | LOW | Build `expenseFilters` conditionally: `cursor !== undefined ? { cursor } : {}` |
| `sum()` aggregation returns `null` on empty table | LOW | LOW | Guard with `Number(row.total ?? '0')` — null coalesced to string `'0'` before `Number()` |

---

## Notes

**Why yearlyTotals and not server-side grouping?** The paginated rows are ordered by year+month DESC. The frontend groups visually via the `Mês/Ano` column. The `yearlyTotals` array (computed once per request, not paginated) gives citizens the high-level spending summary without requiring the user to page through all records. This matches the votes `participationRate` pattern — one computed summary field + paginated detail rows.

**Why `formatCurrency` in `@pah/shared` and not `apps/web/src/lib/utils.ts`?** The `apps/web/CLAUDE.md` references `lib/utils.ts` for formatCurrency but that file doesn't exist. The PRD explicitly says "via `formatCurrency` from `@pah/shared`". Following PRD literal spec keeps the formatter reusable by any future package (pipeline transformer, API response pre-formatting).

**Expense amounts from CEAP API** are in BRL decimal format (`1234.56`). The pipeline transformer will store them as `NUMERIC(12,2)`. The precision of 12 digits covers the maximum allowable CEAP annual quota (~R$ 46.000/month × 12 = ~R$ 552.000/year, well within 12 digits).

**Seed data**: This phase deliberately creates NO seed data for expenses. The table stays empty until Phase 7 (pipeline). The empty state message covers this gracefully.
