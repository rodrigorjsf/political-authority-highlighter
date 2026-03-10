# Backend Development Guide -- Political Authority Highlighter

# Stack: Fastify 5.x | TypeBox | Drizzle ORM 0.36+ | PostgreSQL 16 | pg-boss 10

# Last Updated: 2026-02-28 | PRD Version: 1.0

## Core Principles

> Primary: Clean Architecture (Martin), Domain-Driven Design (Evans), SOLID Principles
> Secondary: Clean Code (Martin), The Pragmatic Programmer (Hunt/Thomas)

1. **Dependency Inversion (SOLID/Clean Architecture)**: Services depend on repository interfaces, not on Drizzle directly. Routes depend on services, not on the database. This allows unit testing services with in-memory stubs.

2. **Single Responsibility (SOLID/Clean Code)**: Each route file handles one resource. Each service method performs one use case. Each adapter fetches from one source. Functions under 30 lines. Files under 300 lines.

3. **Repository Pattern (DDD)**: All database access goes through repository functions. No inline Drizzle queries in route handlers or services. Repositories are the only code that imports from `packages/db/`.

4. **Idempotent Upserts (Pragmatic Programmer)**: Every pipeline write operation uses `ON CONFLICT DO UPDATE` via Drizzle's `onConflictDoUpdate()`. Running the same ingestion twice produces the same result.

5. **Schema-Enforced Isolation (DDD Bounded Contexts)**: The API app connects with `api_reader` role (SELECT on `public` only). The pipeline app connects with `pipeline_admin` role (ALL on both schemas). This is not just a convention -- it is a database-enforced boundary.

---

## Architecture Boundaries

### What the API IS responsible for

- Serving pre-computed politician data from `public` schema
- Request validation using TypeBox schemas
- Response serialization with `fast-json-stringify`
- Rate limiting, CORS, security headers
- Cache-Control headers for Cloudflare CDN
- Health check endpoint

### What the API is NOT responsible for

- Data ingestion or transformation (that is the pipeline)
- Score calculation (pre-computed by pipeline)
- Writing to the database (api_reader has SELECT only)
- User authentication (no auth in MVP)
- Accessing `internal_data` schema (database role prevents it)

### What the Pipeline IS responsible for

- Fetching data from 6 external government sources
- Transforming and normalizing raw data
- Cross-source identity matching via CPF hash
- Score calculation across 4 dimensions
- Publishing computed data to `public` schema
- Triggering Vercel ISR revalidation after publish
- CPF encryption/decryption

### What the Pipeline is NOT responsible for

- Serving HTTP requests (that is the API)
- Frontend rendering decisions
- User-facing error messages

---

## File and Directory Conventions

### API App (`apps/api/`)

```
apps/api/
+-- src/
|   +-- server.ts                   # Fastify instance creation, plugin registration
|   +-- app.ts                      # Application factory (for testing)
|   +-- routes/
|   |   +-- politicians.route.ts    # GET /api/v1/politicians, GET /api/v1/politicians/:slug
|   |   +-- scores.route.ts         # GET /api/v1/scores/ranking
|   |   +-- sources.route.ts        # GET /api/v1/sources/status
|   |   +-- methodology.route.ts    # GET /api/v1/methodology
|   |   +-- health.route.ts         # GET /health
|   +-- services/
|   |   +-- politician.service.ts   # Business logic for politician queries
|   |   +-- score.service.ts        # Business logic for score/ranking queries
|   |   +-- source.service.ts       # Business logic for data source status
|   +-- repositories/
|   |   +-- politician.repository.ts    # Drizzle queries against public.politicians
|   |   +-- score.repository.ts         # Drizzle queries against public.integrity_scores
|   |   +-- bill.repository.ts          # Drizzle queries against public.bills
|   |   +-- expense.repository.ts       # Drizzle queries against public.expenses
|   |   +-- source.repository.ts        # Drizzle queries against public.data_source_status
|   +-- schemas/
|   |   +-- politician.schema.ts    # TypeBox schemas for politician request/response
|   |   +-- score.schema.ts         # TypeBox schemas for score request/response
|   |   +-- common.schema.ts        # Pagination, error response schemas
|   +-- plugins/
|   |   +-- cors.plugin.ts          # CORS configuration
|   |   +-- rate-limit.plugin.ts    # Rate limiting (60 req/min per IP)
|   |   +-- helmet.plugin.ts        # Security headers
|   |   +-- swagger.plugin.ts       # OpenAPI documentation
|   +-- hooks/
|   |   +-- error-handler.ts        # Global error handler (RFC 7807)
|   |   +-- request-logger.ts       # Structured request logging
|   +-- config/
|       +-- env.ts                  # Zod-validated environment variables
+-- Dockerfile.api
+-- package.json
+-- vitest.config.ts
```

