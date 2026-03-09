# Feature: Profile Sections — Proposals + Agenda (RF-010, RF-011)

## Summary

Add two profile section tabs — **Propostas** (RF-010) and **Atividades** (RF-011) — completing all five politician profile tabs. RF-010 surfaces a paginated list of parliamentary proposals; RF-011 shows committee memberships (atividades de agenda). Both follow the exact same layer-by-layer pattern established by bills (RF-008), votes (RF-009), and expenses (RF-012): Drizzle schema → migration → TypeBox API schema → repository → service → Fastify route → Next.js page.

## User Story

As a Cidadão Engajado visiting a politician's profile
I want to browse the politician's proposals and committee memberships
So that I can understand their policy priorities and institutional roles beyond bills and votes

## Problem Statement

The profile page has five tabs (Projetos de Lei, Votações, Despesas, Propostas, Atividades) but only three are functional. Clicks on "Propostas" and "Atividades" lead to missing-page errors. Two DB tables and their full stack layers are absent.

## Solution Statement

Create `public_data.proposals` and `public_data.committees` tables with migrations. Build API schema, repository, service, and route for each. Add Next.js pages for `/politicos/[slug]/propostas` and `/politicos/[slug]/atividades`. Add types to `@pah/shared`. Register routes in `app.ts`. Mirror the bills + votes pattern exactly.

## Metadata

| Field            | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| Type             | NEW_CAPABILITY                                           |
| Complexity       | LOW (identical pattern to RF-008/009/012, already done 3×) |
| Systems Affected | packages/db, packages/shared, apps/api, apps/web          |
| Dependencies     | Phase 2 (profile overview) — complete                    |
| Estimated Tasks  | 16                                                       |

---

## UX Design

### Before State

