# Backend API — Political Authority Highlighter

Stack: Fastify 5.x | TypeBox | Drizzle ORM 0.36+ | Supabase (PostgreSQL 16)

## Architecture

API connects with `api_reader` role — SELECT only on `public` schema. The API is read-only for core political data; the alert subscription endpoints (`/api/v1/subscribe/*`) are the only write operations.

All DB access through repository functions in `src/repositories/`. No inline Drizzle queries in routes or services.

## URL Structure

`GET /api/v1/politicians`, `GET /api/v1/politicians/:slug`, `GET /api/v1/politicians/:slug/bills|votes|expenses|assets|candidacies`, `GET /api/v1/scores/ranking`, `GET /api/v1/sources/status`, `GET /api/v1/methodology`, `GET /health`

Subscription: `POST /api/v1/subscribe`, `GET /api/v1/subscribe/confirm`

## API Conventions

**Pagination**: Cursor-based (keyset) only — never OFFSET. Response: `{ data: [...], cursor: string | null }`.

**Cursor codec**: `encodeCursor`/`decodeCursor` is duplicated across 5 API services — do not add a 6th copy. RF-019 Phase 1 will consolidate.

**Cache-Control** (Cloudflare): Politicians + ranking: `public, max-age=300, s-maxage=3600`. Sources status: `max-age=60, s-maxage=300`. Methodology: `max-age=86400, s-maxage=604800`. Health: `no-store`.

**Error format**: RFC 7807 Problem Details. Every route must declare `response` schemas in TypeBox — Fastify uses them for `fast-json-stringify` serialization (strips undeclared fields).

**All route handlers must be `async function`** (Fastify 5 plugin requirement) — add `// eslint-disable-next-line @typescript-eslint/require-await` only when no await inside.

## Silent Exclusion (DR-001)

The listing endpoint (`/politicians`) does NOT include `exclusion_flag`. The profile endpoint (`/politicians/:slug`) includes `exclusion_flag` as boolean only. No endpoint returns exclusion record details.

## Testing

```bash
pnpm --filter @pah/api test               # Unit tests (excludes *.integration.test.ts)
pnpm --filter @pah/api test:integration   # Requires live PostgreSQL (Testcontainers)
```

**Mock patterns**:
- Use `MockRepository`/`MockResend` interfaces with `as unknown as T` cast
- `expect.stringMatching(...)` cast as `unknown` for `unsafe-assignment`
- `JSON.parse()` results: cast as `Record<string, unknown>`

## Security Baseline

**Input validation**: All query params via TypeBox with min/max. Slug: `^[a-z0-9-]+$`. State: 2-char uppercase. Search: ≤ 100 chars. Numeric params bounded.

**Helmet**: `contentSecurityPolicy` with `defaultSrc: ["'none'"]`, HSTS `maxAge: 31536000`.

**Rate limit**: 60 req/min per IP.
