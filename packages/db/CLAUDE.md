# DB Package — Political Authority Highlighter

Exports three path-specific entries: `@pah/db/public-schema`, `@pah/db/internal-schema`, `@pah/db/clients`.

See `.claude/rules/db-patterns.md` for Drizzle patterns (GIN index syntax, null safety, schema names, access boundaries).

**Package has no `build` script** — exports TypeScript source directly via `"exports"` in `package.json`. Turborepo `^build` dependency does not compile this package.

## Migration Workflow

1. `pnpm --filter @pah/db exec drizzle-kit generate` → writes to `packages/db/migrations/`
2. Copy new files to `supabase/migrations/` (including `internal/` subdirectory)
3. `supabase db reset` → applies locally (migrations + `roles.sql` + seed)
4. `supabase db push` → applies to remote (CI/CD)

All migrations must be reversible (up and down).
