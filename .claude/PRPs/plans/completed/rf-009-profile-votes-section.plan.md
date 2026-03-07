# Feature: Profile Section — Voting Record (RF-009)

## Summary

Add a paginated voting record tab at `/politicos/[slug]/votacoes` showing a politician's parliamentary voting history, with a participation rate summary. Mirrors the RF-008 bills section exactly: new `public_data.votes` table, a `GET /api/v1/politicians/:slug/votes` endpoint with keyset cursor pagination, and an ISR Next.js page. The only departure from the bills pattern is an additional aggregate query for the participation rate (present sessions / total sessions).

## User Story

As a Cidadão Engajado
I want to see a politician's voting history and their participation rate
So that I can assess how active and present they are in parliamentary sessions

## Problem Statement

Clicking the "Votações" tab on a politician profile navigates to `/politicos/[slug]/votacoes`, which currently returns a 404. Citizens cannot evaluate a politician's parliamentary attendance or how they voted on specific matters.

## Solution Statement

Add the `votes` table to the public schema (migration `0004_add_votes.sql`), expose a paginated API endpoint that also returns an aggregate participation rate, and render an ISR page with a participation rate summary + scrollable vote table.

## Metadata

| Field            | Value                                          |
|------------------|------------------------------------------------|
| Type             | NEW_CAPABILITY                                 |
| Complexity       | MEDIUM                                         |
| Systems Affected | packages/shared, packages/db, apps/api, apps/web |
| Dependencies     | RF-007 complete (politician profile page exists) |
| Estimated Tasks  | 14                                             |

---

## UX Design

### Before State

```
╔══════════════════════════════════════════════════════════════════╗
║                          BEFORE STATE                            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Profile Page /politicos/joao-silva-sp                          ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │ [Projetos de Lei] [Votações] [Despesas] [...]           │    ║
║  │            ↑ tab exists but link is dead                │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║            │                                                     ║
║            ▼ user clicks "Votações"                             ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │                    404 NOT FOUND                        │    ║
║  │          /politicos/joao-silva-sp/votacoes              │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║  USER_FLOW: Profile → click Votações → 404 → bounce             ║
║  PAIN_POINT: No voting history visible; tab is a dead link      ║
║  DATA_FLOW: No votes table, no API endpoint                     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### After State

```
╔══════════════════════════════════════════════════════════════════╗
║                          AFTER STATE                             ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  /politicos/joao-silva-sp/votacoes  (ISR revalidate=3600)       ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │ ← João Silva                                           │    ║
║  │ Votações                                               │    ║
║  │ PT-SP                                                  │    ║
║  │                                                        │    ║
║  │ Participação: 87.3% (seed data)                        │    ║
║  │                                                        │    ║
║  │ Data       │ Matéria            │ Voto   │ Resultado   │    ║
║  │ ────────── │ ────────────────── │ ────── │ ─────────   │    ║
║  │ 2024-03-15 │ PL 1234/2023...   │ Sim    │ Aprovado    │    ║
║  │ 2024-03-10 │ PEC 45/2023...    │ Não    │ Rejeitado   │    ║
║  │ 2024-03-05 │ PDL 12/2024...    │ Aus.   │ Aprovado    │    ║
║  │                                                        │    ║
║  │                      [Próxima →]                       │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║  USER_FLOW: Profile → Votações → see rate + table → paginate    ║
║  VALUE_ADD: Attendance and voting position visible per session  ║
║  DATA_FLOW: votes table → API endpoint → ISR page               ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/politicos/[slug]/votacoes` | 404 Not Found | ISR page with vote table | Can view voting history |
| Profile tabs | "Votações" tab navigates to 404 | Tab links to working page | Tab is functional |
| API | No votes endpoint | `GET /politicians/:slug/votes` | API clients can fetch votes |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `packages/shared/src/types/bill.ts` | all | MIRROR this shape for Vote type |
| P0 | `packages/db/src/public-schema.ts` | 92–118 | MIRROR bills table definition for votes |
| P0 | `packages/db/migrations/public/0003_add_bills.sql` | all | MIRROR this SQL for 0004_add_votes.sql |
| P0 | `apps/api/src/repositories/bill.repository.ts` | all | MIRROR cursor pattern; add count query |
| P0 | `apps/api/src/services/bill.service.ts` | all | MIRROR cursor encode/decode + DTO mapping |
| P0 | `apps/api/src/schemas/bill.schema.ts` | all | MIRROR TypeBox schema structure |
| P0 | `apps/api/src/routes/bills.route.ts` | all | MIRROR route factory pattern |
| P0 | `apps/api/src/app.ts` | all | MIRROR DI wiring pattern |
| P0 | `apps/web/src/lib/api-client.ts` | all | MIRROR fetchPoliticianBills pattern |
| P0 | `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | all | MIRROR page component pattern |
| P0 | `apps/web/src/app/politicos/[slug]/projetos/loading.tsx` | all | MIRROR skeleton pattern |
| P1 | `apps/api/src/services/bill.service.test.ts` | all | MIRROR test structure for vote.service.test.ts |
| P1 | `apps/web/src/lib/api-types.ts` | all | UPDATE: add Vote types |
| P1 | `packages/shared/src/index.ts` | all | UPDATE: add vote type exports |

