# Feature: RF-018 Phase 7 — Testing Infrastructure

## Summary

Set up a documented local full-stack development environment (Supabase + API + Web) with convenience scripts, a `TESTING.md` guide, and a `docker-compose.test.yml` for headless CI E2E testing. This phase creates the foundation that Phases 8 (visual regression) and 9 (a11y enhancement) depend on to run Playwright E2E tests against a real stack.

## User Story

As a developer working on Political Authority Highlighter
I want a documented, one-command-per-service local stack and a CI-ready test environment
So that I can run E2E tests locally and in CI without manual setup guesswork

## Problem Statement

The project has no `TESTING.md`, no `docker-compose.test.yml`, no root-level convenience scripts for starting each service, and no documented workflow for running E2E tests against the full stack. E2E tests assume the API is already running but Playwright config only starts the web server. The profile E2E test is skipped because it requires a seeded database. Developers must manually know the right commands, ports, and env vars.

## Solution Statement

Create `TESTING.md` documenting the 3-terminal workflow, add `dev:db`, `dev:api`, `dev:web` convenience scripts to root `package.json`, create `docker-compose.test.yml` for CI headless E2E, unskip the profile E2E test (seed data already has the needed politician), and verify the full stack works end-to-end locally.

## Metadata

| Field            | Value                                                      |
| ---------------- | ---------------------------------------------------------- |
| Type             | ENHANCEMENT                                                |
| Complexity       | LOW                                                        |
| Systems Affected | root config, apps/web (E2E), apps/api, CI                  |
| Dependencies     | supabase CLI (already installed), Playwright (already dep)  |
| Estimated Tasks  | 7                                                          |

---

## UX Design

### Before State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              BEFORE STATE                                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║   Developer needs to run E2E tests                                          ║
║                                                                             ║
║   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          ║
║   │  Terminal 1  │         │  Terminal 2  │         │  Terminal 3  │          ║
║   │ "supabase    │         │ "pnpm       │         │ "pnpm       │          ║
║   │  start"      │         │  --filter    │         │  --filter    │          ║
║   │ (guesswork)  │         │  @pah/api    │         │  @pah/web    │          ║
║   └─────────────┘         │  dev"        │         │  test:e2e"   │          ║
║                           │ (which env?) │         └─────────────┘          ║
║                           └─────────────┘                                   ║
║                                                                             ║
║   PAIN_POINTS:                                                              ║
║   - No documented workflow                                                  ║
║   - Must know to set RESEND_API_KEY + EMAIL_ENCRYPTION_KEY + ALERTS_FROM    ║
║   - Profile E2E test skipped (but seed data exists)                         ║
║   - No CI E2E pipeline                                                      ║
║   - No convenience scripts                                                  ║
║                                                                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### After State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                               AFTER STATE                                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║   Developer reads TESTING.md → runs 3 commands                              ║
║                                                                             ║
║   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          ║
║   │  Terminal 1  │         │  Terminal 2  │         │  Terminal 3  │          ║
║   │ pnpm dev:db  │ ──────►│ pnpm dev:api │ ──────►│ pnpm dev:web │          ║
║   │ (supabase    │         │ (Fastify on  │         │ (Next.js on  │          ║
║   │  start)      │         │  :3001)      │         │  :3000)      │          ║
║   └──────┬───────┘         └──────┬───────┘         └──────┬───────┘          ║
║          │                        │                        │                  ║
║          ▼                        ▼                        ▼                  ║
║   ┌─────────────────────────────────────────────────────────────┐            ║
║   │  pnpm test:e2e  (Playwright reuses :3000, hits :3001)      │            ║
║   │  All tests pass including profile page                      │            ║
║   └─────────────────────────────────────────────────────────────┘            ║
║                                                                             ║
║   CI: docker-compose.test.yml + Playwright → automated E2E                  ║
║   TESTING.md: complete docs + env parity notes + snapshot workflow           ║
║                                                                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| Root `package.json` | No dev:* scripts | `dev:db`, `dev:api`, `dev:web` convenience scripts | One-command-per-terminal startup |
| `TESTING.md` | Does not exist | Full local + CI test documentation | Clear workflow for new contributors |
| `docker-compose.test.yml` | Does not exist | API + Web services for CI E2E | Automated E2E in GitHub Actions |
| `accessibility.spec.ts:46` | Profile test skipped | Profile test enabled (seed has `ana-lima-sp`) | Full a11y coverage |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `package.json` | all | Root scripts to ADD convenience scripts |
| P0 | `.env.example` | all | All env vars needed for local dev |
| P0 | `apps/api/src/config/env.ts` | all | Required API env vars (fail-fast on startup) |
| P0 | `apps/web/playwright.config.ts` | all | How Playwright starts web server + reuses existing |
| P1 | `supabase/config.toml` | 1-60 | Port assignments and seed config |
| P1 | `supabase/seed.sql` | all | Available seed politicians for E2E |
| P1 | `apps/web/e2e/accessibility.spec.ts` | all | Profile test to unskip |
| P1 | `apps/web/e2e/politician-listing.spec.ts` | all | Existing E2E pattern |
| P1 | `apps/api/src/server.ts` | all | How API loads .env.local and starts |
| P2 | `.github/workflows/ci.yml` | all | Current CI steps (no E2E yet) |
| P2 | `turbo.json` | all | Task dependency graph |

