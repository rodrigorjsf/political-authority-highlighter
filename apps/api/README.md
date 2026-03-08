# @pah/api

Backend REST API for the Political Authority Highlighter. Built with **Fastify 5**, **TypeBox**, and **Drizzle ORM**.

## Features

- **Performance First**: Fastify 5 with TypeBox for extremely fast request validation and response serialization.
- **Clean Architecture**: Route → Service → Repository pattern for clear dependency separation and testability.
- **Security-Minded**: Reads only from the `public_data` schema using the `api_reader` role. Zero access to the `internal_data` schema (database-enforced).
- **Modern Standards**: RFC 7807 Problem Details for consistent error handling.
- **Scalable Pagination**: Keyset (cursor-based) pagination for all list endpoints.
- **Auto-Documentation**: OpenAPI (Swagger) documentation available at `/docs`.

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **Routes** | HTTP request handling, TypeBox schema validation, response serialization. |
| **Services** | Business logic, cursor encode/decode, parallel data aggregation. |
| **Repositories** | SQL queries via Drizzle, mapping database rows to domain concepts. |
| **Schemas** | TypeBox definitions for shared API contracts. |

## Endpoints

```
GET /politicians                         # List with filters and cursor pagination
GET /politicians/:slug                   # Full profile with latest score
GET /politicians/:slug/bills             # Paginated authored bills
GET /politicians/:slug/votes             # Paginated vote records
GET /politicians/:slug/expenses          # Paginated expenses (RF-012)
GET /scores/ranking                      # Top/bottom politicians by overall score
GET /sources/status                      # Data freshness per source
GET /health                              # Database connectivity health check
```

## Development

```bash
pnpm dev              # Start development server with hot-reload
pnpm build            # Build project (TypeScript)
pnpm lint             # Run ESLint
pnpm test             # Run unit tests
pnpm test:integration # Run integration tests (requires Docker for Testcontainers)
```

## Environment Variables

- `DATABASE_URL_READER`: PostgreSQL connection string with `api_reader` role.
- `PORT`: Port to listen on (default: 3000).
- `LOG_LEVEL`: Pino log level (default: info).