---

## Patterns to Mirror

**SHARED_TYPE_PATTERN:**

```typescript
// SOURCE: packages/shared/src/types/bill.ts — COPY this structure
export interface Vote {
  id: string
  externalId: string
  source: 'camara' | 'senado'
  sessionDate: string      // ISO date 'YYYY-MM-DD'
  matterDescription: string
  voteCast: string         // 'sim' | 'não' | 'abstenção' | 'ausente'
  sessionResult: string
  sourceUrl: string | null
}

export interface VoteFilters {
  cursor?: string
  limit?: number
}

export interface VoteListResponse {
  data: Vote[]
  cursor: string | null
  participationRate: number // 0.0 to 1.0
}
```

**DB_TABLE_PATTERN:**

```typescript
// SOURCE: packages/db/src/public-schema.ts:96-118 — MIRROR bills table
export const votes = publicData.table(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    externalId: varchar('external_id', { length: 100 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(),
    sessionDate: date('session_date').notNull(),
    matterDescription: text('matter_description').notNull(),
    voteCast: varchar('vote_cast', { length: 20 }).notNull(), // 'sim'|'não'|'abstenção'|'ausente'
    sessionResult: varchar('session_result', { length: 100 }).notNull(),
    sourceUrl: varchar('source_url', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_votes_politician').on(table.politicianId),
    index('idx_votes_pagination').on(table.politicianId, table.sessionDate, table.id),
  ],
)
```

**REPOSITORY_CURSOR_PATTERN:**

```typescript
// SOURCE: apps/api/src/repositories/bill.repository.ts:34-44
// COPY the or()/and() keyset cursor pattern; adapt date field name
if (filters.cursor !== undefined) {
  const { sessionDate, voteId } = filters.cursor
  const cursorCondition = or(
    lt(votes.sessionDate, sessionDate),
    and(eq(votes.sessionDate, sessionDate), lt(votes.id, voteId)),
  )
  // or() returns SQL<unknown> | undefined — MUST guard before pushing
  if (cursorCondition !== undefined) {
    conditions.push(cursorCondition)
  }
}
```

**PARTICIPATION_RATE_QUERY:**

```typescript
// NEW pattern (no bills equivalent) — aggregate query for participation rate
// count() imported from 'drizzle-orm'; sql imported from 'drizzle-orm'
async selectParticipationRate(slug: string): Promise<{ total: number; present: number }> {
  const rows = await db
    .select({
      total: count(),
      present: count(sql`CASE WHEN ${votes.voteCast} != 'ausente' THEN 1 END`),
    })
    .from(votes)
    .innerJoin(politicians, eq(votes.politicianId, politicians.id))
    .where(and(eq(politicians.slug, slug), eq(politicians.active, true)))

  const row = rows.at(0)
  // PostgreSQL count() returns bigint → pg driver may return string → use Number()
  return { total: Number(row?.total ?? 0), present: Number(row?.present ?? 0) }
}
```

**SERVICE_CURSOR_PATTERN:**

```typescript
// SOURCE: apps/api/src/services/bill.service.ts — MIRROR exactly
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

**SERVICE_PARALLEL_FETCH_PATTERN:**

```typescript
// NEW: run participation rate and paginated query in parallel
const [rateResult, rows] = await Promise.all([
  repository.selectParticipationRate(slug),
  repository.selectByPoliticianSlug(slug, { limit: input.limit, cursor: decodedCursor }),
])
const participationRate = rateResult.total > 0 ? rateResult.present / rateResult.total : 0
```

**SERVICE_NO_UNCHECKED_PATTERN:**

```typescript
// SOURCE: apps/api/src/services/bill.service.ts:60-64
// Use .at(-1) not [length-1] — noUncheckedIndexedAccess rule
const lastRow = data.at(-1)
const nextCursor =
  hasMore && lastRow !== undefined
    ? encodeCursor({ sessionDate: lastRow.sessionDate, voteId: lastRow.id })
    : null
```

**ROUTE_PATTERN:**

```typescript
// SOURCE: apps/api/src/routes/bills.route.ts — MIRROR exactly
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

**TEST_PATTERN:**

```typescript
// SOURCE: apps/api/src/services/bill.service.test.ts — MIRROR structure
function buildRow(overrides: Partial<VoteRow> = {}): VoteRow { ... }
function buildRepository(rows: VoteRow[] = [], rate = { total: 0, present: 0 }): VoteRepository {
  return {
    selectByPoliticianSlug: vi.fn().mockResolvedValue(rows),
    selectParticipationRate: vi.fn().mockResolvedValue(rate),
  }
}
```