```
╔════════════════════════════════════════════════════════════════╗
║  /politicos/[slug]  →  tabs: [Projetos] [Votações] [Despesas] ║
║                         [Propostas] [Atividades]               ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  User clicks "Propostas"  ──►  404 / missing page error        ║
║  User clicks "Atividades" ──►  404 / missing page error        ║
║                                                                ║
║  PAIN: 2 of 5 profile tabs are broken.                         ║
║  Bounce rate increases. User trust drops.                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### After State

```
╔════════════════════════════════════════════════════════════════╗
║  /politicos/[slug]/propostas                                   ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Tipo     Número  Data        Resumo          Status  Fonte   ║
║  ─────────────────────────────────────────────────────────── ║
║  PL       1234    2024-03-01  Altera lei...   Em análise  ↗  ║
║  PEC       42     2023-11-15  Propõe emenda.. Aprovado    ↗  ║
║  ...                                                           ║
║                                        [← Início] [Próxima →] ║
╚════════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════════╗
║  /politicos/[slug]/atividades                                  ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Comissão                     Cargo     Desde    Até           ║
║  ─────────────────────────────────────────────────────────── ║
║  Comissão de Constituição...  Titular   2024-02  atual        ║
║  Comissão de Finanças         Suplente  2023-03  2024-01      ║
║  ...                                                           ║
╚════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/politicos/[slug]/propostas` | 404 error | Paginated proposals table with type, number, summary, status, source link | Can browse policy proposals |
| `/politicos/[slug]/atividades` | 404 error | Committee membership list sorted by start date | Can see institutional role |
| Profile tab "Propostas" | Broken link | Working tab | No dead ends |
| Profile tab "Atividades" | Broken link | Working tab | No dead ends |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | [apps/api/src/repositories/bill.repository.ts](apps/api/src/repositories/bill.repository.ts) | 1–74 | Cursor pagination pattern to MIRROR exactly |
| P0 | [apps/api/src/services/bill.service.ts](apps/api/src/services/bill.service.ts) | 1–71 | Service pattern: encodeCursor, decodeCursor, toBillDto |
| P0 | [apps/api/src/routes/bills.route.ts](apps/api/src/routes/bills.route.ts) | 1–42 | Route pattern: createBillsRoute(deps) |
| P0 | [apps/api/src/schemas/bill.schema.ts](apps/api/src/schemas/bill.schema.ts) | all | TypeBox schema pattern to MIRROR |
| P0 | [packages/db/src/public-schema.ts](packages/db/src/public-schema.ts) | 97–145 | bills + votes table definitions to MIRROR |
| P0 | [packages/db/migrations/0003_add_bills.sql](packages/db/migrations/0003_add_bills.sql) | all | Migration SQL pattern to MIRROR |
| P1 | [apps/api/src/app.ts](apps/api/src/app.ts) | 1–77 | Where to register new routes (after expenses registration) |
| P1 | [apps/web/src/app/politicos/[slug]/projetos/page.tsx](apps/web/src/app/politicos/[slug]/projetos/page.tsx) | all | Web page pattern to MIRROR |
| P1 | [apps/web/src/lib/api-client.ts](apps/web/src/lib/api-client.ts) | 82–111 | fetchPoliticianBills/Votes pattern to MIRROR |
| P1 | [apps/web/src/lib/api-types.ts](apps/web/src/lib/api-types.ts) | all | Where to add new type re-exports |
| P1 | [packages/shared/src/types/bill.ts](packages/shared/src/types/bill.ts) | all | Shared type pattern to MIRROR |
| P1 | [packages/shared/src/index.ts](packages/shared/src/index.ts) | all | Where to add new exports |
| P2 | [apps/api/src/services/bill.service.test.ts](apps/api/src/services/bill.service.test.ts) | all | Unit test pattern to FOLLOW |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| Existing codebase only | — | All patterns are established; no external research needed |

---

## Patterns to Mirror

**NAMING_CONVENTION:**

```typescript
// SOURCE: apps/api/src/repositories/bill.repository.ts:27
// COPY THIS PATTERN:
export function createProposalRepository(db: PublicDb): {
  selectByPoliticianSlug: (slug: string, filters: ProposalListFilters) => Promise<ProposalRow[]>
}
```

**CURSOR_PAGINATION (proposals):**

```typescript
// SOURCE: apps/api/src/repositories/bill.repository.ts:18-21, 34-44
// COPY THIS PATTERN — proposals pagination on (submission_date DESC, id DESC):
export interface ProposalListFilters {
  limit: number
  cursor?: { submissionDate: string; proposalId: string } | undefined
}
// cursor condition uses or(lt(date), and(eq(date), lt(id)))
```

**NO_PAGINATION (committees):**

```typescript
// SOURCE: apps/api/src/repositories/bill.repository.ts (inverted — committees don't paginate)
// Committee memberships are small (< 20 typically) — return ALL, sorted by start_date DESC
// No cursor, no limit. Simple SELECT with ORDER BY.
```

**DRIZZLE_TABLE_DEFINITION:**

```typescript
// SOURCE: packages/db/src/public-schema.ts:97-119
// COPY THIS PATTERN for proposals:
export const proposals = publicData.table(
  'proposals',
  { /* columns */ },
  (table) => [
    index('idx_proposals_politician').on(table.politicianId),
    index('idx_proposals_pagination').on(table.politicianId, table.submissionDate, table.id),
  ],
)
```

**TYPEBOX_SCHEMA:**

```typescript
// SOURCE: apps/api/src/schemas/bill.schema.ts:1-40
// COPY THIS PATTERN:
export const ProposalSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.String(),
  source: Type.String(),
  proposalType: Type.String(),
  proposalNumber: Type.String(),
  proposalYear: Type.Integer(),
  summary: Type.String(),
  status: Type.String(),
  submissionDate: Type.String({ format: 'date' }),
  sourceUrl: Type.Union([Type.String(), Type.Null()]),
})
```

**SERVICE_CURSOR_ENCODE:**

```typescript
// SOURCE: apps/api/src/services/bill.service.ts:9-18
// COPY THIS PATTERN:
function encodeCursor(cursor: ProposalCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}
function decodeCursor(encoded: string): ProposalCursor {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as ProposalCursor
  } catch {
    throw new Error('Invalid cursor')
  }
}
```

**ROUTE_FACTORY:**

```typescript
// SOURCE: apps/api/src/routes/bills.route.ts:1-42
// COPY THIS PATTERN:
export function createProposalsRoute(deps: { proposalService: ProposalService }): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get<{ Params: PoliticianParams; Querystring: ProposalListQuery }>(
      '/politicians/:slug/proposals',
      { schema: { params: PoliticianParamsSchema, querystring: ProposalListQuerySchema, response: { 200: ProposalListResponseSchema } } },
      async (request, reply) => {
        const { slug } = request.params
        const { limit = 20, cursor } = request.query
        const result = await deps.proposalService.findByPoliticianSlug(slug, { limit, cursor })
        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')
        return result
      },
    )
  }
}
```

**WEB_PAGE_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/[slug]/projetos/page.tsx
// COPY THIS PATTERN exactly — ISR, generateMetadata, fetchPoliticianBySlug + fetchPoliticianProposals,
// notFound on 404, breadcrumb, table rows, empty state, pagination nav
export const revalidate = 3600
```

**TEST_STRUCTURE:**

```typescript
// SOURCE: apps/api/src/services/bill.service.test.ts:1-end
// COPY THIS PATTERN:
describe('ProposalService', () => {
  function buildProposalRow(overrides: Partial<ProposalRow> = {}): ProposalRow { ... }
  it('returns empty data and no cursor when no proposals', ...)
  it('sets cursor when more rows than limit', ...)
  it('returns null cursor when rows fit within limit', ...)
})
```

