---
description: packages/shared export rules — value inlining, no submodule re-exports
paths: ["packages/shared/**"]
---

# packages/shared Export Rules

## Value Exports Must Be Inlined in `src/index.ts`

Do NOT re-export values via submodule paths:

```typescript
// BREAKS Next.js webpack (cannot resolve .js -> .ts)
export { Role } from './enums.js'
export { REVALIDATE } from './constants.js'

// CORRECT: inline directly in index.ts
export const Role = { DEPUTADO: 'deputado', SENADOR: 'senador' } as const
export type Role = typeof Role[keyof typeof Role]
```

`transpilePackages` does NOT fix this. The only workaround is inlining.

## Type Exports via Submodule Paths Are Safe

```typescript
// SAFE: types are erased at compile time
export type { Politician } from './types/politician.js'
export type { IntegrityScore } from './types/score.js'
```

## Zero External Dependencies

This package must have **zero** entries in `dependencies` and `devDependencies` (test-only tools aside). Domain types, utilities, and constants only.

## No `enum` Keyword

Use `const` + `as const` pattern — see `.claude/rules/typescript.md`.
