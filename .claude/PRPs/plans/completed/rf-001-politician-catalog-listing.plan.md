# Feature: RF-001 — Politician Catalog Listing (Phase 1: Base Listing)

## Summary

Implement the politician listing page (`/politicos`) for a greenfield TypeScript monorepo. This covers: monorepo scaffolding (package.json, tsconfig, turbo), database schema (Drizzle + PostgreSQL), a Fastify 5 REST endpoint (`GET /api/v1/politicians`) with TypeBox validation and cursor-based pagination, a Next.js 15 Server Component listing page, and a `PoliticianCard` component. The stack is pre-specified in CLAUDE.md and ARCHITECTURE.md — follow it exactly.

## User Story

As a Cidadão Engajado
I want to browse all active federal politicians sorted by integrity score in a responsive grid
So that I can identify which politicians are worth investigating and navigate to their profiles

## Problem Statement

No frontend or backend code exists yet. The platform cannot serve any public content. This phase bootstraps the monorepo and delivers the first user-facing page: a card grid of politicians sorted by pre-computed integrity score, with cursor-based pagination.

## Solution Statement

Bootstrap the pnpm monorepo with four packages (`shared`, `db`, `api`, `web`). Define the PostgreSQL schema with Drizzle ORM. Implement a typed Fastify 5 route with TypeBox that queries `public_data.politicians JOIN public_data.integrity_scores` using composite cursor pagination. Render the data in a Next.js 15 ISR Server Component page with responsive `PoliticianCard` components and `PaginationControls`.

## Metadata

| Field | Value |
|-------|-------|
| Type | NEW_CAPABILITY |
| Complexity | HIGH (full-stack greenfield, 4 packages, DB + API + Web) |
| Systems Affected | packages/shared, packages/db, apps/api, apps/web |
| Dependencies | next@15, fastify@5, drizzle-orm@0.36+, @sinclair/typebox, postgres, vitest, playwright |
| Estimated Tasks | 22 |

---

## UX Design

### Before State

```
No /politicos page exists. Project is 100% greenfield.
User visiting the platform gets a 404 or blank screen.
DATA_FLOW: Government APIs → pipeline (future) → DB (not created) → ∅
```

### After State

```
GET /politicos?cursor=<base64url-token>

┌──────────────────────────────────────────┐
│ /politicos  (Server Component, ISR 1h)   │
│                                          │
│  ┌────────┐  ┌────────┐  ┌────────┐    │  ← 3 cols desktop, 1 mobile
│  │ [Foto] │  │ [Foto] │  │ [Foto] │    │
│  │ Name   │  │ Name   │  │ Name   │    │
│  │ Party  │  │ Party  │  │ Party  │    │
│  │ UF     │  │ UF     │  │ UF     │    │
│  │ Desde  │  │ Desde  │  │ Desde  │    │
│  │ 72/100 │  │ 68/100 │  │ 61/100 │    │  ← factual, no labels
│  └────────┘  └────────┘  └────────┘    │
│                                          │
│  [← Anterior]  Page 2  [Próxima →]      │  ← cursor-based
└──────────────────────────────────────────┘
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/politicos` | 404 | Card grid sorted by score | Users can discover politicians |
| `GET /api/v1/politicians` | 404 | JSON list with cursor | API delivers typed pagination |
| `public_data.politicians` | Empty | Schema defined | Data model ready for ingestion |

---

## Mandatory Reading

**CRITICAL: Read ALL of these before writing a single line of code.**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `CLAUDE.md` | all | Global code standards, TypeScript config, naming, import boundaries |
| P0 | `apps/api/CLAUDE.md` | all | Fastify patterns, repository pattern, TypeBox schemas, error handling |
| P0 | `apps/web/CLAUDE.md` | all | Server Components, ISR, URL-as-state, color neutrality rules |
| P1 | `docs/prd/ER.md` | all | Exact table schemas, column types, index definitions |
| P1 | `docs/prd/ARCHITECTURE.md` | §2, §5, §7 | Stack decisions, ADRs, import boundaries |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| [Fastify 5 Routes](https://fastify.dev/docs/latest/Reference/Routes/) | Route definition | TypeBox integration pattern |
| [Fastify 5 Type Providers](https://fastify.dev/docs/latest/Reference/Type-Providers/) | `FastifyPluginAsyncTypebox` | Typed plugin type for routes |
| [Drizzle Cursor Pagination](https://orm.drizzle.team/docs/guides/cursor-based-pagination) | Composite cursor | `or(lt(), and(eq(), lt()))` pattern |
| [Next.js 15 Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching) | Server Components | `revalidate`, `tags`, caching defaults |
| [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image) | `sizes`, `preload` | `priority` is deprecated in Next.js 16 |

---

## Patterns to Mirror

**NAMING — Repository functions:**
```typescript
// SOURCE: apps/api/CLAUDE.md lines 176-178
// COPY THIS PATTERN:
async function selectPoliticianBySlug(slug: string): Promise<PoliticianRow | null>
async function selectPoliticiansWithScores(filters: QueryFilters): Promise<PoliticianWithScore[]>
```

**NAMING — Service functions:**
```typescript
// SOURCE: apps/api/CLAUDE.md lines 172-173
// COPY THIS PATTERN:
async function findPoliticiansByFilters(filters: PoliticianFilters): Promise<PaginatedResult<Politician>>
```

**NAMING — Types:**
```typescript
// SOURCE: apps/api/CLAUDE.md lines 199-211
// COPY THIS PATTERN:
type PoliticianRow = typeof politicians.$inferSelect           // DB row
type PoliticianInsert = typeof politicians.$inferInsert        // Insert type
interface PoliticianFilters { state?: string; role?: string; cursor?: string; limit: number }
interface PoliticianListResponse { data: PoliticianResponse[]; cursor: string | null }
```

**SAFE ARRAY ACCESS (noUncheckedIndexedAccess is ON):**
```typescript
// SOURCE: apps/api/CLAUDE.md lines 566-573
// COPY THIS PATTERN — never use result[0] directly:
const result = await db.select()...
return result[0] ?? null      // ← correct: ?? null handles undefined
// Also for last element: rows.at(-1) not rows[rows.length - 1]
```

**FASTIFY — Server setup:**
```typescript
// SOURCE: apps/api/CLAUDE.md lines 367-395
// COPY THIS PATTERN:
export function buildApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
  }).withTypeProvider<TypeBoxTypeProvider>()

  app.register(corsPlugin)
  app.register(rateLimitPlugin)
  app.register(helmetPlugin)
  app.register(politicianRoutes, { prefix: '/api/v1' })
  app.setErrorHandler(errorHandler)

  return app
}
```

**FASTIFY — Route with TypeBox:**
```typescript
// SOURCE: apps/api/CLAUDE.md lines 398-471
// COPY THIS PATTERN:
export async function politicianRoutes(app: FastifyInstance): Promise<void> {
  app.get('/politicians', {
    schema: {
      querystring: PoliticianListQuery,
      response: { 200: Type.Object({ data: Type.Array(PoliticianResponseSchema), cursor: Type.Union([Type.String(), Type.Null()]) }) },
    },
  }, async (request, reply) => {
    const result = await politicianService.findByFilters(request.query)
    reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')
    return result
  })
}
```

**DRIZZLE — Schema definition:**
```typescript
// SOURCE: apps/api/CLAUDE.md lines 500-533
// COPY THIS PATTERN:
export const publicData = pgSchema('public_data')

export const politicians = publicData.table('politicians', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: varchar('external_id', { length: 100 }).unique().notNull(),
  source: varchar('source', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  state: varchar('state', { length: 2 }).notNull(),
  party: varchar('party', { length: 50 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  photoUrl: varchar('photo_url', { length: 500 }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

**DRIZZLE — Repository factory (inject db):**
```typescript
// SOURCE: apps/api/CLAUDE.md lines 563-606
// COPY THIS PATTERN:
export function createPoliticianRepository(db: PublicDb) {
  return {
    async selectWithFilters(filters: { cursor?: string; limit: number }) {
      // ... Drizzle query
      return query
    },
  }
}
```

**NEXT.JS — Page with searchParams (Next.js 15 — must await):**
```typescript
// SOURCE: apps/web/CLAUDE.md lines 601-625
// COPY THIS PATTERN — searchParams is a Promise in Next.js 15:
export default async function PoliticianListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams   // ← MUST await in Next.js 15
  const cursor = typeof params.cursor === 'string' ? params.cursor : undefined
  const result = await fetchPoliticians({ cursor })
  return <main>...</main>
}
```

**NEXT.JS — ISR segment config:**
```typescript
// SOURCE: apps/web/CLAUDE.md lines 290-291
// COPY THIS PATTERN at top of page file:
export const revalidate = 3600   // revalidate at most every 1 hour
```

**NEXT.JS — Typed API client:**
```typescript
// SOURCE: apps/web/CLAUDE.md lines 392-449
// COPY THIS PATTERN:
async function apiFetch<T>(path: string, options?: RequestInit & { next?: NextFetchRequestConfig }): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...options?.headers },
  })
  if (!response.ok) {
    const body = await response.json()
    throw new ApiError(response.status, body)
  }
  return response.json() as Promise<T>
}
```

**NEXT.JS — Image with fallback (use `preload` not `priority`):**
```typescript
// SOURCE: apps/web/CLAUDE.md line 792 + research findings
// NOTE: `priority` prop is deprecated in Next.js 16. Use `preload` instead.
// COPY THIS PATTERN:
<Image
  src={photoUrl ?? '/images/politician-placeholder.svg'}
  alt={`Foto de ${name}, ${party}-${state}`}
  fill
  sizes="80px"
  preload={isAboveFold}          // ← NOT priority={true}
  loading={isAboveFold ? 'eager' : 'lazy'}
  style={{ objectFit: 'cover', borderRadius: '50%' }}
