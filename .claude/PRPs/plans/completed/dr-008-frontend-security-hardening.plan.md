# Feature: Frontend Security Hardening (DR-008)

## Summary

Implement the four security hardening pillars for the Political Authority Highlighter frontend:
(1) `Content-Security-Policy-Report-Only` header in `next.config.ts` to mitigate XSS,
(2) `server-only` guards in all `packages/db/src/` files to create build-time enforcement against DB code leaking into the browser bundle,
(3) ESLint `no-restricted-imports` rule in `apps/web/.eslintrc.cjs` to catch forbidden package imports at lint time,
(4) CI security steps (`pnpm audit --audit-level=high` + post-build chunk scan).
A global `error.tsx` boundary is also created to prevent internal error details from reaching users.

## User Story

As a developer maintaining the platform
I want CSP headers, `server-only` guards, ESLint import restrictions, and CI bundle scanning in place
So that database internals never reach the browser and security vulnerabilities are caught before deployment

## Problem Statement

The frontend has no Content-Security-Policy header, `packages/db/src/` files have no `server-only` guard (allowing any Client Component to accidentally import them without a build failure), there is no ESLint rule restricting `@pah/db`/`pg`/`drizzle-orm` by package name (only by filesystem path via `import/no-restricted-paths`), CI has no vulnerability audit or bundle scan, and `apps/web/src/app/error.tsx` does not exist (relying on Next.js default error boundary which could expose server-side details in development).

## Solution Statement

Seven atomic tasks in sequence: add CSP header to `next.config.ts`; install `server-only` and add guards to all 3 db files; create `apps/web/.eslintrc.cjs` with `no-restricted-imports`; create `scripts/check-client-bundle.sh` and add 2 CI steps; create `apps/web/src/app/error.tsx` with generic message; create `error.test.tsx` verifying no details leak; verify `api-client.ts` error handling is compliant (it already is — `super(body.title)` only).

## Metadata

| Field            | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| Type             | ENHANCEMENT                                                  |
| Complexity       | MEDIUM                                                       |
| Systems Affected | `apps/web/`, `packages/db/`, `.github/workflows/`, `scripts/` |
| Dependencies     | `server-only@0.0.1` (new)                                    |
| Estimated Tasks  | 7                                                            |

---

## UX Design

### Before State

```
╔═════════════════════════════════════════════════════════════════════╗
║                           BEFORE STATE                              ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  Dev: Accidental @pah/db import in Client Component                 ║
║  ┌────────────────────┐   ┌──────────────────────────┐             ║
║  │ Client Component   │──►│ @pah/db import           │             ║
║  │ 'use client'       │   │ silently bundled — NO err │             ║
║  └────────────────────┘   └──────────────────────────┘             ║
║         No build error · No lint error · DB schema in browser       ║
║                                                                     ║
║  Browser: No CSP header → XSS attack has no mitigation layer       ║
║  CI: High CVEs unreported, client bundle never scanned              ║
║  Error boundary: None → Next.js default exposes details in dev      ║
║                                                                     ║
║  DATA_FLOW: government data → API → web app → browser              ║
║  PAIN_POINTS:                                                       ║
║  - DB schema can silently reach client bundle                       ║
║  - No Content-Security-Policy header on any response                ║
║  - CVEs in npm dependencies go undetected until production          ║
║  - Error pages may surface internal server details                  ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝
```

### After State

