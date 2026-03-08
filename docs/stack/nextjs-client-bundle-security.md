# Next.js Client Bundle Analysis & Sensitive Data Leak Prevention

> Researched: 2026-03-07 | Next.js version: 15+ (verified against v16.1.6 docs) | Status: complete

## 1. The `server-only` Package

### What It Does

The `server-only` package causes a **build-time error** if a module that imports it is
transitively imported into a Client Component (any file in the `'use client'` module graph).
This is the primary defense against server code leaking into the client bundle.

### How Next.js Handles It

From the official docs: _"Next.js handles `server-only` and `client-only` imports internally
to provide clearer error messages when a module is used in the wrong environment. The contents
of these packages from NPM are not used by Next.js."_

Installing the npm package is **optional** -- Next.js recognizes `import 'server-only'`
natively. However, installing it avoids linting warnings about extraneous dependencies.

Next.js also provides its own type declarations for `server-only` and `client-only`, for
TypeScript configurations where `noUncheckedSideEffectImports` is active.

### Installation

```bash
pnpm add server-only
# Optionally also:
pnpm add client-only
```

### Usage Pattern

Add `import 'server-only'` at the top of any module that must never reach the client:

```typescript
// packages/db/src/public-schema.ts
import 'server-only'

// ... Drizzle schema definitions
```

```typescript
// apps/web/src/lib/api-client.ts (server-side fetch wrapper)
import 'server-only'

export async function fetchPoliticianBySlug(slug: string) {
  // Uses process.env.NEXT_PUBLIC_API_URL but also accesses
  // server-only caching features
}
```

### Where to Apply in This Project

| File / Package | Reason |
|----------------|--------|
| `packages/db/src/public-schema.ts` | Drizzle schema must never appear in client bundle |
| `packages/db/src/internal-schema.ts` | Internal schema -- doubly critical |
| `packages/db/src/clients.ts` | Database connection strings |
| `apps/web/src/app/api/revalidate/route.ts` | Uses `VERCEL_REVALIDATE_TOKEN` |
| Any future DAL (Data Access Layer) files | Per Next.js security guide recommendation |