**WEB_PAGE_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/[slug]/projetos/page.tsx — MIRROR
export const revalidate = 3600
// params and searchParams are Promise<> in Next.js 15
// exactOptionalPropertyTypes: build filters conditionally
const voteFilters = cursor !== undefined ? { cursor } : {}
```

**API_CLIENT_PATTERN:**

```typescript
// SOURCE: apps/web/src/lib/api-client.ts:78-89 — MIRROR fetchPoliticianBills
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

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `packages/shared/src/types/vote.ts` | CREATE | Domain types — zero external deps |
| `packages/shared/src/index.ts` | UPDATE | Re-export Vote types |
| `packages/db/src/public-schema.ts` | UPDATE | Add votes Drizzle table |
| `packages/db/migrations/public/0004_add_votes.sql` | CREATE | SQL migration for votes table |
| `apps/api/src/schemas/vote.schema.ts` | CREATE | TypeBox request/response schemas |
| `apps/api/src/repositories/vote.repository.ts` | CREATE | DB queries with participation rate |
| `apps/api/src/services/vote.service.ts` | CREATE | Cursor logic + participation rate |
| `apps/api/src/services/vote.service.test.ts` | CREATE | Unit tests (5+ cases) |
| `apps/api/src/routes/votes.route.ts` | CREATE | Fastify route handler |
| `apps/api/src/app.ts` | UPDATE | Wire vote DI chain |
| `apps/web/src/lib/api-types.ts` | UPDATE | Add Vote, VoteFilters, VoteListResponse |
| `apps/web/src/lib/api-client.ts` | UPDATE | Add fetchPoliticianVotes |
| `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` | CREATE | ISR page with rate + table |
| `apps/web/src/app/politicos/[slug]/votacoes/loading.tsx` | CREATE | Skeleton loader |

---

## NOT Building (Scope Limits)

- **Vote filtering by year/type**: Post-MVP; pagination only for now
- **Vote participation chart**: Post-MVP; plain text percentage only in MVP
- **Vote search/text filter**: Post-MVP
- **Breakdown by voteCast value (sim/não counts)**: Post-MVP
- **`formatCurrency`** utility in shared: Belongs to RF-012 (expenses), not this phase

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

---

### Task 1: CREATE `packages/shared/src/types/vote.ts`

- **ACTION**: CREATE domain type file for votes
- **IMPLEMENT**:

  ```typescript
  /** A parliamentary voting record for a politician (RF-009). */
  export interface Vote {
    id: string
    externalId: string
    source: 'camara' | 'senado'
    sessionDate: string       // ISO date 'YYYY-MM-DD'
    matterDescription: string
    voteCast: string          // 'sim' | 'não' | 'abstenção' | 'ausente'
    sessionResult: string
    sourceUrl: string | null
  }

  export interface VoteFilters {
    cursor?: string
    limit?: number
  }

  export interface VoteListResponse {
    data: Vote[]
    cursor: string | null
    participationRate: number // 0.0 to 1.0 (present sessions / total sessions)
  }
  ```

- **MIRROR**: `packages/shared/src/types/bill.ts` — identical structure, adapted field names
- **GOTCHA**: Zero external imports — shared package has zero dependencies
- **VALIDATE**: `pnpm --filter @pah/shared typecheck` (or `pnpm typecheck` at root)

---

### Task 2: UPDATE `packages/shared/src/index.ts`

- **ACTION**: ADD vote type re-exports after Bill exports
- **IMPLEMENT**: Add line `export type { Vote, VoteFilters, VoteListResponse } from './types/vote.js'`
- **MIRROR**: `packages/shared/src/index.ts:7` — same pattern as bill export
- **GOTCHA**: Extension `.js` is required in ESM imports even for `.ts` source files
- **VALIDATE**: `pnpm typecheck`

---

### Task 3: UPDATE `packages/db/src/public-schema.ts`

- **ACTION**: ADD `votes` table definition after the `bills` table block (after line 118)
- **IMPLEMENT**: Add the `votes` table using the DB_TABLE_PATTERN from Patterns section above
- **MIRROR**: `packages/db/src/public-schema.ts:96-118` (bills table) — copy structure, change field names
- **IMPORTS NEEDED**: All imports already present (`uuid`, `varchar`, `text`, `date`, `timestamp`, `index` from `drizzle-orm/pg-core`)
- **GOTCHA**: `voteCast` max length 20 is enough for 'abstenção' (9 chars); set 20 to allow future values
- **GOTCHA**: Use `date()` for `sessionDate`, not `timestamp()` — matches bills pattern
- **VALIDATE**: `pnpm typecheck`

---

### Task 4: CREATE `packages/db/migrations/public/0004_add_votes.sql`

