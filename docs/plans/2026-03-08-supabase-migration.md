# Supabase Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the project's backend infrastructure from self-hosted PostgreSQL on Hetzner VPS to Supabase BaaS, while maintaining a robust local development environment using Docker Compose and standard PostgreSQL.

**Architecture:** The project will transition to a managed PostgreSQL instance on Supabase. Development and CI will continue to use a local PostgreSQL container (Docker Compose) to ensure parity. Deployment will use the Supabase CLI to apply Drizzle ORM migrations.

**Tech Stack:** Supabase (PostgreSQL), Drizzle ORM, Docker Compose, GitHub Actions, Supabase CLI.

---

### Task 1: Documentation and Base Configuration Update

**Files:**
- Modify: `docs/prd/ARCHITECTURE.md`
- Modify: `docs/prd/PRD.md`
- Modify: `CLAUDE.md`
- Modify: `.env.example`
- Modify: `.mcp.json`

**Step 1: Update ARCHITECTURE.md**
- Replace ADR-006 (Single VPS) with a new ADR for Managed BaaS with Supabase.
- Update infrastructure diagrams to show Supabase Cloud.
- Adjust monthly cost estimate to ~$25/month (Supabase Pro).

**Step 2: Update PRD.md**
- Update cost metrics (RNF-COST-002, RNF-COST-003).
- Update availability/reliability strategies (Section 3.3).
- Update infrastructure section (Section 6.1).

**Step 3: Update .env.example**
- Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Maintain `DATABASE_URL` for local Postgres.

**Step 4: Update .mcp.json**
- Ensure `postgres-local` is documented as the development standard.

**Step 5: Commit**
```bash
git add docs/ .env.example .mcp.json CLAUDE.md
git commit -m "docs: update architecture to include Supabase BaaS while keeping local dev"
```

---

### Task 2: Database Layer Refactoring (`packages/db`)

**Files:**
- Modify: `packages/db/src/clients.ts`
- Modify: `packages/db/drizzle.config.ts`

**Step 1: Refactor clients.ts for Pooling Support**
- Implement support for Supabase connection pooling (Port 6543) vs direct connection for local dev.

**Step 2: Update drizzle.config.ts**
- Ensure it handles environment-specific connection strings gracefully.

**Step 3: Commit**
```bash
git add packages/db/src/clients.ts packages/db/drizzle.config.ts
git commit -m "refactor: adjust db clients for supabase pooling and local dev"
```

---

### Task 3: Supabase CLI Integration

**Files:**
- Modify: `package.json`
- Create: `supabase/config.toml`

**Step 1: Install Supabase CLI**
Run: `pnpm add -D supabase`

**Step 2: Initialize Supabase**
Run: `npx supabase init`

**Step 3: Configure Supabase to track Drizzle migrations**
- Document the link between `packages/db/migrations` and Supabase.

**Step 4: Commit**
```bash
git add package.json supabase/
git commit -m "chore: initialize supabase cli and configuration"
```

---

### Task 4: CI/CD Workflow Update

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Replace VPS Deployment Steps**
- Remove SSH/Docker Compose deployment steps for the backend.
- Add `supabase db push` step to apply migrations to the production/staging project.

**Step 2: Commit**
```bash
git add .github/workflows/ci.yml
git commit -m "ci: replace VPS deployment with Supabase CLI"
```

---

### Task 5: Local Environment Validation

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Harden Local Dev Environment**
- Ensure the local `postgres` service matches Supabase's PostgreSQL 16 standard.

**Step 2: Verify local flow**
Run: `pnpm dev`
Expected: System starts and functions using local Docker Postgres.

**Step 3: Commit**
```bash
git add docker-compose.yml
git commit -m "chore: ensure local docker dev environment is robust"
```