### Pipeline App (`apps/pipeline/`)

```
apps/pipeline/
+-- src/
|   +-- worker.ts                   # pg-boss worker entry point
|   +-- scheduler.ts                # Cron schedule definitions for all sources
|   +-- adapters/
|   |   +-- base.adapter.ts         # Abstract adapter: retry logic, rate limiting, logging
|   |   +-- camara.adapter.ts       # Camara dos Deputados REST JSON API
|   |   +-- senado.adapter.ts       # Senado Federal REST XML/JSON API
|   |   +-- transparencia.adapter.ts # Portal da Transparencia REST JSON (API key)
|   |   +-- tse.adapter.ts          # TSE Open Data bulk CSV
|   |   +-- tcu.adapter.ts          # TCU CADIRREG REST JSON
|   |   +-- cgu.adapter.ts          # CGU-PAD bulk CSV
|   +-- transformers/
|   |   +-- politician.transformer.ts   # Name normalization, diacritics, casing
|   |   +-- expense.transformer.ts      # BRL currency, date normalization
|   |   +-- bill.transformer.ts         # Bill type categorization
|   +-- matchers/
|   |   +-- cpf.matcher.ts          # SHA-256 hash-based exact CPF matching
|   |   +-- fuzzy.matcher.ts        # Name + state + birth_date fallback matching
|   +-- scoring/
|   |   +-- calculator.ts           # Main score orchestrator
|   |   +-- components/
|   |       +-- transparency.ts     # Data availability scoring (0-25)
|   |       +-- legislative.ts      # Parliamentary activity scoring (0-25)
|   |       +-- financial.ts        # Expense/asset regularity scoring (0-25)
|   |       +-- anticorruption.ts   # Binary exclusion check (0 or 25)
|   +-- publisher/
|   |   +-- publisher.ts            # Upserts computed data to public schema
|   |   +-- revalidator.ts          # Triggers Vercel ISR revalidation
|   +-- crypto/
|   |   +-- cpf.ts                  # AES-256-GCM encrypt/decrypt + SHA-256 hash
|   +-- repositories/
|   |   +-- ingestion.repository.ts     # Writes to internal_data tables
|   |   +-- identity.repository.ts      # Manages politician_identifiers
|   |   +-- exclusion.repository.ts     # Reads/writes exclusion_records
|   |   +-- publish.repository.ts       # Upserts to public tables
|   +-- config/
|       +-- env.ts                  # Pipeline-specific env validation
|       +-- schedules.ts            # Cron expressions for each source
+-- Dockerfile.pipeline
+-- package.json
+-- vitest.config.ts
```

### File Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Route | `<resource>.route.ts` | `politicians.route.ts` |
| Service | `<resource>.service.ts` | `politician.service.ts` |
| Repository | `<resource>.repository.ts` | `politician.repository.ts` |
| Schema (TypeBox) | `<resource>.schema.ts` | `politician.schema.ts` |
| Adapter | `<source>.adapter.ts` | `camara.adapter.ts` |
| Transformer | `<entity>.transformer.ts` | `expense.transformer.ts` |
| Scorer | `<component>.ts` (in `scoring/components/`) | `transparency.ts` |
| Test | `<module>.test.ts` (co-located) | `politician.service.test.ts` |
| Integration Test | `<module>.integration.test.ts` | `politicians.route.integration.test.ts` |

---

## Naming Conventions

### Functions and Methods

```typescript
// Route handlers: verb + resource
async function listPoliticians(request: FastifyRequest, reply: FastifyReply): Promise<void>
async function getPoliticianBySlug(request: FastifyRequest, reply: FastifyReply): Promise<void>

// Service methods: verb + domain concept
async function findPoliticiansByFilters(filters: PoliticianFilters): Promise<PaginatedResult<Politician>>
async function calculateIntegrityScore(politicianId: string): Promise<IntegrityScore>

// Repository methods: query-descriptive
async function selectPoliticianBySlug(slug: string): Promise<PoliticianRow | null>
async function selectPoliticiansWithScores(filters: QueryFilters): Promise<PoliticianWithScore[]>
async function upsertPolitician(data: PoliticianUpsert): Promise<void>

// Adapter methods: source-specific fetch
async function fetchDeputados(page: number): Promise<RawDeputado[]>
async function fetchSenadores(): Promise<RawSenador[]>

// Transformer functions: to + target type
function toPolitician(raw: RawDeputado): PoliticianInsert
function toExpense(raw: RawDespesa): ExpenseInsert
```