- **ACTION**: CREATE SQL migration file
- **IMPLEMENT**:

  ```sql
  -- 0004_add_votes.sql — public_data schema: votes (RF-009)

  CREATE TABLE IF NOT EXISTS public_data.votes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politician_id       UUID NOT NULL REFERENCES public_data.politicians(id),
    external_id         VARCHAR(100) NOT NULL,
    source              VARCHAR(20) NOT NULL,
    session_date        DATE NOT NULL,
    matter_description  TEXT NOT NULL,
    vote_cast           VARCHAR(20) NOT NULL,
    session_result      VARCHAR(100) NOT NULL,
    source_url          VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (politician_id, external_id)
  );

  -- Index for politician lookup
  CREATE INDEX IF NOT EXISTS idx_votes_politician
    ON public_data.votes(politician_id);

  -- Composite index for stable DESC cursor pagination (politician_id, date DESC, id DESC)
  CREATE INDEX IF NOT EXISTS idx_votes_pagination
    ON public_data.votes(politician_id, session_date DESC, id DESC);
  ```

- **MIRROR**: `packages/db/migrations/public/0003_add_bills.sql` — identical structure
- **GOTCHA**: Use `TIMESTAMPTZ` for `created_at`/`updated_at`, not plain `TIMESTAMP`
- **VALIDATE**: File exists and SQL is syntactically valid (visual check)

---

### Task 5: CREATE `apps/api/src/schemas/vote.schema.ts`

- **ACTION**: CREATE TypeBox schemas for the votes endpoint
- **IMPLEMENT**:

  ```typescript
  import { Type, type Static } from '@sinclair/typebox'
  import { PoliticianParamsSchema, type PoliticianParams } from './politician.schema.js'

  export { PoliticianParamsSchema, type PoliticianParams }

  export const VoteListQuerySchema = Type.Object({
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
    cursor: Type.Optional(
      Type.String({ description: 'Opaque base64url cursor from previous response' }),
    ),
  })
  export type VoteListQuery = Static<typeof VoteListQuerySchema>

  export const VoteSchema = Type.Object({
    id: Type.String({ format: 'uuid' }),
    externalId: Type.String(),
    source: Type.String(),
    sessionDate: Type.String({ format: 'date' }),
    matterDescription: Type.String(),
    voteCast: Type.String(),
    sessionResult: Type.String(),
    sourceUrl: Type.Union([Type.String(), Type.Null()]),
  })
  export type VoteDto = Static<typeof VoteSchema>

  export const VoteListResponseSchema = Type.Object({
    data: Type.Array(VoteSchema),
    cursor: Type.Union([Type.String(), Type.Null()]),
    participationRate: Type.Number({ minimum: 0, maximum: 1 }),
  })
  export type VoteListResponseDto = Static<typeof VoteListResponseSchema>
  ```

- **MIRROR**: `apps/api/src/schemas/bill.schema.ts` — identical structure; add `participationRate` field
- **GOTCHA**: `sourceUrl: Type.Union([Type.String(), Type.Null()])` — must be Union to allow null
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 6: CREATE `apps/api/src/repositories/vote.repository.ts`

- **ACTION**: CREATE repository with cursor pagination + participation rate query
- **IMPLEMENT**:

  ```typescript
  import { eq, and, lt, or, desc, count, sql } from 'drizzle-orm'
  import type { PublicDb } from '@pah/db/clients'
  import { votes, politicians } from '@pah/db/public-schema'

  export interface VoteRow {
    id: string
    externalId: string
    source: string
    sessionDate: string   // Drizzle returns date as string 'YYYY-MM-DD'
    matterDescription: string
    voteCast: string
    sessionResult: string
    sourceUrl: string | null
  }

  export interface VoteListFilters {
    limit: number
    cursor?: { sessionDate: string; voteId: string } | undefined
  }

  export function createVoteRepository(db: PublicDb): {
    selectByPoliticianSlug: (slug: string, filters: VoteListFilters) => Promise<VoteRow[]>
    selectParticipationRate: (slug: string) => Promise<{ total: number; present: number }>
  } {
    return {
      async selectByPoliticianSlug(slug, filters): Promise<VoteRow[]> {
        const conditions = [eq(politicians.active, true)]
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
        const rows = await db
          .select({
            id: votes.id,
            externalId: votes.externalId,
            source: votes.source,
            sessionDate: votes.sessionDate,
            matterDescription: votes.matterDescription,
            voteCast: votes.voteCast,
            sessionResult: votes.sessionResult,
            sourceUrl: votes.sourceUrl,
          })
          .from(votes)
          .innerJoin(politicians, eq(votes.politicianId, politicians.id))
          .where(and(eq(politicians.slug, slug), ...conditions))
          .orderBy(desc(votes.sessionDate), desc(votes.id))
          .limit(filters.limit + 1)

        return rows.map((row) => ({ ...row, sourceUrl: row.sourceUrl ?? null }))
      },

      async selectParticipationRate(slug): Promise<{ total: number; present: number }> {
        const rows = await db
          .select({
            total: count(),
            present: count(sql`CASE WHEN ${votes.voteCast} != 'ausente' THEN 1 END`),
          })
          .from(votes)
          .innerJoin(politicians, eq(votes.politicianId, politicians.id))
          .where(and(eq(politicians.slug, slug), eq(politicians.active, true)))

        const row = rows.at(0)
        // PostgreSQL count() returns bigint — pg driver may return string — use Number()
        return { total: Number(row?.total ?? 0), present: Number(row?.present ?? 0) }
      },
    }
  }

  export type VoteRepository = ReturnType<typeof createVoteRepository>
  ```