---

## Files to Change

### New Files to CREATE

| File | Action | Justification |
|------|--------|---------------|
| `packages/db/migrations/0006_add_proposals.sql` | CREATE | SQL migration for proposals table |
| `packages/db/migrations/0007_add_committees.sql` | CREATE | SQL migration for committees table |
| `packages/shared/src/types/proposal.ts` | CREATE | Shared domain interfaces for proposals |
| `packages/shared/src/types/committee.ts` | CREATE | Shared domain interfaces for committees |
| `apps/api/src/schemas/proposal.schema.ts` | CREATE | TypeBox request/response schemas for proposals |
| `apps/api/src/schemas/committee.schema.ts` | CREATE | TypeBox request/response schemas for committees |
| `apps/api/src/repositories/proposal.repository.ts` | CREATE | Drizzle queries for proposals with cursor pagination |
| `apps/api/src/repositories/committee.repository.ts` | CREATE | Drizzle queries for committees (no pagination) |
| `apps/api/src/services/proposal.service.ts` | CREATE | Cursor encoding + response shaping for proposals |
| `apps/api/src/services/committee.service.ts` | CREATE | Response shaping for committees |
| `apps/api/src/services/proposal.service.test.ts` | CREATE | Unit tests for proposal service |
| `apps/api/src/services/committee.service.test.ts` | CREATE | Unit tests for committee service |
| `apps/api/src/routes/proposals.route.ts` | CREATE | GET /politicians/:slug/proposals Fastify route |
| `apps/api/src/routes/committees.route.ts` | CREATE | GET /politicians/:slug/committees Fastify route |
| `apps/web/src/app/politicos/[slug]/propostas/page.tsx` | CREATE | Next.js ISR page for proposals tab |
| `apps/web/src/app/politicos/[slug]/propostas/loading.tsx` | CREATE | Skeleton loading state for proposals |
| `apps/web/src/app/politicos/[slug]/atividades/page.tsx` | CREATE | Next.js ISR page for committees tab |
| `apps/web/src/app/politicos/[slug]/atividades/loading.tsx` | CREATE | Skeleton loading state for committees |

### Existing Files to UPDATE

| File | Action | Justification |
|------|--------|---------------|
| `packages/db/src/public-schema.ts` | UPDATE | Add `proposals` and `committees` Drizzle table definitions |
| `packages/shared/src/index.ts` | UPDATE | Export new Proposal/Committee types |
| `apps/web/src/lib/api-types.ts` | UPDATE | Re-export Proposal/Committee types |
| `apps/web/src/lib/api-client.ts` | UPDATE | Add fetchPoliticianProposals + fetchPoliticianCommittees |
| `apps/api/src/app.ts` | UPDATE | Register proposalsRoute and committeesRoute |

---

## NOT Building (Scope Limits)

- **Pagination for committees** — memberships are ≤ 20 per politician; offset would add complexity with no benefit
- **Proposal filtering by type/status** — out of scope for MVP; the API query only supports cursor + limit
- **Vote tallies or outcomes per proposal** — that is RF-009 data, not RF-010
- **Agenda calendar events** — RF-011 scope is committee memberships, not schedule/diary entries
- **Pipeline adapters** — data ingestion is Phase 7; these pages render empty-state until pipeline runs

---

## Step-by-Step Tasks

Execute in order. Each task is independently verifiable.

---

### Task 1: UPDATE `packages/db/src/public-schema.ts` — add proposals + committees tables

- **ACTION**: ADD two table definitions after the `votes` table (line 145)
- **IMPLEMENT**:
  - `proposals` table: `id` (uuid pk), `politician_id` (fk), `external_id` (varchar 100), `source` (varchar 20), `proposal_type` (varchar 20 — 'PL', 'PEC', 'PLP', 'MP', etc.), `proposal_number` (varchar 20), `proposal_year` (smallint), `summary` (text), `status` (varchar 50), `submission_date` (date), `source_url` (varchar 500 nullable), `created_at`, `updated_at`
  - `committees` table: `id` (uuid pk), `politician_id` (fk), `external_id` (varchar 100), `source` (varchar 20), `committee_name` (text), `role` (varchar 50 — 'Titular', 'Suplente', 'Presidente', etc.), `start_date` (date), `end_date` (date nullable — null = current), `created_at`, `updated_at`
- **MIRROR**: `packages/db/src/public-schema.ts:97–145` — bills and votes table pattern
- **INDEXES** for proposals: `idx_proposals_politician` on `politician_id`, `idx_proposals_pagination` on `(politician_id, submission_date, id)`
- **INDEXES** for committees: `idx_committees_politician` on `politician_id`
- **UNIQUE** for proposals: `(external_id, politician_id)` to prevent duplicate ingestion
- **UNIQUE** for committees: `(external_id, politician_id)`
- **GOTCHA**: Use `date` column type (not `timestamp`) for `submission_date`, `start_date`, `end_date` — matches bills/votes pattern
- **VALIDATE**: `pnpm --filter @pah/db typecheck`

