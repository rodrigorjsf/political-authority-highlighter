---
applyTo: "packages/db/**"
---

# Database Schema Code Review — Political Authority Highlighter

## Schema Isolation (ADR-001) — REJECT violations

Two schemas with strict separation:

- `public` schema: 10+ tables serving the API. Access via `api_reader` role (SELECT only).
- `internal_data` schema: 5 tables for pipeline processing. Access via `pipeline_admin` role (ALL).

The ONLY data crossing the boundary is the `exclusion_flag` boolean on `public.politicians` and `public.integrity_scores`. No other internal data may appear in the public schema.

## Drizzle Patterns

Always use `pgSchema('public')` or `pgSchema('internal_data')` — never hardcode schema names in SQL. Two separate schema files: `public-schema.ts` and `internal-schema.ts`. Two database client constructors in `clients.ts`: `createPublicDb()` (api_reader) and `createPipelineDb()` (pipeline_admin).

All files in `packages/db/src/` must import `'server-only'` to prevent accidental inclusion in client bundles (DR-008).

## Migration Rules

Migrations must be reversible (up and down). Never drop columns without a migration that first removes dependencies. Schema changes to `internal_data` must not affect `public` schema queries.

REJECT: Irreversible migrations. REJECT: Migrations that grant `api_reader` any permission on `internal_data`.

## Type Safety

`noUncheckedIndexedAccess` is enabled — `rows[0]` returns `T | undefined`, not `T`. Always handle the undefined case. Use cursor-based pagination patterns, never OFFSET.

GIN index syntax for Drizzle 0.36.4: `index('name').using('gin', column)` — NOT `.on(column).using('gin')`.

## CPF Storage (DR-005)

CPF exists ONLY in `internal_data.politician_identifiers`. The table stores: encrypted CPF (AES-256-GCM, Buffer), CPF hash (SHA-256, varchar), source-specific external IDs. The `api_reader` role has ZERO permissions on this table — enforced at PostgreSQL level.

REJECT: CPF fields in any `public` schema table. REJECT: Granting `api_reader` access to `internal_data`.

## Exclusion Records (DR-001)

`internal_data.exclusion_records` stores corruption indicators from CEIS, CNEP, CEAF, CEPIM, TCU, CGU. These records are NEVER exposed via the public schema. Only the boolean `exclusion_flag` is published to `public.integrity_scores` and `public.politicians`.

## `packages/shared/` Dependency

`packages/db/` may import from `packages/shared/` (types, constants). It must NEVER import from `apps/*`. Domain types like `Politician`, `IntegrityScore` are defined in `packages/shared/src/types/`.

## Value Export Pattern

Type-only re-exports (`export type`) from submodules work fine (erased at compile time). Value re-exports from submodules fail in Next.js webpack. Workaround: inline value exports directly in `index.ts` using `const` + `as const` + type alias pattern (NOT TypeScript `enum` keyword).