```
╔═════════════════════════════════════════════════════════════════════╗
║                            AFTER STATE                              ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  Layer 1 (Build-time): server-only guard                            ║
║  ┌──────────────────────┐   ┌────────────────────────┐             ║
║  │ Client Component     │──►│ @pah/db import         │──► FAIL     ║
║  │ 'use client'         │   │ server-only throws     │             ║
║  └──────────────────────┘   └────────────────────────┘             ║
║                                                                     ║
║  Layer 2 (Lint-time): no-restricted-imports rule                    ║
║  ┌────────────────────────────┐                                     ║
║  │ import '@pah/db/clients'   │──────────────────────► LINT ERROR   ║
║  └────────────────────────────┘                                     ║
║                                                                     ║
║  Layer 3 (Browser): CSP Report-Only header                          ║
║  ┌──────────────────────────────────────────┐                      ║
║  │ Content-Security-Policy-Report-Only      │                      ║
║  │ sent with every Next.js response         │──► XSS violations    ║
║  └──────────────────────────────────────────┘   reported to console ║
║                                                                     ║
║  Layer 4 (CI): pnpm audit + bundle scan                             ║
║  ┌──────────────────────────────────────────┐                      ║
║  │ pnpm audit --audit-level=high            │──► CVE → CI FAIL     ║
║  │ grep .next/static/chunks/ for patterns   │──► Leak → CI FAIL    ║
║  └──────────────────────────────────────────┘                      ║
║                                                                     ║
║  Layer 5 (Error boundary): generic message + digest                 ║
║  ┌──────────────────────────────────────────┐                      ║
║  │ error.tsx: "An unexpected error occurred" │                      ║
║  │ shows error.digest for server correlation │                      ║
║  └──────────────────────────────────────────┘                      ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location                                | Before                       | After                                    | User Impact                               |
| --------------------------------------- | ---------------------------- | ---------------------------------------- | ----------------------------------------- |
| Every Next.js HTTP response             | No CSP header                | `Content-Security-Policy-Report-Only`    | XSS mitigation layer active               |
| `packages/db/src/*.ts`                  | No `server-only` import      | `import 'server-only'` as first line     | Build fails if DB imported in client      |
| `apps/web/` ESLint                      | No `no-restricted-imports`   | Package-name restriction rule active     | Lint error on `@pah/db` import            |
| CI (after Install step)                 | No audit step                | `pnpm audit --audit-level=high`          | High CVEs fail the pipeline               |
| CI (after Build step)                   | No bundle scan               | grep `.next/static/chunks/`              | Leaked DB strings fail CI                 |
| `apps/web/src/app/error.tsx`            | File does not exist          | Generic message + digest ref             | No server details leaked to users         |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
| -------- | ---- | ----- | ------------- |
| P0 | `apps/web/next.config.ts` | all (29 lines) | Pattern to EXTEND — add CSP to existing `headers()` array |
| P0 | `docs/stack/nextjs-15-csp.md` | 171-264 | Exact `next.config.ts` CSP implementation for this project |
| P0 | `docs/stack/nextjs-client-bundle-security.md` | 1-120 | `server-only` install pattern + where to apply |
| P1 | `.eslintrc.cjs` | all (32 lines) | Root ESLint config — understand inheritance before creating app-level config |
| P1 | `.github/workflows/ci.yml` | all (38 lines) | CI structure — where to insert new steps |
| P2 | `packages/db/src/clients.ts` | all (37 lines) | First file to add `server-only` to |
| P2 | `apps/web/CLAUDE.md` | 378-417, 985-1030 | `error.tsx` exact pattern + CSP spec |
| P2 | `apps/web/src/lib/api-client.ts` | 20-48 | Error handling verification — `ApiError` surfaces only `body.title` |
| P3 | `apps/web/src/components/seo/json-ld.test.tsx` | all | Test pattern to MIRROR for `error.test.tsx` |

**External Documentation:**

| Source | Section | Why Needed |
| ------ | ------- | ---------- |
| [Next.js CSP Guide](https://nextjs.org/docs/app/guides/content-security-policy) | Static CSP approach | Confirms `headers()` syntax, report-only vs enforcing, ISR compatibility |
| [Next.js server-only](https://nextjs.org/docs/app/getting-started/server-and-client-components) | `server-only` package | Build-time guard mechanism, exact import syntax |
| [ESLint no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) | `patterns` array syntax | Package-name–based restriction — `patterns[].group` for wildcards |
| [pnpm audit docs](https://pnpm.io/cli/audit) | `--audit-level` + `--ignore-registry-errors` | Exit code behavior, CI-safe flags |

---

## Patterns to Mirror

**HEADERS_PATTERN:**

```typescript
// SOURCE: apps/web/next.config.ts:13-25
// EXTEND THIS — add CSP header entry, keep all 4 existing headers:
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ]
},
```

**SERVER_ONLY_PATTERN:**

```typescript
// SOURCE: docs/stack/nextjs-client-bundle-security.md:38-40
// ADD as FIRST LINE to each packages/db/src/*.ts file:
import 'server-only'

// ... rest of existing file unchanged
```

**ESLINT_WEB_CONFIG_PATTERN:**

```javascript
// SOURCE: .eslintrc.cjs:1-32 (root config for inheritance reference)
// CREATE apps/web/.eslintrc.cjs — adds no-restricted-imports, inherits everything from root:
'use strict'

module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [/* see Task 3 */],
    }],
  },
}
```

**ERROR_TSX_PATTERN:**

```typescript
// SOURCE: apps/web/CLAUDE.md:378-401
// CREATE apps/web/src/app/error.tsx FOLLOWING this exact pattern:
'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">An unexpected error occurred</h1>
      <p className="text-muted-foreground">
        We are working to resolve this issue. Please try again later.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        Try again
      </button>
    </main>
  )
}
```

**TEST_STRUCTURE_PATTERN:**

```typescript
// SOURCE: apps/web/src/components/seo/json-ld.test.tsx:1-5
// MIRROR this import pattern for error.test.tsx:
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ErrorPage from './error'

