# Political Authority Highlighter -- Project Development Guide
# Architecture: Managed Infrastructure with Supabase
# Stack: TypeScript 5.4+ | Next.js 15 | Fastify 5 | Supabase (PostgreSQL 16) | Drizzle ORM | pg-boss 10
# Last Updated: 2026-03-08 | PRD Version: 1.1

## Core Principles

> Applied from: Clean Architecture (Martin), Domain-Driven Design (Evans), The Pragmatic Programmer (Hunt/Thomas), SOLID Principles, 12-Factor App (Wiggins)

1. **Dependency Rule (Clean Architecture)**: Dependencies point inward. The API layer never references pipeline internals. The frontend never imports database schemas. Domain types in `packages/shared` have zero external dependencies.

2. **Schema Isolation as Security Boundary (DDD Bounded Contexts)**: The `public` and `internal_data` PostgreSQL schemas are treated as separate bounded contexts. The API bounded context can only read from `public`. The pipeline bounded context owns both schemas. The only data that crosses the boundary is the `exclusion_flag` boolean.

3. **DRY with Shared Packages (Pragmatic Programmer)**: Domain types (`Politician`, `IntegrityScore`, `Bill`), constants (score weights, source configs), and utilities (slug generation, date formatting) live in `packages/shared`. Never duplicate type definitions across apps.

4. **Configuration in Environment (12-Factor)**: All secrets, API keys, and environment-specific values come from environment variables. Never hardcode URLs, credentials, or feature flags. Use `.env.local` for development, Docker secrets or environment variables for production.

5. **Political Neutrality by Design (Domain Rule)**: The platform presents factual public data without editorial bias. No party colors in the UI. Uniform scoring methodology applied equally. No ranking labels like "best" or "worst." This is a cross-cutting constraint that affects every layer.

---

## Product Domain

Political Authority Highlighter is a Brazilian political transparency platform that cross-references 6+ government data sources (Camara, Senado, Portal da Transparencia, TSE, TCU, CGU) to surface public integrity data about politicians. All data is public government data accessed under LAI (Lei de Acesso a Informacao).

### Ubiquitous Language

| Term | Definition | Code Reference |
|------|-----------|---------------|
| Politician | A Brazilian federal legislator (deputado or senador) | `Politician` type |
| Integrity Score | Pre-computed 0-100 composite score across 4 dimensions | `IntegrityScore` type |
| Transparency Score | 0-25 sub-score measuring data availability across sources | `transparency_score` field |
| Legislative Score | 0-25 sub-score measuring parliamentary activity | `legislative_score` field |
| Financial Score | 0-25 sub-score measuring expense/asset regularity | `financial_score` field |
| Anticorruption Score | 0-25 binary sub-score (25 if clean, 0 if any exclusion) | `anticorruption_score` field |
| Exclusion Flag | Boolean-only bridge from internal to public schema | `exclusion_flag` field |
| Silent Exclusion | Pattern where anticorruption impact is visible but details are hidden | ADR-004 |
| Source Adapter | Module that fetches and parses data from one government API | `*.adapter.ts` files |
| Ingestion Pipeline | Batch process that fetches, transforms, scores, and publishes data | `apps/pipeline/` |
| Public Schema | `public` PostgreSQL schema serving the API (SELECT only) | `packages/db/public-schema.ts` |
| Internal Schema | `internal_data` PostgreSQL schema for pipeline processing | `packages/db/internal-schema.ts` |
| Slug | URL-friendly politician identifier (e.g., `joao-silva-sp`) | `slug` field |
| Idempotency Key | `source + external_id` composite ensuring no duplicate records | `idempotency_key` field |

---

## Monorepo Structure