### Types and Interfaces

```typescript
// Domain types (in packages/shared): PascalCase nouns from ubiquitous language
interface Politician { ... }
interface IntegrityScore { ... }
interface Bill { ... }
interface Expense { ... }

// Database row types: append Row
type PoliticianRow = typeof politicians.$inferSelect
type IntegrityScoreRow = typeof integrityScores.$inferSelect

// Insert types: append Insert or Upsert
type PoliticianInsert = typeof politicians.$inferInsert
type PoliticianUpsert = Omit<PoliticianInsert, 'id' | 'createdAt'>

// API response types: append Response
interface PoliticianResponse { ... }
interface PoliticianListResponse { data: PoliticianResponse[]; cursor: string | null }

// Filter types: append Filters
interface PoliticianFilters { state?: string; party?: string; role?: string; search?: string }

// Job payload types: append Payload
interface CamaraSyncPayload { page: number; batchId: string }

// Enums for constant values (RF-002, RF-013)
export enum PoliticalRole {
  DEPUTADO = 'deputado',
  SENADOR = 'senador',
}

export enum DataSource {
  CAMARA = 'camara',
  SENADO = 'senado',
  TRANSPARENCIA = 'transparencia',
  TSE = 'tse',
  TCU = 'tcu',
  CGU = 'cgu',
}
```

### Constants

```typescript
// SCREAMING_SNAKE_CASE for true constants
const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 20
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60

// Use ms package for time-related configurations
import ms from 'ms'
const CACHE_TTL = ms('1h')
const RATE_LIMIT_WINDOW = ms('1m')

// Score weights as named const object
const SCORE_WEIGHTS = {
  transparency: 0.25,
  legislative: 0.25,
  financial: 0.25,
  anticorruption: 0.25,
} as const
```

---

## Code Standards

### Formatting Rules (CLAUDE.md)

- No semicolons (enforced)
- Single quotes (enforced)
- No unnecessary curly braces (enforced)
- 2-space indentation
- Import order: external → internal → types

### Functions and Methods

- **Maximum 30 lines** per function. Extract helper functions if logic grows.
- **Single responsibility**: a function either fetches, transforms, validates, or persists -- never combines multiple concerns.
- **Explicit return types** on all exported functions.
- **No side effects** in pure transformation functions. Adapter fetch methods and repository writes are the only functions allowed to perform I/O.
- **Use object destructuring** where possible for cleaner code.

```typescript
// GOOD: small, single-purpose, typed, uses destructuring
export async function findPoliticianBySlug(
  slug: string,
): Promise<PoliticianWithScore | null> {
  const politician = await politicianRepository.selectBySlug(slug)
  if (!politician) return null
  const score = await scoreRepository.selectLatestByPoliticianId(politician.id)
  return { ...politician, score }
}

// GOOD: destructured parameters
export function parseData({ name, party, state }: PoliticianRow): PoliticianResponse {
  return { name, party, state }
}
```

### Classes and Modules

- **Prefer functions over classes** for services and repositories. Use classes only for adapters (which carry state like base URL and rate limiter).
- **One export per concern** per file. A repository file exports functions for one table/entity.
- **Module size limit**: 300 lines. Split if larger.
- **Export all types by default**.

### Error Handling

All API errors follow RFC 7807 Problem Details:

```typescript
// Define domain-specific error types
export class NotFoundError extends Error {
  constructor(
    public readonly resource: string,
    public readonly identifier: string,
  ) {
    super(`${resource} '${identifier}' not found`)
    this.name = 'NotFoundError'
  }
}

// ... rest of error handler logic ...
```

**Use type guards or schema validation** instead of type assertions (`as`).

```typescript
// GOOD: Type guard for narrowing
function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError
}

// GOOD: Schema validation for external data
const data = PoliticianResponseSchema.parse(await response.json())

// BAD: Type assertion
const data = await response.json() as PoliticianResponse
```

**Pipeline error handling**: Adapters catch and log source-specific errors, then mark the ingestion job as `partial` or `failed`. The pipeline never throws unhandled exceptions -- all errors are recorded in `internal_data.ingestion_logs`.