**Source:** [Server and Client Components -- nextjs.org](https://nextjs.org/docs/app/getting-started/server-and-client-components)

---

## 2. `serverExternalPackages` in next.config.ts

### What It Does

Packages imported inside Server Components and Route Handlers are **automatically bundled**
by Next.js. The `serverExternalPackages` option opts specific packages out of this bundling,
making them use native Node.js `require` instead. This is for packages with Node.js-specific
features (native bindings, `fs`, `net`, etc.).

### Important Distinction

`serverExternalPackages` controls **server-side** bundling behavior -- it does NOT prevent
packages from appearing in client bundles. That is the job of `server-only`.

However, it is still relevant because some packages (like `pg`, database drivers) could
cause build failures if the bundler tries to resolve their Node.js dependencies. Next.js
already auto-excludes `pg` from bundling by default.

### Pre-configured Packages (auto-excluded)

Next.js maintains a built-in list. Relevant entries for this project:

- `pg` (PostgreSQL driver -- already excluded)
- `better-sqlite3`, `mongodb`, `mongoose`, `@prisma/client` (not used but illustrative)
- `sharp` (image processing)
- `pino` (logger -- used by Fastify)

### Configuration for This Project

```typescript
// apps/web/next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  serverExternalPackages: [
    // drizzle-orm uses pg under the hood
    'drizzle-orm',
    '@pah/db',
  ],
  // ... existing config
}
```

**Note:** Since `apps/web` should never import `@pah/db` at all (per import boundaries),
this is a **defense-in-depth** measure. The primary protection is the `server-only` import
in `packages/db/`.

**Source:** [serverExternalPackages -- nextjs.org](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)

---

## 3. Bundle Analysis Tools

### Option A: Next.js Bundle Analyzer for Turbopack (v16.1+, experimental)

```bash
pnpm next experimental-analyze
# Or to write output to disk (for CI diffing):
pnpm next experimental-analyze --output
```

Features:

- Filter by route, environment (client vs server), and type (JS, CSS, JSON)
- View full import chain for any module
- Trace imports across server-to-client boundaries
- Output written to `.next/diagnostics/analyze` with `--output` flag

### Option B: `@next/bundle-analyzer` (Webpack, stable)

```bash
pnpm add -D @next/bundle-analyzer
```

```typescript
// apps/web/next.config.ts
import type { NextConfig } from 'next'
import withBundleAnalyzer from '@next/bundle-analyzer'

const config: NextConfig = {
  // ... existing config
}

export default process.env.ANALYZE === 'true'
  ? withBundleAnalyzer({ enabled: true })(config)
  : config
```

```bash
ANALYZE=true pnpm --filter @pah/web build
```

Opens 3 HTML reports in browser showing client, server, and edge bundles with treemap
visualization.

### Can They Detect Server Module Leaks?

**Partially.** The bundle analyzer shows what modules are in each bundle, so you can
visually inspect the client bundle for unexpected server dependencies (e.g., `drizzle-orm`,
`pg`, `@pah/db`). However, this is a **manual** inspection. For automated CI checks, see
Section 4 below.

**Source:** [Package Bundling Guide -- nextjs.org](https://nextjs.org/docs/app/guides/package-bundling)

---

## 4. CI Step: Verify No Server-Only Code in Client Chunks

Next.js does not provide a built-in CLI command for this. However, since `next build` outputs
client chunks to `.next/static/chunks/`, you can grep them for forbidden module identifiers.

### Approach: Post-Build Grep Script

```bash
#!/usr/bin/env bash
# scripts/check-client-bundle.sh
# Fails CI if forbidden server-only modules appear in client JavaScript chunks.

set -euo pipefail

FORBIDDEN_PATTERNS=(
  "drizzle-orm"
  "@pah/db"
  "public-schema"
  "internal-schema"
  "pg-boss"
  "CPF_ENCRYPTION_KEY"
  "DATABASE_URL"
  "VERCEL_REVALIDATE_TOKEN"
)

CLIENT_CHUNKS_DIR="apps/web/.next/static/chunks"

if [ ! -d "$CLIENT_CHUNKS_DIR" ]; then
  echo "ERROR: Client chunks directory not found. Run 'next build' first."
  exit 1
fi

FOUND=0
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -rl "$pattern" "$CLIENT_CHUNKS_DIR" 2>/dev/null; then
    echo "SECURITY VIOLATION: '$pattern' found in client bundle!"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo "Client bundle contains server-only code. This is a security violation."
  echo "Check that 'import \"server-only\"' is present in all server modules."
  exit 1
fi

echo "Client bundle check passed: no forbidden patterns found."
```

### CI Integration

```yaml
# .github/workflows/ci.yml -- add after the Build step
- name: Check client bundle for server-only leaks
  run: bash scripts/check-client-bundle.sh
```

### Why This Works

After `next build`, all client-side JavaScript is written to `.next/static/chunks/`.
Even minified, module names and string literals like `drizzle-orm`, `DATABASE_URL`, etc.
are often preserved (especially package names in import paths and error messages). Grepping
for these patterns catches leaks that `server-only` might miss if someone forgets to add it.

### Limitations

- Minification may obscure some patterns (unlikely for package names)
- False positives if a pattern appears in unrelated client code (e.g., a UI string)
- Does not catch data leaks via props (use React Taint API for that)

---

## 5. ESLint Rules for Import Boundary Enforcement

### `import/no-restricted-paths`

This rule from `eslint-plugin-import` prevents files in specific directories from importing
modules from forbidden directories. It operates on **resolved paths**, not import strings.

```javascript
// .eslintrc.cjs (or equivalent ESLint config for apps/web)
module.exports = {
  plugins: ['import'],
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        // Prevent ANY web app code from importing @pah/db
        {
          target: './apps/web/src',
          from: './packages/db',
          message: 'Frontend must not import database packages. Use the API client instead.',
        },
        // Prevent ANY web app code from importing api internals
        {
          target: './apps/web/src',
          from: './apps/api',
          message: 'Frontend must not import API internals.',
        },
        // Prevent ANY web app code from importing pipeline internals
        {
          target: './apps/web/src',
          from: './apps/pipeline',
          message: 'Frontend must not import pipeline internals.',
        },
      ],
    }],
  },
}
```

### `no-restricted-imports` (built-in ESLint)

For a simpler approach that does not require `eslint-plugin-import`:

```javascript
// ESLint config for apps/web
rules: {
  'no-restricted-imports': ['error', {
    patterns: [
      {
        group: ['@pah/db', '@pah/db/*'],
        message: 'Database package must never be imported in the frontend.',
      },
      {
        group: ['pg', 'pg-pool', 'postgres', 'drizzle-orm/pg-core'],
        message: 'PostgreSQL packages must never be imported in the frontend.',
      },
      {
        group: ['pg-boss'],
        message: 'pg-boss is a server-only package.',
      },
    ],
  }],
}
```

**Source:** [eslint-plugin-import no-restricted-paths](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md), [ESLint no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports)

---

## 6. Environment Variable Security

### How `NEXT_PUBLIC_` Works

From official docs: _"Non-`NEXT_PUBLIC_` environment variables are only available in the
Node.js environment, meaning they aren't accessible to the browser."_

Next.js replaces `process.env.NEXT_PUBLIC_*` references with **hard-coded values at build
time** (inlined into the JS bundle). Non-prefixed variables are replaced with empty strings
in client code.

### Key Rules for This Project

| Variable | Prefix | Exposure |
|----------|--------|----------|
| `NEXT_PUBLIC_API_URL` | `NEXT_PUBLIC_` | Intentionally public -- API base URL |
| `VERCEL_REVALIDATE_TOKEN` | None | Server-only -- safe |
| `DATABASE_URL` | None | Server-only -- safe (but should never be in web env) |
| `CPF_ENCRYPTION_KEY` | None | Server-only -- safe (pipeline only) |

### Prevention Patterns

1. **Never prefix secrets with `NEXT_PUBLIC_`** -- this is obvious but the most common mistake.

2. **Validate at build time** -- add a check script:

   ```bash
   # scripts/check-env-prefixes.sh
   # Ensure no secret-looking variables use NEXT_PUBLIC_ prefix
   DANGEROUS_PREFIXES=(
     "NEXT_PUBLIC_DATABASE"
     "NEXT_PUBLIC_SECRET"
     "NEXT_PUBLIC_TOKEN"
     "NEXT_PUBLIC_KEY"
     "NEXT_PUBLIC_PASSWORD"
     "NEXT_PUBLIC_CPF"
     "NEXT_PUBLIC_ENCRYPTION"
   )
   for prefix in "${DANGEROUS_PREFIXES[@]}"; do
     if env | grep -q "^${prefix}"; then
       echo "SECURITY ERROR: Environment variable with dangerous prefix found: $prefix"
       exit 1
     fi
   done
   echo "Environment variable prefix check passed."
   ```

3. **Use React Taint API** (experimental) for additional protection:

   ```typescript
   // next.config.ts
   const config: NextConfig = {
     experimental: {
       taint: true,
     },
   }
   ```

   Then in server code:

   ```typescript
   import { experimental_taintUniqueValue } from 'react'

   // Prevents this value from ever being passed to a Client Component
   experimental_taintUniqueValue(
     'Do not pass database connection string to client',
     globalThis,
     process.env.DATABASE_URL
   )
   ```

**Source:** [Environment Variables -- nextjs.org](https://nextjs.org/docs/pages/guides/environment-variables), [Data Security Guide -- nextjs.org](https://nextjs.org/docs/app/guides/data-security)

---

## 7. Concrete Recommendations for This Project

### Layer 1: Build-time Guards (Highest Priority)

1. **Add `import 'server-only'`** to every file in `packages/db/src/`:
   - `public-schema.ts`
   - `internal-schema.ts`
   - `clients.ts`
   - `migrate.ts`

   This causes an immediate build failure if any client component transitively imports
   these modules.

2. **Install `server-only`** in the `packages/db` package:

   ```bash
   pnpm --filter @pah/db add server-only
   ```

### Layer 2: Lint-time Guards

1. **Add `no-restricted-imports`** to `apps/web` ESLint config to forbid:
   - `@pah/db` and `@pah/db/*`
   - `pg`, `drizzle-orm/pg-core`, `pg-boss`
   - Any other server-only packages

2. **Add `import/no-restricted-paths`** zones (requires `eslint-plugin-import`):
   - `apps/web/src` cannot import from `packages/db/`
   - `apps/web/src` cannot import from `apps/api/`
   - `apps/web/src` cannot import from `apps/pipeline/`

### Layer 3: CI Post-Build Verification

1. **Add the grep script** (`scripts/check-client-bundle.sh`) as a CI step after `next build`.
   This catches leaks that escaped layers 1 and 2.

2. **Periodically run bundle analyzer** (`ANALYZE=true pnpm build` or
   `pnpm next experimental-analyze --output`) and review client bundle composition.

### Layer 4: Environment Variable Hygiene

1. **Only `NEXT_PUBLIC_API_URL`** should have the `NEXT_PUBLIC_` prefix in the web app.
   Add the env prefix check script to CI.

2. **Add `VERCEL_REVALIDATE_TOKEN`** access only in `apps/web/src/app/api/revalidate/route.ts`
   (a Route Handler, which is server-only by definition).

### Layer 5: Defense in Depth (Optional)

1. **`serverExternalPackages`** in `next.config.ts` for `drizzle-orm` and `@pah/db`.

2. **React Taint API** (`experimental.taint: true`) for marking sensitive values that must
    never cross the server-client boundary via props.

---

## Summary of All Sources

| Source | URL | Domain | Official |
|--------|-----|--------|----------|
| Server and Client Components | <https://nextjs.org/docs/app/getting-started/server-and-client-components> | nextjs.org | Yes |
| Data Security Guide | <https://nextjs.org/docs/app/guides/data-security> | nextjs.org | Yes |
| serverExternalPackages | <https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages> | nextjs.org | Yes |
| Package Bundling Guide | <https://nextjs.org/docs/app/guides/package-bundling> | nextjs.org | Yes |
| Environment Variables | <https://nextjs.org/docs/pages/guides/environment-variables> | nextjs.org | Yes |
| Production Checklist | <https://nextjs.org/docs/app/guides/production-checklist> | nextjs.org | Yes |
| eslint-plugin-import no-restricted-paths | <https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md> | github.com | Yes (official repo) |
| ESLint no-restricted-imports | <https://eslint.org/docs/latest/rules/no-restricted-imports> | eslint.org | Yes |