---

### Task 2: CREATE `packages/db/migrations/0006_add_proposals.sql`

- **ACTION**: CREATE migration SQL for the proposals table
- **MIRROR**: `packages/db/migrations/0003_add_bills.sql`
- **IMPLEMENT**:

```sql
-- RF-010: Add proposals table for parliamentary proposal tracking
CREATE TABLE IF NOT EXISTS public_data.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES public_data.politicians(id),
  external_id VARCHAR(100) NOT NULL,
  source VARCHAR(20) NOT NULL,
  proposal_type VARCHAR(20) NOT NULL,
  proposal_number VARCHAR(20) NOT NULL,
  proposal_year SMALLINT NOT NULL,
  summary TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  submission_date DATE NOT NULL,
  source_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (external_id, politician_id)
);

CREATE INDEX IF NOT EXISTS idx_proposals_politician ON public_data.proposals(politician_id);
CREATE INDEX IF NOT EXISTS idx_proposals_pagination ON public_data.proposals(submission_date DESC, id DESC);
```

- **VALIDATE**: File exists at correct path, SQL is syntactically valid

---

### Task 3: CREATE `packages/db/migrations/0007_add_committees.sql`

- **ACTION**: CREATE migration SQL for the committees table
- **IMPLEMENT**:

```sql
-- RF-011: Add committees table for committee membership tracking
CREATE TABLE IF NOT EXISTS public_data.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID NOT NULL REFERENCES public_data.politicians(id),
  external_id VARCHAR(100) NOT NULL,
  source VARCHAR(20) NOT NULL,
  committee_name TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (external_id, politician_id)
);

CREATE INDEX IF NOT EXISTS idx_committees_politician ON public_data.committees(politician_id);
```

- **VALIDATE**: File exists at correct path

---

### Task 4: CREATE `packages/shared/src/types/proposal.ts`

- **ACTION**: CREATE shared domain interfaces for proposals
- **MIRROR**: `packages/shared/src/types/bill.ts`
- **IMPLEMENT**:

```typescript
/**
 * Parliamentary proposal authored or co-authored by a politician (RF-010).
 * Covers all proposal types: PL, PEC, PLP, MP, PDL, etc.
 */
export interface Proposal {
  id: string
  externalId: string
  source: 'camara' | 'senado'
  proposalType: string
  proposalNumber: string
  proposalYear: number
  summary: string
  status: string
  submissionDate: string // 'YYYY-MM-DD'
  sourceUrl: string | null
}

/**
 * Query filter options for fetching politician proposals.
 */
export interface ProposalFilters {
  cursor?: string
  limit?: number
}

/**
 * Paginated API response for proposals.
 */
export interface ProposalListResponse {
  data: Proposal[]
  cursor: string | null
}
```

- **VALIDATE**: `pnpm --filter @pah/shared typecheck`

---

### Task 5: CREATE `packages/shared/src/types/committee.ts`

- **ACTION**: CREATE shared domain interfaces for committees
- **IMPLEMENT**:

```typescript
/**
 * Committee membership for a politician (RF-011).
 * end_date null means current active membership.
 */
export interface Committee {
  id: string
  externalId: string
  source: 'camara' | 'senado'
  committeeName: string
  role: string
  startDate: string // 'YYYY-MM-DD'
  endDate: string | null // null = current
}

/**
 * API response for committee memberships (no pagination — small dataset).
 */
export interface CommitteeListResponse {
  data: Committee[]
}
```

- **VALIDATE**: `pnpm --filter @pah/shared typecheck`

---

### Task 6: UPDATE `packages/shared/src/index.ts` — export new types

- **ACTION**: ADD two new export lines after the existing `expense` export
- **MIRROR**: `packages/shared/src/index.ts:9` — same `export type { ... } from './types/X.js'` pattern
- **ADD**:

```typescript
export type { Proposal, ProposalFilters, ProposalListResponse } from './types/proposal.js'
export type { Committee, CommitteeListResponse } from './types/committee.js'
```

- **VALIDATE**: `pnpm --filter @pah/shared typecheck`

---

### Task 7: CREATE `apps/api/src/schemas/proposal.schema.ts`

- **ACTION**: CREATE TypeBox schemas for proposals
- **MIRROR**: `apps/api/src/schemas/bill.schema.ts`
- **IMPLEMENT**:

```typescript
import { Type, type Static } from '@sinclair/typebox'
import { PoliticianParamsSchema, type PoliticianParams } from './politician.schema.js'

export { PoliticianParamsSchema, type PoliticianParams }

export const ProposalListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
  cursor: Type.Optional(Type.String({ description: 'Opaque base64url cursor from previous response' })),
})
export type ProposalListQuery = Static<typeof ProposalListQuerySchema>

export const ProposalSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.String(),
  source: Type.String(),
  proposalType: Type.String(),
  proposalNumber: Type.String(),
  proposalYear: Type.Integer({ minimum: 1980, maximum: 2100 }),
  summary: Type.String(),
  status: Type.String(),
  submissionDate: Type.String({ format: 'date' }),
  sourceUrl: Type.Union([Type.String(), Type.Null()]),
})
export type ProposalDto = Static<typeof ProposalSchema>

export const ProposalListResponseSchema = Type.Object({
  data: Type.Array(ProposalSchema),
  cursor: Type.Union([Type.String(), Type.Null()]),
})
export type ProposalListResponseDto = Static<typeof ProposalListResponseSchema>
```

- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 8: CREATE `apps/api/src/schemas/committee.schema.ts`

- **ACTION**: CREATE TypeBox schemas for committees
- **IMPLEMENT**:

```typescript
import { Type, type Static } from '@sinclair/typebox'
import { PoliticianParamsSchema, type PoliticianParams } from './politician.schema.js'

export { PoliticianParamsSchema, type PoliticianParams }

export const CommitteeSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.String(),
  source: Type.String(),
  committeeName: Type.String(),
  role: Type.String(),
  startDate: Type.String({ format: 'date' }),
  endDate: Type.Union([Type.String({ format: 'date' }), Type.Null()]),
})
export type CommitteeDto = Static<typeof CommitteeSchema>

export const CommitteeListResponseSchema = Type.Object({
  data: Type.Array(CommitteeSchema),
})
export type CommitteeListResponseDto = Static<typeof CommitteeListResponseSchema>
```

- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 9: CREATE `apps/api/src/repositories/proposal.repository.ts`

- **ACTION**: CREATE repository with cursor pagination
- **MIRROR**: `apps/api/src/repositories/bill.repository.ts` exactly
- **IMPLEMENT** cursor on `(submission_date DESC, id DESC)`:

```typescript
import { eq, and, lt, or, desc } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { proposals, politicians } from '@pah/db/public-schema'

export interface ProposalRow {
  id: string
  externalId: string
  source: string
  proposalType: string
  proposalNumber: string
  proposalYear: number
  summary: string
  status: string
  submissionDate: string
  sourceUrl: string | null
}

export interface ProposalListFilters {
  limit: number
  cursor?: { submissionDate: string; proposalId: string } | undefined
}

export function createProposalRepository(db: PublicDb): {
  selectByPoliticianSlug: (slug: string, filters: ProposalListFilters) => Promise<ProposalRow[]>
} {
  return {
    async selectByPoliticianSlug(slug, filters): Promise<ProposalRow[]> {
      const conditions = [eq(politicians.active, true)]

      if (filters.cursor !== undefined) {
        const { submissionDate, proposalId } = filters.cursor
        const cursorCondition = or(
          lt(proposals.submissionDate, submissionDate),
          and(eq(proposals.submissionDate, submissionDate), lt(proposals.id, proposalId)),
        )
        if (cursorCondition !== undefined) conditions.push(cursorCondition)
      }

      const rows = await db
        .select({ id: proposals.id, externalId: proposals.externalId, source: proposals.source,
          proposalType: proposals.proposalType, proposalNumber: proposals.proposalNumber,
          proposalYear: proposals.proposalYear, summary: proposals.summary, status: proposals.status,
          submissionDate: proposals.submissionDate, sourceUrl: proposals.sourceUrl })
        .from(proposals)
        .innerJoin(politicians, eq(proposals.politicianId, politicians.id))
        .where(and(eq(politicians.slug, slug), ...conditions))
        .orderBy(desc(proposals.submissionDate), desc(proposals.id))
        .limit(filters.limit + 1)

      return rows.map((row) => ({ ...row, sourceUrl: row.sourceUrl ?? null,
        proposalYear: Number(row.proposalYear) }))
    },
  }
}

export type ProposalRepository = ReturnType<typeof createProposalRepository>
```

- **GOTCHA**: `smallint` columns (`proposal_year`) come back as `number` from Drizzle already, but use `Number()` to be safe — matches `billYear` pattern in bill.repository.ts:68
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 10: CREATE `apps/api/src/repositories/committee.repository.ts`

- **ACTION**: CREATE repository WITHOUT cursor pagination (all memberships returned)
- **IMPLEMENT** — simple SELECT with ORDER BY start_date DESC:

