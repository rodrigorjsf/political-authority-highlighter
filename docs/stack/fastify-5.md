# Fastify 5 — Stack Documentation

> Version used: `fastify@^5.0.0`
> Last updated: 2026-03-01
> Source: https://fastify.dev/docs/latest/

---

## TypeBox Integration (@fastify/type-provider-typebox)

Fastify 5 uses TypeBox for schema validation and type inference.

```typescript
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>()
```

**Reference:** https://fastify.dev/docs/latest/Reference/Type-Providers/

---

## Plugin Pattern (TypeScript)

All Fastify plugins must be `async` (required by type system even if no await):

```typescript
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'

const politiciansRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/politicians', { schema: { ... } }, async (request) => {
    // handler
  })
}

export default politiciansRoute
```

**ESLint gotcha:** `@typescript-eslint/require-await` will flag async functions without await. Use `// eslint-disable-next-line @typescript-eslint/require-await` if Fastify's plugin contract requires async but no await is used in the outer function.

---

## Request Schema with TypeBox

```typescript
import { Type } from '@sinclair/typebox'
import type { Static } from '@sinclair/typebox'

const ListPoliticiansQuerySchema = Type.Object({
  cursor: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  role: Type.Optional(Type.Union([Type.Literal('deputado'), Type.Literal('senador')])),
  state: Type.Optional(Type.String({ minLength: 2, maxLength: 2 })),
  search: Type.Optional(Type.String({ minLength: 2 })),
})

type ListPoliticiansQuery = Static<typeof ListPoliticiansQuerySchema>
```

---

## Response Schema (prevents field leakage)

```typescript
const PoliticianCardSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  party: Type.String(),
  state: Type.String(),
  role: Type.Union([Type.Literal('deputado'), Type.Literal('senador')]),
  photoUrl: Type.Union([Type.String({ format: 'uri' }), Type.Null()]),
  tenureStartDate: Type.String({ format: 'date' }),
  overallScore: Type.Integer({ minimum: 0, maximum: 100 }),
})

// Route schema:
schema: {
  querystring: ListPoliticiansQuerySchema,
  response: {
    200: Type.Object({
      data: Type.Array(PoliticianCardSchema),
      cursor: Type.Union([Type.String(), Type.Null()]),
      total: Type.Integer(),
    }),
  },
}
```

**Security:** TypeBox response schemas act as allowlists — fields not in the schema are stripped from the response. This prevents accidental data leakage (DR-005: CPF, DR-001: exclusion records).

---

## Error Handling (RFC 7807 ProblemDetail)

```typescript
// Custom error response
app.setErrorHandler((error, request, reply) => {
  reply.status(error.statusCode ?? 500).send({
    type: 'https://yourapi.com/errors/validation',
    title: error.message,
    status: error.statusCode ?? 500,
    detail: error.message,
  })
})
```

---

## Health Check Route

```typescript
app.get('/health', () => ({ status: 'ok' }))
// Note: no 'async' needed if no await inside
```

---

## CORS

```typescript
import cors from '@fastify/cors'

await app.register(cors, {
  origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
})
```

---

## Plugin Registration Order

```typescript
// Register plugins before routes
await app.register(cors, { ... })
await app.register(helmet, { ... })

// Register routes after plugins
await app.register(politiciansRoute, { prefix: '/api/v1' })
```

---

## Explicit Return Types Required

Due to `@typescript-eslint/explicit-function-return-type`:

```typescript
// Route handler — must have explicit return type or eslint-disable
app.get('/politicians', { schema }, async (request): Promise<ListPoliticiansResponse> => {
  return politicianService.listPoliticians(request.query)
})
```