describe('ErrorPage', () => {
  it('...', () => { /* ... */ })
})
```

**CI_STEP_PATTERN:**

```yaml
# SOURCE: .github/workflows/ci.yml:27-37
# MIRROR the step format when adding new CI steps:
- name: Security audit
  run: pnpm audit --audit-level=high --ignore-registry-errors

- name: Check client bundle for leaks
  run: bash scripts/check-client-bundle.sh
```

---

## Files to Change

| File                                       | Action          | Justification                                         |
| ------------------------------------------ | --------------- | ----------------------------------------------------- |
| `apps/web/next.config.ts`                  | UPDATE          | Add CSP header + extract `isDev` / `apiUrl` variables |
| `packages/db/package.json`                 | UPDATE (pnpm)   | Add `server-only` to `dependencies`                  |
| `packages/db/src/public-schema.ts`         | UPDATE          | Add `import 'server-only'` at line 1                  |
| `packages/db/src/internal-schema.ts`       | UPDATE          | Add `import 'server-only'` at line 1                  |
| `packages/db/src/clients.ts`               | UPDATE          | Add `import 'server-only'` at line 1                  |
| `apps/web/.eslintrc.cjs`                   | CREATE          | App-level `no-restricted-imports` for web package    |
| `scripts/check-client-bundle.sh`           | CREATE          | Post-build bundle scan script                         |
| `.github/workflows/ci.yml`                 | UPDATE          | Add audit step + bundle scan step                     |
| `apps/web/src/app/error.tsx`               | CREATE          | Global error boundary (generic message only)          |
| `apps/web/src/app/error.test.tsx`          | CREATE          | Unit tests verifying no server details leak           |

---

## NOT Building (Scope Limits)

- **`Content-Security-Policy` enforcing header** — starting with `Content-Security-Policy-Report-Only` per PRD Phase 10; enforcement is a post-MVP step after violation monitoring
- **`report-uri` endpoint** — CSP violation collection server is post-MVP; violations appear in browser console only
- **React Taint API** (`experimental.taint: true`) — experimental feature; `server-only` guards are sufficient for MVP
- **`serverExternalPackages` in next.config.ts** — defense-in-depth; primary protection is `server-only` + ESLint + CI scan. Add only if a server-side bundling error appears
- **`@next/bundle-analyzer`** — CI grep scan is sufficient for automated detection; visual analyzer is a developer tool
- **`import 'server-only'` in `apps/web/src/app/api/revalidate/route.ts`** — Route Handlers are server-only by Next.js App Router definition; no guard needed
- **HTML stripping in pipeline transformers (RNF-SEC-013)** — pipeline concern, noted in Phase 7 as a separate requirement

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

---

### Task 1: UPDATE `apps/web/next.config.ts` — Add CSP header

- **ACTION**: ADD `Content-Security-Policy-Report-Only` header to the existing `headers()` array
- **READ FIRST**: `apps/web/next.config.ts` (all 29 lines), `docs/stack/nextjs-15-csp.md:171-264`
- **IMPLEMENT**:
  1. After `import type { NextConfig } from 'next'` (line 1), add:

     ```typescript
     const isDev = process.env['NODE_ENV'] === 'development'
     const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
     ```

  2. Add `cspHeader` template string above the `config` const:

     ```typescript
     const cspHeader = `
       default-src 'self';
       script-src 'self' 'unsafe-inline'${isDev ? ` 'unsafe-eval'` : ''};
       style-src 'self' 'unsafe-inline';
       img-src 'self' blob: data: https:;
       font-src 'self';
       connect-src 'self' ${apiUrl};
       object-src 'none';
       base-uri 'self';
       form-action 'self';
       frame-ancestors 'none';
       ${isDev ? '' : 'upgrade-insecure-requests;'}
     `
     ```

  3. In the `headers()` array, ADD the CSP entry **BEFORE** the 4 existing headers (position 0 in the `headers` array — or after, order within the array does not matter):

     ```typescript
     { key: 'Content-Security-Policy-Report-Only', value: cspHeader.replace(/\s{2,}/g, ' ').trim() },
     ```

- **MIRROR**: `apps/web/next.config.ts:13-25` — extend existing block; `docs/stack/nextjs-15-csp.md:211-264`
- **GOTCHA**: Use `Content-Security-Policy-Report-Only` NOT `Content-Security-Policy` — PRD Phase 10 requires report-only for initial deployment
- **GOTCHA**: `img-src` MUST include `https:` — politician photos are fetched from `camara.leg.br` and `senado.leg.br` CDNs configured in `next.config.ts:7-9`
- **GOTCHA**: `upgrade-insecure-requests` must be excluded in dev — breaks `http://localhost` connections
- **GOTCHA**: Use `.replace(/\s{2,}/g, ' ').trim()` to collapse the multi-line template string to one line for the header value
- **GOTCHA**: Template literal interpolation inside the `cspHeader` string — use a regular template literal (not tagged) and reference `isDev` and `apiUrl` which are defined before `config`
- **VALIDATE**: `pnpm --filter @pah/web build` — build must succeed. Check `Content-Security-Policy-Report-Only` header appears in response by running `pnpm --filter @pah/web dev` and inspecting DevTools Network tab.