---

## Patterns to Mirror

**ROOT_SCRIPTS:**

```typescript
// SOURCE: package.json:6-12
// EXISTING PATTERN — add dev:* scripts alongside these:
"scripts": {
  "dev": "turbo run dev",
  "build": "turbo run build",
  "lint": "turbo run lint",
  "typecheck": "turbo run typecheck",
  "test": "turbo run test",
  "test:e2e": "turbo run test:e2e"
}
```

**PLAYWRIGHT_CONFIG:**

```typescript
// SOURCE: apps/web/playwright.config.ts:14-23
// KEY PATTERN — webServer reuses existing dev server locally:
webServer: {
  command: isCI
    ? 'pnpm --filter @pah/web build && pnpm --filter @pah/web start'
    : 'pnpm --filter @pah/web dev',
  url: BASE_URL,
  reuseExistingServer: !isCI,
  timeout: isCI ? 180_000 : 120_000,
}
```

**API_ENV_VALIDATION:**

```typescript
// SOURCE: apps/api/src/config/env.ts:3-13
// ALL of these must be set for API to start:
// DATABASE_URL_READER (url), RESEND_API_KEY (min 1), EMAIL_ENCRYPTION_KEY (64-hex),
// ALERTS_FROM_EMAIL (email), PORT (default 3001), HOST (default 0.0.0.0)
```

**E2E_A11Y_PATTERN:**

```typescript
// SOURCE: apps/web/e2e/accessibility.spec.ts:4-18
// COPY THIS PATTERN for checkA11y helper:
async function checkA11y(page: Page, testInfo: TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  // ... attach results, assert no violations
}
```

**SEED_DATA:**