/>
```

**NEXT.JS — Grid layout:**
```typescript
// SOURCE: apps/web/CLAUDE.md lines 826-829
// COPY THIS PATTERN:
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {politicians.map((p) => <PoliticianCard key={p.id} politician={p} />)}
</div>
```

**ERROR HANDLING — RFC 7807:**
```typescript
// SOURCE: apps/api/CLAUDE.md lines 280-326
// COPY THIS PATTERN:
export class NotFoundError extends Error {
  constructor(public readonly resource: string, public readonly identifier: string) {
    super(`${resource} '${identifier}' not found`)
    this.name = 'NotFoundError'
  }
}
// Global handler maps to { type, title, status, detail, instance }
```

**TEST STRUCTURE — Vitest:**
```typescript
// SOURCE: apps/api/CLAUDE.md lines 934-978
// COPY THIS PATTERN:
describe('GET /api/v1/politicians', () => {
  it('returns paginated list of active politicians', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians?limit=10' })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(10)
    expect(body.cursor).toBeDefined()
  })
})
```

---

## Files to Change

### Group A: Monorepo Scaffolding

| File | Action | Justification |
|------|--------|---------------|
| `package.json` | CREATE | pnpm workspace root with scripts |
| `pnpm-workspace.yaml` | CREATE | Declares `packages/*` and `apps/*` workspaces |
| `turbo.json` | CREATE | Build pipeline orchestration |
| `tsconfig.base.json` | CREATE | Shared strict TypeScript config |
| `.prettierrc` | CREATE | Formatting rules (specified in CLAUDE.md) |
| `.eslintrc.cjs` | CREATE | Import boundaries + TypeScript strict rules |
| `docker-compose.yml` | CREATE | PostgreSQL 16 + API + Pipeline services |
| `infrastructure/init-schemas.sql` | CREATE | Create schemas, roles, and permissions |
| `.env.example` | CREATE | Document all required env vars |

### Group B: Database Package

| File | Action | Justification |
|------|--------|---------------|
| `packages/db/package.json` | CREATE | drizzle-orm, postgres driver |
| `packages/db/tsconfig.json` | CREATE | Extends base, paths for exports |
| `packages/db/drizzle.config.ts` | CREATE | Migration configuration |
| `packages/db/src/public-schema.ts` | CREATE | politicians + integrity_scores tables |
| `packages/db/src/internal-schema.ts` | CREATE | Stub (required for clients.ts) |
| `packages/db/src/clients.ts` | CREATE | createPublicDb + createPipelineDb factories |
| `packages/db/migrations/public/0001_initial.sql` | CREATE | Create public_data schema and all tables |

### Group C: Shared Package

| File | Action | Justification |
|------|--------|---------------|
| `packages/shared/package.json` | CREATE | Zero external deps |
| `packages/shared/tsconfig.json` | CREATE | Extends base |
| `packages/shared/src/types/politician.ts` | CREATE | PoliticianCard, ListPoliticiansResponse, PoliticianFilters |
| `packages/shared/src/index.ts` | CREATE | Named exports (no barrel re-export of dirs) |

### Group D: API App

| File | Action | Justification |
|------|--------|---------------|
| `apps/api/package.json` | CREATE | fastify, typebox, drizzle, vitest |
| `apps/api/tsconfig.json` | CREATE | Extends base, path to packages |
| `apps/api/vitest.config.ts` | CREATE | Test runner config |
| `apps/api/src/config/env.ts` | CREATE | Zod-validated env vars, fail-fast |
| `apps/api/src/schemas/common.schema.ts` | CREATE | CursorPagination, ProblemDetail TypeBox schemas |
| `apps/api/src/schemas/politician.schema.ts` | CREATE | PoliticianListQuery, PoliticianCardSchema TypeBox |
| `apps/api/src/repositories/politician.repository.ts` | CREATE | selectWithFilters (cursor pagination) |
| `apps/api/src/services/politician.service.ts` | CREATE | findByFilters (cursor encode/decode) |
| `apps/api/src/routes/politicians.route.ts` | CREATE | GET /politicians route |
| `apps/api/src/routes/health.route.ts` | CREATE | GET /health |
| `apps/api/src/hooks/error-handler.ts` | CREATE | RFC 7807 error mapping |
| `apps/api/src/plugins/cors.plugin.ts` | CREATE | CORS config |
| `apps/api/src/plugins/rate-limit.plugin.ts` | CREATE | 60 req/min |
| `apps/api/src/plugins/helmet.plugin.ts` | CREATE | Security headers |
| `apps/api/src/app.ts` | CREATE | Fastify app factory (used in tests) |
| `apps/api/src/server.ts` | CREATE | Entry point: buildApp + listen |
| `apps/api/src/routes/politicians.route.integration.test.ts` | CREATE | Integration test with Testcontainers |

### Group E: Web App

| File | Action | Justification |
|------|--------|---------------|
| `apps/web/package.json` | CREATE | next, react, tailwindcss, vitest, playwright |
| `apps/web/tsconfig.json` | CREATE | Extends base |
| `apps/web/next.config.ts` | CREATE | remotePatterns for Camara/Senado photo CDNs |
| `apps/web/tailwind.config.ts` | CREATE | Content paths for Tailwind purge |
| `apps/web/src/styles/globals.css` | CREATE | Tailwind directives + neutral color palette |
| `apps/web/src/lib/api-types.ts` | CREATE | TypeScript types mirroring API response shapes |
| `apps/web/src/lib/api-client.ts` | CREATE | apiFetch wrapper + fetchPoliticians function |
| `apps/web/src/app/layout.tsx` | CREATE | Root layout with `<html lang="pt-BR">` |
| `apps/web/src/app/politicos/page.tsx` | CREATE | ISR listing page (Server Component) |
| `apps/web/src/app/politicos/loading.tsx` | CREATE | Skeleton matching card grid layout |
| `apps/web/src/components/politician/politician-card.tsx` | CREATE | Card with 6 fields + photo fallback |
| `apps/web/src/components/politician/score-badge.tsx` | CREATE | Neutral "72/100" display |
| `apps/web/src/components/politician/politician-card.test.tsx` | CREATE | Vitest + RTL unit tests |
| `apps/web/e2e/politician-listing.spec.ts` | CREATE | Playwright E2E: listing, pagination, card fields |

---

## NOT Building (Scope Limits)

- **Role filter (RF-002)** — Phase 2; `role` param skeleton in schema but no UI
- **State filter (RF-003)** — Phase 3; same
- **Name search (RF-015)** — Phase 4; tsvector query deferred
- **Politician profile page (RF-007)** — separate PRP
- **Data ingestion pipeline** — separate PRP; use seed data for dev/testing
- **Infinite scroll** — deliberate; cursor pagination is canonical
- **Score methodology page** — separate PRP
- **Authentication** — no auth in MVP
- **`apps/pipeline/`** — separate PRP; scaffolding not needed here

---

## Step-by-Step Tasks

Execute **strictly in order**. Validate after each task with `pnpm typecheck` before moving to the next.

---

### Task 1: CREATE monorepo root files

**ACTION:** Create the 5 root files that make the pnpm workspace functional.

**`package.json`:**
```json
{
  "name": "political-authority-highlighter",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "prettier": "^3.2.0"
  }
}
```

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**`turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "persistent": true, "cache": false },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] },
    "test:e2e": { "dependsOn": ["^build"] }
  }
}
```

**`tsconfig.base.json`:** Copy exactly from CLAUDE.md lines 122-143.

**`.prettierrc`:** Copy exactly from CLAUDE.md lines 158-164.

**VALIDATE:** `ls package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .prettierrc`

---

### Task 2: CREATE `.eslintrc.cjs`

**ACTION:** Import boundary enforcement is critical for security (prevents API importing internal-schema).

```javascript
// .eslintrc.cjs
'use strict'

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: true },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    // Import boundary rules — critical for ADR-001
    'import/no-restricted-paths': ['error', {
      zones: [
        // web cannot import db or apps
        { target: './apps/web', from: './packages/db' },
        { target: './apps/web', from: './apps/api' },
        { target: './apps/web', from: './apps/pipeline' },
        // api cannot import internal schema or pipeline
        { target: './apps/api', from: './packages/db/src/internal-schema.ts' },
        { target: './apps/api', from: './apps/pipeline' },
        // shared has zero deps
        { target: './packages/shared', from: './packages/db' },
        { target: './packages/shared', from: './apps' },
      ],
    }],
  },
  ignorePatterns: ['node_modules', '.next', 'dist', 'migrations'],
}
```

**VALIDATE:** `pnpm add -D -w eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-import` then `pnpm lint`

---

### Task 3: CREATE `infrastructure/init-schemas.sql`

**ACTION:** PostgreSQL schema + role initialization run by Docker at container creation.

**IMPLEMENT:**
```sql
-- Create schemas
CREATE SCHEMA IF NOT EXISTS public_data;
CREATE SCHEMA IF NOT EXISTS internal_data;

-- Create roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'api_reader') THEN
    CREATE ROLE api_reader;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pipeline_admin') THEN
    CREATE ROLE pipeline_admin;
  END IF;
END $$;

-- api_reader: SELECT only on public_data, ZERO access to internal_data
GRANT USAGE ON SCHEMA public_data TO api_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public_data TO api_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public_data GRANT SELECT ON TABLES TO api_reader;
-- Explicitly: no GRANT on internal_data (omission is the security boundary)

-- pipeline_admin: full access to both schemas
GRANT ALL ON SCHEMA public_data TO pipeline_admin;
GRANT ALL ON SCHEMA internal_data TO pipeline_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public_data TO pipeline_admin;
GRANT ALL ON ALL TABLES IN SCHEMA internal_data TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public_data GRANT ALL ON TABLES TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA internal_data GRANT ALL ON TABLES TO pipeline_admin;

-- Create application users (passwords from env in production)
CREATE USER api_reader_user WITH PASSWORD 'reader_password_change_in_prod';
CREATE USER pipeline_admin_user WITH PASSWORD 'admin_password_change_in_prod';
GRANT api_reader TO api_reader_user;
GRANT pipeline_admin TO pipeline_admin_user;
```

**VALIDATE:** `docker compose up -d postgres && docker compose exec postgres psql -U postgres -c '\dn'` → shows public_data and internal_data schemas

---

### Task 4: CREATE `docker-compose.yml`

**ACTION:** Local development environment with PostgreSQL 16.

**IMPLEMENT:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: authority_highlighter
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_dev_password
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./infrastructure/init-schemas.sql:/docker-entrypoint-initdb.d/01-schemas.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

**VALIDATE:** `docker compose up -d && docker compose ps` → postgres is healthy

---

### Task 5: CREATE `packages/shared` package

**ACTION:** Domain types with zero external dependencies.

**`packages/shared/package.json`:**
```json
{
  "name": "@pah/shared",
  "version": "0.0.1",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  }
}
```

**`packages/shared/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

**`packages/shared/src/types/politician.ts`:**
```typescript
/**
 * Summary representation of a politician as displayed on the listing page (RF-001).
 * Contains only public_data fields — no internal data, no CPF, no exclusion details.
 */
