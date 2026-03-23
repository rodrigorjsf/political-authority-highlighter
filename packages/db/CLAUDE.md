# DB Package -- Political Authority Highlighter

Exports three path-specific entries: `@pah/db/public-schema`, `@pah/db/internal-schema`, `@pah/db/clients`.

## Access Rules

- `apps/api/` may only import `@pah/db/public-schema` — never `internal-schema` or `clients`
- `apps/pipeline/` may import all three
- `apps/web/` must never import from `@pah/db` (enforced by ESLint + `server-only`)
- The package has `server-only` as a dependency — importing it in any Client Component throws at build time

## Schema Names

- Public schema: `pgSchema('public')` — NOT `pgSchema('public_data')`
- Internal schema: `pgSchema('internal_data')`
- All SQL migrations use `public.` and `internal_data.` prefixes

## Non-Standard Patterns

**GIN index syntax (Drizzle 0.36)**:

```typescript
// CORRECT
index('name').using('gin', column)
// WRONG (older API — will fail silently or error)
index('name').on(column).using('gin')
```

**`noUncheckedIndexedAccess`**: `rows[0]` is `T | undefined`. Always null-check:

```typescript
return result[0] ?? null  // CORRECT
return result[0]           // TypeScript error
```

**Package has no `build` script** — exports TypeScript source directly via `"exports"` in `package.json`. Turborepo `^build` dependency does not compile this package.

## Migration Workflow

1. `pnpm --filter @pah/db drizzle-kit generate` → writes to `packages/db/migrations/`
2. Copy new files to `supabase/migrations/` (including `internal/` subdirectory)
3. `supabase db reset` → applies locally (migrations + `roles.sql` + seed)
4. `supabase db push` → applies to remote (CI/CD)

All migrations must be reversible (up and down).
