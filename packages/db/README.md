# @pah/db

Database persistence layer for the Political Authority Highlighter. Built with **Drizzle ORM** and **PostgreSQL 16**.

## Dual-Schema Security Boundary (ADR-001)

PostgreSQL enforces a hard isolation between public-facing data and internal anti-corruption records:

- **`public_data` schema**:
  - Contains: `politicians`, `integrity_scores`, `bills`, `votes`, `expenses`, `data_source_status`.
  - Accessed by the API app using the `api_reader` role (SELECT only).
- **`internal_data` schema**:
  - Contains: `politician_identifiers` (CPF encrypted/hashed), `exclusion_records`, `ingestion_logs`.
  - Accessed ONLY by the pipeline app using the `pipeline_admin` role (Full Access).

## Features

- **Cursor-Based Pagination**: Composite cursors for stable results across large data sets.
- **Type Inference**: Automatic TypeScript types via `$inferSelect` and `$inferInsert`.
- **Full-Text Search**: Optimized Brazilian Portuguese text search on politician names.
- **Atomic Migrations**: Managed via `drizzle-kit`.

## Structure

```
src/
├── clients.ts            # Public (reader) vs Pipeline (admin) DB clients
├── internal-schema.ts    # Schema definition for internal_data
├── public-schema.ts      # Schema definition for public_data
└── migrate.ts            # Migration runner script
```

## Workflows

### Database Migrations

```bash
# Generate a new migration from schema changes
pnpm drizzle-kit generate

# Apply migrations to the database
pnpm migrate
```

### Type Checking

```bash
pnpm typecheck
```

## Database Roles

| Role | Access Level | App |
|------|--------------|-----|
| `api_reader` | SELECT on `public_data` only | `apps/api` |
| `pipeline_admin` | ALL on both schemas | `apps/pipeline` |