export interface PoliticianCard {
  id: string
  slug: string
  name: string
  party: string
  state: string
  role: 'deputado' | 'senador'
  photoUrl: string | null
  tenureStartDate: string | null   // ISO date string; null if not available
  overallScore: number             // 0-100 integer
}

/**
 * Filters for the politician listing API (RF-001, RF-002, RF-003, RF-015).
 * All fields are optional to support progressive filter addition.
 */
export interface PoliticianFilters {
  cursor?: string
  limit?: number
  role?: 'deputado' | 'senador'
  state?: string
  search?: string
}

/**
 * Paginated response for the politician listing endpoint.
 * cursor is null when no more pages exist.
 */
export interface ListPoliticiansResponse {
  data: PoliticianCard[]
  cursor: string | null
}
```

**`packages/shared/src/index.ts`:**
```typescript
export type { PoliticianCard, PoliticianFilters, ListPoliticiansResponse } from './types/politician.js'
```

**GOTCHA:** `.js` extension required in ESM imports even for TypeScript files when `moduleResolution: "bundler"` — but check if the project uses bundler or Node16. With `"moduleResolution": "bundler"` in tsconfig.base.json, TypeScript handles this. Use bare imports without extension inside the package.

**VALIDATE:** `cd packages/shared && pnpm typecheck`

---

### Task 6: CREATE `packages/db` — Schema

**ACTION:** Drizzle ORM schema for `public_data` PostgreSQL schema.

**`packages/db/package.json`:**
```json
{
  "name": "@pah/db",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    "./public-schema": "./src/public-schema.ts",
    "./internal-schema": "./src/internal-schema.ts",
    "./clients": "./src/clients.ts",
    "./migrate": "./src/migrate.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@pah/shared": "workspace:*",
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.27.0",
    "typescript": "^5.4.0"
  }
}
```

**`packages/db/src/public-schema.ts`:**
```typescript
import {
  pgSchema,
  uuid,
  varchar,
  boolean,
  smallint,
  timestamp,
  text,
  date,
  index,
} from 'drizzle-orm/pg-core'