---

### Task 2: Install `server-only` + add guards to `packages/db/src/`

- **READ FIRST**: `packages/db/src/clients.ts` (all 37 lines), `docs/stack/nextjs-client-bundle-security.md:1-65`
- **ACTION A**: Install `server-only` package in `@pah/db`
  - **COMMAND**: `pnpm --filter @pah/db add server-only`
  - **EXPECTED**: `packages/db/package.json` gains `"server-only": "^0.0.1"` (or similar) in `dependencies`
- **ACTION B**: Add guard to `packages/db/src/public-schema.ts`
  - **INSERT** `import 'server-only'` as first line — before the existing first import (which is `import { pgSchema, pgTable, ... }`)
- **ACTION C**: Add guard to `packages/db/src/internal-schema.ts`
  - **INSERT** `import 'server-only'` as first line — before the existing first import
- **ACTION D**: Add guard to `packages/db/src/clients.ts`
  - **INSERT** `import 'server-only'` as first line — before `import { drizzle } from 'drizzle-orm/postgres-js'` at line 1
- **GOTCHA**: `server-only` version is `0.0.1` — the only published version; no specific pin needed
- **GOTCHA**: `import 'server-only'` is a side-effect import — no `from` path, no named exports, no default import
- **GOTCHA**: `apps/web` does NOT currently have `@pah/db` in its `dependencies` — the guard prevents future accidental additions from silently leaking to the bundle
- **GOTCHA**: `pnpm --filter @pah/db add server-only` adds to `packages/db/package.json` `dependencies`, NOT devDependencies — `server-only` must be a runtime dependency for Next.js to pick up the conditional export
- **VALIDATE**: `pnpm --filter @pah/db typecheck` passes. `pnpm --filter @pah/web build` passes (web app does not import `@pah/db`, so no build error). `pnpm --filter @pah/api typecheck` passes (api imports `@pah/db/public-schema` and `@pah/db/clients` — these are Server Components/Route Handlers, not client code, so `server-only` is satisfied).

---

### Task 3: CREATE `apps/web/.eslintrc.cjs` — ESLint `no-restricted-imports`

- **READ FIRST**: `.eslintrc.cjs` (all 32 lines) — understand the root config structure before creating a child config
- **ACTION**: CREATE new file `apps/web/.eslintrc.cjs`
- **IMPLEMENT**: ESLint config that adds `no-restricted-imports` rule for all files under `apps/web/`

  ```javascript
  'use strict'

  module.exports = {
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@pah/db', '@pah/db/*'],
            message: 'Database package must never be imported in the frontend. Use the API client instead.',
          },
          {
            group: ['pg', 'pg-pool', 'postgres'],
            message: 'PostgreSQL drivers must never be imported in the frontend.',
          },
          {
            group: ['drizzle-orm', 'drizzle-orm/*'],
            message: 'Drizzle ORM must never be imported in the frontend.',
          },
          {
            group: ['pg-boss'],
            message: 'pg-boss is a server-only package.',
          },
        ],
      }],
    },
  }
  ```

