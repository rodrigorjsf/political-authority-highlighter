---
description: Import boundary enforcement — prevents cross-layer imports
paths: ["apps/**"]
---

# Import Boundaries (ESLint-enforced)

| Source | May Import | Must NOT Import |
|--------|-----------|-----------------|
| `apps/web/` | `packages/shared/` | `packages/db/`, `apps/api/`, `apps/pipeline/` |
| `apps/api/` | `packages/shared/`, `@pah/db/public-schema` | `@pah/db/internal-schema`, `apps/pipeline/` |
| `apps/pipeline/` | `packages/shared/`, `packages/db/*` | `apps/web/`, `apps/api/` |

Additional web restrictions: no imports of `drizzle-orm`, `pg`, `pg-boss`. Only `NEXT_PUBLIC_API_URL` uses the `NEXT_PUBLIC_` prefix.