```
political-authority-highlighter/
+-- package.json                    # pnpm workspace root
+-- pnpm-workspace.yaml
+-- turbo.json                      # Turborepo build orchestration
+-- tsconfig.base.json              # Shared TypeScript strict config
+-- .eslintrc.cjs                   # Root ESLint config
+-- .prettierrc                     # Prettier config
+-- docker-compose.yml
+-- CLAUDE.md                       # THIS FILE - project-wide guide
+-- ARCHITECTURE.md                 # Full architecture document
+-- .github/
|   +-- workflows/
|       +-- ci.yml                  # Lint, type-check, test, build
|       +-- deploy.yml              # Deploy backend to Supabase, frontend auto-deploys on Vercel
+-- packages/
|   +-- shared/                     # Domain types, constants, utilities
|   |   +-- src/
|   |   |   +-- types/              # Politician, IntegrityScore, Bill, Vote, Expense, etc.
|   |   |   +-- constants/          # Score weights, source configurations, API paths
|   |   |   +-- utils/              # slugify, formatDate, formatCurrency (BRL)
|   |   +-- package.json
|   +-- db/                         # Drizzle schemas, migrations, database clients
|       +-- src/
|       |   +-- public-schema.ts    # Drizzle pgSchema('public') tables
|       |   +-- internal-schema.ts  # Drizzle pgSchema('internal_data') tables
|       |   +-- clients.ts          # publicDb (api_reader) + pipelineDb (pipeline_admin)
|       |   +-- migrate.ts          # Migration runner
|       +-- migrations/
|       |   +-- public/             # public schema migrations
|       |   +-- internal/           # internal_data schema migrations
|       +-- drizzle.config.ts
|       +-- package.json
+-- apps/
    +-- web/                        # Next.js 15 frontend (deployed on Vercel)
    |   +-- CLAUDE.md               # Frontend development guide
    |   +-- src/
    |   +-- next.config.ts
    |   +-- package.json
    +-- api/                        # Fastify 5 backend API (deployed on Supabase Edge)
    |   +-- CLAUDE.md               # Backend development guide
    |   +-- src/
    |   +-- package.json
    +-- pipeline/                   # Data ingestion pipeline (deployed on Supabase / GitHub Actions)
        +-- CLAUDE.md               # Pipeline-specific guide
        +-- src/
        +-- package.json
+-- infrastructure/
    +-- CLAUDE.md                   # Infrastructure and DevOps guide
    +-- docker-compose.yml          # Local development environment
    +-- init-schemas.sql
```

### Import Boundaries (Enforced via ESLint)

| Source | May Import From | Must NOT Import From |
|--------|----------------|---------------------|
| `apps/web/` | `packages/shared/` | `packages/db/`, `apps/api/`, `apps/pipeline/` |
| `apps/api/` | `packages/shared/`, `packages/db/public-schema.ts` | `packages/db/internal-schema.ts`, `apps/pipeline/` |
| `apps/pipeline/` | `packages/shared/`, `packages/db/*` (all) | `apps/web/`, `apps/api/` |
| `packages/shared/` | Nothing (zero dependencies) | Everything |
| `packages/db/` | `packages/shared/` | `apps/*` |

---

## TypeScript Configuration

All packages use `tsconfig.base.json` as the base with these strict settings:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Rules:**
- The `any` type is banned. Use `unknown` and narrow with type guards.
- Prefer `interface` for object shapes that may be extended, `type` for unions, intersections, and mapped types.
- All public function signatures must have explicit return types.
- Use `as const` for literal constants. Never use `as` type assertions except `as unknown as T` in test factories.

---

## Code Style Rules

### General Principles

- **TypeScript**: All code must be strictly typed, leverage TypeScript's type safety features

### Code Formatting

- No semicolons (enforced)
- Single quotes (enforced)
- No unnecessary curly braces (enforced)
- 2-space indentation
- Import order: external → internal → types

### Code style rules

- Interfaces over types - use interfaces for object types
- Use enum for constant values, prefer them over string literals
- Export all types by default
- Use type guards instead of type assertions

### Best Practices

#### Library-First Approach

- Common areas where libraries should be preferred:
  - Date/time manipulation → date-fns, dayjs
  - Form validation → joi, yup, zod
  - HTTP requests → axios, got
  - State management → Redux, MobX, Zustand
  - Utility functions → lodash, ramda

#### Code Quality