- **IMPORTANT**: Do NOT add `root: true` — the file must inherit from root `.eslintrc.cjs` via ESLint's cascading config behavior. The root config has `root: true` which stops upward traversal; the child config adds rules on top.
- **IMPORTANT**: Do NOT re-declare `parser`, `plugins`, or `extends` — the root config handles those for all files in the monorepo. Only add `rules`.
- **GOTCHA**: `no-restricted-imports` uses `patterns[].group` (array of glob strings) for wildcard matching — `@pah/db/*` requires `patterns`, not `paths` (which is for exact module names only)
- **GOTCHA**: Each `patterns` entry MUST include a `message` field — ESLint appends it to the error for developer guidance
- **GOTCHA**: The `postgres` package (not `pg`) is the actual PostgreSQL driver used in `@pah/db` — it must be in the forbidden list
- **VALIDATE**: `pnpm lint` passes cleanly. Then temporarily add `import '@pah/db/clients'` to any file in `apps/web/src/` (e.g., top of `api-client.ts`) → `pnpm lint` must fail with "Database package must never be imported in the frontend." Revert the test import immediately.

---

### Task 4: CREATE `scripts/check-client-bundle.sh` + UPDATE `.github/workflows/ci.yml`

- **READ FIRST**: `.github/workflows/ci.yml` (all 38 lines), `docs/stack/nextjs-client-bundle-security.md:174-229`
- **ACTION A**: CREATE `scripts/check-client-bundle.sh` at monorepo root
  - **IMPLEMENT**: Bash script that greps `.next/static/chunks/` for forbidden patterns
  - **SHEBANG**: `#!/usr/bin/env bash`
  - **OPTIONS**: `set -euo pipefail`
  - **CHUNKS_DIR**: `apps/web/.next/static/chunks` (relative from monorepo root — this is where `pnpm build` outputs client chunks for the web workspace)
  - **FORBIDDEN_PATTERNS** (array):
    - `drizzle-orm`
    - `@pah/db`
    - `public-schema`
    - `internal-schema`
    - `pg-boss`
    - `CPF_ENCRYPTION_KEY`
    - `DATABASE_URL`
    - `VERCEL_REVALIDATE_TOKEN`
  - **LOGIC**: For each pattern, run `grep -rl "$pattern" "$CLIENT_CHUNKS_DIR"` — if any match, print a SECURITY VIOLATION message and set `FOUND=1`; at end, if `FOUND=1` exit 1, else print "Client bundle check passed" and exit 0
  - **GUARD**: Check that `CLIENT_CHUNKS_DIR` exists before grepping — exit 1 with a message if not (means `next build` was not run)
  - **MIRROR**: `docs/stack/nextjs-client-bundle-security.md:182-222` — exact script pattern
- **ACTION B**: UPDATE `.github/workflows/ci.yml` — add 2 new steps
  - **STEP 1** — Insert AFTER the `Install dependencies` step (after line 25), BEFORE `Lint` (line 27):

    ```yaml
    - name: Security audit
      run: pnpm audit --audit-level=high --ignore-registry-errors
    ```

  - **STEP 2** — Insert AFTER the `Build` step (after line 37), as the final step:

    ```yaml
    - name: Check client bundle for leaks
      run: bash scripts/check-client-bundle.sh
    ```

  - **MIRROR**: `.github/workflows/ci.yml:27-37` — existing step indentation and format (`- name:` + `run:`)
- **GOTCHA**: `--ignore-registry-errors` is REQUIRED for the audit step — prevents CI from failing due to npm registry downtime (registry 503 would otherwise fail the step with a false positive)
- **GOTCHA**: The chunks dir is `apps/web/.next/static/chunks` from monorepo root — NOT `.next/static/chunks`. The Turborepo `build` runs from the repo root and writes Next.js output to `apps/web/.next/`
- **GOTCHA**: `grep -rl` returns non-zero exit when no matches found — use the `FOUND=0` flag pattern rather than relying on grep exit code to avoid premature failure
- **VALIDATE**: `pnpm build` (full monorepo build), then `bash scripts/check-client-bundle.sh` — must print "Client bundle check passed: no forbidden patterns found." and exit 0. Also validate CI YAML syntax: `pnpm dlx yaml-lint .github/workflows/ci.yml` or just verify indentation manually.

