# Stack Documentation

Local reference docs for the libraries used in this project. Saved here to avoid repeated web searches.

| File | Library | Version | Last Updated |
|------|---------|---------|-------------|
| [nextjs-15.md](./nextjs-15.md) | Next.js | ^15.0.0 (15.5.12) | 2026-03-01 |
| [nextjs-15-csp.md](./nextjs-15-csp.md) | Next.js Security | CSP Configuration | 2026-03-07 |
| [nextjs-client-bundle-security.md](./nextjs-client-bundle-security.md) | Next.js Security | Bundle Protection | 2026-03-07 |
| [fastify-5.md](./fastify-5.md) | Fastify | ^5.0.0 | 2026-03-01 |
| [drizzle-orm.md](./drizzle-orm.md) | Drizzle ORM | ^0.36.0 | 2026-03-01 |
| [ceap-expenses-rf012.md](./ceap-expenses-rf012.md) | Domain: Expenses | CEAP Ingestion | 2026-03-08 |

## What's covered per file

### nextjs-15.md
- `searchParams` as Promise (must be awaited in page props)
- `useSearchParams()` — Suspense requirement for ISR pages
- Client Component filter pattern with `useRouter.push()`
- ISR/revalidation and cache tags
- Import conventions (no `.js` extensions with `moduleResolution: "bundler"`)
- Vitest mocking: `next/image`, `next/link`, `next/navigation`
- `params` as Promise in dynamic segments

### nextjs-15-csp.md
- Content Security Policy (CSP) header configuration
- Nonce-based scripts and `strict-dynamic`
- Next.js 15 `Content-Security-Policy-Report-Only` implementation

### nextjs-client-bundle-security.md
- `server-only` guards for database modules
- CI post-build scans for sensitive environment variables
- `no-restricted-imports` ESLint rules for backend packages

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

### ceap-expenses-rf012.md
- Ingestion logic for Camara and Senado CEAP expenses
- Brazilian Real (BRL) currency normalization
- Key-set cursor strategy for year/month/id grouping


## Update Policy

Update a file whenever:
- A new library version is adopted and introduces breaking changes
- A new pattern is discovered that differs from what's documented
- A gotcha is found that burned time during implementation