- Use destructuring of objects where possible:
  - Instead of `const name = user.name` use `const { name } = user`
  - Instead of `const result = await getUser(userId)` use `const { data: user } = await getUser(userId)`
  - Instead of `const parseData = (data) => data.name` use `const parseData = ({ name }) => name`
- Use `ms` package for time related configuration and environment variables, instead of multiplying numbers by 1000

---

## Code Formatting and Linting

**Prettier** (runs on save and pre-commit):
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

**ESLint** extends:
- `@typescript-eslint/recommended-type-checked`
- `eslint-plugin-import` with `import/no-restricted-paths` for boundary enforcement
- `eslint-plugin-drizzle` for safe query patterns (in db package)

---

## Git Conventions

### Branch Naming

```
feat/PAH-<number>-<short-description>
fix/PAH-<number>-<short-description>
chore/<short-description>
docs/<short-description>

Examples:
  feat/PAH-12-politician-profile-page
  fix/PAH-45-score-calculation-rounding
  chore/upgrade-drizzle-orm
```

### Conventional Commits

```
<type>(<scope>): <description>

Types: feat, fix, refactor, docs, test, chore, perf, ci
Scopes: api, web, pipeline, db, shared, infra

Examples:
  feat(api): add cursor-based pagination to politician listing
  fix(pipeline): handle Senado XML empty response gracefully
  refactor(db): split public schema migrations into separate directory
  test(api): add integration tests for expense endpoint
  chore(infra): upgrade PostgreSQL image to 16.6
```

### Pre-commit Hooks (via lint-staged + husky)

1. `prettier --write` on staged files
2. `eslint --fix` on staged `.ts`/`.tsx` files
3. `tsc --noEmit` type check on the affected package

---

## Environment Variable Management

**Rules:**
- Never commit `.env` files. Add `.env*` to `.gitignore` (except `.env.example`).
- Every environment variable must have an entry in `.env.example` with a placeholder value.
- Validate all environment variables at application startup using Zod schemas. Fail fast on missing variables.
- Prefix frontend-exposed variables with `NEXT_PUBLIC_`.

### Required Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `DATABASE_URL` | api, pipeline | PostgreSQL connection string |
| `DATABASE_URL_READER` | api | Connection string with `api_reader` role |
| `DATABASE_URL_WRITER` | pipeline | Connection string with `pipeline_admin` role |
| `CPF_ENCRYPTION_KEY` | pipeline | AES-256-GCM key for CPF encryption (32 bytes, hex-encoded) |
| `TRANSPARENCIA_API_KEY` | pipeline | Portal da Transparencia API key |
| `VERCEL_REVALIDATE_TOKEN` | pipeline | Secret for triggering ISR revalidation |
| `NEXT_PUBLIC_API_URL` | web | Backend API base URL |
| `NODE_ENV` | all | `development`, `production`, `test` |

---

## Testing Strategy

| Type | Tool | Location | What to Test |
|------|------|----------|-------------|
| Unit | Vitest | `*.test.ts` co-located with source | Pure functions, transformers, score calculators, utilities |
| Integration | Vitest + Testcontainers | `__tests__/integration/` | Database queries, API routes with real PostgreSQL |
| E2E | Playwright | `apps/web/e2e/` | Critical user flows: search, profile view, ranking |
| Schema | Vitest | `packages/db/__tests__/` | Migration up/down, schema constraints |

### Test Naming Convention

```typescript
// Unit test
describe('calculateIntegrityScore', () => {
  it('returns 0 for anticorruption component when exclusion records exist', () => {
    // Arrange
    const components = buildScoreComponents({ hasExclusions: true })
    // Act
    const score = calculateIntegrityScore(components)
    // Assert
    expect(score.anticorruptionScore).toBe(0)
  })
})
```

### Coverage Targets

| Package | Minimum Coverage |
|---------|-----------------|
| `packages/shared/` | 90% |
| `apps/api/services/` | 80% |
| `apps/pipeline/scoring/` | 90% |
| `apps/pipeline/transformers/` | 85% |
| `apps/pipeline/adapters/` | 70% (external API mocking) |
| `apps/web/` | 60% (focus on E2E) |