### Comments Policy

- **Do not comment obvious code.** Self-documenting names are preferred.
- **Do comment**: business rules, scoring formulas, external API quirks, LGPD compliance reasons.
- **JSDoc required** on all exported functions, types, and interfaces.

```typescript
/**
 * Calculates the anticorruption score component for a politician.
 *
 * Per DR-001 (Silent Exclusion): returns 25 if no exclusion records exist
 * across any source (CEIS, CNEP, CEAF, CEPIM, TCU, CGU), or 0 if any
 * exclusion record exists. This is a binary determination.
 *
 * The exclusion_flag boolean is the ONLY data that crosses from
 * internal_data to public schema.
 */
export function calculateAnticorruptionScore(
  exclusionRecords: ExclusionRecord[],
): AnticorruptionResult {
  const hasExclusions = exclusionRecords.length > 0
  return {
    score: hasExclusions ? 0 : 25,
    exclusionFlag: hasExclusions,
  }
}
```

---

## Fastify 5 Patterns

### Server Setup

```typescript
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty' }
          : undefined,
    },
  }).withTypeProvider<TypeBoxTypeProvider>()

  // Register plugins
  app.register(corsPlugin)
  app.register(rateLimitPlugin)
  app.register(helmetPlugin)

  // Register routes with prefix
  app.register(politicianRoutes, { prefix: '/api/v1' })
  app.register(scoreRoutes, { prefix: '/api/v1' })
  app.register(sourceRoutes, { prefix: '/api/v1' })
  app.register(healthRoutes)

  // Global error handler
  app.setErrorHandler(errorHandler)

  return app
}
```

### Route Definition with TypeBox

```typescript
import { Type, type Static } from '@sinclair/typebox'

// Define schemas
const PoliticianParams = Type.Object({
  slug: Type.String({ minLength: 1, pattern: '^[a-z0-9-]+$' }),
})

const PoliticianListQuery = Type.Object({
  state: Type.Optional(Type.String({ minLength: 2, maxLength: 2 })),
  party: Type.Optional(Type.String()),
  role: Type.Optional(Type.Union([Type.Literal('deputado'), Type.Literal('senador')])),
  search: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  cursor: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
})

const PoliticianResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  slug: Type.String(),
  state: Type.String(),
  party: Type.String(),
  role: Type.String(),
  photoUrl: Type.Union([Type.String(), Type.Null()]),
  active: Type.Boolean(),
  score: Type.Optional(Type.Object({
    overall: Type.Integer({ minimum: 0, maximum: 100 }),
    transparency: Type.Integer({ minimum: 0, maximum: 25 }),
    legislative: Type.Integer({ minimum: 0, maximum: 25 }),
    financial: Type.Integer({ minimum: 0, maximum: 25 }),
    anticorruption: Type.Integer({ minimum: 0, maximum: 25 }),
    exclusionFlag: Type.Boolean(),
    calculatedAt: Type.String({ format: 'date-time' }),
  })),
})

// Register route
export async function politicianRoutes(app: FastifyInstance): Promise<void> {
  app.get('/politicians', {
    schema: {
      querystring: PoliticianListQuery,
      response: {
        200: Type.Object({
          data: Type.Array(PoliticianResponseSchema),
          cursor: Type.Union([Type.String(), Type.Null()]),
        }),
      },
    },
  }, async (request, reply) => {
    const result = await politicianService.findByFilters(request.query)
    reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')
    return result
  })

  app.get('/politicians/:slug', {
    schema: {
      params: PoliticianParams,
      response: {
        200: PoliticianResponseSchema,
        404: ProblemDetailSchema,
      },
    },
  }, async (request, reply) => {
    const politician = await politicianService.findBySlug(request.params.slug)
    if (!politician) {
      throw new NotFoundError('Politician', request.params.slug)
    }
    reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')
    return politician
  })
}
```

### Rate Limiting

```typescript
import rateLimit from '@fastify/rate-limit'

export async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (_request, context) => ({
      type: 'https://autoridade-politica.com.br/errors/rate-limit',
      title: 'Rate limit exceeded',
      status: 429,
      detail: `Rate limit exceeded. Retry after ${Math.ceil(context.ttl / 1000)} seconds.`,
    }),
  })
}
```

---

## Drizzle ORM Patterns

### Schema Definitions