- **MIRROR**: `apps/api/src/repositories/bill.repository.ts` — identical pattern, add `selectParticipationRate`
- **IMPORTS**: `count, sql` from `'drizzle-orm'` (in addition to `eq, and, lt, or, desc`)
- **GOTCHA**: `or()` returns `SQL<unknown> | undefined` — MUST guard with `if (cursorCondition !== undefined)` before `.push()`
- **GOTCHA**: `Number()` coercion on `count()` results — pg driver returns bigint as string
- **GOTCHA**: `rows.at(0)` not `rows[0]` for `noUncheckedIndexedAccess` compliance
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 7: CREATE `apps/api/src/services/vote.service.ts`

- **ACTION**: CREATE service with cursor encode/decode, DTO mapping, and parallel rate fetch
- **IMPLEMENT**:

  ```typescript
  import type { VoteRepository, VoteRow } from '../repositories/vote.repository.js'
  import type { VoteDto, VoteListResponseDto } from '../schemas/vote.schema.js'

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

  function toVoteDto(row: VoteRow): VoteDto {
    return {
      id: row.id,
      externalId: row.externalId,
      source: row.source,
      sessionDate: row.sessionDate,
      matterDescription: row.matterDescription,
      voteCast: row.voteCast,
      sessionResult: row.sessionResult,
      sourceUrl: row.sourceUrl,
    }
  }

  export interface FindVotesInput {
    limit: number
    cursor?: string | undefined
  }

  /** Service for vote queries: cursor encoding, participation rate, and response shaping. */
  export function createVoteService(repository: VoteRepository): {
    findByPoliticianSlug: (slug: string, input: FindVotesInput) => Promise<VoteListResponseDto>
  } {
    return {
      async findByPoliticianSlug(slug, input): Promise<VoteListResponseDto> {
        const decodedCursor = input.cursor !== undefined ? decodeCursor(input.cursor) : undefined

        // Run participation rate and paginated query in parallel
        const [rateResult, rows] = await Promise.all([
          repository.selectParticipationRate(slug),
          repository.selectByPoliticianSlug(slug, { limit: input.limit, cursor: decodedCursor }),
        ])

        const participationRate =
          rateResult.total > 0 ? rateResult.present / rateResult.total : 0

        const hasMore = rows.length > input.limit
        const data = hasMore ? rows.slice(0, input.limit) : rows

        const lastRow = data.at(-1)
        const nextCursor =
          hasMore && lastRow !== undefined
            ? encodeCursor({ sessionDate: lastRow.sessionDate, voteId: lastRow.id })
            : null

        return { data: data.map(toVoteDto), cursor: nextCursor, participationRate }
      },
    }
  }

  export type VoteService = ReturnType<typeof createVoteService>
  ```

- **MIRROR**: `apps/api/src/services/bill.service.ts` — same cursor pattern; add parallel Promise.all
- **GOTCHA**: `data.at(-1)` not `data[data.length - 1]` — `noUncheckedIndexedAccess` rule
- **GOTCHA**: `participationRate = 0` when `total === 0` (no votes) — avoid division by zero
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 8: CREATE `apps/api/src/services/vote.service.test.ts`

- **ACTION**: CREATE unit tests for the vote service
- **IMPLEMENT**: 7 test cases covering:
  1. `returns empty data, null cursor, and 0 participationRate when no rows`
  2. `returns rows mapped to VoteDto`
  3. `returns null cursor when rows <= limit`
  4. `returns non-null cursor and slices data when repository returns limit+1 rows`
  5. `cursor encodes the last item sessionDate and voteId`
  6. `participation rate is 0 when total is 0`
  7. `participation rate is computed as present/total`
