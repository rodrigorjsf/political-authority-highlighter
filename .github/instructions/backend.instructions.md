---
applyTo: "apps/api/**"
---

# Backend API Code Review — Political Authority Highlighter

## Schema Isolation (ADR-001) — REJECT violations

The API connects with `api_reader` role — SELECT only on `public` schema. The API must NEVER access `internal_data` schema. REJECT any file in `apps/api/` that imports from `packages/db/internal-schema.ts`. REJECT any reference to `internal_data` tables (`politician_identifiers`, `exclusion_records`, `raw_source_data`, `ingestion_logs`, `cpf_match_audit`).

The ONLY data crossing from internal to public is the `exclusion_flag` boolean on `politicians` and `integrity_scores` tables.

## Repository Pattern — REJECT inline queries

All database access goes through repository functions in `src/repositories/`. No inline Drizzle queries in route handlers or services. Repositories are the ONLY code that imports from `packages/db/`. One repository file per entity.

REJECT: `db.select()` or `db.insert()` in route handlers or service files.

## TypeBox Schemas Required

Every route MUST define TypeBox `schema` with `querystring`/`params` and `response` sections. Without a response schema, Fastify falls back to `JSON.stringify` (slow) and may leak sensitive fields. Response schemas ensure only declared fields are serialized via `fast-json-stringify`.

REJECT: Route handlers without `schema.response` definition.

## Cursor-Based Pagination Only

All list endpoints use keyset (cursor-based) pagination. NEVER use OFFSET. Response format: `{ data: T[], cursor: string | null }`. Cursor is base64-encoded last item key.

REJECT: `OFFSET` in any query. REJECT: `page` or `offset` query parameters.

## Cache-Control Headers

Every response must set appropriate Cache-Control headers. Politicians/ranking: `public, max-age=300, s-maxage=3600`. Sources status: `public, max-age=60, s-maxage=300`. Methodology: `public, max-age=86400, s-maxage=604800`. Health: `no-store`.

## Error Handling (RFC 7807)

All errors return Problem Details format: `{ type, title, status, detail }`. Never expose internal error details (stack traces, SQL, table names, file paths) to clients. Use domain-specific error classes (`NotFoundError`, `ValidationError`). Use type guards for narrowing (`error instanceof NotFoundError`), not type assertions.

## CPF Never Exposed (DR-005)

No API endpoint, response body, log message, or error message may contain a CPF. The `api_reader` role has ZERO permissions on `internal_data.politician_identifiers`. REJECT any code referencing CPF in the API layer.

## Silent Exclusion (DR-001)

The listing endpoint (`/politicians`) does NOT include `exclusion_flag` in response. The profile endpoint (`/politicians/:slug`) includes `exclusion_flag` as boolean only. No endpoint returns exclusion record details (source, date, type, reason). No API error message mentions exclusion reasons.

REJECT: Any response field named `exclusion_records`, `corruption_indicator`, or similar.

## Read-Only API

The API is read-only. The `api_reader` database role has SELECT only. No write endpoints (POST/PUT/PATCH/DELETE for data mutation). All writes happen in the pipeline.

REJECT: Write endpoints in `apps/api/`. REJECT: `db.insert()`, `db.update()`, `db.delete()` in API code.

## Rate Limiting & Input Validation

60 req/min per IP. Rate limit error returns RFC 7807 with `429` status. Slug: `^[a-z0-9-]+$`. State: 2-char uppercase. Search: 2-100 chars. Limit: integer 1-50, default 20. All constraints via TypeBox min/max.

## Code Quality

Functions max 30 lines. Files max 300 lines. Explicit return types on exports. Use `ms` for time values. Object destructuring preferred. Fastify plugins must be async. Routes prefixed `/api/v1`. Health at `/health`.