```sql
-- SOURCE: supabase/seed.sql
-- First politician: ana-lima-sp (slug derived from name 'Ana Lima' + state 'SP')
-- 25 politicians total with integrity_scores — sufficient for all E2E tests
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `TESTING.md` | CREATE | Document 3-terminal workflow, env setup, E2E, snapshot update |
| `package.json` | UPDATE | Add `dev:db`, `dev:api`, `dev:web` convenience scripts |
| `docker-compose.test.yml` | CREATE | Headless CI: API + Web services (DB = supabase CLI) |
| `apps/web/e2e/accessibility.spec.ts` | UPDATE | Unskip profile test, use correct seed slug |
| `.github/workflows/ci.yml` | UPDATE | Note: evaluate only — actual CI E2E step is Phase 10 scope |

---

## NOT Building (Scope Limits)

- **CI E2E pipeline step** — Phase 10 will add E2E to `.github/workflows/ci.yml` after visual regression (Phase 8) and a11y (Phase 9) are established
- **Visual regression screenshots** — Phase 8 scope
- **Dark mode E2E tests** — Phase 9 scope
- **Test skills** — Phase 10 scope
- **Testcontainers integration** — separate concern; integration tests already work against Supabase local
- **Vercel MCP environment variable retrieval** — PRD mentions this but it is a nice-to-have; document known vars from `.env.example` instead

---

## Step-by-Step Tasks

### Task 1: CREATE `TESTING.md`

- **ACTION**: CREATE root-level testing documentation
- **IMPLEMENT**: Document the following sections:
  1. **Prerequisites**: Node.js 22, pnpm 9, Supabase CLI, `.env.local` file (copy from `.env.example`)
  2. **Local Development Stack** (3-terminal workflow):
     - Terminal 1: `pnpm dev:db` (runs `supabase start`, waits for healthy status)
     - Terminal 2: `pnpm dev:api` (runs `pnpm --filter @pah/api dev`)
     - Terminal 3: `pnpm dev:web` (runs `pnpm --filter @pah/web dev`)
  3. **Environment Variables**: table of required vars with dev defaults from `.env.example`. Note that `RESEND_API_KEY`, `EMAIL_ENCRYPTION_KEY`, `ALERTS_FROM_EMAIL` are required by the API — use dummy values for local dev (e.g., `re_test_dummy` for Resend, a 64-char hex zero string for encryption key, `test@example.com` for email)
  4. **Running Tests**:
     - Unit: `pnpm test` (runs all unit tests via Turbo)
     - E2E: Start all 3 services first, then `pnpm --filter @pah/web test:e2e`
     - Integration: Start DB first, then `pnpm --filter @pah/api test:integration`
  5. **Service Ports**: table (DB: 54322, API: 3001, Web: 3000)
  6. **Database Seeding**: `supabase db reset` to re-run migrations + seed (25 politicians)
  7. **Verifying the Stack**: `curl http://localhost:3001/health` → `{"status":"ok"}`; open `http://localhost:3000` → home page renders
  8. **Environment Parity Notes**: local uses direct Postgres (port 54322, `prepare: true`); production uses Supavisor pooler (port 6543, `prepare: false`); `NEXT_PUBLIC_API_URL` defaults to `http://localhost:3001/api/v1` locally
  9. **Snapshot Update Workflow** (placeholder for Phase 8): mention that visual regression baselines will be added in Phase 8 under `apps/web/e2e/__snapshots__/`
- **STYLE**: Follow project markdown conventions (no semicolons in code blocks, single quotes)
- **GOTCHA**: Do NOT include actual secrets — reference `.env.example` for placeholder values
- **VALIDATE**: File renders correctly in markdown preview; all referenced commands are accurate

### Task 2: UPDATE root `package.json` — add convenience scripts

- **ACTION**: ADD `dev:db`, `dev:api`, `dev:web` scripts
- **IMPLEMENT**:

  ```json
  "dev:db": "supabase start",
  "dev:api": "pnpm --filter @pah/api dev",
  "dev:web": "pnpm --filter @pah/web dev"
  ```

- **MIRROR**: Existing script pattern in `package.json:6-12`
- **PLACEMENT**: Add after `"dev": "turbo run dev"` line
- **GOTCHA**: `supabase start` is a long-running process (stays running); it's not a Turbo task — do NOT route through Turbo
- **VALIDATE**: `pnpm dev:db --help` should show supabase start help (or start supabase if DB is not running)

### Task 3: CREATE `docker-compose.test.yml`