```typescript
// packages/db/src/public-schema.ts
import { pgSchema, uuid, varchar, boolean, smallint, timestamp, text, numeric, date } from 'drizzle-orm/pg-core'

export const publicData = pgSchema('public')

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
  bioSummary: text('bio_summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const integrityScores = publicData.table('integrity_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
  overallScore: smallint('overall_score').notNull(),
  transparencyScore: smallint('transparency_score').notNull(),
  legislativeScore: smallint('legislative_score').notNull(),
  financialScore: smallint('financial_score').notNull(),
  anticorruptionScore: smallint('anticorruption_score').notNull(),
  exclusionFlag: boolean('exclusion_flag').notNull().default(false),
  methodologyVersion: varchar('methodology_version', { length: 20 }).notNull(),
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
})
```

### Database Client Separation

```typescript
// packages/db/src/clients.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import * as publicSchema from './public-schema'
import * as internalSchema from './internal-schema'

// API uses this client -- connects with api_reader role (SELECT only on public)
export function createPublicDb(connectionString: string) {
  return drizzle(connectionString, { schema: publicSchema })
}

// Pipeline uses this client -- connects with pipeline_admin role (ALL on both schemas)
export function createPipelineDb(connectionString: string) {
  return drizzle(connectionString, { schema: { ...publicSchema, ...internalSchema } })
}
```

### Repository Pattern with Drizzle

```typescript
// apps/api/src/repositories/politician.repository.ts
import { eq, ilike, and, sql, desc } from 'drizzle-orm'
import { politicians, integrityScores } from '@pah/db/public-schema'
import type { PublicDb } from '@pah/db/clients'

export function createPoliticianRepository(db: PublicDb) {
  return {
    async selectBySlug(slug: string) {
      const result = await db
        .select()
        .from(politicians)
        .leftJoin(integrityScores, eq(politicians.id, integrityScores.politicianId))
        .where(eq(politicians.slug, slug))
        .limit(1)

      return result[0] ?? null
    },

    async selectWithFilters(filters: {
      state?: string
      party?: string
      role?: string
      search?: string
      cursor?: string
      limit: number
    }) {
      const conditions = [eq(politicians.active, true)]

      if (filters.state) conditions.push(eq(politicians.state, filters.state))
      if (filters.party) conditions.push(eq(politicians.party, filters.party))
      if (filters.role) conditions.push(eq(politicians.role, filters.role))
      if (filters.search) {
        conditions.push(
          sql`${politicians.searchVector} @@ plainto_tsquery('portuguese', ${filters.search})`,
        )
      }

      const query = db
        .select()
        .from(politicians)
        .leftJoin(integrityScores, eq(politicians.id, integrityScores.politicianId))
        .where(and(...conditions))
        .orderBy(desc(integrityScores.overallScore))
        .limit(filters.limit + 1) // Fetch one extra for cursor

      return query
    },
  }
}
```

### Idempotent Upserts (Pipeline)

```typescript
// apps/pipeline/src/repositories/publish.repository.ts
import { sql } from 'drizzle-orm'
import { politicians } from '@pah/db/public-schema'

export async function upsertPolitician(
  db: PipelineDb,
  data: PoliticianUpsert,
): Promise<void> {
  await db
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
        active: data.active,
        bioSummary: data.bioSummary,
        updatedAt: sql`now()`,
      },
    })
}
```

---

## API Route Conventions

### URL Structure

```
Base: /api/v1

GET  /politicians                         # List with filters and cursor pagination
GET  /politicians/:slug                   # Full profile with latest score
GET  /politicians/:slug/bills             # Paginated authored bills
GET  /politicians/:slug/votes             # Paginated vote records
GET  /politicians/:slug/expenses          # Paginated expenses (filterable by year)
GET  /politicians/:slug/assets            # Declared assets by year
GET  /politicians/:slug/candidacies       # Electoral history
GET  /scores/ranking                      # Top/bottom politicians by overall score
GET  /sources/status                      # Data freshness per source
GET  /methodology                         # Scoring methodology documentation
GET  /health                              # Health check (no /api/v1 prefix)
```

### Pagination (Cursor-Based)

All list endpoints use keyset (cursor-based) pagination, never OFFSET:

```typescript
// Request
GET /api/v1/politicians?limit=20&cursor=eyJpZCI6IjEyMzQifQ==

// Response
{
  "data": [...],
  "cursor": "eyJpZCI6IjU2NzgifQ==" // base64-encoded last item key, or null if no more
}
```

### Cache-Control Headers

Every response sets appropriate caching headers for Cloudflare:

| Endpoint | Cache-Control |
|----------|--------------|
| `/politicians` | `public, max-age=300, s-maxage=3600` |
| `/politicians/:slug` | `public, max-age=300, s-maxage=3600` |
| `/scores/ranking` | `public, max-age=300, s-maxage=3600` |
| `/sources/status` | `public, max-age=60, s-maxage=300` |
| `/methodology` | `public, max-age=86400, s-maxage=604800` |
| `/health` | `no-store` |

---

## CPF Handling

**This section is critical for LGPD compliance. Every developer must understand these rules.**

### Encryption (AES-256-GCM)

```typescript
// apps/pipeline/src/crypto/cpf.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/**
 * Encrypts a CPF value using AES-256-GCM.
 * The encryption key is loaded from CPF_ENCRYPTION_KEY environment variable.
 * The IV is randomly generated and prepended to the ciphertext.
 *
 * Storage format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
 */
export function encryptCpf(cpf: string, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(cpf, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted])
}

/**
 * Creates a SHA-256 hash of the normalized CPF (digits only).
 * Used for cross-source matching without decryption.
 */
export function hashCpf(cpf: string): string {
  const normalized = cpf.replace(/\D/g, '').padStart(11, '0')
  return createHash('sha256').update(normalized).digest('hex')
}
```

### CPF Rules (Non-Negotiable)

1. CPFs exist ONLY in `internal_data.politician_identifiers` table.
2. The `api_reader` database role has ZERO permissions on `internal_data`.
3. No API endpoint, response body, log message, or error message may contain a CPF.
4. CPF encryption key is an environment variable, never in code or config files.
5. CPF matching between sources uses the SHA-256 hash -- decryption is only needed for debugging by the administrator.

---

## Data Ingestion Pipeline Patterns

### pg-boss Job Configuration

```typescript
// apps/pipeline/src/scheduler.ts
import PgBoss from 'pg-boss'

const SCHEDULES = [
  { name: 'camara-sync', cron: '0 2 * * *', data: {} },      // Daily 02:00 UTC
  { name: 'senado-sync', cron: '15 2 * * *', data: {} },      // Daily 02:15 UTC
  { name: 'transparencia-sync', cron: '30 2 * * *', data: {} }, // Daily 02:30 UTC
  { name: 'tse-sync', cron: '0 3 * * 0', data: {} },          // Weekly Sunday 03:00 UTC
  { name: 'tcu-sync', cron: '0 3 * * 3', data: {} },          // Weekly Wednesday 03:00 UTC
  { name: 'cgu-sync', cron: '0 4 1 * *', data: {} },          // Monthly 1st 04:00 UTC
] as const

export async function registerSchedules(boss: PgBoss): Promise<void> {
  for (const schedule of SCHEDULES) {
    await boss.schedule(schedule.name, schedule.cron, schedule.data, {
      retryLimit: 3,
      retryBackoff: true,     // Exponential backoff
      retryDelay: 60,         // 1 minute initial, then 5m, 15m
      expireInMinutes: 120,   // Job timeout: 2 hours
    })
  }
}
```

### Base Adapter Pattern

```typescript
// apps/pipeline/src/adapters/base.adapter.ts
export abstract class BaseAdapter<TRaw> {
  protected abstract readonly sourceName: string
  protected abstract readonly baseUrl: string
  protected abstract readonly rateLimitPerMinute: number

  /**
   * Fetches all records from the source, handling pagination and rate limiting.
   * Stores raw responses in internal_data.raw_source_data for auditability.
   */
  async fetchAll(ingestionLogId: string): Promise<TRaw[]> {
    const results: TRaw[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      await this.respectRateLimit()
      try {
        const batch = await this.fetchPage(page)
        results.push(...batch.items)
        hasMore = batch.hasNextPage
        page++
      } catch (error) {
        await this.logError(ingestionLogId, page, error)
        throw error
      }
    }

    return results
  }

  protected abstract fetchPage(page: number): Promise<{ items: TRaw[]; hasNextPage: boolean }>
  protected abstract parseResponse(raw: unknown): TRaw[]
}
```

### Source-Specific Adapter Example