export const publicData = pgSchema('public_data')

/**
 * Central entity: a Brazilian federal legislator (deputado or senador).
 * All fields are publicly available government data (LAI compliant).
 * No CPF, no exclusion details — see internal-schema.ts for sensitive data.
 */
export const politicians = publicData.table(
  'politicians',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalId: varchar('external_id', { length: 100 }).unique().notNull(),
    source: varchar('source', { length: 20 }).notNull(),    // 'camara' | 'senado'
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    state: varchar('state', { length: 2 }).notNull(),       // UF abbreviation
    party: varchar('party', { length: 50 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(),        // 'deputado' | 'senador'
    photoUrl: varchar('photo_url', { length: 500 }),        // nullable — fallback shown in UI
    active: boolean('active').notNull().default(true),
    bioSummary: text('bio_summary'),
    // RF-001 AC #1: tenure start date for card display
    // Added vs ER.md v1.0 — populated from Camara dataPosse / Senado dataInicioAtividade
    tenureStartDate: date('tenure_start_date'),
    // DR-001: Silent exclusion — only boolean crosses schema boundary
    exclusionFlag: boolean('exclusion_flag').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_politicians_slug').on(table.slug),
    index('idx_politicians_state').on(table.state),
    index('idx_politicians_party').on(table.party),
    index('idx_politicians_role').on(table.role),
    index('idx_politicians_active').on(table.active),
  ],
)

/**
 * Pre-computed integrity scores per politician.
 * Versioned by methodology_version to support algorithm evolution.
 * All scores are computed by the pipeline — never by the API.
 */
export const integrityScores = publicData.table(
  'integrity_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    overallScore: smallint('overall_score').notNull(),         // 0-100
    transparencyScore: smallint('transparency_score').notNull(), // 0-25
    legislativeScore: smallint('legislative_score').notNull(),   // 0-25
    financialScore: smallint('financial_score').notNull(),       // 0-25
    anticorruptionScore: smallint('anticorruption_score').notNull(), // 0 or 25 (binary, DR-001)
    exclusionFlag: boolean('exclusion_flag').notNull().default(false),
    methodologyVersion: varchar('methodology_version', { length: 20 }).notNull(),
    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_scores_politician').on(table.politicianId),
    // Composite DESC index for stable cursor pagination (RF-001 AC #4)
    index('idx_scores_overall_desc').on(table.overallScore, table.politicianId),
  ],
)
```

**`packages/db/src/internal-schema.ts`:**
```typescript
// Stub for Phase 1 — full internal schema implemented in pipeline PRP
import { pgSchema } from 'drizzle-orm/pg-core'

export const internalData = pgSchema('internal_data')
// Tables defined when pipeline is implemented
```

**VALIDATE:** `cd packages/db && pnpm typecheck`

---

### Task 7: CREATE `packages/db/src/clients.ts`

**ACTION:** Two separate database clients enforcing the `api_reader` / `pipeline_admin` role split.

```typescript
// packages/db/src/clients.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as publicSchema from './public-schema.js'
import * as internalSchema from './internal-schema.js'

/**
 * Public database client — connects with api_reader role (SELECT only on public_data).
 * Used by apps/api exclusively.
 */
export function createPublicDb(connectionString: string) {
  const client = postgres(connectionString)
  return drizzle(client, { schema: publicSchema })
}

export type PublicDb = ReturnType<typeof createPublicDb>

/**
 * Pipeline database client — connects with pipeline_admin role (ALL on both schemas).
 * Used by apps/pipeline exclusively.
 */
export function createPipelineDb(connectionString: string) {
  const client = postgres(connectionString)
  return drizzle(client, { schema: { ...publicSchema, ...internalSchema } })
}

export type PipelineDb = ReturnType<typeof createPipelineDb>
```

**VALIDATE:** `cd packages/db && pnpm typecheck`

---

### Task 8: CREATE `packages/db/migrations/public/0001_initial.sql`

**ACTION:** Migration SQL for `public_data` schema tables needed for Phase 1.

**IMPLEMENT:**
```sql
-- 0001_initial.sql — public_data schema: politicians + integrity_scores

