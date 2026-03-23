---
description: Prohibit TypeScript enum keyword — use const + as const + type alias pattern
paths: ["**/*.ts", "**/*.tsx"]
---

# No TypeScript `enum` Keyword

**Never use the `enum` keyword.** It causes `@typescript-eslint/no-unsafe-enum-comparison` errors when comparing enum values against interface fields typed as string unions.

## Required Pattern

```typescript
// CORRECT: const + as const + type alias
export const Role = {
  DEPUTADO: 'deputado',
  SENADOR: 'senador',
} as const
export type Role = typeof Role[keyof typeof Role]

// WRONG: enum keyword
export enum Role {         // ← causes lint errors in comparisons
  DEPUTADO = 'deputado',
  SENADOR = 'senador',
}
```

## Why

Comparing an `enum` value against a `string` field (e.g., `if (politician.role === Role.DEPUTADO)`) triggers `no-unsafe-enum-comparison`. The `const` + `as const` pattern produces a string literal union that compares cleanly.

All existing domain enums (`Role`, `LegislativeSource`) already follow this pattern in `packages/shared/src/index.ts`.