```typescript
// apps/pipeline/src/adapters/camara.adapter.ts
export class CamaraAdapter extends BaseAdapter<RawDeputado> {
  protected readonly sourceName = 'camara'
  protected readonly baseUrl = 'https://dadosabertos.camara.leg.br/api/v2'
  protected readonly rateLimitPerMinute = 120 // Camara API limit

  protected async fetchPage(page: number) {
    const response = await fetch(
      `${this.baseUrl}/deputados?pagina=${page}&itens=100&ordem=ASC&ordenarPor=nome`,
      { headers: { Accept: 'application/json' } },
    )

    if (!response.ok) {
      throw new SourceApiError(this.sourceName, response.status, await response.text())
    }

    const body = await response.json()
    return {
      items: this.parseResponse(body.dados),
      hasNextPage: body.links.some((l: { rel: string }) => l.rel === 'next'),
    }
  }

  protected parseResponse(dados: unknown[]): RawDeputado[] {
    return dados.map((d) => RawDeputadoSchema.parse(d))
  }
}
```

---

## External API Integration Patterns

### Source Configuration

| Source | Base URL | Auth | Format | Rate Limit | Cadence |
|--------|---------|------|--------|-----------|---------|
| Camara | `dadosabertos.camara.leg.br/api/v2` | None | JSON | 120/min | Daily |
| Senado | `legis.senado.leg.br/dadosabertos` | None | XML/JSON | None documented | Daily |
| Transparencia | `api.portaltransparencia.gov.br/api-de-dados` | API Key (header) | JSON | 90/min | Daily |
| TSE | `dadosabertos.tse.jus.br` | None | CSV (bulk) | N/A | Weekly |
| TCU | `api-cadirreg.apps.tcu.gov.br` | None | JSON | None documented | Weekly |
| CGU | `portaldatransparencia.gov.br/download-de-dados` | None | CSV (bulk) | N/A | Monthly |

### Retry Policy

All adapters use exponential backoff:

- Attempt 1: immediate
- Attempt 2: 1 minute delay
- Attempt 3: 5 minutes delay
- After 3 failures: job moves to dead letter queue, ingestion marked as `failed`

### Source Error Handling

```typescript
// Never let a single source failure stop other sources
export class SourceApiError extends Error {
  constructor(
    public readonly source: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(`${source} API returned ${statusCode}`)
    this.name = 'SourceApiError'
  }
}
```

---

## Testing Standards

### Unit Tests (Vitest)

```typescript
// apps/pipeline/src/scoring/components/anticorruption.test.ts
import { describe, it, expect } from 'vitest'
import { calculateAnticorruptionScore } from './anticorruption'

describe('calculateAnticorruptionScore', () => {
  it('returns score 25 and exclusionFlag false when no exclusion records exist', () => {
    // Arrange
    const exclusionRecords: ExclusionRecord[] = []

    // Act
    const result = calculateAnticorruptionScore(exclusionRecords)

    // Assert
    expect(result.score).toBe(25)
    expect(result.exclusionFlag).toBe(false)
  })

  it('returns score 0 and exclusionFlag true when any exclusion record exists', () => {
    // Arrange
    const exclusionRecords = [buildExclusionRecord({ source: 'CEIS' })]

    // Act
    const result = calculateAnticorruptionScore(exclusionRecords)

    // Assert
    expect(result.score).toBe(0)
    expect(result.exclusionFlag).toBe(true)
  })

  it('returns score 0 regardless of number of exclusion records', () => {
    const exclusionRecords = [
      buildExclusionRecord({ source: 'CEIS' }),
      buildExclusionRecord({ source: 'TCU' }),
      buildExclusionRecord({ source: 'CGU' }),
    ]

    const result = calculateAnticorruptionScore(exclusionRecords)

    expect(result.score).toBe(0)
  })
})
```

### Integration Tests with Testcontainers

```typescript
// apps/api/src/routes/politicians.route.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { buildApp } from '../app'

describe('GET /api/v1/politicians', () => {
  let container: StartedPostgreSqlContainer
  let app: FastifyInstance

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    app = buildApp({ databaseUrl: container.getConnectionUri() })
    await app.ready()
    // Seed test data
  }, 30_000)

  afterAll(async () => {
    await app.close()
    await container.stop()
  })

  it('returns paginated list of active politicians', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/politicians?limit=10',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(10)
    expect(body.cursor).toBeDefined()
  })

  it('filters politicians by state', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/politicians?state=SP',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    body.data.forEach((p: { state: string }) => {
      expect(p.state).toBe('SP')
    })
  })
})
```

---

## Documentation in Code

JSDoc is required for:

- All exported functions and types
- All TypeBox schema definitions (describe the API contract)
- All scoring component functions (document the formula and domain rules)
- All adapter classes (document source API quirks, rate limits, data format)
- Any non-obvious business rule or LGPD compliance logic

