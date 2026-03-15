# Deploy Validation Design

**Date:** 2026-03-14
**Project:** Political Authority Highlighter
**Status:** Approved — pending implementation

---

## Problem

After a PR is created to `development`, there is no automated process to verify that:

- The GitHub Actions CI pipeline passed
- The Vercel preview deploy succeeded
- Supabase migrations were applied without errors

When failures occur, the developer must manually hunt through GitHub Actions logs, the Vercel dashboard, and the Supabase dashboard to diagnose and fix them. This is slow and error-prone.

---

## Goal

Create a **post-PR deploy validation system** that:

1. Automatically detects CI, Vercel, and Supabase failures after every push to `development`
2. Diagnoses root causes using available MCPs (Vercel, Supabase) and `gh` CLI
3. Applies fixes autonomously (code changes, commits, push) when possible — max 1 retry per failure type
4. Posts a summary comment on the PR with status and any corrections made
5. Is also invocable manually from Claude Code at any time

---

## Prerequisites

Before creating the workflow, verify the following GitHub Actions secrets are configured
(Settings → Secrets → Actions in the repo):

| Secret | Purpose | Already present? |
| --- | --- | --- |
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude Code Action authentication | yes (used by claude.yml) |
| `VERCEL_TOKEN` | Vercel MCP and CLI authentication | yes (used by ci.yml) |
| `SUPABASE_ACCESS_TOKEN` | Supabase MCP authentication | verify — generate at supabase.com/dashboard/account/tokens if missing |
| `SUPABASE_PROJECT_REF` | Identifies which Supabase project to query (migrations, logs) | find at: Supabase Dashboard → Project Settings → General → Reference ID |

> **SUPABASE_ACCESS_TOKEN** is a personal access token from the Supabase dashboard. If it does not
> exist as a repo secret, create it and add it before creating the workflow file.

---

## Architecture

```text
PR created / pushed to `development`
        │
        ▼
ci.yml (existing)
  lint → typecheck → test → build → vercel build → bundle scan
        │
        ▼ on completion (success or failure)
validate-deploy.yml  ◄── NEW
  triggered by: workflow_run on ci.yml
        │
        ├── Resolve PR number from branch (gh pr list --head <branch>)
        ├── Collect status: GitHub CI + Vercel deploy + Supabase migrations
        │
        ├── [all pass] → posts ✅ comment on PR with deploy URL and migration summary
        │
        └── [any failure] → claude-code-action@v1
                              │
                              ├── Diagnoses with MCPs (Vercel logs, Supabase logs, gh CLI)
                              ├── Applies fix on PR branch (max 1 fix attempt per failure type)
                              ├── Commits + pushes
                              ├── Posts comment with what was fixed
                              └── If fix fails: posts ❌ diagnostic comment without further retries
```

> **Trigger choice:** `validate-deploy.yml` fires off `ci.yml` completion (not `deploy.yml`).
> This avoids a known issue: `deploy.yml` uses a job-level `if:` guard, so its workflow always
> completes with conclusion `success` even when the job was skipped. Triggering off `ci.yml`
> gives a reliable `conclusion == 'success' | 'failure'` signal. The Vercel deploy status is
> checked directly via MCP regardless of CI outcome.

**Manual invocation:** The skill `project-deploy-validator` can be invoked from Claude Code IDE
at any time using `/project-deploy-validator`. It executes the same validation logic using the
locally installed MCPs (`mcp__vercel__*`, `mcp__supabase__*`) and `gh` CLI.

---

## Components

### 1. Skill — `project-deploy-validator`

**Location:** `.claude/skills/project-deploy-validator/SKILL.md`

**Trigger:** After creating a PR to `development`, or on-demand to check deploy status.

**Step-by-step logic:**

```text
0. RESOLVE PR
   └── gh pr list --head <branch> --state open --json number,url --limit 1
       → If result is empty (direct push to development, no open PR):
         post a Gist or write a summary to stdout; skip all gh pr comment steps
       → If PR found: capture PR number for use in gh pr comment <number>

1. CHECK GitHub CI
   └── gh run list --branch <branch> --workflow "CI" --limit 3
       (use the workflow name "CI", not the filename ci.yml — both work, prefer name)
       → Identify the most recent run matching <head_sha>
       → If failed: gh run view <id> --log-failed → collect errors

2. CHECK Vercel Deploy
   └── mcp__vercel__list_deployments (filter by branch)
       → Match deployment by commit SHA (<head_sha>) — NOT just by branch name,
         to avoid acting on the previous deployment if the new one hasn't been created yet
       → If no deployment matches <head_sha> yet: poll up to 3 times (30s apart)
       → If failed/error: mcp__vercel__get_deployment_build_logs → collect errors

3. CHECK Supabase Migrations
   └── mcp__supabase__list_migrations (project_id: <SUPABASE_PROJECT_REF>)
       → IMPORTANT: pass SUPABASE_PROJECT_REF explicitly as project_id on every
         mcp__supabase__* call — the MCP does not read it from the environment automatically
       → Compare listed migrations against /supabase/migrations/ on disk
       → mcp__supabase__get_logs (project_id: <SUPABASE_PROJECT_REF>, type: db)
         → check for recent migration errors

4. IF ALL OK → post ✅ comment on PR with:
   - CI run link
   - Vercel preview URL (from the matched deployment)
   - List of Supabase migrations applied
   → If no PR (step 0): print summary to stdout instead

5. IF FAILURE DETECTED → by type (max 1 fix attempt per failure type):
   ├── lint/types/test/build  → fix code → pnpm lint/typecheck/build locally → push
   ├── Vercel build           → analyze logs → fix → push
   ├── Supabase migration     → analyze DB logs → fix SQL → push
   └── After fix attempt:
       ├── Success → post 🔧 comment (or stdout if no PR) with diff summary and commit hash
       └── Still failing → post ❌ comment (or stdout) with full diagnostic; no further retries
```