```typescript
import { eq, and, desc } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { committees, politicians } from '@pah/db/public-schema'

export interface CommitteeRow {
  id: string
  externalId: string
  source: string
  committeeName: string
  role: string
  startDate: string
  endDate: string | null
}

export function createCommitteeRepository(db: PublicDb): {
  selectByPoliticianSlug: (slug: string) => Promise<CommitteeRow[]>
} {
  return {
    async selectByPoliticianSlug(slug): Promise<CommitteeRow[]> {
      const rows = await db
        .select({ id: committees.id, externalId: committees.externalId, source: committees.source,
          committeeName: committees.committeeName, role: committees.role,
          startDate: committees.startDate, endDate: committees.endDate })
        .from(committees)
        .innerJoin(politicians, eq(committees.politicianId, politicians.id))
        .where(and(eq(politicians.slug, slug), eq(politicians.active, true)))
        .orderBy(desc(committees.startDate))

      return rows.map((row) => ({ ...row, endDate: row.endDate ?? null }))
    },
  }
}

export type CommitteeRepository = ReturnType<typeof createCommitteeRepository>
```

- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 11: CREATE `apps/api/src/services/proposal.service.ts`

- **ACTION**: CREATE service with cursor encode/decode
- **MIRROR**: `apps/api/src/services/bill.service.ts` exactly
- **CURSOR_FIELDS**: `{ submissionDate: string; proposalId: string }`
- **LAST_ROW_CURSOR**: `encodeCursor({ submissionDate: lastRow.submissionDate, proposalId: lastRow.id })`
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 12: CREATE `apps/api/src/services/committee.service.ts`

- **ACTION**: CREATE service (no cursor — just map rows to DTOs)
- **IMPLEMENT**:

```typescript
import type { CommitteeRepository, CommitteeRow } from '../repositories/committee.repository.js'
import type { CommitteeDto, CommitteeListResponseDto } from '../schemas/committee.schema.js'

function toCommitteeDto(row: CommitteeRow): CommitteeDto {
  return {
    id: row.id, externalId: row.externalId, source: row.source,
    committeeName: row.committeeName, role: row.role,
    startDate: row.startDate, endDate: row.endDate,
  }
}

export function createCommitteeService(committeeRepository: CommitteeRepository): {
  findByPoliticianSlug: (slug: string) => Promise<CommitteeListResponseDto>
} {
  return {
    async findByPoliticianSlug(slug: string): Promise<CommitteeListResponseDto> {
      const rows = await committeeRepository.selectByPoliticianSlug(slug)
      return { data: rows.map(toCommitteeDto) }
    },
  }
}

export type CommitteeService = ReturnType<typeof createCommitteeService>
```

- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 13: CREATE service tests

- **ACTION**: CREATE `apps/api/src/services/proposal.service.test.ts` and `committee.service.test.ts`
- **MIRROR**: `apps/api/src/services/bill.service.test.ts`
- **PROPOSAL TEST CASES**:
  - returns empty data + null cursor when no proposals
  - sets cursor when more rows than limit
  - returns null cursor when rows fit within limit
- **COMMITTEE TEST CASES**:
  - returns empty data when no committees
  - maps rows to DTOs correctly (endDate null → null)
  - returns all rows without pagination
- **VALIDATE**: `pnpm --filter @pah/api test`

---

### Task 14: CREATE Fastify routes

- **ACTION**: CREATE `apps/api/src/routes/proposals.route.ts` and `committees.route.ts`
- **MIRROR**: `apps/api/src/routes/bills.route.ts`
- **PROPOSALS** endpoint: `GET /politicians/:slug/proposals` — `limit` + `cursor` query params
- **COMMITTEES** endpoint: `GET /politicians/:slug/committees` — no query params (params schema only)
- **BOTH**: `Cache-Control: public, max-age=300, s-maxage=3600`
- **COMMITTEES ROUTE** — no querystring schema needed (no pagination), only params:

```typescript
app.get<{ Params: PoliticianParams }>('/politicians/:slug/committees',
  { schema: { params: PoliticianParamsSchema, response: { 200: CommitteeListResponseSchema } } },
  async (request, reply) => {
    const { slug } = request.params
    const result = await deps.committeeService.findByPoliticianSlug(slug)
    void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')
    return result
  },
)
```

- **VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 15: UPDATE `apps/api/src/app.ts` — register new routes

- **ACTION**: ADD imports and registrations for proposal + committee routes
- **MIRROR**: Lines 10–18 (import pattern) and 55–59 (register pattern) in app.ts
- **ADD IMPORTS** (after existing imports):

```typescript
import { createProposalRepository } from './repositories/proposal.repository.js'
import { createProposalService } from './services/proposal.service.js'
import { createProposalsRoute } from './routes/proposals.route.js'
import { createCommitteeRepository } from './repositories/committee.repository.js'
import { createCommitteeService } from './services/committee.service.js'
import { createCommitteesRoute } from './routes/committees.route.js'
```

