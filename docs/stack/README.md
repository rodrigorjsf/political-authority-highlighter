# Stack Documentation

Local reference docs for the libraries used in this project. Saved here to avoid repeated web searches.

| File | Library | Version | Last Updated |
|------|---------|---------|-------------|
| [nextjs-15.md](./nextjs-15.md) | Next.js | ^15.0.0 (15.5.12) | 2026-03-01 |
| [fastify-5.md](./fastify-5.md) | Fastify | ^5.0.0 | 2026-03-01 |
| [drizzle-orm.md](./drizzle-orm.md) | Drizzle ORM | ^0.36.0 | 2026-03-01 |

## What's covered per file

### nextjs-15.md
- `searchParams` as Promise (must be awaited in page props)
- `useSearchParams()` — Suspense requirement for ISR pages
- Client Component filter pattern with `useRouter.push()`
- ISR/revalidation and cache tags
- Import conventions (no `.js` extensions with `moduleResolution: "bundler"`)
- Vitest mocking: `next/image`, `next/link`, `next/navigation`
- `params` as Promise in dynamic segments

### fastify-5.md
- TypeBox integration (`@fastify/type-provider-typebox`)
- Plugin pattern (must be async)
- Request/response TypeBox schemas (field leakage prevention)
- RFC 7807 error handling
- CORS setup
- Plugin registration order
- ESLint workarounds for Fastify async plugin pattern

### drizzle-orm.md
- Dual-schema pattern (`public_data` + `internal_data` — ADR-001)
- Type inference (`$inferSelect`, `$inferInsert`)
- Database client setup (reader vs writer roles)
- Cursor-based pagination (composite cursor: score + id)
- Dynamic WHERE clause filtering
- Migrations workflow
- Upsert pattern for pipeline idempotency (DR-007)
- Import boundary enforcement

## Update Policy

Update a file whenever:
- A new library version is adopted and introduces breaking changes
- A new pattern is discovered that differs from what's documented
- A gotcha is found that burned time during implementation