---

### Task 5: CREATE `apps/web/src/app/error.tsx` — Global error boundary

- **READ FIRST**: `apps/web/CLAUDE.md:374-417` — the exact `error.tsx` code spec
- **ACTION**: CREATE `apps/web/src/app/error.tsx`
- **IMPLEMENT**: Follow the exact pattern from `apps/web/CLAUDE.md:378-401`:
  - **DIRECTIVE**: `'use client'` — REQUIRED; error boundaries must be Client Components (React lifecycle)
  - **PROPS**: `{ error: Error & { digest?: string }, reset: () => void }` — exact type from Next.js docs
  - **CONTENT**: Generic heading + explanation text + "Try again" button
  - **HEADING**: "An unexpected error occurred" — never show `error.message`, `error.stack`, `error.name`
  - **BODY TEXT**: "We are working to resolve this issue. Please try again later."
  - **DIGEST DISPLAY** (optional but recommended): If `error.digest` is defined, show it as a reference code: `<p className="text-xs text-muted-foreground">Reference: {error.digest}</p>` — `digest` is a hash, NOT sensitive data, safe to show for support correlation
  - **BUTTON**: `onClick={reset}` — allows users to retry the failed render
  - **TAILWIND**: `className="flex min-h-[50vh] flex-col items-center justify-center gap-4"` on `<main>`, existing Tailwind color tokens for button
- **GOTCHA**: NEVER render `error.message` directly — in production Next.js sanitizes server errors to generic messages, but client errors show the actual message which could leak component internals; the generic text is always safer
- **GOTCHA**: NEVER render `error.stack` — full stack trace must never reach the UI per RNF-SEC-014
- **GOTCHA**: `'use client'` must be the very first line — no imports before it
- **GOTCHA**: The `digest` property is Next.js-specific (not part of standard `Error`) — check `error.digest !== undefined` or use optional chaining `error.digest` with a conditional render
- **VALIDATE**: `pnpm --filter @pah/web build` — must succeed. `pnpm --filter @pah/web typecheck` — must pass.

---

### Task 6: CREATE `apps/web/src/app/error.test.tsx` — Unit tests

- **READ FIRST**: `apps/web/src/components/seo/json-ld.test.tsx` (all), `apps/web/src/app/metodologia/page.test.tsx` (all)
- **ACTION**: CREATE `apps/web/src/app/error.test.tsx`
- **IMPLEMENT**: Unit tests covering security-critical behaviors:

  ```typescript
  import { render, screen, fireEvent } from '@testing-library/react'
  import { describe, it, expect, vi } from 'vitest'
  import ErrorPage from './error'
  ```

  - **Test 1**: Renders generic heading text (not error.message)
    - `render(<ErrorPage error={new Error('db connection string leaked')} reset={vi.fn()} />)`
    - `expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()`
    - Heading text must NOT be "db connection string leaked"
  - **Test 2**: Does NOT render `error.message` in the output
    - Render with an error whose message contains sensitive data
    - `expect(screen.queryByText(/db connection string leaked/i)).not.toBeInTheDocument()`
  - **Test 3**: Renders "Try again" button
    - `expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()`
  - **Test 4**: Calls `reset()` when button is clicked
    - `const reset = vi.fn(); render(<ErrorPage error={new Error('')} reset={reset} />)`
    - `fireEvent.click(screen.getByRole('button', { name: /try again/i }))`
    - `expect(reset).toHaveBeenCalledOnce()`
  - **Test 5** (if digest is displayed): Shows `error.digest` as reference when provided
    - `const error = Object.assign(new Error(''), { digest: 'abc123' })`
    - `expect(screen.getByText(/abc123/)).toBeInTheDocument()`
  - **Test 6** (DR-002 political neutrality check — not applicable here, skip)
- **MIRROR**: `apps/web/src/components/seo/json-ld.test.tsx:1-86` — import style, describe/it structure
- **GOTCHA**: `fireEvent.click` is available from `@testing-library/react` without installing `@testing-library/user-event` — use `fireEvent` for simplicity unless `userEvent` is already in `devDependencies`
- **GOTCHA**: `vi.fn()` is from Vitest — already imported per test pattern (`import { describe, it, expect, vi } from 'vitest'`)
- **VALIDATE**: `pnpm --filter @pah/web test` — all tests including new ones must pass