CREATE TABLE IF NOT EXISTS public_data.politicians (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     VARCHAR(100) NOT NULL UNIQUE,
  source          VARCHAR(20) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL UNIQUE,
  state           VARCHAR(2) NOT NULL,
  party           VARCHAR(50) NOT NULL,
  role            VARCHAR(20) NOT NULL,
  photo_url       VARCHAR(500),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  bio_summary     TEXT,
  tenure_start_date DATE,
  exclusion_flag  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_data.integrity_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id         UUID NOT NULL REFERENCES public_data.politicians(id),
  overall_score         SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  transparency_score    SMALLINT NOT NULL CHECK (transparency_score BETWEEN 0 AND 25),
  legislative_score     SMALLINT NOT NULL CHECK (legislative_score BETWEEN 0 AND 25),
  financial_score       SMALLINT NOT NULL CHECK (financial_score BETWEEN 0 AND 25),
  anticorruption_score  SMALLINT NOT NULL CHECK (anticorruption_score IN (0, 25)),
  exclusion_flag        BOOLEAN NOT NULL DEFAULT FALSE,
  methodology_version   VARCHAR(20) NOT NULL,
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for listing and cursor pagination
CREATE INDEX IF NOT EXISTS idx_politicians_slug   ON public_data.politicians(slug);
CREATE INDEX IF NOT EXISTS idx_politicians_state  ON public_data.politicians(state);
CREATE INDEX IF NOT EXISTS idx_politicians_role   ON public_data.politicians(role);
CREATE INDEX IF NOT EXISTS idx_politicians_active ON public_data.politicians(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_scores_politician  ON public_data.integrity_scores(politician_id);
-- Composite index for stable DESC cursor pagination (overallScore DESC, politicianId DESC)
CREATE INDEX IF NOT EXISTS idx_scores_overall_cursor
  ON public_data.integrity_scores(overall_score DESC, politician_id DESC);
```

**GOTCHA:** PostgreSQL `gen_random_uuid()` requires PostgreSQL 13+. The stack uses PostgreSQL 16 — confirmed safe.

**VALIDATE:** `docker compose exec postgres psql -U postgres authority_highlighter -f /dev/stdin < packages/db/migrations/public/0001_initial.sql`

---

### Task 9: CREATE `apps/api` scaffolding

**ACTION:** package.json, tsconfig, vitest config, and env validation.

**`apps/api/package.json`:**
```json
{
  "name": "@pah/api",
  "version": "0.0.1",
  "type": "module",
  "main": "src/server.ts",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.0",
    "@fastify/helmet": "^12.0.0",
    "@fastify/rate-limit": "^9.0.0",
    "@fastify/swagger": "^8.0.0",
    "@fastify/type-provider-typebox": "^4.0.0",
    "@pah/db": "workspace:*",
    "@pah/shared": "workspace:*",
    "@sinclair/typebox": "^0.32.0",
    "fastify": "^5.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@testcontainers/postgresql": "^10.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

**`apps/api/src/config/env.ts`:**
```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL_READER: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
})

/**
 * Validated environment variables — fails fast at startup if missing.
 * All API config comes from here. Never read process.env directly elsewhere.
 */
export const env = envSchema.parse(process.env)
```

**GOTCHA:** `zod` is used for env validation in the API (per CLAUDE.md). TypeBox is for request/response schemas. Do not mix them.

**VALIDATE:** `cd apps/api && pnpm typecheck`

---

### Task 10: CREATE API TypeBox schemas

**ACTION:** TypeBox schemas for request validation and response serialization.

**`apps/api/src/schemas/common.schema.ts`:**
```typescript
import { Type } from '@sinclair/typebox'

/** RFC 7807 Problem Details schema */
export const ProblemDetailSchema = Type.Object({
  type: Type.String(),
  title: Type.String(),
  status: Type.Integer(),
  detail: Type.String(),
  instance: Type.String(),
})

/** Cursor pagination response metadata */
export const CursorPaginationSchema = Type.Object({
  cursor: Type.Union([Type.String(), Type.Null()]),
})
```

**`apps/api/src/schemas/politician.schema.ts`:**
```typescript
import { Type, type Static } from '@sinclair/typebox'

/**
 * Query parameters for GET /api/v1/politicians.
 * Phase 1: cursor + limit only. role, state, search added in Phases 2-4.
 */
export const PoliticianListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
  cursor: Type.Optional(Type.String({ description: 'Opaque base64url cursor from previous response' })),
  // Phase 2: role
  role: Type.Optional(Type.Union([Type.Literal('deputado'), Type.Literal('senador')])),
  // Phase 3: state
  state: Type.Optional(Type.String({ minLength: 2, maxLength: 2 })),
})

export type PoliticianListQuery = Static<typeof PoliticianListQuerySchema>

/**
 * Single politician card in list response.
 * DR-001: exclusion_flag is NOT in this schema — only shown on profile page (RF-007).
 * DR-002: No qualitative labels, only raw data.
 */
export const PoliticianCardSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  slug: Type.String(),
  name: Type.String(),
  party: Type.String(),
  state: Type.String(),
  role: Type.String(),
  photoUrl: Type.Union([Type.String(), Type.Null()]),
  tenureStartDate: Type.Union([Type.String(), Type.Null()]),
  overallScore: Type.Integer({ minimum: 0, maximum: 100 }),
})

export type PoliticianCardDto = Static<typeof PoliticianCardSchema>

export const PoliticianListResponseSchema = Type.Object({
  data: Type.Array(PoliticianCardSchema),
  cursor: Type.Union([Type.String(), Type.Null()]),
})
```

**VALIDATE:** `cd apps/api && pnpm typecheck`

---

### Task 11: CREATE `apps/api/src/repositories/politician.repository.ts`

**ACTION:** Database queries for the listing endpoint. Repository pattern — no Drizzle in routes/services.

**MIRROR:** `apps/api/CLAUDE.md` lines 563-606 (repository factory pattern)

```typescript
import { eq, and, desc, lt, or } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { politicians, integrityScores } from '@pah/db/public-schema'

export interface ListFilters {
  limit: number
  cursor?: { overallScore: number; politicianId: string } | undefined
  role?: string | undefined
  state?: string | undefined
}

export interface PoliticianWithScore {
  id: string
  slug: string
  name: string
  party: string
  state: string
  role: string
  photoUrl: string | null
  tenureStartDate: string | null
  overallScore: number
}

/**
 * Repository for public_data.politicians queries.
 * All Drizzle access is isolated here — never inline queries in services or routes.
 */
export function createPoliticianRepository(db: PublicDb) {
  return {
    /**
     * Paginated listing of active politicians, sorted by overall_score DESC.
     * Uses composite cursor (overallScore, politicianId) for stable keyset pagination.
     * Fetches limit+1 rows to determine if a next page exists.
     */
    async selectWithFilters(filters: ListFilters): Promise<PoliticianWithScore[]> {
      const conditions = [eq(politicians.active, true)]

      if (filters.role !== undefined) {
        conditions.push(eq(politicians.role, filters.role))
      }
      if (filters.state !== undefined) {
        conditions.push(eq(politicians.state, filters.state))
      }
      if (filters.cursor !== undefined) {
        const { overallScore, politicianId } = filters.cursor
        // Composite cursor: (score < cursorScore) OR (score = cursorScore AND id < cursorId)
        // This is the correct decomposition of (score, id) < (cursorScore, cursorId) DESC
        conditions.push(
          or(
            lt(integrityScores.overallScore, overallScore),
            and(
              eq(integrityScores.overallScore, overallScore),
              lt(politicians.id, politicianId),
            ),
          ),
        )
      }

      const rows = await db
        .select({
          id: politicians.id,
          slug: politicians.slug,
          name: politicians.name,
          party: politicians.party,
          state: politicians.state,
          role: politicians.role,
          photoUrl: politicians.photoUrl,
          tenureStartDate: politicians.tenureStartDate,
          overallScore: integrityScores.overallScore,
        })
        .from(politicians)
        .innerJoin(integrityScores, eq(politicians.id, integrityScores.politicianId))
        .where(and(...conditions))
        .orderBy(desc(integrityScores.overallScore), desc(politicians.id))
        .limit(filters.limit + 1) // +1 to detect hasMore

      return rows.map((row) => ({
        ...row,
        photoUrl: row.photoUrl ?? null,
        tenureStartDate: row.tenureStartDate ?? null,
        overallScore: Number(row.overallScore),
      }))
    },
  }
}

export type PoliticianRepository = ReturnType<typeof createPoliticianRepository>
```

**GOTCHA:** `and(...conditions)` requires at least one condition. `eq(politicians.active, true)` always provides the first condition — safe.

**GOTCHA:** `overallScore` is `smallint` in PostgreSQL. Drizzle may return it as a string in some drivers. Use `Number(row.overallScore)` to normalize.

**VALIDATE:** `cd apps/api && pnpm typecheck`

---

### Task 12: CREATE `apps/api/src/services/politician.service.ts`

**ACTION:** Business logic — cursor encode/decode, pagination result building.

**MIRROR:** `apps/api/CLAUDE.md` lines 247-265 (small single-purpose functions, explicit return types)

```typescript
import type { PoliticianRepository, PoliticianWithScore } from '../repositories/politician.repository.js'
import type { PoliticianCardDto } from '../schemas/politician.schema.js'

interface Cursor {
  overallScore: number
  politicianId: string
}

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

function toPoliticianCardDto(row: PoliticianWithScore): PoliticianCardDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    party: row.party,
    state: row.state,
    role: row.role,
    photoUrl: row.photoUrl,
    tenureStartDate: row.tenureStartDate,
    overallScore: row.overallScore,
  }
}

export interface FindByFiltersInput {
  limit: number
  cursor?: string | undefined
  role?: string | undefined
  state?: string | undefined
}

export interface FindByFiltersResult {
  data: PoliticianCardDto[]
  cursor: string | null
}

/**
 * Finds politicians by filters with cursor-based pagination.
 * Returns limit politicians + a cursor string if more exist.
 */
export function createPoliticianService(repository: PoliticianRepository) {
  return {
    async findByFilters(input: FindByFiltersInput): Promise<FindByFiltersResult> {
      const decodedCursor = input.cursor !== undefined ? decodeCursor(input.cursor) : undefined

      const rows = await repository.selectWithFilters({
        limit: input.limit,
        cursor: decodedCursor,
        role: input.role,
        state: input.state,
      })

      const hasMore = rows.length > input.limit
      const data = hasMore ? rows.slice(0, input.limit) : rows

      const lastRow = data.at(-1)  // safe: .at(-1) handles noUncheckedIndexedAccess
      const nextCursor =
        hasMore && lastRow !== undefined
          ? encodeCursor({ overallScore: lastRow.overallScore, politicianId: lastRow.id })
          : null

      return { data: data.map(toPoliticianCardDto), cursor: nextCursor }
    },
  }
}

export type PoliticianService = ReturnType<typeof createPoliticianService>
```

**VALIDATE:** `cd apps/api && pnpm typecheck`

---

### Task 13: CREATE `apps/api/src/routes/politicians.route.ts`

**ACTION:** Fastify route handler — delegates to service, sets Cache-Control.

**MIRROR:** `apps/api/CLAUDE.md` lines 438-471 (route pattern with TypeBox)

```typescript
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { PoliticianListQuerySchema, PoliticianListResponseSchema } from '../schemas/politician.schema.js'
import type { PoliticianService } from '../services/politician.service.js'

interface RouteDeps {
  politicianService: PoliticianService
}

/**
 * GET /politicians — paginated politician listing sorted by integrity score DESC.
 * Cache-Control: public, max-age=300, s-maxage=3600 for Cloudflare CDN.
 */
export function createPoliticiansRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  return async (app) => {
    app.get(
      '/politicians',
      {
        schema: {
          querystring: PoliticianListQuerySchema,
          response: { 200: PoliticianListResponseSchema },
        },
      },
      async (request, reply) => {
        const { limit = 20, cursor, role, state } = request.query

        const result = await deps.politicianService.findByFilters({
          limit,
          cursor,
          role,
          state,
        })

        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')

        return result
      },
    )
  }
}
```

**VALIDATE:** `cd apps/api && pnpm typecheck`

---

### Task 14: CREATE `apps/api/src/hooks/error-handler.ts` and `app.ts`

**ACTION:** Global error handler + Fastify app factory.

**`apps/api/src/hooks/error-handler.ts`:** Copy RFC 7807 pattern from `apps/api/CLAUDE.md` lines 280-326 exactly.

**`apps/api/src/app.ts`:**
```typescript
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { createPublicDb } from '@pah/db/clients'
import { createPoliticianRepository } from './repositories/politician.repository.js'
import { createPoliticianService } from './services/politician.service.js'
import { createPoliticiansRoute } from './routes/politicians.route.js'
import { errorHandler } from './hooks/error-handler.js'
import { env } from './config/env.js'

export function buildApp(): ReturnType<typeof Fastify> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  }).withTypeProvider<TypeBoxTypeProvider>()

  // Plugins
  void app.register(cors, { origin: ['https://autoridade-politica.com.br', 'http://localhost:3000'] })
  void app.register(helmet)
  void app.register(rateLimit, { max: 60, timeWindow: '1 minute' })

  // Dependency injection
  const db = createPublicDb(env.DATABASE_URL_READER)
  const politicianRepository = createPoliticianRepository(db)
  const politicianService = createPoliticianService(politicianRepository)

  // Routes
  void app.register(createPoliticiansRoute({ politicianService }), { prefix: '/api/v1' })

  // Health check (no prefix)
  void app.get('/health', { schema: { response: { 200: { type: 'object', properties: { status: { type: 'string' } } } } } },
    async () => ({ status: 'ok' }),
  )

  app.setErrorHandler(errorHandler)

  return app
}
```

**`apps/api/src/server.ts`:**
```typescript
import { buildApp } from './app.js'
import { env } from './config/env.js'

const app = buildApp()

try {
  await app.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
```

**VALIDATE:** `cd apps/api && pnpm typecheck`

---

### Task 15: CREATE API integration test

**ACTION:** Integration test using `app.inject()` — no Testcontainers for Phase 1 (seed data sufficient).

**`apps/api/src/routes/politicians.route.integration.test.ts`:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'

// Phase 1: tests run against a seeded local PostgreSQL
// Full Testcontainers setup added in CI task

describe('GET /api/v1/politicians', () => {
  const app = buildApp()

  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 with data array and cursor field', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians' })
    expect(response.statusCode).toBe(200)
    const body = response.json<{ data: unknown[]; cursor: string | null }>()
    expect(Array.isArray(body.data)).toBe(true)
    expect('cursor' in body).toBe(true)
  })

  it('respects limit query param', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians?limit=5' })
    expect(response.statusCode).toBe(200)
    const body = response.json<{ data: unknown[] }>()
    expect(body.data.length).toBeLessThanOrEqual(5)
  })

  it('returns 400 for invalid limit', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians?limit=0' })
    expect(response.statusCode).toBe(400)
  })

  it('returns 400 for limit over maximum', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians?limit=100' })
    expect(response.statusCode).toBe(400)
  })

  it('each item has required card fields', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians?limit=1' })
    const body = response.json<{ data: Array<Record<string, unknown>> }>()
    if (body.data.length > 0) {
      const item = body.data[0]
      expect(item).toBeDefined()
      if (item !== undefined) {
        expect(typeof item['id']).toBe('string')
        expect(typeof item['slug']).toBe('string')
        expect(typeof item['name']).toBe('string')
        expect(typeof item['party']).toBe('string')
        expect(typeof item['state']).toBe('string')
        expect(typeof item['overallScore']).toBe('number')
      }
    }
  })

  it('sets Cache-Control header', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians' })
    expect(response.headers['cache-control']).toBe('public, max-age=300, s-maxage=3600')
  })

  it('/health returns ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json<{ status: string }>().status).toBe('ok')
  })
})
```

**VALIDATE:** `cd apps/api && pnpm test`

---

### Task 16: CREATE `apps/web` scaffolding

**ACTION:** Next.js 15 app scaffolding with ISR, Tailwind, and API client.

**`apps/web/package.json`:**
```json
{
  "name": "@pah/web",
  "version": "0.0.1",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@pah/shared": "workspace:*",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.3.0",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.9.0",
    "@playwright/test": "^1.44.0",
    "@testing-library/react": "^16.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

**`apps/web/next.config.ts`:**
```typescript
import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    remotePatterns: [
      // Camara dos Deputados official photo CDN
      new URL('https://www.camara.leg.br/internet/deputado/bandep/**'),
      // Senado Federal official photo CDN
      new URL('https://www.senado.leg.br/senadores/img/fotos-oficiais/**'),
    ],
  },
  // Security headers (DR-002, DR-006)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default config
```

**`apps/web/src/styles/globals.css`:** Copy neutral palette from `apps/web/CLAUDE.md` lines 468-483.

**VALIDATE:** `cd apps/web && pnpm typecheck`

---

### Task 17: CREATE `apps/web/src/lib/api-client.ts` and `api-types.ts`

**ACTION:** Typed API client mirroring `apps/web/CLAUDE.md` lines 392-449 exactly.

**`apps/web/src/lib/api-types.ts`:**
```typescript
import type { PoliticianCard, ListPoliticiansResponse, PoliticianFilters } from '@pah/shared'

// Re-export from shared to avoid importing shared types directly in components
export type { PoliticianCard, ListPoliticiansResponse, PoliticianFilters }

export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail: string
  instance: string
}
```

**`apps/web/src/lib/api-client.ts`:** Copy exactly from `apps/web/CLAUDE.md` lines 392-449. Update `apiFetch` to use `{ next: { revalidate: 300, tags: ['politicians'] } }`.

**VALIDATE:** `cd apps/web && pnpm typecheck`

---

### Task 18: CREATE `apps/web/src/app/layout.tsx`

**ACTION:** Root layout — `lang="pt-BR"`, Tailwind globals, metadata.

```typescript
import type { Metadata } from 'next'
import './styles/globals.css'

export const metadata: Metadata = {
  title: 'Autoridade Política — Transparência Política no Brasil',
  description: 'Dados públicos de integridade de deputados federais e senadores brasileiros.',
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
```

**VALIDATE:** `cd apps/web && pnpm typecheck`

---

### Task 19: CREATE `apps/web/src/components/politician/politician-card.tsx`

**ACTION:** Server Component card displaying 6 required fields. No `'use client'`.

**MIRROR:** `apps/web/CLAUDE.md` naming conventions + accessibility patterns.

```typescript
import Image from 'next/image'
import Link from 'next/link'
import type { PoliticianCard } from '@pah/shared'

interface PoliticianCardProps {
  politician: PoliticianCard
  /** True for first N cards visible without scroll — enables preload (prevents LCP regression) */
  isAboveFold?: boolean
}

/**
 * Card component for the politician listing page (RF-001).
 * Server Component — no client-side JavaScript.
 * DR-002: no qualitative labels, no party colors.
 * WCAG 2.1 AA: semantic <article>, descriptive alt text, keyboard navigable via <a>.
 */
export function PoliticianCard({
  politician,
  isAboveFold = false,
}: PoliticianCardProps): React.JSX.Element {
  const { slug, name, party, state, role, photoUrl, tenureStartDate, overallScore } = politician

  const roleLabel = role === 'deputado' ? 'Deputado Federal' : 'Senadora Federal'
  const tenureDisplay = tenureStartDate
    ? new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: 'short' }).format(new Date(tenureStartDate))
    : '—'

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/politicos/${slug}`} className="block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
        <div className="flex items-start gap-3">
          {/* Photo — 60x60 with SVG placeholder fallback */}
          <div className="relative h-15 w-15 shrink-0 overflow-hidden rounded-full bg-muted">
            <Image
              src={photoUrl ?? '/images/politician-placeholder.svg'}
              alt={`Foto de ${name}, ${party}-${state}`}
              fill
              sizes="60px"
              // NOTE: `priority` deprecated in Next.js 16 — use `preload` instead
              preload={isAboveFold}
              loading={isAboveFold ? 'eager' : 'lazy'}
              style={{ objectFit: 'cover' }}
            />
          </div>

          <div className="min-w-0 flex-1">
            {/* Name */}
            <h2 className="truncate text-sm font-semibold text-foreground">{name}</h2>

            {/* Party + State badges — neutral gray, no party colors (DR-002) */}
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {party}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {state}
              </span>
            </div>

            {/* Role + Tenure start */}
            <p className="mt-1 text-xs text-muted-foreground">
              {roleLabel} · Desde {tenureDisplay}
            </p>
          </div>
        </div>

        {/* Score — factual numeric display, no qualitative label (DR-002) */}
        <div
          className="mt-3 flex items-center justify-between"
          aria-label={`Pontuação de integridade: ${overallScore} de 100`}
        >
          <span className="text-xs text-muted-foreground">Pontuação de integridade</span>
          <span className="tabular-nums text-sm font-semibold text-primary">
            {overallScore}/100
          </span>
        </div>
      </Link>
    </article>
  )
}
```

**GOTCHA:** The SVG placeholder `/images/politician-placeholder.svg` must exist in `apps/web/public/images/`. Create a simple neutral gray silhouette SVG.

**VALIDATE:** `cd apps/web && pnpm typecheck`

---

### Task 20: CREATE `/public/images/politician-placeholder.svg`

**ACTION:** Neutral gray silhouette for politicians without photos.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none">
  <rect width="60" height="60" rx="30" fill="#E5E7EB"/>
  <circle cx="30" cy="22" r="10" fill="#9CA3AF"/>
  <path d="M10 50c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="#9CA3AF"/>
</svg>
```