- **ADD DI** (after `voteService`):

```typescript
const proposalRepository = createProposalRepository(db)
const proposalService = createProposalService(proposalRepository)
const committeeRepository = createCommitteeRepository(db)
const committeeService = createCommitteeService(committeeRepository)
```

- **ADD REGISTRATIONS** (after existing route registrations):

```typescript
void app.register(createProposalsRoute({ proposalService }), { prefix: '/api/v1' })
void app.register(createCommitteesRoute({ committeeService }), { prefix: '/api/v1' })
```

- **VALIDATE**: `pnpm --filter @pah/api typecheck && pnpm --filter @pah/api test`

---

### Task 16: UPDATE `apps/web/src/lib/api-types.ts` and `api-client.ts`

- **ACTION**: ADD proposal + committee types and fetch functions
- **ADD TO `api-types.ts`**:

```typescript
import type { ..., Proposal, ProposalFilters, ProposalListResponse, Committee, CommitteeListResponse } from '@pah/shared'
export type { ..., Proposal, ProposalFilters, ProposalListResponse, Committee, CommitteeListResponse }
```

- **ADD TO `api-client.ts`**:

```typescript
/**
 * Fetches paginated proposals for a politician with ISR caching.
 */
export async function fetchPoliticianProposals(
  slug: string,
  filters: ProposalFilters = {},
): Promise<ProposalListResponse> {
  const params = new URLSearchParams()
  if (filters.cursor !== undefined) params.set('cursor', filters.cursor)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  return apiFetch<ProposalListResponse>(
    `/politicians/${encodeURIComponent(slug)}/proposals?${params.toString()}`,
    { next: { revalidate: 300, tags: [`politician-${slug}-proposals`] } },
  )
}

/**
 * Fetches committee memberships for a politician with ISR caching.
 */
export async function fetchPoliticianCommittees(slug: string): Promise<CommitteeListResponse> {
  return apiFetch<CommitteeListResponse>(
    `/politicians/${encodeURIComponent(slug)}/committees`,
    { next: { revalidate: 300, tags: [`politician-${slug}-committees`] } },
  )
}
```

- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 17: CREATE web pages — Propostas

- **ACTION**: CREATE `apps/web/src/app/politicos/[slug]/propostas/page.tsx` and `loading.tsx`
- **MIRROR**: `apps/web/src/app/politicos/[slug]/projetos/page.tsx` and its loading.tsx exactly
- **PAGE CONTENT**: Table with columns: `Mês/Ano` → `Tipo`, `Número`, `Data`, `Resumo`, `Status`, `Fonte`
- **TABLE COLUMNS**:
  - `Tipo` — `proposal.proposalType`
  - `Número` — `proposal.proposalNumber / proposal.proposalYear`
  - `Data` — `proposal.submissionDate`
  - `Resumo` — `proposal.summary` (truncate long text)
  - `Status` — `proposal.status`
  - `Fonte` — link to `proposal.sourceUrl` if not null, else `—`
- **PAGINATION**: cursor-based, same as projetos/despesas pages (← Início / Próxima →)
- **EMPTY STATE**: `Nenhuma proposta encontrada.`
- **METADATA**: `Propostas — {politician.name} ({politician.party}-{politician.state}) — Autoridade Política`
- **ISR**: `export const revalidate = 3600`
- **GOTCHA**: `summary` may be long — apply `className="max-w-xs truncate"` or similar to keep table readable
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 18: CREATE web pages — Atividades (Committees)

- **ACTION**: CREATE `apps/web/src/app/politicos/[slug]/atividades/page.tsx` and `loading.tsx`
- **MIRROR**: page.tsx structure from projetos but WITHOUT pagination (no cursor)
- **PAGE CONTENT**: Table with columns: `Comissão`, `Cargo`, `Desde`, `Até`
  - `Comissão` — `committee.committeeName`
  - `Cargo` — `committee.role`
  - `Desde` — `committee.startDate` (format as `MM/YYYY`)
  - `Até` — `committee.endDate` formatted as `MM/YYYY` or `atual` if null
- **EMPTY STATE**: `Nenhuma participação em comissões encontrada.`
- **NO PAGINATION NAV** — all memberships returned at once
- **METADATA**: `Atividades — {politician.name} ({politician.party}-{politician.state}) — Autoridade Política`
- **ISR**: `export const revalidate = 3600`
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|-----------|-----------|
| `apps/api/src/services/proposal.service.test.ts` | empty result, cursor set when hasMore, null cursor when fits | Cursor encoding, pagination logic |
| `apps/api/src/services/committee.service.test.ts` | empty result, DTO mapping, endDate null preserved | Response shaping |

### Edge Cases Checklist

