---
name: project-deploy-validator
description: Post-PR deploy validation for Political Authority Highlighter. Checks GitHub CI, Vercel deploy, and Supabase migrations after a PR is pushed to development. Auto-fixes failures (max 1 attempt per type) and posts result as PR comment. Use after creating a PR to development, or on-demand to check deploy status.
---

# Project Deploy Validator

## When to Use

- After creating or pushing to a PR targeting `development`
- On-demand to check current deploy/CI status for any branch
- Automatically invoked by `validate-deploy.yml` GitHub Actions workflow

## Required Context

When invoked from the GitHub Actions workflow, you will receive:

- `branch` — the PR branch name (e.g., `feat/PAH-42-something`)
- `head_sha` — the exact commit SHA that triggered the CI run
- `ci_run_id` — the GitHub Actions run ID for the CI workflow
- `ci_conclusion` — `success` or `failure`

When invoked manually, derive these from the current git state:

```bash
git branch --show-current   # → branch
git rev-parse HEAD           # → head_sha
gh run list --branch <branch> --workflow "CI" --limit 1 --json databaseId,conclusion
```

## Step-by-Step Logic

### Step 0: Resolve PR

```bash
gh pr list --head <branch> --state open --json number,url --limit 1
```

- If result is **empty** (direct push to `development`, no open PR): skip all
  `gh pr comment` steps and write the summary to stdout instead.
- If PR found: capture the PR `number` for all subsequent `gh pr comment <number>` calls.

---

### Step 1: Check GitHub CI

```bash
gh run list --branch <branch> --workflow "CI" --limit 3 --json databaseId,conclusion,headSha
```

- Match the run where `headSha == <head_sha>`
- If `conclusion == failure`:

  ```bash
  gh run view <databaseId> --log-failed
  ```

  Collect the full error output for diagnosis.

---

### Step 2: Check Vercel Deploy

Use `mcp__vercel__list_deployments` filtered by the branch.

- Find the deployment where `meta.githubCommitSha == <head_sha>`
- If no matching deployment exists yet: poll up to **3 times with 30s delay** before
  reporting as "deploy not yet triggered"
- If deployment `state == ERROR` or `state == CANCELED`:
  Use `mcp__vercel__get_deployment_build_logs` with the deployment ID to collect errors
- If deployment `state == READY`: capture the preview URL for the success report

---

### Step 3: Check Supabase Migrations

> IMPORTANT: always pass `project_id: <SUPABASE_PROJECT_REF>` explicitly on every
> `mcp__supabase__*` call. The MCP does NOT read this from the environment automatically.

```
mcp__supabase__list_migrations(project_id: <SUPABASE_PROJECT_REF>)
```

- Compare listed migration names against files under `supabase/migrations/` on disk
- If any migration files on disk are absent from the applied list: flag as unapplied
- Also run:

  ```
  mcp__supabase__get_logs(project_id: <SUPABASE_PROJECT_REF>, type: "db")
  ```

  Scan for recent ERROR entries related to migration execution.

---

### Step 4: Report or Fix

#### If all checks pass

Post a ✅ comment on the PR (or stdout if no PR):

```
✅ Deploy validation passed

- **CI:** [run link] — passed
- **Vercel:** [preview URL] — ready
- **Supabase migrations:** [N applied, all up to date]
```

#### If any check fails — auto-fix (max 1 attempt per failure type)

Fix strategy by failure type:

| Failure | Fix Strategy |
| --- | --- |
| ESLint errors | Run `pnpm lint --fix`, stage changed files |
| TypeScript errors | Fix the type errors in source code |
| Unit test failures | Fix the failing assertions or the source bug |
| Build errors (Next.js / tsc) | Fix compilation errors |
| Vercel build errors | Analyze `get_deployment_build_logs`, fix source |
| Supabase migration errors | Analyze `get_logs`, fix the SQL migration file |

After applying the fix:

1. Run the relevant local verification:

   ```bash
   pnpm lint && pnpm typecheck && pnpm build
   ```

2. Commit using conventional commits:

   ```bash
   git add <changed files>
   git commit -m "fix(<scope>): <description of what was fixed>"
   ```

3. Push to the PR branch:

   ```bash
   git push
   ```

4. Re-run the verification for that specific failure type to confirm resolution.

#### Termination Rule

If re-verification after the fix attempt still shows failures:

- Post a ❌ comment (or stdout) with the **full diagnostic output**
- **Stop — do NOT attempt further fixes**

#### Fix Success

Post a 🔧 comment (or stdout):

```
🔧 Deploy validation: auto-fix applied

**Fixed:** <description of what was wrong>
**Commit:** <sha> — <commit message>
**Re-verification:** passed / still failing

<full diff or error details if still failing>
```

---

## No-PR Fallback

If running on a direct push to `development` with no open PR:

- Complete all checks and fixes as normal
- Print all output to stdout instead of posting PR comments
- Do not fail — this is expected behavior for direct `development` pushes

---

## Changelog

| Date | Summary |
| --- | --- |
| 2026-03-14 | Initial skill — post-PR deploy validation |
