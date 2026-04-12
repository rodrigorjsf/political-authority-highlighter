# Political Authority Highlighter

Brazilian political transparency platform. Stack: TypeScript 5.4+ | Next.js 15 | Fastify 5 | Supabase (PostgreSQL 16) | Drizzle ORM | pg-boss 10 | pnpm workspaces + Turborepo

PRD: `docs/prd/PRD.md` | Architecture: `docs/prd/ARCHITECTURE.md`

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
```

## Import Boundaries (ESLint-enforced)

| Package | May Import | Must NOT Import |
|---------|-----------|-----------------|
| `apps/web/` | `packages/shared/` | `packages/db/`, `apps/api/`, `apps/pipeline/` |
| `apps/api/` | `packages/shared/`, `packages/db/public-schema.ts` | `packages/db/internal-schema.ts`, `apps/pipeline/` |
| `apps/pipeline/` | `packages/shared/`, `packages/db/*` | `apps/web/`, `apps/api/` |
| `packages/shared/` | Nothing | Everything |
| `packages/db/` | `packages/shared/` | `apps/*` |

## Critical Domain Rules

**DR-001 (Silent Exclusion)**: Never expose why anticorruption score is 0. Only `exclusion_flag` boolean crosses from `internal_data` to `public`. Display: "Information from anti-corruption databases affected this score."

**DR-002 (Political Neutrality)**: No party colors. Equal score weights (0.25 each). No labels like "best," "worst," "corrupt," "clean." Numbers only (72/100).

**DR-003 (Public Data Only)**: All data from public government sources under LAI.

**DR-004 (Transparency)**: Absence of data lowers transparency sub-score only — not anticorruption score.

**DR-005 (CPF)**: CPFs encrypted (AES-256-GCM) + hashed (SHA-256). Exist only in `internal_data.politician_identifiers`. Never in logs, errors, or API responses.

**DR-006 (No Retaliation)**: `api_reader` role has zero permissions on `internal_data`. Enforced at database level.

## Applied Learning

When something fails repeatedly, when User has to re-explain, or when a workaround is found for a platform/tool limitation, add a one-line bullet here. Keep  each bullet under 15 words. No explanations. Only add things that will save time in futures sessions.

- Agents fail silently on wrong paths. Always verify hardcoded paths.