---

### Task 7: VERIFY `apps/web/src/lib/api-client.ts` error sanitization

- **READ FIRST**: `apps/web/src/lib/api-client.ts` (all 177 lines)
- **ACTION**: AUDIT for compliance — no code changes unless a violation is found
- **VERIFY**:
  1. `ApiError.constructor` at `api-client.ts:20-27` — calls `super(body.title)` ✓ only `title` propagates as `Error.message`
  2. `body: ProblemDetail` stored as `public readonly` at line 23 — callers have access but must not render `body.detail` or `body.instance` in JSX
  3. `apiFetch` at `api-client.ts:42-44` — throws `new ApiError(response.status, body)` on non-OK responses ✓
  4. Search for callers of `fetchPoliticianBySlug`, `fetchPoliticians`, etc. — verify none render `apiError.body.detail` in JSX
  5. Profile page at `apps/web/src/app/politicos/[slug]/page.tsx` — verify error handling is `if (err instanceof ApiError && err.status === 404) notFound(); throw err` — the re-thrown error reaches `error.tsx` which shows only generic message ✓
- **OUTCOME**: Document findings. If any caller renders `apiError.body.detail` or `apiError.body.instance` directly in JSX, fix those usages.
- **GOTCHA**: The `this.body` property on `ApiError` is accessible to callers — the protection comes from `error.tsx` never rendering `error.message` or any `ApiError`-specific properties; callers only use `err.status` for conditional logic (e.g., 404 → `notFound()`)
- **VALIDATE**: No files in `apps/web/src/` render `apiError.body.detail`, `apiError.body.instance`, or `error.message` in JSX that would reach the browser output

---

## Testing Strategy

### Unit Tests to Write

| Test File                              | Test Cases                                                     | Validates           |
| -------------------------------------- | -------------------------------------------------------------- | ------------------- |
| `apps/web/src/app/error.test.tsx`      | Generic message shown; `error.message` NOT rendered; `reset()` called on click; `digest` shown if present | Error boundary security |

### Edge Cases Checklist

