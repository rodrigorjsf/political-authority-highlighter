# GitHub Copilot Code Review Instructions

## Project Context
This is Political Authority Highlighter, a Brazilian political transparency platform. Stack: TypeScript 5.4+ | Next.js 15 | Fastify 5 | Supabase | Drizzle ORM | pg-boss 10.

---

## TypeScript & Type Safety

Always use explicit return types on public functions.

Never use the `any` type; use `unknown` and narrow with type guards instead.

Prefer `interface` for object shapes that may be extended; use `type` for unions and intersections.

Use `as const` for literal constants; never use `as` type assertions except `as unknown as T` in test factories.

Enforce `exactOptionalPropertyTypes`: build optional objects conditionally instead of passing `undefined` to optional fields.

---

## Code Formatting & Style

Enforce no semicolons, single quotes, and no unnecessary curly braces (Prettier + ESLint).

Maintain 2-space indentation across all files.

Order imports: external → internal → types.

Use destructuring for objects: `const { name } = user` instead of `const name = user.name`.

Use `ms` package for time-related configuration instead of multiplying by 1000.

---

## Architecture & Import Boundaries

The API layer (`apps/api/`) must never import from `apps/pipeline/` or `packages/db/internal-schema.ts`.

The frontend (`apps/web/`) must never import from `packages/db/`, `apps/api/`, or `apps/pipeline/`.

The `packages/shared/` has zero external dependencies; domain types and utilities live here.

All import boundary violations are enforced via ESLint `import/no-restricted-paths`.

---

## Database & Schema Isolation

The `public` schema serves the API (SELECT only via `api_reader` role); the `internal_data` schema is pipeline-owned.

The only data crossing the boundary is the `exclusion_flag` boolean flag.

API code uses `packages/db/public-schema.ts` (Drizzle pgSchema('public')); pipeline code uses both schemas.

Never hardcode schema names; always use Drizzle's pgSchema() function.

---

## Critical Domain Rules (Non-Negotiable)

**DR-001: Silent Exclusion** – Never expose why anticorruption score is 0; only the boolean flag crosses the schema boundary. Show "Information from anti-corruption databases affected this score."

**DR-002: Political Neutrality** – No party colors in UI (neutral gray/blue palette). Use uniform scoring (0.25 weights). No "best/worst/corrupt/clean" labels; use factual language only.

**DR-003: Public Data Only** – All data from government sources under LAI; no scraping, no user-generated content in MVP.

**DR-005: CPF Never Exposed** – CPF is AES-256-GCM encrypted at rest, SHA-256 hashed for lookups, exists only in `internal_data.politician_identifiers`. No API, log, or error message may contain a CPF.

**DR-006: No Retaliation Risk** – Internal data (exclusion records, CPF matches, audit logs) must never be publicly accessible.

---

## Testing Strategy

Unit tests use Vitest; store in `*.test.ts` co-located with source. Test pure functions, transformers, score calculators.

Integration tests require real PostgreSQL in `__tests__/integration/`.

E2E tests use Playwright in `apps/web/e2e/` for critical user flows.

All public function signatures must have explicit return types in tests.

---

## Environment Variables & Configuration

Never commit `.env` files; use `.env.example` with placeholders.

Validate all environment variables at startup using Zod schemas; fail fast on missing values.

Prefix frontend-exposed variables with `NEXT_PUBLIC_`.

Secrets (DATABASE_URL, API_KEYS, CPF_ENCRYPTION_KEY) never appear in logs or error messages.

---

## Pre-PR Code Review Checklist

Verify `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `vercel build` all pass (both last two are MANDATORY).

Verify `pnpm test` passes all unit and integration tests.

Confirm no `any` types, no hardcoded secrets, no CPF values in logs.

Verify import boundaries respected: API does not import internal schema or pipeline.

Check database migrations are reversible (up and down).

Verify public-facing text is politically neutral and factual.

Verify new API endpoints include request/response schemas with TypeBox.

Verify new components are accessible (keyboard navigation, ARIA attributes).

For UI changes, verify compliance with `docs/prd/frontend_design_prd.md` (design tokens, typography, dark mode, component specs).

Confirm conventional commit format: `<type>(<scope>): <description>` with scopes (api, web, pipeline, db, shared, infra).

---

## Conventional Commits

Commit types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

Commit scopes: `api`, `web`, `pipeline`, `db`, `shared`, `infra`.

Examples: `feat(api): add cursor-based pagination`, `fix(pipeline): handle Senado XML empty response`.

---

## Frontend-Specific Rules (Next.js 15)

Use ISR (Incremental Static Regeneration) for politician detail pages.

Ensure proper ARIA labels and keyboard navigation on all interactive components.

Use Next.js App Router; avoid Pages Router.

Verify `searchParams` is treated as Promise (Next.js 15); use Suspense where needed.

Use design tokens from `docs/prd/frontend_design_prd.md` (colors, typography, spacing, border-radius).

Never use party colors in UI; maintain political neutrality.

---

## Backend-Specific Rules (Fastify 5 + Drizzle)

All route handlers must use explicit return types.

Use Drizzle ORM for all database queries; never write raw SQL.

Validate all incoming requests using TypeBox schemas.

Handle errors gracefully; never expose internal error details to clients.

Use pg-boss for async tasks (scoring, data ingestion); options must include `name` field.

Prefix pipeline endpoints with `/internal/` to signal internal-only access.

---

## Pipeline-Specific Rules (Data Ingestion)

All source adapters follow the `*.adapter.ts` naming convention.

CPF encryption/decryption uses AES-256-GCM from `src/crypto/cpf.ts`.

Idempotency key = `source + external_id` composite to prevent duplicates.

Pipeline publishes results to `public` schema only (via `pipeline_admin` role).

All adapters include fallback handling for missing/empty responses from government APIs.

---

## Security Rules

Never log sensitive data (CPF, credentials, API keys).

Always use environment variables for secrets; never hardcode.

Validate input at API boundaries; trust internal code.

Database-level RBAC enforced: `api_reader` has zero permissions on `internal_data`.

Use HTTPS for all external API calls; validate SSL certificates.

---

## Code Quality & Performance

Avoid premature abstraction; write simple code first.

Use early returns to reduce nesting.

Keep functions small and focused (single responsibility).

Avoid deep property access chains; destructure early.

Use type guards instead of type assertions.

---

## Dependency Management

Prefer libraries for cross-cutting concerns: date-fns/dayjs for dates, zod for validation, axios for HTTP.

Avoid unnecessary dependencies; evaluate npm package before adding.

Pin major versions in package.json; use `^` for semver.

Regularly audit dependencies with `pnpm audit`.

---

## Documentation & Clarity

Public function signatures must have clear, descriptive names.

Use JSDoc comments only for complex logic; avoid stating the obvious.

Provide context in commit messages: explain "why," not just "what."

Update `.env.example` when adding new environment variables.

Update `CLAUDE.md` and layer-specific guides when architectural changes are made.

---

## When Copilot Code Review Applies

This file guides Copilot Chat and Copilot code review agent when reviewing PRs, suggesting refactors, or answering code questions about Political Authority Highlighter.

Ensure all suggestions align with domain rules (DR-001 through DR-006) and TypeScript strict mode.