**VALIDATE:** File exists at `apps/web/public/images/politician-placeholder.svg`

---

### Task 21: CREATE `apps/web/src/app/politicos/page.tsx` and `loading.tsx`

**ACTION:** ISR Server Component listing page with cursor pagination.

**`apps/web/src/app/politicos/page.tsx`:**
```typescript
// ISR: revalidate every 1 hour (same cadence as API cache s-maxage)
export const revalidate = 3600

import { fetchPoliticians } from '../../lib/api-client.js'
import { PoliticianCard } from '../../components/politician/politician-card.js'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Políticos — Autoridade Política',
  description: 'Lista de deputados federais e senadores brasileiros ordenados por pontuação de integridade.',
  alternates: { canonical: 'https://autoridade-politica.com.br/politicos' },
}

interface Props {
  // searchParams is a Promise in Next.js 15 — MUST be awaited
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PoliticosPage({ searchParams }: Props): Promise<React.JSX.Element> {
  const params = await searchParams
  const cursor = typeof params['cursor'] === 'string' ? params['cursor'] : undefined

  const result = await fetchPoliticians({ cursor })

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Políticos</h1>

      {/* Politician grid — 1 col mobile, 2 tablet, 3 desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.map((politician, index) => (
          <PoliticianCard
            key={politician.id}
            politician={politician}
            isAboveFold={index < 6}  // First 6 cards are above the fold on desktop
          />
        ))}
      </div>

      {result.data.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          Nenhum político encontrado.
        </p>
      )}

      {/* Cursor pagination */}
      <nav className="mt-8 flex justify-center gap-4" aria-label="Paginação">
        {cursor !== undefined && (
          <Link
            href="/politicos"
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            ← Início
          </Link>
        )}
        {result.cursor !== null && (
          <Link
            href={`/politicos?cursor=${result.cursor}`}
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

**`apps/web/src/app/politicos/loading.tsx`:**
```typescript
/** Skeleton loader matching the card grid layout — prevents CLS (RNF-PERF-003) */
export default function Loading(): React.JSX.Element {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg border border-border bg-muted"
            aria-hidden="true"
          />
        ))}
      </div>
    </main>
  )
}
```

**VALIDATE:** `cd apps/web && pnpm typecheck`

---

### Task 22: CREATE component unit test and E2E test

**`apps/web/src/components/politician/politician-card.test.tsx`:**
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PoliticianCard } from './politician-card.js'
import type { PoliticianCard as PoliticianCardType } from '@pah/shared'

const mockPolitician: PoliticianCardType = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  slug: 'joao-silva-sp',
  name: 'João Silva',
  party: 'PL',
  state: 'SP',
  role: 'deputado',
  photoUrl: null,
  tenureStartDate: '2023-02-01',
  overallScore: 72,
}

describe('PoliticianCard', () => {
  it('displays the politician name', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  it('displays party and state badges', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    expect(screen.getByText('PL')).toBeInTheDocument()
    expect(screen.getByText('SP')).toBeInTheDocument()
  })

  it('displays score as X/100 — no qualitative labels (DR-002)', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    expect(screen.getByText('72/100')).toBeInTheDocument()
    expect(screen.queryByText(/excelente|ótimo|bom|ruim/i)).not.toBeInTheDocument()
  })

  it('links to the politician profile page', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/politicos/joao-silva-sp')
  })

  it('shows fallback when photoUrl is null', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'Foto de João Silva, PL-SP')
  })

  it('uses accessible article element', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    expect(screen.getByRole('article')).toBeInTheDocument()
  })
})
```