---

## What NEVER to Do

| Anti-Pattern | Why It Is Prohibited |
|-------------|---------------------|
| Use `@Res()` or `reply.raw` to bypass Fastify serialization | Skips TypeBox response validation and `fast-json-stringify`, defeats type safety and leaks unknown fields |
| Import `internal-schema.ts` in any `apps/api/` file | Violates schema isolation (ADR-001). Even if the DB role prevents queries, the import creates a false dependency |
| Inline Drizzle queries in route handlers | Breaks the repository pattern and makes unit testing impossible. All DB access goes through repositories |
| Use `OFFSET` for pagination | Performance degrades on large tables. Use cursor-based (keyset) pagination |
| Log, return, or expose CPF values anywhere | LGPD violation. CPFs are encrypted/hashed and exist only in internal_data (DR-005) |
| Use `any` type | Use `unknown` and narrow with type guards or Zod/TypeBox parsing |
| Use `as` type assertions (except `as const` or test factories) | Hides type errors. Parse with Zod/TypeBox for runtime data, use type guards for narrowing |
| Skip response schema in route definitions | Without response schema, Fastify falls back to JSON.stringify (slow) and may leak sensitive fields |
| Hardcode API URLs, keys, or feature flags | All configuration from environment variables (12-Factor). Use `config/env.ts` validated at startup |
| Use `raw SQL` in the API layer | Always use Drizzle query builder for parameterized queries. Raw SQL is allowed only in pipeline for complex cross-schema operations |
| Create write endpoints in the API | The API is read-only (api_reader role). All writes happen in the pipeline |
| Use `setTimeout`/`setInterval` for scheduling | Use pg-boss for all scheduled tasks. It provides retry, dead letter queues, and persistence |
| Decrypt CPFs outside the pipeline crypto module | CPF decryption is confined to `apps/pipeline/src/crypto/cpf.ts` and should only be used for admin debugging |

---

## Dependency Rules

### Allowed External Packages (API)

| Category | Allowed Packages |
|----------|-----------------|
| Framework | `fastify`, `@fastify/*` (cors, rate-limit, helmet, swagger) |
| Validation | `@sinclair/typebox`, `@fastify/type-provider-typebox` |
| Database | `drizzle-orm`, `postgres` (driver) |
| Logging | `pino` (bundled with Fastify) |
| Utilities | `packages/shared` (internal) |

### Allowed External Packages (Pipeline)

| Category | Allowed Packages |
|----------|-----------------|
| Job Queue | `pg-boss` |
| Database | `drizzle-orm`, `postgres` |
| CSV Parsing | `papaparse` or `csv-parse` |
| XML Parsing | `fast-xml-parser` |
| Validation | `zod` (for raw source data validation) |
| HTTP | `node:fetch` (built-in) |
| Crypto | `node:crypto` (built-in) |

### Adding New Dependencies

1. Check if the functionality exists in Node.js built-in modules first.
2. Verify the package is actively maintained (last release within 6 months).
3. Run `npm audit` to check for known vulnerabilities.
4. Add to the specific app/package `package.json`, never to the root.
5. Document why the dependency is needed in the PR description.

---

## Security Baseline

### Input Validation

- All API query parameters validated via TypeBox schemas with min/max constraints.
- Slug parameters restricted to `^[a-z0-9-]+$` pattern.
- State parameters restricted to 2-character uppercase strings.
- Search strings limited to 100 characters and sanitized for PostgreSQL full-text search.
- Numeric parameters (limit, year) bounded with `minimum`/`maximum`.

### Output Sanitization

- Response schemas in TypeBox ensure only declared fields are serialized.
- `fast-json-stringify` (via response schema) strips undeclared properties.
- No HTML rendering on the API -- responses are JSON only.

### Sensitive Data Handling

- CPF: encrypted (AES-256-GCM) and hashed (SHA-256), never in API responses or logs.
- Database passwords: environment variables, never in code.
- API keys (Portal da Transparencia): environment variables, used only in pipeline.
- Encryption key: environment variable (`CPF_ENCRYPTION_KEY`), rotatable without data loss (hash unchanged).

### Security Headers (Helmet)

```typescript
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'no-referrer' },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
  xContentTypeOptions: true,
  xFrameOptions: { action: 'deny' },
}
```

---

## Changelog

| Date | PRD Version | Summary |
|------|-------------|---------|
| 2026-02-28 | 1.0 | Initial backend development guide |