- **MIRROR**: `apps/api/src/services/bill.service.test.ts` — identical structure
- **PATTERN**:

  ```typescript
  function buildRow(overrides: Partial<VoteRow> = {}): VoteRow {
    return {
      id: '550e8400-e29b-41d4-a716-446655440001',
      externalId: 'VT-123-2024',
      source: 'camara',
      sessionDate: '2024-03-01',
      matterDescription: 'PL 1234/2023 — Dispõe sobre...',
      voteCast: 'sim',
      sessionResult: 'Aprovado',
      sourceUrl: null,
      ...overrides,
    }
  }

  function buildRepository(
    rows: VoteRow[] = [],
    rate = { total: 0, present: 0 },
  ): VoteRepository {
    return {
      selectByPoliticianSlug: vi.fn().mockResolvedValue(rows),
      selectParticipationRate: vi.fn().mockResolvedValue(rate),
    }
  }
  ```

- **VALIDATE**: `pnpm --filter @pah/api test`

---

### Task 9: CREATE `apps/api/src/routes/votes.route.ts`

- **ACTION**: CREATE Fastify route plugin for `GET /politicians/:slug/votes`
- **IMPLEMENT**:

  ```typescript
  import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
  import {
    PoliticianParamsSchema,
    VoteListQuerySchema,
    VoteListResponseSchema,
    type PoliticianParams,
    type VoteListQuery,
  } from '../schemas/vote.schema.js'
  import type { VoteService } from '../services/vote.service.js'

  interface RouteDeps {
    voteService: VoteService
  }

  export function createVotesRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
    // eslint-disable-next-line @typescript-eslint/require-await
    return async (app) => {
      app.get<{ Params: PoliticianParams; Querystring: VoteListQuery }>(
        '/politicians/:slug/votes',
        {
          schema: {
            params: PoliticianParamsSchema,
            querystring: VoteListQuerySchema,
            response: { 200: VoteListResponseSchema },
          },
        },
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

- **MIRROR**: `apps/api/src/routes/bills.route.ts` — identical, change resource name
- **GOTCHA**: `eslint-disable-next-line @typescript-eslint/require-await` on the outer async function
- **GOTCHA**: `void reply.header(...)` to discard the Promise return value
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 10: UPDATE `apps/api/src/app.ts`

- **ACTION**: ADD vote DI wiring (3 imports + 3 lines in the factory body)
- **IMPLEMENT**: Add after the bill wiring block:

  ```typescript
  // ADD to imports (after bill imports):
  import { createVoteRepository } from './repositories/vote.repository.js'
  import { createVoteService } from './services/vote.service.js'
  import { createVotesRoute } from './routes/votes.route.js'

  // ADD to buildApp() body (after billService wiring):
  const voteRepository = createVoteRepository(db)
  const voteService = createVoteService(voteRepository)
  void app.register(createVotesRoute({ voteService }), { prefix: '/api/v1' })
  ```

- **MIRROR**: `apps/api/src/app.ts:10-12, 40-45` — identical wiring pattern
- **VALIDATE**: `pnpm --filter @pah/api typecheck && pnpm --filter @pah/api build`

---

### Task 11: UPDATE `apps/web/src/lib/api-types.ts`

- **ACTION**: ADD Vote, VoteFilters, VoteListResponse imports and re-exports
- **IMPLEMENT**: Add `Vote, VoteFilters, VoteListResponse` to the import from `@pah/shared` and to the re-export block
- **MIRROR**: `apps/web/src/lib/api-types.ts:1-20` — identical pattern as BillFilters/BillListResponse
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 12: UPDATE `apps/web/src/lib/api-client.ts`

- **ACTION**: ADD `fetchPoliticianVotes` function and import VoteFilters/VoteListResponse
- **IMPLEMENT**: Add import `VoteFilters, VoteListResponse` to the import line, then add the function after `fetchPoliticianBills`:

  ```typescript
  /**
   * Fetches paginated votes for a politician with ISR caching.
   * revalidate: 300 = 5 min
   * tags: ['politician-{slug}-votes'] = allows targeted on-demand revalidation
   */
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

- **MIRROR**: `apps/web/src/lib/api-client.ts:73-89` (fetchPoliticianBills) — identical pattern
- **GOTCHA**: `exactOptionalPropertyTypes` — build URLSearchParams conditionally with `if (filters.cursor !== undefined)`, never pass `{ cursor: string | undefined }`
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 13: CREATE `apps/web/src/app/politicos/[slug]/votacoes/page.tsx`

