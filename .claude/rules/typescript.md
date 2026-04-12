---
description: TypeScript strict rules — no any, no enum, no as assertions, explicit return types
paths: ["**/*.ts", "**/*.tsx"]
---

# TypeScript Strict Rules

- **No `any`** — use `unknown` + type guards or Zod/TypeBox parsing
- **No `enum` keyword** — use `const` + `as const` + type alias (causes `no-unsafe-enum-comparison` lint errors). Pattern: `export const Role = { DEPUTADO: 'deputado' } as const; export type Role = typeof Role[keyof typeof Role]`
- **No `as` assertions** — except `as const` and `as unknown as T` in test factories
- **`exactOptionalPropertyTypes` is on** — never `{ cursor: string | undefined }` for `{ cursor?: string }`. Build conditionally: `cursor !== undefined ? { cursor } : {}`
- **`interface`** for extendable shapes, **`type`** for unions/intersections
- All public function signatures require **explicit return types**
