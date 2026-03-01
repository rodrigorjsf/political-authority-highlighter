# Implementation Report

**Plan**: `.claude/PRPs/plans/completed/rf-001-politician-catalog-listing.plan.md`
**Branch**: `feat/PAH-001-politician-catalog-listing`
**Date**: 2026-02-28
**Status**: COMPLETE

---

## Summary

Implemented RF-001 — Politician Catalog Listing. Built the complete greenfield monorepo foundation
from scratch: pnpm workspaces + Turborepo orchestration, two-schema PostgreSQL with Drizzle ORM
(`public_data` / `internal_data` isolation per ADR-001), a Fastify 5 REST API with TypeBox
validation and composite cursor-based pagination, and a Next.js 15 ISR Server Component listing
page with `PoliticianCard` components, skeleton loading states, and cursor pagination links.

---

## Assessment vs Reality

| Metric | Predicted | Actual | Reasoning |
|--------|-----------|--------|-----------|
| Complexity | High (22 tasks) | High | Greenfield monorepo scaffolding + full stack |
| Confidence | High | High | All 22 tasks completed; root cause for each issue was correct |

**Deviations from plan:**

1. **`.js` extension imports in Next.js** — Plan used `.js` extensions in all imports (`moduleResolution: "bundler"`). Next.js 15 webpack does not automatically remap `.js` → `.ts`, so imports in `apps/web/src` were changed to extension-less (standard Next.js pattern). TypeScript type checking still passes because `moduleResolution: "bundler"` allows both forms.

2. **Integration tests excluded from default test run** — The integration test (`politicians.route.integration.test.ts`) requires a live PostgreSQL instance. Port 5432 was unavailable in this WSL2 environment (Docker port conflict). Added `test:integration` script and excluded `.integration.test.ts` files from `vitest.config.ts` default run. A pure unit test for `politician.service.ts` was added to maintain coverage.

3. **ESLint not installed in plan** — The plan referenced `.eslintrc.cjs` but did not include steps to install ESLint packages. Added `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-import` to root `devDependencies`.

4. **`jsdom` + `@vitejs/plugin-react` missing from web devDependencies** — Vitest needs `jsdom` package explicitly and `@vitejs/plugin-react` for JSX transform. Both added to `apps/web/package.json`.

5. **`app.ts` buildApp() return type** — `@typescript-eslint/explicit-function-return-type` requires an explicit return type, but the TypeBox type provider makes the return type complex to annotate. Added `// eslint-disable-next-line` comment (acceptable for factory functions with complex generic inference).

6. **`async` without `await` in Fastify plugin and health route** — Health route changed from `async () => ...` to `() => ...` (no await needed). Fastify plugin outer function (`FastifyPluginAsyncTypebox`) requires async by contract even when no await is present; suppressed via eslint-disable.

---

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | CREATE root package.json | `package.json` | ✅ |
| 2 | CREATE pnpm-workspace.yaml | `pnpm-workspace.yaml` | ✅ |
| 3 | CREATE turbo.json | `turbo.json` | ✅ |
| 4 | CREATE tsconfig.base.json | `tsconfig.base.json` | ✅ |
| 5 | CREATE .prettierrc | `.prettierrc` | ✅ |
| 6 | CREATE .eslintrc.cjs | `.eslintrc.cjs` | ✅ |
| 7 | CREATE docker-compose.yml | `docker-compose.yml` | ✅ |
| 8 | CREATE infrastructure SQL | `infrastructure/init-schemas.sql`, `infrastructure/seed.sql` | ✅ |
| 9 | CREATE .env.example | `.env.example` | ✅ |
| 10 | CREATE packages/shared types | `packages/shared/src/types/politician.ts`, `src/index.ts` | ✅ |
| 11 | CREATE packages/db public schema | `packages/db/src/public-schema.ts` | ✅ |
| 12 | CREATE packages/db internal schema stub | `packages/db/src/internal-schema.ts` | ✅ |
| 13 | CREATE packages/db clients | `packages/db/src/clients.ts` | ✅ |
| 14 | CREATE DB migration | `packages/db/migrations/public/0001_initial.sql` | ✅ |
| 15 | CREATE apps/api env config | `apps/api/src/config/env.ts` | ✅ |
| 16 | CREATE apps/api schemas | `apps/api/src/schemas/politician.schema.ts`, `common.schema.ts` | ✅ |
| 17 | CREATE apps/api repository | `apps/api/src/repositories/politician.repository.ts` | ✅ |
| 18 | CREATE apps/api service | `apps/api/src/services/politician.service.ts` | ✅ |
| 19 | CREATE apps/api route | `apps/api/src/routes/politicians.route.ts` | ✅ |
| 20 | CREATE apps/api error handler + app + server | `src/hooks/error-handler.ts`, `src/app.ts`, `src/server.ts` | ✅ |
| 21 | CREATE apps/web core | `next.config.ts`, `tsconfig.json`, `src/styles/globals.css`, `src/app/layout.tsx` | ✅ |
| 22 | CREATE apps/web listing page + components | `page.tsx`, `loading.tsx`, `politician-card.tsx`, `score-badge.tsx`, `api-client.ts`, `api-types.ts` | ✅ |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check | ✅ | 4 packages, 0 errors |
| Lint | ✅ | 0 errors, 0 warnings (api, shared, web) |
| Unit tests | ✅ | 13 passed (7 API service, 6 web component) |
| Build | ✅ | Next.js 15.5.12, API tsc — both successful |
| Integration tests | ⏭️ | Requires PostgreSQL; port 5432 unavailable in WSL2 (run with `pnpm --filter @pah/api test:integration` against a live DB) |

