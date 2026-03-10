# @pah/api

Backend REST API for the Political Authority Highlighter. Built with **Fastify 5**, **TypeBox**, and **Drizzle ORM**.

## Features

- **Performance** — Fastify 5 with TypeBox for validation and serialization.
- **Clean Architecture** — Route → Service → Repository.
- **Security** — Reads `public` schema via `api_reader` role. No access to `internal_data`.
- **Standards** — RFC 7807 Problem Details and keyset (cursor) pagination.
- **OpenAPI** — Auto-documentation at `/docs`.

## Endpoints

```
GET /politicians                         # List with filters and cursor pagination
GET /politicians/:slug                   # Profile with latest score
GET /politicians/:slug/bills             # Paginated authored bills
GET /politicians/:slug/votes             # Paginated vote records
GET /politicians/:slug/expenses          # Paginated expenses (RF-012)
GET /scores/ranking                      # Ranking by overall score
GET /sources/status                      # Data freshness
GET /health                              # Health check
```

## Development

```bash
pnpm dev              # Development server
pnpm build            # Build project
pnpm lint             # Run ESLint
pnpm test             # Run unit tests
pnpm test:integration # Run integration tests (Testcontainers)
```

## Config

- `DATABASE_URL_READER` — PostgreSQL `api_reader` connection string.
- `PORT` — Default: 3000.
- `LOG_LEVEL` — Default: info.
