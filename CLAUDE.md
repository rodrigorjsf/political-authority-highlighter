# Political Authority Highlighter

Stack: TypeScript 5.4+ | Next.js 15 | Fastify 5 | Supabase (PostgreSQL 16) | Drizzle ORM | pg-boss 10 | pnpm workspaces + Turborepo

PRD: `docs/prd.md` | Architecture: `ARCHITECTURE.md`

## Commands

```bash
pnpm build                               # All packages (Turborepo)
pnpm lint                                # All packages
pnpm typecheck                           # Requires ^build first
pnpm test                                # Unit tests only
vercel build --yes                       # MANDATORY pre-PR gate (catches webpack errors pnpm typecheck misses)

# Per-package
pnpm --filter @pah/web test:e2e          # Playwright — use WEB_PORT=3001 in Claude sessions (port 3000 blocked by MCP)
pnpm --filter @pah/api test:integration  # Requires live PostgreSQL (Testcontainers)
pnpm --filter @pah/db migrate            # Apply Drizzle migrations

# Local dev (three separate processes)
supabase start                           # PostgreSQL 16 on port 54322 (NOT 5432)
pnpm --filter @pah/api dev               # Port 3001
pnpm --filter @pah/web dev               # Port 3000
```

## Import Boundaries (ESLint-enforced)

| Package | May Import | Must NOT Import |
|---------|-----------|-----------------|
| `apps/web/` | `packages/shared/` | `packages/db/`, `apps/api/`, `apps/pipeline/` |
| `apps/api/` | `packages/shared/`, `packages/db/public-schema.ts` | `packages/db/internal-schema.ts`, `apps/pipeline/` |
| `apps/pipeline/` | `packages/shared/`, `packages/db/*` | `apps/web/`, `apps/api/` |
| `packages/shared/` | Nothing | Everything |
| `packages/db/` | `packages/shared/` | `apps/*` |

## TypeScript Rules

- No `any`. Use `unknown` + type guards.
- **Never use `enum` keyword** — use `const` + `as const` + type alias: `export const Role = { DEPUTADO: 'deputado', SENADOR: 'senador' } as const; export type Role = typeof Role[keyof typeof Role]`
- `exactOptionalPropertyTypes` is on: never `{ cursor: string | undefined }` for `{ cursor?: string }` — build conditionally: `cursor !== undefined ? { cursor } : {}`
- `as` assertions banned except `as unknown as T` in test factories
- `interface` for extendable shapes, `type` for unions/intersections
- All public function signatures require explicit return types
- Use `ms` package for time values instead of multiplying numbers

## Workflow

- Plan mode for any non-trivial task (3+ steps or architectural decisions)
- After corrections: update `tasks/lessons.md`
- Verify before done: run tests, check logs, demonstrate correctness
- Pre-PR: `pnpm build && vercel build --yes` must both pass

## Critical Domain Rules

**DR-001 (Silent Exclusion)**: Never expose why anticorruption score is 0. Only `exclusion_flag` boolean crosses from `internal_data` to `public`. Display: "Information from anti-corruption databases affected this score." No source, record, or date.

**DR-002 (Political Neutrality)**: No party colors. Equal score weights (0.25 each). No labels like "best," "worst," "corrupt," "clean." Numbers only (72/100).

**DR-003 (Public Data Only)**: All data from public government sources under LAI. No scraping private sources.

**DR-004 (Transparency)**: Absence of data lowers transparency sub-score only — not anticorruption score.

**DR-005 (CPF)**: CPFs encrypted (AES-256-GCM) + hashed (SHA-256) for lookups. Exist only in `internal_data.politician_identifiers`. Never in logs, errors, or API responses. `api_reader` has no access to this table.

**DR-006 (No Retaliation)**: `api_reader` role has zero permissions on `internal_data`. Enforced at database level, not application level.

## Key Domain Terms

| Term | Meaning |
|------|---------|
| Exclusion Flag | Boolean-only bridge from `internal_data` → `public` schema |
| Silent Exclusion | Anticorruption = 0 but details never exposed (DR-001) |
| Idempotency Key | `source + external_id` composite — prevents duplicate records |
| Public Schema | `public` PostgreSQL schema (SELECT only via `api_reader` role) |
| Internal Schema | `internal_data` PostgreSQL schema (`pipeline_admin` only) |
| Slug | URL identifier: `joao-silva-sp` (name + state) |
| Transparency Score | Rewards data availability (0-25); absence ≠ corruption |

## Scope Guides

| Layer | Guide | Scope |
|-------|-------|-------|
| Frontend | `apps/web/CLAUDE.md` | Next.js pages, components, ISR, SEO, accessibility, design PRD |
| Backend API | `apps/api/CLAUDE.md` | Fastify routes, services, Drizzle queries, TypeBox schemas |
| Pipeline | `apps/pipeline/CLAUDE.md` | Adapters, transformers, scoring, pg-boss, CPF crypto |
| Shared Package | `packages/shared/CLAUDE.md` | Zero-dep rule, export patterns |
| DB Package | `packages/db/CLAUDE.md` | Dual-schema, Drizzle patterns, migrations |
| Infrastructure | `infrastructure/CLAUDE.md` | Supabase CLI, CI/CD, secrets |

## Pre-PR Checklist

- [ ] `pnpm build` passes
- [ ] `vercel build --yes` passes (MANDATORY — final gate)
- [ ] `pnpm lint` zero warnings
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] No `any` types, no `enum` keyword, no hardcoded secrets
- [ ] No CPF in logs, errors, or responses (DR-005)
- [ ] Import boundaries respected (API never imports internal schema)
- [ ] New env vars added to `.env.example`
- [ ] Migrations reversible (up and down)
- [ ] UI text politically neutral (DR-002)
- [ ] New components accessible (keyboard navigable, proper ARIA)
- [ ] UI changes: run `web-frontend-design` skill checklist
- [ ] Conventional commit: `type(scope): description` (scopes: api, web, pipeline, db, shared, infra)