- [ ] CSP `connect-src` uses `NEXT_PUBLIC_API_URL` env var (falls back to `localhost:3001`)
- [ ] CSP `img-src` includes `https:` (required for politician photo CDNs on `camara.leg.br` and `senado.leg.br`)
- [ ] `upgrade-insecure-requests` directive absent in dev (breaks `http://localhost`)
- [ ] `Content-Security-Policy-Report-Only` (not enforcing) — violations are reported to browser console, not blocked
- [ ] `error.tsx` renders when server Component throws a non-404 error
- [ ] `scripts/check-client-bundle.sh` exits 0 when no forbidden patterns found
- [ ] `scripts/check-client-bundle.sh` exits 1 when a forbidden pattern is present
- [ ] `scripts/check-client-bundle.sh` exits 1 with a clear message if the chunks dir doesn't exist (build not run)

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm lint && pnpm typecheck
```

**EXPECT**: Exit 0, zero warnings across all packages

### Level 2: UNIT_TESTS

```bash
pnpm --filter @pah/web test
```

**EXPECT**: All tests pass including new `error.test.tsx` (6 test cases)

### Level 3: FULL_SUITE

```bash
pnpm test && pnpm build
```

**EXPECT**: All tests pass, full monorepo build succeeds

### Level 4: BUNDLE_VALIDATION

```bash
# After pnpm build succeeds (Level 3):
bash scripts/check-client-bundle.sh
```

**EXPECT**: "Client bundle check passed: no forbidden patterns found." (exit 0)

### Level 5: BROWSER_VALIDATION

Use Playwright MCP or `pnpm --filter @pah/web dev` + browser DevTools to verify:

- [ ] Navigate to `/politicos` — check Network tab for the response
- [ ] Confirm `content-security-policy-report-only` header is present
- [ ] Confirm the header value includes `default-src 'self'`, `connect-src 'self' <api-url>`, `frame-ancestors 'none'`
- [ ] Check browser Console — confirm no CSP violation messages appear on normal page usage

### Level 6: MANUAL_VALIDATION

1. `pnpm --filter @pah/web build` — must succeed without any `server-only` errors
2. `pnpm audit --audit-level=high` — run locally to see current CVE status before CI catches it
3. `bash scripts/check-client-bundle.sh` — must print "passed" and exit 0
4. Temporarily add `import '@pah/db/clients'` to any `apps/web/src/` file → `pnpm lint` must fail with "Database package must never be imported in the frontend." Delete the test import.
5. `pnpm --filter @pah/api build` — must still succeed (api imports `@pah/db/public-schema`, which now has `server-only` — verify api build is unaffected)

---

## Acceptance Criteria

- [ ] `Content-Security-Policy-Report-Only` header present on every HTTP response from the Next.js app
- [ ] `next build` fails if any Client Component transitively imports `@pah/db` (via `server-only` build-time guard)
- [ ] `pnpm lint` fails with a clear message if any file in `apps/web/` imports `@pah/db`, `pg`, `postgres`, `drizzle-orm`, or `pg-boss`
- [ ] CI `pnpm audit --audit-level=high` step exits non-zero on high-severity CVEs (via exit code)
- [ ] CI bundle scan step fails if `drizzle-orm`, `DATABASE_URL`, `CPF_ENCRYPTION_KEY`, or `VERCEL_REVALIDATE_TOKEN` appear in `.next/static/chunks/`
- [ ] `apps/web/src/app/error.tsx` exists, has `'use client'`, and renders only generic message — never `error.message`, `error.stack`, or internal API details
- [ ] `pnpm test` passes: all existing tests + 6 new tests in `error.test.tsx`
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0

---

## Completion Checklist

- [ ] All 7 tasks completed in order
- [ ] Each task validated immediately after completion
- [ ] Level 1: Static analysis (`pnpm lint && pnpm typecheck`) passes
- [ ] Level 2: Unit tests (`pnpm --filter @pah/web test`) pass
- [ ] Level 3: Full suite (`pnpm test && pnpm build`) passes
- [ ] Level 4: Bundle validation (`bash scripts/check-client-bundle.sh`) passes
- [ ] Level 5: Browser validation — CSP header visible in DevTools
- [ ] All 8 acceptance criteria checked

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| `pnpm audit` reveals existing high CVEs | MED | MED | Run `pnpm audit --audit-level=high` locally before pushing; use `pnpm audit --fix` or `pnpm why <package>` to investigate; add `--ignore <CVE>` for known false positives |
| `server-only` breaks `@pah/api` build | LOW | HIGH | API uses `@pah/db/public-schema` and `@pah/db/clients` in Fastify route handlers — these are server-side code, so `server-only` will NOT cause a build error. Validate with `pnpm --filter @pah/api build` after Task 2. |
| CSP `connect-src` blocks API calls | LOW | HIGH | Using `Content-Security-Policy-Report-Only` (not enforcing) — violations are reported, not blocked. If `NEXT_PUBLIC_API_URL` is correct, no violations should occur. |
| Bundle scan false positives (forbidden string in UI text) | MED | LOW | The forbidden patterns (`drizzle-orm`, `DATABASE_URL`, etc.) are highly unlikely to appear as UI strings. If a false positive occurs, adjust the grep to exclude known-safe patterns. |
| `apps/web/.eslintrc.cjs` breaks existing lint | LOW | MED | The new file adds only `no-restricted-imports` rules; all other rules are inherited from root. Run `pnpm lint` from monorepo root after Task 3 to confirm. |
| `scripts/check-client-bundle.sh` path mismatch | LOW | LOW | CI runs from monorepo root; ensure `CLIENT_CHUNKS_DIR="apps/web/.next/static/chunks"` is correct relative to repo root (not `apps/web/.next` which would be the full `.next` dir). |

---

## Notes

- Phase 10 can run in parallel with any other feature work — all changes are to config files, CI pipeline, and the error boundary; no business logic, no DB schema changes
- The CSP policy starts in `Content-Security-Policy-Report-Only` mode (monitoring only). Switching to enforcing `Content-Security-Policy` is a post-Phase-10 step after monitoring browser console for violations
- When `server-only` causes a build failure because of an accidental import, Next.js's error message will show the full import chain — making it easy to identify which Client Component caused the leak
- The `drizzle-orm` pattern in the bundle scan will match even in minified chunks because Next.js preserves module names in import paths within chunks
- After Phase 10 is complete, Phase 11 (Code Quality Refactor) can begin — its scope is unrelated to security