**Termination rule:** If re-verification after a fix attempt still shows failures, post a
`❌` diagnostic comment with the full error output and stop. Do not attempt more than one
fix per failure type per invocation.

**Outputs:**

- ✅ Status report with CI link, Vercel preview URL, migrations applied
- 🔧 Fix applied: diff summary + commit hash + re-verification result
- ❌ Failure with full diagnostic when auto-fix was not enough

---

### 2. GitHub Actions Workflow — `validate-deploy.yml`

**Location:** `.github/workflows/validate-deploy.yml`

**Trigger:** `workflow_run` on `ci.yml` completion for `development` branch.

> **Warning:** The `workflow_run` trigger matches workflows by their `name:` field exactly
> (case-sensitive). The trigger below references `"CI"` which is the `name:` in `ci.yml`.
> If `ci.yml` is renamed, this trigger will silently stop firing.

```yaml
name: Validate Deploy

on:
  workflow_run:
    workflows: ["CI"]
    branches: [development]
    types: [completed]

jobs:
  validate:
    runs-on: ubuntu-latest
    # Only run for PRs from the same repo (not forks — cannot push fixes to fork branches)
    if: github.event.workflow_run.head_repository.full_name == github.repository
    permissions:
      contents: write        # push fixes to PR branch
      pull-requests: write   # post PR comments
      actions: read          # read CI run logs via gh CLI
      id-token: write

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_branch }}
          fetch-depth: 0

      - name: Run Claude Deploy Validator
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          # additional_permissions grants the Claude agent gh CLI access to Actions logs.
          # This is distinct from the job-level permissions: block above, which governs
          # the GITHUB_TOKEN scope for push/comment operations.
          additional_permissions: |
            actions: read
          prompt: |
            Run /project-deploy-validator for:
            - branch: ${{ github.event.workflow_run.head_branch }}
            - head_sha: ${{ github.event.workflow_run.head_sha }}
            - ci_run_id: ${{ github.event.workflow_run.id }}
            - ci_conclusion: ${{ github.event.workflow_run.conclusion }}
            Use head_sha to match the correct Vercel deployment (not just branch).
            Fix any failures found, push fixes, and post
            a summary comment on the PR (or stdout if no open PR exists).
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
```

**Key design decisions:**

- Triggers off `ci.yml` (not `deploy.yml`) for a reliable `conclusion` signal
- Job-level `if:` excludes fork PRs — cannot push fixes to a fork branch from base repo
- `permissions: contents: write` + `pull-requests: write` governs GITHUB_TOKEN for push/comment
- `additional_permissions: actions: read` grants the Claude agent ability to call `gh run view`
- `VERCEL_TOKEN` and `SUPABASE_ACCESS_TOKEN` passed as env vars for MCP authentication
- Checks out the **PR branch head** (`head_branch`) to enable committing and pushing fixes

---

### 3. Updates to Existing Skills

**`project-guardian`** — new Section 10:

```markdown
### 10. Post-PR Validation (Required)

After creating a PR to `development`, validate the deploy:

- Automatic: `validate-deploy.yml` triggers after CI completes and posts result as PR comment
- Manual (when needed): invoke `/project-deploy-validator` in Claude Code

Only consider implementation COMPLETE when all three are confirmed:
- [ ] CI (`ci.yml`) passed on GitHub Actions
- [ ] Vercel deploy confirmed (preview URL available on PR comment)
- [ ] Supabase migrations applied without errors
```

**`project-cicd`** — new row in "Current Stack in CI" table:

```text
| validate-deploy.yml | — | Post-CI | Validates CI + Vercel + Supabase after ci.yml completes;
                                       auto-fix via claude-code-action (max 1 retry/type) |
```

---

## Available MCPs (already installed)

| MCP | Key tools used |
| --- | --- |
| `mcp__vercel__*` | `list_deployments`, `get_deployment_build_logs`, `get_runtime_logs`, `get_project` |
| `mcp__supabase__*` | `list_migrations`, `get_logs`, `execute_sql`, `list_branches` |
| `mcp__git__*` | `git_status`, `git_log`, `git_diff` |
| `gh` CLI (Bash) | `gh run list`, `gh run view --log-failed`, `gh pr list`, `gh pr comment` |

No new MCPs need to be installed — the Vercel and Supabase MCPs already cover the required checks.

---

## Auto-Fix Scope

All failure types are in scope for auto-fix, with a hard limit of **1 attempt per failure type**:

| Failure Type | Auto-Fix Strategy |
| --- | --- |
| ESLint errors | `pnpm lint --fix`, commit |
| TypeScript errors | Fix type issues in source, commit |
| Unit test failures | Fix failing assertions or source bug, commit |
| Build errors (Next.js / tsc) | Fix compilation errors, commit |
| Vercel build errors | Analyze build logs via MCP, fix, commit |
| Supabase migration errors | Analyze DB logs via MCP, fix SQL, commit |

If the re-verification after a fix attempt still fails: post `❌` diagnostic and stop. No
infinite loops.

---

## Success Criteria

- A ✅ PR comment appears automatically after every successful CI + deploy to `development`
- A 🔧 PR comment appears when a failure is detected and fixed automatically
- A ❌ PR comment appears when auto-fix was attempted but did not resolve the failure
- The skill `/project-deploy-validator` produces equivalent output when invoked manually
- `project-guardian` references post-PR validation as a mandatory completion step
- `project-cicd` documents `validate-deploy.yml` in its stack table
