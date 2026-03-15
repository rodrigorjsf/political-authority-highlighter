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
3. Applies fixes autonomously (code changes, commits, push) when possible
4. Posts a summary comment on the PR with status and any corrections made
5. Is also invocable manually from Claude Code at any time

---

## Architecture

```
PR created / pushed to `development`
        │
        ▼
ci.yml (existing)
  lint → typecheck → test → build → vercel build → bundle scan
        │
        ▼ on success
deploy.yml (existing)
  notifies Vercel → Vercel auto-deploys via GitHub integration
        │
        ▼ on completion (success or failure)
validate-deploy.yml  ◄── NEW
        │
        ├── Collects status: GitHub Actions + Vercel deploy + Supabase migrations
        │
        ├── [all pass] → posts ✅ comment on PR with deploy URL and migration summary
        │
        └── [any failure] → claude-code-action@v1
                              │
                              ├── Diagnoses with MCPs (Vercel logs, Supabase logs, gh CLI)
                              ├── Applies fix on PR branch
                              ├── Commits + pushes
                              └── Posts comment with what was fixed
```

**Manual invocation:** The skill `project-deploy-validator` can be invoked from Claude Code IDE
at any time using `/project-deploy-validator`. It executes the same validation logic using the
locally installed MCPs (`mcp__vercel__*`, `mcp__supabase__*`) and `gh` CLI.

---

## Components

### 1. Skill — `project-deploy-validator`

**Location:** `.claude/skills/project-deploy-validator/SKILL.md`

**Trigger:** After creating a PR to `development`, or on-demand to check deploy status.

**Step-by-step logic:**

```
1. CHECK GitHub CI
   └── gh run list --branch <branch> --limit 5
       → Identify the most recent ci.yml run
       → If failed: gh run view <id> --log-failed → collect errors

2. CHECK Vercel Deploy
   └── mcp__vercel__list_deployments (filter by branch)
       → If failed/error: mcp__vercel__get_deployment_build_logs → collect errors

3. CHECK Supabase Migrations
   └── mcp__supabase__list_migrations → compare with /supabase/migrations/ on disk
       → mcp__supabase__get_logs (type: db) → check for recent errors

4. IF ALL OK → report ✅ with summary (branch, deploy URL, migrations applied)

5. IF FAILURE DETECTED → by type:
   ├── lint/types/test/build  → fix code → verify locally → push
   ├── Vercel build           → analyze logs → fix → push
   ├── Supabase migration     → analyze error → fix SQL → push
   └── After any fix          → re-run verification to confirm resolution
```

**Outputs:**

- Status report with Vercel preview URL
- List of Supabase migrations applied
- If fix was applied: diff summary + commit hash

---

### 2. GitHub Actions Workflow — `validate-deploy.yml`

**Location:** `.github/workflows/validate-deploy.yml`

**Trigger:** `workflow_run` on `deploy.yml` completion for `development` branch.

```yaml
name: Validate Deploy

on:
  workflow_run:
    workflows: ["Deploy staging CI"]
    branches: [development]
    types: [completed]

jobs:
  validate:
    runs-on: ubuntu-latest
    permissions:
      contents: write        # push fixes
      pull-requests: write   # post comments
      actions: read          # read CI logs
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
          additional_permissions: |
            actions: read
          prompt: |
            Run /project-deploy-validator for branch
            ${{ github.event.workflow_run.head_branch }},
            triggered by workflow run
            ${{ github.event.workflow_run.id }}.
            Fix any failures found, push fixes, and post
            a summary comment on the PR.
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**Key design decisions:**

- Checks out the **PR branch** (not `development` base) to enable committing fixes
- `VERCEL_TOKEN` and `SUPABASE_ACCESS_TOKEN` passed as env vars for MCPs to work in Actions context
- `gh` CLI is available on ubuntu runners by default
- Triggers on both `success` and `failure` of `deploy.yml` — Vercel may fail even after CI passes

---

### 3. Updates to Existing Skills

**`project-guardian`** — new Section 10:

```markdown
### 10. Post-PR Validation (Required)

After creating a PR to `development`, validate the deploy:

- Automatic: `validate-deploy.yml` triggers and posts result as PR comment
- Manual (when needed): invoke `/project-deploy-validator` in Claude Code

Only consider implementation COMPLETE when:
- [ ] CI (`ci.yml`) passed on GitHub Actions
- [ ] Vercel deploy confirmed (preview URL available on PR)
- [ ] Supabase migrations applied without errors
```

**`project-cicd`** — new row in "Current Stack in CI" table:

```
| validate-deploy.yml | — | Post-deploy | Validates CI + Vercel + Supabase after deploy;
                                          auto-fix via claude-code-action |
```

---

## Available MCPs (already installed)

| MCP | Key tools used |
|-----|---------------|
| `mcp__vercel__*` | `list_deployments`, `get_deployment_build_logs`, `get_runtime_logs`, `get_project` |
| `mcp__supabase__*` | `list_migrations`, `get_logs`, `execute_sql`, `list_branches` |
| `mcp__git__*` | `git_status`, `git_log`, `git_diff` |
| `gh` CLI (Bash) | `gh run list`, `gh run view --log-failed`, `gh pr comment` |

No new MCPs need to be installed — the Vercel and Supabase MCPs already cover the required checks.

---

## Auto-Fix Scope

All failure types are in scope for auto-fix:

| Failure Type | Auto-Fix Strategy |
|-------------|------------------|
| ESLint errors | `pnpm lint --fix`, commit |
| TypeScript errors | Fix type issues in source, commit |
| Unit test failures | Fix failing assertions or source bug, commit |
| Build errors (Next.js / tsc) | Fix compilation errors, commit |
| Vercel build errors | Analyze build logs via MCP, fix, commit |
| Supabase migration errors | Analyze DB logs via MCP, fix SQL, commit |

After any fix: re-run the full verification loop to confirm resolution before posting comment.

---

## Success Criteria

- A ✅ PR comment appears automatically after every successful deploy to `development`
- A 🔧 PR comment appears when a failure is detected, describing what was fixed
- The skill `/project-deploy-validator` produces the same output when invoked manually
- `project-guardian` references the post-PR validation as a mandatory completion step
- `project-cicd` documents the new workflow in its stack table