---

## Critical Domain Rules

These rules are non-negotiable and must be enforced in code reviews and automated checks.

### DR-001: Silent Exclusion

The public API and frontend must NEVER expose why a politician's anticorruption score is 0. Only the boolean `exclusion_flag` crosses from `internal_data` to `public`. The frontend displays: "Information from anti-corruption databases affected this score" with a link to public government transparency portals. No record details, no source names, no dates.

### DR-002: Political Neutrality

- No party colors anywhere in the UI. Use a neutral gray/blue palette.
- Scoring methodology applies uniformly. Equal weights (0.25 each) for all four components.
- No ranking labels like "best," "worst," "corrupt," or "clean."
- Use factual language: "Score: 72/100" not "Good politician."

### DR-003: Public Data Only

All data comes from publicly accessible government sources under LAI. No scraping of private sources. No user-generated content in MVP. No authentication system needed.

### DR-004: Transparency Rewards Data Availability

Politicians who provide more data to public systems score higher on the transparency component. Absence of data is not penalized as corruption -- it simply results in a lower transparency sub-score.

### DR-005: CPF Never Exposed

CPF (Cadastro de Pessoas Fisicas) is always encrypted (AES-256-GCM) at rest and hashed (SHA-256) for lookups. CPFs exist only in `internal_data.politician_identifiers`. The API has no access to this table (enforced at the PostgreSQL role level). No API endpoint, log entry, or error message may ever contain a CPF.

### DR-006: No Retaliation Risk

Internal data (exclusion records, CPF matches, audit logs) must never be publicly accessible. The `api_reader` database role has zero permissions on `internal_data`. This is enforced at the database level, not the application level.

---

## Key Architectural Decisions Summary

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-001 | Two-schema PostgreSQL with RBAC | Database-level isolation; even SQL injection on API cannot reach internal data |
| ADR-002 | ISR on Vercel for SEO | Sub-second page loads, zero frontend hosting cost, daily data update cadence |
| ADR-003 | pg-boss (no Redis) | Single data store, $5/month saved, <100 jobs/day does not need Redis throughput |
| ADR-004 | Silent exclusion via boolean flag | LGPD data minimization, no retaliation risk, political neutrality |
| ADR-005 | Drizzle ORM dual-schema type safety | Compile-time prevention of cross-schema access from API module |
| ADR-006 | Managed infrastructure with Supabase | Zero maintenance, PITR, Supavisor pooling, solo developer ops simplicity |
| ADR-007 | Application-layer CPF encryption | Encryption key never reaches database process memory |

---

## Pre-PR Checklist

Before opening a pull request, verify:

- [ ] `pnpm lint` passes across all packages (zero warnings)
- [ ] `pnpm typecheck` passes with `tsc --noEmit`
- [ ] `pnpm test` passes all unit and integration tests
- [ ] No `any` types introduced
- [ ] No hardcoded URLs, secrets, or environment-specific values
- [ ] No CPF values in logs, error messages, or API responses
- [ ] Import boundaries respected (API does not import internal schema)
- [ ] New environment variables added to `.env.example`
- [ ] Database migrations are reversible (up and down)
- [ ] Public-facing text is politically neutral and factual
- [ ] New API endpoints include request/response schemas with TypeBox
- [ ] New components are accessible (keyboard navigable, proper ARIA attributes)
- [ ] Conventional commit message format used

---

## Layer-Specific Guides

| Layer | Guide Location | Scope |
|-------|---------------|-------|
| Backend (API + Pipeline) | `apps/api/CLAUDE.md` | Fastify routes, services, Drizzle queries, pipeline adapters, scoring |
| Frontend | `apps/web/CLAUDE.md` | Next.js pages, components, ISR, SEO, accessibility |
| Infrastructure | `infrastructure/CLAUDE.md` | Docker Compose, PostgreSQL, backups, CI/CD, monitoring |

---

## Changelog

| Date | PRD Version | Summary |
|------|-------------|---------|
| 2026-02-28 | 1.0 | Initial project-wide development guide |