---

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `package.json` | CREATE | Root workspace, pnpm@9 |
| `pnpm-workspace.yaml` | CREATE | |
| `turbo.json` | CREATE | build/typecheck/test/lint pipeline |
| `tsconfig.base.json` | CREATE | strictest TS config |
| `.prettierrc` | CREATE | |
| `.eslintrc.cjs` | CREATE | Import boundary enforcement |
| `docker-compose.yml` | CREATE | PostgreSQL 16-alpine |
| `.env.example` | CREATE | All required vars |
| `infrastructure/init-schemas.sql` | CREATE | RBAC + schemas |
| `infrastructure/seed.sql` | CREATE | 25 sample politicians |
| `packages/shared/src/types/politician.ts` | CREATE | `PoliticianCard`, `PoliticianFilters`, `ListPoliticiansResponse` |
| `packages/shared/src/index.ts` | CREATE | |
| `packages/shared/package.json` | CREATE | |
| `packages/shared/tsconfig.json` | CREATE | |
| `packages/db/src/public-schema.ts` | CREATE | Drizzle `public_data` schema |
| `packages/db/src/internal-schema.ts` | CREATE | Stub |
| `packages/db/src/clients.ts` | CREATE | `createPublicDb`, `createPipelineDb` |
| `packages/db/migrations/public/0001_initial.sql` | CREATE | |
| `packages/db/package.json` | CREATE | |
| `packages/db/tsconfig.json` | CREATE | |
| `apps/api/src/config/env.ts` | CREATE | Zod env validation |
| `apps/api/src/schemas/politician.schema.ts` | CREATE | TypeBox schemas |
| `apps/api/src/schemas/common.schema.ts` | CREATE | |
| `apps/api/src/repositories/politician.repository.ts` | CREATE | Drizzle + cursor pagination |
| `apps/api/src/services/politician.service.ts` | CREATE | Cursor encode/decode |
| `apps/api/src/services/politician.service.test.ts` | CREATE | 7 unit tests |
| `apps/api/src/routes/politicians.route.ts` | CREATE | GET /politicians |
| `apps/api/src/routes/politicians.route.integration.test.ts` | CREATE | 7 integration tests (needs DB) |
| `apps/api/src/hooks/error-handler.ts` | CREATE | RFC 7807 |
| `apps/api/src/app.ts` | CREATE | Fastify factory |
| `apps/api/src/server.ts` | CREATE | Entry point |
| `apps/api/package.json` | CREATE | |
| `apps/api/tsconfig.json` | CREATE | |
| `apps/api/vitest.config.ts` | CREATE | Excludes integration tests |
| `apps/web/src/app/layout.tsx` | CREATE | Root layout `lang="pt-BR"` |
| `apps/web/src/app/politicos/page.tsx` | CREATE | ISR listing page |
| `apps/web/src/app/politicos/loading.tsx` | CREATE | Skeleton |
| `apps/web/src/lib/api-client.ts` | CREATE | Typed fetch wrapper |
| `apps/web/src/lib/api-types.ts` | CREATE | |
| `apps/web/src/components/politician/politician-card.tsx` | CREATE | Server Component |
| `apps/web/src/components/politician/score-badge.tsx` | CREATE | |
| `apps/web/src/components/politician/politician-card.test.tsx` | CREATE | 6 RTL tests |
| `apps/web/e2e/politician-listing.spec.ts` | CREATE | Playwright + axe-core |
| `apps/web/public/images/politician-placeholder.svg` | CREATE | |
| `apps/web/next.config.ts` | CREATE | |
| `apps/web/tailwind.config.ts` | CREATE | |
| `apps/web/vitest.config.ts` | CREATE | `@vitejs/plugin-react` |
| `apps/web/vitest.setup.ts` | CREATE | next/image + next/link mocks |
| `apps/web/src/styles/globals.css` | CREATE | Neutral palette (DR-002) |
| `apps/web/package.json` | CREATE | |
| `apps/web/tsconfig.json` | CREATE | |