- **ACTION**: CREATE ISR page for the votes tab
- **IMPLEMENT**:

  ```typescript
  export const revalidate = 3600

  import Link from 'next/link'
  import type { Metadata } from 'next'
  import { notFound } from 'next/navigation'
  import { fetchPoliticianBySlug, fetchPoliticianVotes, ApiError } from '../../../../lib/api-client'

  export async function generateMetadata({
    params,
  }: {
    params: Promise<{ slug: string }>
  }): Promise<Metadata> {
    const { slug } = await params
    try {
      const politician = await fetchPoliticianBySlug(slug)
      return {
        title: `Votações — ${politician.name} (${politician.party}-${politician.state}) — Autoridade Política`,
      }
    } catch {
      return { title: 'Votações — Autoridade Política' }
    }
  }

  export default async function VotesPage({
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
    const voteFilters = cursor !== undefined ? { cursor } : {}
    const result = await fetchPoliticianVotes(slug, voteFilters)

    const participationPct = (result.participationRate * 100).toFixed(1)

    return (
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Link
          href={`/politicos/${slug}`}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← {politician.name}
        </Link>

        <h1 className="mb-2 text-2xl font-bold">Votações</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {politician.party}-{politician.state}
        </p>

        {/* Participation rate summary */}
        <p className="mb-6 text-sm">
          Participação:{' '}
          <span className="font-medium tabular-nums">{participationPct}%</span>
        </p>

        {result.data.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            Nenhuma votação encontrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4">Data</th>
                  <th className="pb-3 pr-4">Matéria</th>
                  <th className="pb-3 pr-4">Voto</th>
                  <th className="pb-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((vote) => (
                  <tr key={vote.id} className="border-b border-border">
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {vote.sessionDate}
                    </td>
                    <td className="py-3 pr-4">
                      {vote.sourceUrl !== null ? (
                        <a
                          href={vote.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {vote.matterDescription}
                        </a>
                      ) : (
                        vote.matterDescription
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                        {vote.voteCast}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{vote.sessionResult}</td>
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
              href={`/politicos/${slug}/votacoes`}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              ← Início
            </Link>
          )}
          {result.cursor !== null && (
            <Link
              href={`/politicos/${slug}/votacoes?cursor=${result.cursor}`}
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

- **MIRROR**: `apps/web/src/app/politicos/[slug]/projetos/page.tsx` — identical structure; add participation rate section
- **GOTCHA**: `const voteFilters = cursor !== undefined ? { cursor } : {}` — `exactOptionalPropertyTypes` violation if you write `{ cursor: string | undefined }`
- **GOTCHA**: `params` and `searchParams` are `Promise<>` in Next.js 15 — must `await` both
- **GOTCHA**: `participationRate` is 0.0–1.0 from API — multiply by 100 and `.toFixed(1)` for display
- **GOTCHA**: DR-002 political neutrality — NO color coding for 'sim' (green) / 'não' (red). Use neutral border badge for all vote values
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 14: CREATE `apps/web/src/app/politicos/[slug]/votacoes/loading.tsx`

- **ACTION**: CREATE skeleton loader for the votes page
- **IMPLEMENT**:

  ```typescript
  export default function VotesLoading(): React.JSX.Element {
    return (
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted" />
        {/* Title skeleton */}
        <div className="mb-2 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mb-4 h-4 w-20 animate-pulse rounded bg-muted" />
        {/* Participation rate skeleton */}
        <div className="mb-6 h-4 w-40 animate-pulse rounded bg-muted" />
        {/* Table skeleton — 5 rows */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-border pb-3">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </main>
    )
  }
  ```

- **MIRROR**: `apps/web/src/app/politicos/[slug]/projetos/loading.tsx` — identical pattern
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|-----------|-----------|
| `vote.service.test.ts` | empty list, DTO mapping, null cursor, limit+1 cursor, cursor content, rate=0 when no votes, rate computed correctly | Service business logic |

### Edge Cases Checklist

- [ ] Politician with zero votes: `participationRate` = 0 (not NaN from 0/0)
- [ ] `cursor` undefined: no keyset condition added to query
- [ ] `or()` returns undefined: guard prevents `.push()` crash
- [ ] `count()` returns string from pg driver: `Number()` coercion applied
- [ ] `exactOptionalPropertyTypes`: `voteFilters` built conditionally
- [ ] `voteCast` values contain accented characters ('não', 'abstenção'): varchar 20 handles them (UTF-8 bytes > char count but still safe)

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm lint && pnpm typecheck
```

**EXPECT**: Exit 0, zero ESLint warnings, zero TypeScript errors

### Level 2: UNIT_TESTS

```bash
pnpm --filter @pah/api test
```

**EXPECT**: All tests pass including the 7 new vote.service.test.ts cases

### Level 3: FULL_SUITE + BUILD

```bash
pnpm --filter @pah/web test && pnpm --filter @pah/web build
```

**EXPECT**: All tests pass; `next build` succeeds with `/politicos/[slug]/votacoes` as ISR route

### Level 4: MANUAL_VALIDATION

With dev API running (`pnpm --filter @pah/api dev`):

```bash
# Verify endpoint returns votes + participationRate
curl "http://localhost:3001/api/v1/politicians/joao-silva-sp/votes?limit=5"

# Expected shape:
# { "data": [...], "cursor": "...", "participationRate": 0.873 }

# Verify cursor pagination
curl "http://localhost:3001/api/v1/politicians/joao-silva-sp/votes?limit=2"
# Take cursor from response, then:
curl "http://localhost:3001/api/v1/politicians/joao-silva-sp/votes?limit=2&cursor=<cursor>"
```

With dev web running (`pnpm --filter @pah/web dev`):

- Navigate to `http://localhost:3000/politicos/joao-silva-sp/votacoes`
- Verify: breadcrumb link, title, participation rate displayed, table with 4 columns
- Verify: "Próxima →" button appears when more than 20 votes
- Navigate to non-existent slug: verify 404 not-found page renders

---

## Acceptance Criteria

- [ ] `GET /api/v1/politicians/:slug/votes?limit=20` returns `{ data, cursor, participationRate }`
- [ ] Cursor pagination: fetching page 2 with returned cursor returns next 20 votes
- [ ] `participationRate` is 0.0 when politician has no votes (not NaN)
- [ ] `/politicos/[slug]/votacoes` renders with `revalidate = 3600`
- [ ] Vote table shows: Date, Matéria (linked when sourceUrl present), Voto (badge), Resultado
- [ ] Participation rate displayed as `XX.X%` above the table
- [ ] Empty state message "Nenhuma votação encontrada." when no votes
- [ ] Pagination: "← Início" only when cursor param present; "Próxima →" only when API cursor non-null
- [ ] `loading.tsx` skeleton has 4 columns matching table structure
- [ ] `pnpm lint && pnpm typecheck` passes with exit 0
- [ ] `pnpm --filter @pah/api test` passes (7 new tests)
- [ ] `pnpm --filter @pah/web build` passes (no TypeScript or build errors)

---

## Completion Checklist

- [ ] Task 1: `packages/shared/src/types/vote.ts` created
- [ ] Task 2: `packages/shared/src/index.ts` updated with vote exports
- [ ] Task 3: `packages/db/src/public-schema.ts` updated with votes table
- [ ] Task 4: `packages/db/migrations/public/0004_add_votes.sql` created
- [ ] Task 5: `apps/api/src/schemas/vote.schema.ts` created
- [ ] Task 6: `apps/api/src/repositories/vote.repository.ts` created
- [ ] Task 7: `apps/api/src/services/vote.service.ts` created
- [ ] Task 8: `apps/api/src/services/vote.service.test.ts` created
- [ ] Task 9: `apps/api/src/routes/votes.route.ts` created
- [ ] Task 10: `apps/api/src/app.ts` updated with vote DI wiring
- [ ] Task 11: `apps/web/src/lib/api-types.ts` updated with Vote types
- [ ] Task 12: `apps/web/src/lib/api-client.ts` updated with fetchPoliticianVotes
- [ ] Task 13: `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` created
- [ ] Task 14: `apps/web/src/app/politicos/[slug]/votacoes/loading.tsx` created
- [ ] Level 1: `pnpm lint && pnpm typecheck` — exit 0
- [ ] Level 2: `pnpm --filter @pah/api test` — all pass
- [ ] Level 3: `pnpm --filter @pah/web build` — success
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `count()` return type: pg driver returns bigint as string | MEDIUM | HIGH | `Number()` coercion on all count results; tested in service tests with mock |
| `exactOptionalPropertyTypes` violation in page.tsx | HIGH | MEDIUM | Build `voteFilters` conditionally: `cursor !== undefined ? { cursor } : {}` |
| `or()` from Drizzle returns undefined when args are undefined | LOW | HIGH | Guard already in bill repository — copy exact same pattern |
| DR-002 violation: coloring vote_cast values | MEDIUM | HIGH | Use neutral border badge for ALL vote values; no red/green |
| `voteCast` values with special chars ('não', 'abstenção') exceed varchar(20) | LOW | MEDIUM | VARCHAR(20) stores up to 20 UTF-8 chars; 'abstenção' is 9 chars — safe |
| Promise.all in service: rate query fails silently | LOW | MEDIUM | Both queries fail together — error propagates to route handler → 500 |

---

## Notes

**Why `Promise.all` for participation rate + paginated query?**
The participation rate requires a full table scan (`COUNT(*)`) while the paginated query uses the composite index. Running them in parallel avoids sequential I/O latency. Both queries are under `api_reader` SELECT permissions on `public_data`.

**Why participation rate is 0.0–1.0 (not 0–100)?**
Consistent with standard API conventions; the web layer formats it as a percentage (`toFixed(1)`). Avoids ambiguity between "87.3" and "0.873".

**Why no color coding for vote_cast values?**
DR-002 (Political Neutrality) prohibits using red/green to signal "good/bad" votes. A 'sim' vote on one bill may be considered negative by some citizens. Neutral badges applied uniformly regardless of vote value.

**Parallelism opportunity:**
Phase 5 (RF-012 Expenses) follows the exact same pattern as this phase. It can run concurrently in a separate git worktree:

```bash
git worktree add -b feat/PAH-012-expenses ../pah-expenses feat/PAH-007-politician-profile-overview
```
