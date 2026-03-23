---
description: packages/db Drizzle patterns — GIN index syntax, dual-schema, server-only
paths: ["packages/db/**", "**/public-schema*", "**/internal-schema*", "**/drizzle*"]
---

# DB Package Patterns

## Schema Names

- Public: `pgSchema('public')` — NOT `pgSchema('public_data')`
- Internal: `pgSchema('internal_data')`
- SQL migrations use `public.` and `internal_data.` prefixes

## GIN Index Syntax (Drizzle 0.36)

```typescript
// CORRECT
index('idx_name').using('gin', table.column)

// WRONG — older API, will error or create wrong index
index('idx_name').on(table.column).using('gin')
```

## Null Safety (`noUncheckedIndexedAccess`)

`rows[0]` is `T | undefined` — always null-check:

```typescript
return result[0] ?? null   // correct
return result[0]            // TypeScript error
```

## Access Boundary

- `apps/api/` → only `@pah/db/public-schema`
- `apps/pipeline/` → `@pah/db/public-schema`, `@pah/db/internal-schema`, `@pah/db/clients`
- `apps/web/` → never imports from `@pah/db` (build fails via `server-only`)

## No Build Script

Package exports TypeScript source directly. Turborepo `^build` does not compile this package — consumers receive source files.