- **ACTION**: CREATE Docker Compose file for headless CI E2E testing
- **IMPLEMENT**:
  - Two services: `api` and `web`
  - `api` service:
    - Builds from `apps/api/Dockerfile.api` (or uses `node:22-alpine` with direct `tsx` command)
    - Exposes port 3001
    - Environment: `DATABASE_URL_READER`, `RESEND_API_KEY` (dummy), `EMAIL_ENCRYPTION_KEY` (dummy 64-hex), `ALERTS_FROM_EMAIL` (dummy), `NODE_ENV=test`
    - Depends on: external Supabase DB (assumes `supabase start` already running on host)
    - Network mode: `host` (simplest for accessing Supabase on localhost:54322)
  - `web` service:
    - Builds from Next.js (or uses `node:22-alpine` with `next build && next start`)
    - Exposes port 3000
    - Environment: `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`
    - Depends on: `api`
    - Network mode: `host`
  - **Alternative approach** (simpler, preferred): since CI can just run shell commands, the compose file primarily documents the service orchestration. Use `network_mode: host` to avoid Docker networking complexity with Supabase on localhost.
- **GOTCHA**: `apps/api/Dockerfile.api` and `apps/web/Dockerfile` may not exist yet — check and if they don't, use a simpler approach with `command:` directives using node directly, or create minimal Dockerfiles
- **GOTCHA**: Supabase CLI in CI requires `supabase start` with `--ignore-health-check` flag for faster startup
- **VALIDATE**: `docker compose -f docker-compose.test.yml config` validates the file syntax

### Task 4: UPDATE `apps/web/e2e/accessibility.spec.ts` — unskip profile test

- **ACTION**: UNSKIP the profile page a11y test and use the correct seed slug
- **IMPLEMENT**:
  - Change `test.skip('perfil de político — requer DB populado', ...)` to `test('perfil de político', ...)`
  - The seed data has politician `Ana Lima` from state `SP` — the slug will be `ana-lima-sp`
  - Verify the correct slug by checking `supabase/seed.sql` for the first politician's name and state
  - Update the `page.goto` URL to use the correct seed slug
- **MIRROR**: Other tests in the same file (lines 21-44) use the same `checkA11y` pattern
- **GOTCHA**: The slug is generated from name + state. Seed data row 1: `name = 'Ana Lima'`, `state = 'SP'` → slug = `ana-lima-sp`. Verify this matches the actual slug column in `seed.sql`
- **VALIDATE**: `pnpm --filter @pah/web test:e2e -- --grep "perfil"` should run (requires full stack)

### Task 5: Verify seed data slugs match E2E expectations

- **ACTION**: READ `supabase/seed.sql` and verify the slug column values for the first few politicians
- **IMPLEMENT**:
  - Check if `seed.sql` has explicit `slug` values or if slugs are auto-generated
  - Ensure the slug used in the unskipped profile test matches an actual seed row
  - If slug is not explicit in seed data, find how slugs are generated (likely in pipeline) and verify the E2E test uses a slug that exists
- **GOTCHA**: If `seed.sql` inserts with explicit slugs, use that exact value. If slugs are generated by the pipeline, the seed might not have slugs — in that case, need to add explicit slugs to seed data
- **VALIDATE**: The politician slug used in E2E test exists in the seeded database

### Task 6: Verify full stack locally

- **ACTION**: Manual verification that all 3 services start and work together
- **IMPLEMENT**:
  1. `supabase start` → DB healthy on :54322
  2. API starts on :3001 → `curl http://localhost:3001/health` returns `{"status":"ok"}`
  3. Web starts on :3000 → Home page loads, listing shows seeded politicians
  4. E2E tests pass: `pnpm --filter @pah/web test:e2e`
- **VALIDATE**: All services running, home page shows data, E2E tests pass (including unskipped profile test)

### Task 7: UPDATE `TESTING.md` with verification results

- **ACTION**: Update TESTING.md with any corrections discovered during Task 6
- **IMPLEMENT**: Fix any inaccuracies found during manual verification (wrong ports, missing env vars, etc.)
- **VALIDATE**: TESTING.md accurately reflects the working setup

---

## Testing Strategy

### Verification Tests

| Test | Test Cases | Validates |
|------|------------|-----------|
| `apps/web/e2e/accessibility.spec.ts` | Profile page now included (unskipped) | Seeded DB supports full E2E |
| Manual: API health check | `curl localhost:3001/health` → `{"status":"ok"}` | API starts with local env |
| Manual: Home page | `localhost:3000` shows hero + featured politicians | Full stack connected |
| Manual: Listing page | `localhost:3000/politicos` shows 25 seeded politicians | API ↔ Web ↔ DB data flow |
| `docker compose -f docker-compose.test.yml config` | Valid YAML, services defined | CI compose file syntax |

