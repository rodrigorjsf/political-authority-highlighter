# Drizzle ORM — Stack Documentation

> Version used: `drizzle-orm@^0.36.0`, `drizzle-kit@^0.28.0`
> Last updated: 2026-03-01
> Source: https://orm.drizzle.team/docs/overview

---

## Dual-Schema Pattern (ADR-001)

This project uses two PostgreSQL schemas as security boundaries:

```typescript
// packages/db/src/public-schema.ts
import { pgSchema, text, uuid, integer, boolean, timestamp, varchar, index } from 'drizzle-orm/pg-core'

const publicData = pgSchema('public_data')

export const politicians = publicData.table(
  'politicians',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    party: varchar('party', { length: 20 }).notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    role: text('role', { enum: ['deputado', 'senador'] }).notNull(),
    photoUrl: text('photo_url'),
    tenureStartDate: varchar('tenure_start_date', { length: 10 }).notNull(),
    active: boolean('active').notNull().default(true),
    slug: text('slug').notNull().unique(),
    exclusionFlag: boolean('exclusion_flag').notNull().default(false),
  },
  (table) => [
    index('idx_politicians_active').on(table.active),
    index('idx_politicians_role').on(table.role),
    index('idx_politicians_state').on(table.state),
    index('idx_politicians_slug').on(table.slug),
  ],
)
```

**Reference:** https://orm.drizzle.team/docs/schemas

---

## Type Inference

```typescript
// Preferred: infer types from the schema
export type Politician = typeof politicians.$inferSelect
export type NewPolitician = typeof politicians.$inferInsert

// Usage in service layer:
import type { Politician } from '@pah/db'
```

**Reference:** https://orm.drizzle.team/docs/goodies#type-api

---

## Database Client Setup

```typescript
// packages/db/src/clients.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

// API reader (public_data only, SELECT)
const readerPool = new Pool({ connectionString: process.env['DATABASE_URL_READER'] })
export const publicDb = drizzle(readerPool, { schema: publicSchema })

// Pipeline admin (both schemas, full access)
const writerPool = new Pool({ connectionString: process.env['DATABASE_URL_WRITER'] })
export const pipelineDb = drizzle(writerPool, { schema: { ...publicSchema, ...internalSchema } })
```

---

## Cursor-Based Pagination Pattern

```typescript
import { and, or, lt, eq, desc, asc } from 'drizzle-orm'

// Cursor encodes: { overallScore: number, id: string }
// Decode from base64url:
const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'))
const { overallScore: cursorScore, id: cursorId } = decoded

// Query with cursor (score DESC, id DESC for stable ordering):
const rows = await db
  .select({ ... })
  .from(politicians)
  .leftJoin(integrityScores, eq(integrityScores.politicianId, politicians.id))
  .where(
    and(
      eq(politicians.active, true),
      role !== undefined ? eq(politicians.role, role) : undefined,
      cursor !== undefined
        ? or(
            lt(integrityScores.overallScore, cursorScore),
            and(
              eq(integrityScores.overallScore, cursorScore),
              lt(politicians.id, cursorId),
            ),
          )
        : undefined,
    ),
  )
  .orderBy(desc(integrityScores.overallScore), desc(politicians.id))
  .limit(limit + 1)  // fetch one extra to detect if more pages exist

// If rows.length > limit, there's a next page
const hasMore = rows.length > limit
const data = hasMore ? rows.slice(0, limit) : rows
const lastRow = data[data.length - 1]
const nextCursor = hasMore && lastRow
  ? Buffer.from(JSON.stringify({ overallScore: lastRow.overallScore, id: lastRow.id })).toString('base64url')
  : null
```

**Gotcha (noUncheckedIndexedAccess):** `rows[0]` returns `T | undefined`. Always check:
```typescript
const lastRow = data[data.length - 1]
if (lastRow === undefined) return null
```

---

## WHERE Clause Filtering

```typescript
import { and, eq, ilike } from 'drizzle-orm'

// Build conditions dynamically (undefined conditions are ignored by Drizzle):
const conditions = and(
  eq(politicians.active, true),
  role !== undefined ? eq(politicians.role, role) : undefined,
  state !== undefined ? eq(politicians.state, state) : undefined,
  search !== undefined ? ilike(politicians.name, `%${search}%`) : undefined,
)
```

**Reference:** https://orm.drizzle.team/docs/operators

---

## Migrations

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate --config=packages/db/drizzle.config.ts

# Run migrations
pnpm drizzle-kit migrate --config=packages/db/drizzle.config.ts
```

**Reference:** https://orm.drizzle.team/docs/migrations

---

## Upsert Pattern (DR-007: Idempotency)

```typescript
import { onConflictDoUpdate } from 'drizzle-orm'

await db
  .insert(politicians)
  .values(newPolitician)
  .onConflictDoUpdate({
    target: politicians.slug,
    set: {
      name: newPolitician.name,
      party: newPolitician.party,
      // ...update all mutable fields
    },
  })
```

---

## Import Boundaries

- `apps/api/` may only import `packages/db/src/public-schema.ts`
- `apps/pipeline/` may import all of `packages/db/src/`
- This is enforced via ESLint `import/no-restricted-paths`