**`apps/web/e2e/politician-listing.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Politician Listing Page', () => {
  test('loads the listing page with politician cards', async ({ page }) => {
    await page.goto('/politicos')
    await expect(page.getByRole('heading', { name: 'Políticos' })).toBeVisible()
    // At least one card should be present (requires seeded DB)
    const cards = page.getByRole('article')
    await expect(cards.first()).toBeVisible()
  })

  test('each card displays required fields', async ({ page }) => {
    await page.goto('/politicos')
    const firstCard = page.getByRole('article').first()
    // Score in XX/100 format
    await expect(firstCard.getByText(/\d+\/100/)).toBeVisible()
    // Has a link to profile
    await expect(firstCard.getByRole('link')).toBeVisible()
  })

  test('pagination: next page link appears and works', async ({ page }) => {
    await page.goto('/politicos')
    const nextLink = page.getByRole('link', { name: /próxima/i })
    if (await nextLink.isVisible()) {
      await nextLink.click()
      await expect(page).toHaveURL(/cursor=/)
      await expect(page.getByRole('article').first()).toBeVisible()
    }
  })

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/politicos')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
```

**VALIDATE:** `cd apps/web && pnpm test` then `pnpm test:e2e`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|------------|-----------|
| `apps/api/src/routes/politicians.route.integration.test.ts` | 200 response, limit param, cursor, 400 on invalid, Cache-Control | Route + Service + Repository chain |
| `apps/web/src/components/politician/politician-card.test.tsx` | name, party, state, score, link, fallback photo, no qualitative labels | DR-002 + WCAG |
| `apps/web/e2e/politician-listing.spec.ts` | page loads, fields visible, pagination, axe-core a11y | Full user journey |