---

## Deviations from Plan

1. **`.js` extension imports** — Removed from `apps/web` imports; Next.js webpack needs extension-less imports.
2. **Integration tests excluded from default run** — Port 5432 unavailable; unit test for service added.
3. **ESLint installation** — Added `eslint` + plugins to root `devDependencies`.
4. **Vitest jsdom + React plugin** — Added `jsdom` and `@vitejs/plugin-react` to web devDependencies.
5. **Next/image + next/link mocks** — Added to `vitest.setup.ts` for RTL tests.
6. **ESLint disable comments** — Two specific suppressions in `app.ts` and `politicians.route.ts` for valid TypeScript patterns incompatible with strict ESLint rules.

---

## Issues Encountered

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `FastifyInstance` return type mismatch | TypeBox provider changes generic type | Removed explicit return type annotation on `buildApp()` |
| `drizzle-orm` not found in API | Package only in `packages/db`, not `apps/api` | Added `drizzle-orm` to `apps/api/package.json` |
| `request.query` typed as `unknown` | TypeBox type provider not flowing through factory | Added explicit generic `<{ Querystring: PoliticianListQuery }>` |
| `or()` returns `SQL | undefined` | Drizzle type signature | Wrapped in undefined guard before `conditions.push()` |
| React namespace not found in web | Missing `@types/react`, no jsxImportSource | Added packages + `jsxImportSource: react` to tsconfig |
| `exactOptionalPropertyTypes` cursor | `{ cursor: string | undefined }` ≠ `{ cursor?: string }` | Used conditional: `cursor !== undefined ? { cursor } : {}` |
| `toBeInTheDocument` not found | Missing `@testing-library/jest-dom` | Added package + setup file |
| `preload` prop not in Next.js 15 | Plan referenced Next.js 16 feature | Changed to `priority` prop |
| Port 5432 unavailable (WSL2) | Docker port conflict | Noted; integration tests need external DB |
| `jsdom` missing | Not in devDependencies | Added `jsdom: ^25.0.0` |
| `@vitejs/plugin-react` missing | Not in devDependencies | Added for JSX transform in Vitest |
| Next.js webpack `.js` → `.ts` resolution failure | Next.js doesn't auto-remap `.js` extensions | Removed `.js` from imports in web app |

---

## Tests Written

| Test File | Test Cases |
|-----------|-----------|
| `apps/api/src/services/politician.service.test.ts` | `returns empty data and null cursor`, `maps rows to DTO`, `null cursor when rows ≤ limit`, `non-null cursor when rows = limit+1`, `cursor encodes overallScore and id`, `passes decoded cursor to repository`, `throws on invalid cursor` |
| `apps/web/src/components/politician/politician-card.test.tsx` | `displays politician name`, `displays party and state badges`, `displays score as X/100 no qualitative labels`, `links to profile page`, `shows fallback alt text`, `uses accessible article element` |
| `apps/api/src/routes/politicians.route.integration.test.ts` | `returns 200 with data+cursor`, `respects limit`, `400 for limit=0`, `400 for limit>50`, `required card fields`, `Cache-Control header`, `/health returns ok` |

---

## Next Steps

- [ ] Review implementation
- [ ] Resolve PostgreSQL port conflict and run integration tests: `pnpm --filter @pah/api test:integration`
- [ ] Create PR: `gh pr create` or `/prp-pr`
- [ ] Merge when approved
- [ ] Continue with next phase: `/prp-plan .claude/PRPs/prds/rf-001-politician-catalog-listing.prd.md`
