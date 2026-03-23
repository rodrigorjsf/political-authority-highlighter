# Shared Package -- Political Authority Highlighter

`packages/shared` has **zero external dependencies**. It exports domain types, constants, and utilities for use by all apps.

## Critical Export Rules

**Value exports must be inlined in `src/index.ts`** — do not re-export values from submodule paths (e.g., `export { Role } from './enums.js'`). This fails in Next.js webpack because it cannot resolve `.js` → `.ts`. `transpilePackages` does not fix this.

**Type-only re-exports from submodules are safe** — they are erased at compile time:

```typescript
// SAFE: type-only, erased at compile time
export type { Politician } from './types/politician.js'

// UNSAFE: value re-export via submodule path — webpack cannot resolve
export { Role } from './enums.js'  // ← BREAKS Next.js build

// CORRECT: inline value in index.ts
export const Role = { DEPUTADO: 'deputado', SENADOR: 'senador' } as const
export type Role = typeof Role[keyof typeof Role]
```

**Never use `enum` keyword for shared constants** — use `const` + `as const` + type alias. The `enum` keyword causes `@typescript-eslint/no-unsafe-enum-comparison` errors when comparing against interface fields typed as string unions.

## Current Value Exports (inline in `src/index.ts`)

`Role`, `LegislativeSource`, `REVALIDATE` constants, `formatCurrency`, `formatDate`, `slugify` — all inlined directly, not re-exported from submodules.

## Adding New Exports

1. **New type** → add to appropriate `src/types/*.ts` file, re-export as `export type { ... }` from `index.ts`
2. **New value** (constant, function) → add implementation inline in `index.ts` or import from a local helper without submodule re-export
3. **No new dependencies** — this package must stay dependency-free