- [ ] Empty proposals list → `{ data: [], cursor: null }` response (no 404)
- [ ] Empty committees list → `{ data: [] }` response (no 404)
- [ ] `proposal.summary` very long string — truncated in UI with CSS
- [ ] `committee.endDate` null → rendered as "atual" in UI
- [ ] Invalid cursor string → service throws `Error('Invalid cursor')` → 500 (same as bills)
- [ ] Politician not found → `fetchPoliticianBySlug` throws 404 → `notFound()` called

---

## Validation Commands

### Level 1: STATIC ANALYSIS

```bash
pnpm --filter @pah/db typecheck
pnpm --filter @pah/shared typecheck
pnpm --filter @pah/api lint && pnpm --filter @pah/api typecheck
pnpm --filter @pah/web lint && pnpm --filter @pah/web typecheck
```

**EXPECT**: Exit 0, no errors

### Level 2: UNIT TESTS

```bash
pnpm --filter @pah/api test
```

**EXPECT**: All tests pass including new proposal + committee service tests

### Level 3: FULL SUITE

```bash
pnpm lint && pnpm typecheck && pnpm test
```

**EXPECT**: All pass

### Level 4: DATABASE VALIDATION

Confirm tables in DB schema file match migrations:

- `public_data.proposals` created with correct columns
- `public_data.committees` created with correct columns
- Both have unique constraints on `(external_id, politician_id)`

### Level 5: MANUAL VALIDATION

1. Start API: `pnpm --filter @pah/api dev`
2. Confirm endpoints respond (empty data until pipeline runs):
   - `curl http://localhost:3001/api/v1/politicians/any-slug/proposals` → `{"data":[],"cursor":null}`
   - `curl http://localhost:3001/api/v1/politicians/any-slug/committees` → `{"data":[]}`
3. Start web: `pnpm --filter @pah/web dev`
4. Navigate to `/politicos/any-slug/propostas` → empty state message shown
5. Navigate to `/politicos/any-slug/atividades` → empty state message shown
6. Profile tab navigation shows all 5 tabs working

---

## Acceptance Criteria

- [ ] `GET /api/v1/politicians/:slug/proposals` returns `{ data, cursor }` with 20-item pages
- [ ] `GET /api/v1/politicians/:slug/committees` returns `{ data }` with all memberships sorted by start_date DESC
- [ ] `/politicos/[slug]/propostas` renders proposals table with type, number, date, summary, status, source link; empty state when no data
- [ ] `/politicos/[slug]/atividades` renders committees table with name, role, start/end date; `atual` for active memberships; empty state when no data
- [ ] Loading skeletons exist for both pages
- [ ] Both pages have correct `generateMetadata()` with politician name
- [ ] All 5 profile tabs link to working pages (no 404)
- [ ] Level 1–3 validation commands pass with exit 0
- [ ] Unit tests cover empty result, cursor pagination, and DTO mapping

---

## Completion Checklist

- [ ] Tasks 1–3: DB schema + migrations complete
- [ ] Tasks 4–6: shared types + exports complete
- [ ] Tasks 7–8: TypeBox API schemas complete
- [ ] Tasks 9–10: repositories complete
- [ ] Tasks 11–12: services complete
- [ ] Task 13: service tests pass
- [ ] Task 14: Fastify routes complete
- [ ] Task 15: routes registered in app.ts
- [ ] Task 16: web lib (types + client) updated
- [ ] Tasks 17–18: web pages complete
- [ ] Level 1: `pnpm lint && pnpm typecheck` passes (all packages)
- [ ] Level 2: `pnpm test` passes
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `proposals` table name conflicts with Drizzle reserved keyword | LOW | LOW | Test compile after table definition; rename to `parlamentary_proposals` if needed |
| `committee.endDate` nullable column requires `exactOptionalPropertyTypes` care | MEDIUM | LOW | Always use `endDate: row.endDate ?? null` pattern (same as `sourceUrl ?? null` in bills repo) |
| committees without pagination over-fetches on large datasets | LOW | LOW | Committee memberships are capped by legislative term; rarely exceed 15–20 |
| Web page for proposals truncates summary too aggressively | LOW | LOW | Use `max-w-xs truncate` on summary column; acceptable for MVP |

---

## Notes

- **Pattern confidence**: This phase is the lowest-risk in the entire MVP. The bills/votes/expenses pattern has been executed three times. Task descriptions include exact code snippets to copy.
- **Committees vs. Proposals split**: Two independent resources (proposals = paginated list, committees = full list) but registered in the same phase to complete all 5 profile tabs together.
- **Pipeline readiness**: These pages will show empty state until Phase 7 (pipeline) runs. This is expected and correct behavior — the empty state is designed in.
- **Phase 6 → Phase 9 dependency**: SEO `generateMetadata()` per profile uses profile page data only. Phase 9 (SEO) can proceed as soon as all profile pages exist, which this phase completes.