### Edge Cases Checklist

- [ ] API startup fails if required env vars missing (verify error message is clear)
- [ ] Web loads with fallback `NEXT_PUBLIC_API_URL` when env var is unset
- [ ] `supabase start` is idempotent (running twice doesn't fail)
- [ ] `supabase db reset` re-seeds correctly
- [ ] Playwright reuses existing dev server when `reuseExistingServer: true`

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm lint && pnpm typecheck
```

**EXPECT**: Exit 0, no errors or warnings

### Level 2: UNIT_TESTS

```bash
pnpm test
```

**EXPECT**: All existing unit tests still pass (no regressions)

### Level 3: FULL_SUITE

```bash
pnpm test && pnpm build
```

**EXPECT**: All tests pass, build succeeds

### Level 4: E2E_VALIDATION

```bash
# Requires full stack running (supabase start + API + Web)
pnpm --filter @pah/web test:e2e
```

**EXPECT**: All E2E tests pass including the previously-skipped profile test

### Level 5: COMPOSE_VALIDATION

```bash
docker compose -f docker-compose.test.yml config
```

**EXPECT**: Valid config output, no errors

### Level 6: MANUAL_VALIDATION

1. Start full stack: `pnpm dev:db`, `pnpm dev:api`, `pnpm dev:web`
2. Verify API health: `curl http://localhost:3001/health`
3. Verify home page: open `http://localhost:3000`
4. Verify listing: open `http://localhost:3000/politicos` (should show seeded data)
5. Verify profile: open `http://localhost:3000/politicos/ana-lima-sp` (or correct seed slug)

---

## Acceptance Criteria

- [ ] `TESTING.md` exists at project root with complete 3-terminal workflow documentation
- [ ] Root `package.json` has `dev:db`, `dev:api`, `dev:web` scripts
- [ ] `docker-compose.test.yml` exists and passes syntax validation
- [ ] Profile E2E test is unskipped and uses correct seed slug
- [ ] All existing unit tests pass (no regressions)
- [ ] `pnpm build` succeeds
- [ ] Full E2E suite passes (including profile test) when stack is running

---

## Completion Checklist

- [ ] All tasks completed in dependency order
- [ ] Each task validated immediately after completion
- [ ] Level 1: Static analysis (lint + typecheck) passes
- [ ] Level 2: Unit tests pass
- [ ] Level 3: Full test suite + build succeeds
- [ ] Level 4: E2E tests pass with full stack
- [ ] Level 5: Docker compose config validates
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Seed data slug mismatch | MEDIUM | HIGH | Task 5 explicitly verifies slugs before updating E2E test |
| API requires Resend API key for startup | HIGH | MEDIUM | Document dummy values in TESTING.md (Resend won't actually send in dev) |
| Supabase CLI version differences | LOW | LOW | supabase is pinned in root devDeps (`^2.78.1`) |
| docker-compose.test.yml + Supabase CLI in CI | MEDIUM | LOW | Use network_mode: host; document that CI must run supabase start first |

---

## Notes

- **Phase 10 will add actual CI E2E steps** — this phase only creates the infrastructure and documentation
- **Profile test slug**: Must verify against `supabase/seed.sql` — the politician with slug containing "ana-lima" in the seed data. If seed.sql doesn't have explicit slugs, this is a blocker that needs resolution
- **docker-compose.test.yml is preparatory** — CI integration happens in Phase 10 when the CI pipeline is updated
- **ISR revalidation token**: In local dev, `VERCEL_REVALIDATE_TOKEN` can be any string. The revalidation webhook at `/api/revalidate` compares against this env var. Document this in TESTING.md
- **Existing Dockerfiles**: Check if `apps/api/Dockerfile.api` and web Dockerfile exist. If not, the compose file should use a simpler approach (base node image + direct commands)
