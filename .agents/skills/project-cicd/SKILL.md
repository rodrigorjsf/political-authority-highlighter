---
name: project-cicd
description: CI/CD pipeline maintenance for Political Authority Highlighter. Use when adding new stacks, changing test infrastructure, or deciding if a new tool belongs in the CI pipeline.
license: Apache-2.0
version: 1.0.0
---

# Project CI/CD Maintenance

## Purpose

Maintains a **lean** GitHub Actions pipeline at `.github/workflows/ci.yml`. The pipeline must run only what is essential. Every addition requires a justification; absence is the default.

---

## Current Stack in CI

| Tool | Version | CI Step | Why It's Here |
|------|---------|---------|---------------|
| pnpm | 9 | Install | Workspace package manager |
| Node.js | 20 | Setup | Fastify 5 requires >=20 |
| Turborepo | 2 (via pnpm) | All steps | Monorepo orchestration |
| ESLint | (via root `.eslintrc.cjs`) | Lint | Catches import boundary violations |
| TypeScript | 5.4 | Typecheck | `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` |
| Vitest | 2 | Unit tests | Fast unit tests, no external deps |
| Next.js | 15 | Build | SSG/ISR build verification |
| Vercel | CLI | Vercel Build Validation | OBRIGATÓRIO: Verifies Next.js app builds on Vercel |
| Fastify | 5 | Build | Included via `pnpm build` |
| pnpm audit | (via pnpm) | Security audit | Catches high/critical dependency vulnerabilities |
| supabase/setup-cli | latest | Deploy (deploy.yml) | Supabase CLI: `supabase db push` (remote); local use `supabase start` and `supabase db reset --local` |

---

## What Is NOT in CI (and why)

| Tool/Task | Reason Excluded |
|-----------|----------------|
| Integration tests (`*.integration.test.ts`) | Require a live PostgreSQL instance -- use Testcontainers. Not yet written; add when the first integration test exists and add a `services: postgres` job. |
| E2E tests (Playwright `e2e/*.spec.ts`) | No E2E tests written yet. Add when first spec exists, with a separate job that starts the dev server. |
| Docker build | Production concern, not CI correctness. Add to a separate `deploy.yml` workflow. |
| Coverage reporting | Adds 10-20s with no quality gate yet defined. Add when coverage targets are set. |
| Lighthouse CI | Requires a live URL. Add to `deploy.yml` after deployment. |
| Database migrations | No live DB in CI. Validated by typecheck via Drizzle schema types. |

---

## Adding a New Stack to CI

When a new technology is added to the project, follow this evaluation before updating `ci.yml`:

### Step 1: Identify the tool and its CI purpose

Ask: "What does this tool verify that isn't already covered?"

| Category | Example | CI-worthy? |
|----------|---------|------------|
| Linter/formatter | Prettier, Biome | YES -- catches style drift |
| Type checker | tsc, pyright | YES -- catches type errors at PR time |
| Unit test runner | Vitest, Jest, pytest | YES -- must run on every PR |
| Build tool | Next.js build, tsc --build | YES -- confirms production artifact |
| Infrastructure provisioning | Terraform, Pulumi | NO -- goes in deploy.yml, not CI |
| Database migration | drizzle-kit migrate | NO -- needs live DB; not in unit CI |
| E2E test runner | Playwright, Cypress | YES, but only after first spec exists |
| Container build | Docker, kaniko | NO -- build time cost; goes in deploy.yml |
| Security scanner | Snyk, trivy | MAYBE -- add only if required by team policy |
| Coverage upload | codecov, coveralls | MAYBE -- add only after coverage targets defined |

### Step 2: Check the cost

Before adding, estimate:

- Does this add more than 60s to the total CI time? If yes, consider a separate parallel job.
- Does this require a service (database, Redis, network)? If yes, it cannot go in the simple job.
- Does this require secrets? Add to `env:` block only if the step cannot run without them.

### Step 3: Update `ci.yml`

Add the step in this order within the single job:

```
checkout -> setup tools -> install -> lint -> typecheck -> test -> build -> security
```

If the tool needs a separate job (e.g., integration tests with PostgreSQL service):

```yaml
  integration:
    name: Integration tests
    runs-on: ubuntu-latest
    needs: ci  # wait for unit CI to pass first

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: pah_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/pah_test
```

### Step 4: Update this skill

After updating `ci.yml`, update the **Current Stack in CI** table above to reflect the new step.

---

## When Integration Tests Are Added

When the first `*.integration.test.ts` file is created:

1. Add a `services: postgres:16-alpine` block to a new `integration` job
2. Add `DATABASE_URL` env var pointing to the service
3. Change the unit test step to explicitly exclude integration tests:

   ```yaml
   - name: Unit tests
     run: pnpm test --reporter=verbose
   ```

   (Vitest already excludes `*.integration.test.ts` via `vitest.config.ts` `exclude` pattern -- verify this is configured)
4. Update this skill's table

## When E2E Tests Are Added

When the first `e2e/*.spec.ts` file is created:

1. Add an `e2e` job with `needs: ci`
2. Start the Next.js server with `pnpm --filter @pah/web dev &` and wait for port 3000
3. Run `pnpm --filter @pah/web e2e`
4. Upload Playwright report as an artifact
5. Update this skill's table

---

## Security CI Steps

These steps enforce the Frontend Security First principle (DR-008, RNF-SEC-017):

### Step 1: Dependency Audit

```yaml
- name: Security audit
  run: pnpm audit --audit-level=high
  continue-on-error: false
```

Runs `pnpm audit` with `--audit-level=high` threshold. Fails the build on high or critical vulnerabilities.

### Step 2: Client Bundle Leak Scan (post-build)

After `pnpm build`, scan client chunks for forbidden patterns:

```yaml
- name: Client bundle security scan
  run: |
    FORBIDDEN="drizzle-orm|@pah/db|public-schema|internal-schema|DATABASE_URL|CPF_ENCRYPTION_KEY|TRANSPARENCIA_API_KEY|VERCEL_REVALIDATE_TOKEN"
    if grep -rEl "$FORBIDDEN" apps/web/.next/static/chunks/ 2>/dev/null; then
      echo "::error::Forbidden patterns found in client bundle!"
      exit 1
    fi
```

Detects server-only modules and secret variable names that should never appear in client JavaScript.

### Step 3: Secret Pattern Pre-commit

Enforced via lint-staged hook (not CI), but documented here:

- Regex patterns: `/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/` (CPF format), `/(password|secret|token)\s*[:=]\s*['"][^'"]+/i`
- Scans only staged `.ts`, `.tsx`, `.js`, `.json`, `.env*` files

---

## Leanness Checklist

Before every `ci.yml` change, verify:

- [ ] The new step catches a class of errors that existing steps do not
- [ ] It can run without a live database, network, or secrets
- [ ] It does not duplicate work already done by TypeScript or ESLint
- [ ] It does not significantly increase CI time without a quality gate reason
- [ ] If it needs a service, it's in a separate job with `needs: ci`

The default answer to "should I add this?" is **no**. Add only when the answer to "what real bug has this caught that we'd want to catch automatically?" has a clear answer.

---

## Changelog

| Date | PRD Version | Summary |
|------|-------------|---------|
| 2026-02-28 | 1.0 | Initial CI/CD maintenance skill |
| 2026-03-07 | 1.1 | Add pnpm audit to CI stack, add Security CI Steps section (DR-008, RNF-SEC-017), remove pnpm audit from exclusions |
| 2026-03-09 | 1.2 | Document Supabase CLI in deploy workflow |
