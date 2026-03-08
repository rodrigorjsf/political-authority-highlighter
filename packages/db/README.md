# @pah/db

Database persistence for the Political Authority Highlighter. Built with **Drizzle ORM** and **PostgreSQL 16**.

## Security Boundary (ADR-001)

PostgreSQL enforces isolation between schemas:

- **`public_data`** — `politicians`, `integrity_scores`, `bills`, `votes`, `expenses`.
- **`internal_data`** — `politician_identifiers` (CPF encrypted/hashed), `exclusion_records`, `ingestion_logs`.

## Features

- **Cursor Pagination** — Composite cursors for stable results.
- **Type Inference** — TypeScript types via `$inferSelect` and `$inferInsert`.
- **Search** — Optimized Portuguese full-text search.
- **Migrations** — Managed via `drizzle-kit`.

## Roles

| Role | Access Level | App |
|------|--------------|-----|
| `api_reader` | SELECT on `public_data` | `apps/api` |
| `pipeline_admin` | ALL on both schemas | `apps/pipeline` |

## Structure

```
src/
├── clients.ts            # Public (reader) vs Pipeline (admin) clients
├── internal-schema.ts    # internal_data schema
├── public-schema.ts      # public_data schema
└── migrate.ts            # Migration runner
```

## Workflows

```bash
pnpm drizzle-kit generate # Generate migrations
pnpm migrate              # Apply migrations
pnpm typecheck            # Run type checks
```