### Edge Cases Checklist

- [ ] Empty result set (0 politicians in DB) — shows "Nenhum político encontrado" message
- [ ] Single page of results (< 20) — cursor is null, no "Próxima" link rendered
- [ ] politician with null photoUrl — SVG placeholder renders, no broken image
- [ ] politician with null tenureStartDate — displays "—"
- [ ] Invalid cursor string — decodeCursor throws, caught by error handler, returns 400
- [ ] `limit=50` (max) — returns up to 50 results
- [ ] All politicians have same overallScore — cursor uses (score, id) so pagination still works correctly
- [ ] `noUncheckedIndexedAccess` — `data.at(-1)` used, never `data[data.length-1]`

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm lint && pnpm typecheck
```

**EXPECT:** Exit 0, zero TypeScript errors, zero ESLint violations

### Level 2: UNIT_TESTS

```bash
pnpm test
```

**EXPECT:** All tests pass; coverage >= 80% on repository + service + PoliticianCard

### Level 3: FULL_SUITE + BUILD

```bash
pnpm test && pnpm build
```

**EXPECT:** All tests pass, build succeeds

### Level 4: DATABASE_VALIDATION

```bash
docker compose up -d postgres
docker compose exec postgres psql -U postgres authority_highlighter -c '\dt public_data.*'
```

**EXPECT:** Shows `politicians` and `integrity_scores` tables

### Level 5: BROWSER_VALIDATION

```bash
cd apps/web && pnpm dev
# In another terminal:
cd apps/api && pnpm dev
# Then open http://localhost:3000/politicos
```

**EXPECT:** Grid of politician cards visible, score in XX/100 format, no party colors

### Level 6: MANUAL_VALIDATION

1. Open `http://localhost:3000/politicos`
2. Verify: cards display name, party badge, state badge, role, tenure, score
3. Verify: no qualitative labels ("ótimo", "ruim", "melhor") appear anywhere
4. Verify: "Próxima →" link appears when more than 20 politicians exist
5. Click "Próxima →" — verify URL changes to `?cursor=...` and next 20 cards appear
6. Verify: politicians with no photo show gray silhouette, not broken image
7. Tab through cards — verify keyboard navigation works, focus ring visible
8. Run Lighthouse: LCP < 2.0s

---

## Acceptance Criteria

- [ ] `GET /api/v1/politicians` returns `{ data: PoliticianCard[], cursor: string | null }`
- [ ] Cards sorted by `overallScore DESC` by default
- [ ] 20 cards per page (configurable up to 50)
- [ ] Cursor pagination works — second page shows next 20, different from first
- [ ] Each card displays: photo (or placeholder), name, party, state, role, tenure start, score
- [ ] Score displayed as "72/100" — no qualitative labels anywhere
- [ ] No party colors — only neutral gray/blue palette
- [ ] Photo fallback SVG renders when `photoUrl` is null
- [ ] Keyboard navigation works (Tab through cards, Enter follows link)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` all pass with exit 0
- [ ] Lighthouse LCP < 2.0s on localhost (dev mode may be slower — acceptable for Phase 1)
- [ ] axe-core finds zero accessibility violations

---

## Completion Checklist

- [ ] Tasks 1-4: Monorepo scaffolding complete
- [ ] Tasks 5-8: Database package with schema + migration complete
- [ ] Task 9: Shared types package complete
- [ ] Tasks 10-15: API endpoint working (`curl localhost:3001/api/v1/politicians`)
- [ ] Task 16: API integration tests pass
- [ ] Tasks 17-20: Web scaffolding + PoliticianCard component complete
- [ ] Task 21: Listing page renders in browser
- [ ] Task 22: Unit tests + E2E tests pass
- [ ] Level 1-3 validation commands pass with exit 0
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `tenure_start_date` missing from original ER.md | HIGH | MEDIUM | Already added to schema in Task 6 — document schema delta |
| `priority` prop deprecated in Next.js 16 | HIGH | LOW | Use `preload={true}` from Task 19 onwards |
| Drizzle cursor: all politicians same score | MEDIUM | HIGH | Composite cursor `(score DESC, id DESC)` handles ties |
| `noUncheckedIndexedAccess` TS errors | HIGH | MEDIUM | Use `.at(-1)` and `?? null` patterns (documented in patterns section) |
| `exactOptionalPropertyTypes` TypeBox conflicts | MEDIUM | MEDIUM | Use `Type.Union([Type.String(), Type.Null()])` not `Type.Optional(Type.String())` for nullable fields |
| Photo CDN URLs from Camara/Senado change | LOW | LOW | `remotePatterns` configured in next.config.ts; update when ingestion runs |
| DB not seeded (no test data) | HIGH | HIGH | Create `infrastructure/seed.sql` with 30 sample politicians before running tests |

---

## Notes

### Schema Delta (ER.md v1.0 → Implementation)

`tenure_start_date date` was added to `public_data.politicians` table. The original ER.md (v1.0) did not include this column, but RF-001 AC #1 explicitly requires it on the card. The Camara API provides `dataPosse` (inauguration date) and the Senado API provides `dataInicioAtividade`. This field is populated by the pipeline (future PRP).

### Dependency Injection Pattern

The project uses factory functions with DI rather than classes (`createPoliticianRepository`, `createPoliticianService`). This matches the CLAUDE.md preference for functions over classes in services/repositories, and makes unit testing without a database straightforward.

### Seed Data

Before running integration tests, seed the database with at least 25 politicians and corresponding integrity scores. A `infrastructure/seed.sql` file should be created with realistic test data (not covered in this plan — add as a prerequisite task before test execution).

---

*Plan generated: 2026-02-28*
*PRD Source: .claude/PRPs/prds/rf-001-politician-catalog-listing.prd.md*
*Phase: #1 — Base Listing*
*Confidence Score: 8/10 — patterns are explicit, gotchas documented, main uncertainty is seed data setup*
