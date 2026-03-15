# Deploy Validation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automated post-PR deploy validation that checks GitHub CI, Vercel, and Supabase after every push to `development`, auto-fixes failures, and posts a PR comment — plus a manually-invocable skill for on-demand use.

**Architecture:** A new GitHub Actions workflow (`validate-deploy.yml`) triggers off `ci.yml` completion on the `development` branch and invokes `claude-code-action@v1` with the `project-deploy-validator` skill. The skill uses already-installed MCPs (`mcp__vercel__*`, `mcp__supabase__*`) and `gh` CLI to collect status, apply fixes, and report results. Two existing skills (`project-guardian`, `project-cicd`) gain references to the new workflow.

**Tech Stack:** GitHub Actions (`workflow_run` trigger), `anthropics/claude-code-action@v1`, Vercel MCP, Supabase MCP, `gh` CLI, Markdown skill files.

**Spec:** `docs/superpowers/specs/2026-03-14-deploy-validation-design.md`

---

## Chunk 1: Skill `project-deploy-validator`

**Files:**

- Create: `.claude/skills/project-deploy-validator/SKILL.md`

### Task 1: Create the `project-deploy-validator` skill

- [ ] **Step 1: Create the skill directory and file**

```bash
mkdir -p .claude/skills/project-deploy-validator
```

- [ ] **Step 2: Write the skill file**

Create `.claude/skills/project-deploy-validator/SKILL.md` with this exact content:

```markdown
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

```

- [ ] **Step 3: Verify the skill file is valid markdown**

```bash
# Check the file exists and has content
cat .claude/skills/project-deploy-validator/SKILL.md | head -5
```

Expected: first 5 lines show the frontmatter (`---`, `name:`, `description:`, etc.)

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/project-deploy-validator/SKILL.md
git commit -m "feat(cicd): add project-deploy-validator skill"
```

---

## Chunk 2: GitHub Actions Workflow `validate-deploy.yml`

**Files:**

- Create: `.github/workflows/validate-deploy.yml`

### Task 2: Create the `validate-deploy.yml` workflow

- [ ] **Step 1: Verify prerequisite secrets exist in the repo**

Check that these secrets are configured in GitHub (Settings → Secrets → Actions):

- `CLAUDE_CODE_OAUTH_TOKEN` — already used by `claude.yml`
- `VERCEL_TOKEN` — already used by `ci.yml`
- `SUPABASE_ACCESS_TOKEN` — personal access token from supabase.com/dashboard/account/tokens
- `SUPABASE_PROJECT_REF` — from Supabase Dashboard → Project Settings → General → Reference ID

> If `SUPABASE_ACCESS_TOKEN` or `SUPABASE_PROJECT_REF` are missing, create and add them before
> proceeding. The workflow will silently fail on Supabase checks without these secrets.

```bash
# Verify existing secrets (lists names only, not values)
gh secret list
```

Expected output includes: `CLAUDE_CODE_OAUTH_TOKEN`, `VERCEL_TOKEN`.
If `SUPABASE_ACCESS_TOKEN` or `SUPABASE_PROJECT_REF` are absent, add them:

```bash
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_PROJECT_REF
```

- [ ] **Step 2: Create the workflow file**

Create `.github/workflows/validate-deploy.yml` with this exact content:

```yaml
name: Validate Deploy

on:
  workflow_run:
    workflows: ["CI"]
    branches: [development]
    types: [completed]

jobs:
  validate:
    name: Validate CI + Vercel + Supabase
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
          # This is distinct from the job-level permissions block above, which governs
          # the GITHUB_TOKEN scope for push/comment operations.
          additional_permissions: |
            actions: read
          prompt: |
            Run /project-deploy-validator for:
            - branch: ${{ github.event.workflow_run.head_branch }}
            - head_sha: ${{ github.event.workflow_run.head_sha }}
            - ci_run_id: ${{ github.event.workflow_run.id }}
            - ci_conclusion: ${{ github.event.workflow_run.conclusion }}
            Use head_sha to match the correct Vercel deployment (not just branch name).
            Fix any failures found, push fixes, and post
            a summary comment on the PR (or stdout if no open PR exists).
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
```

- [ ] **Step 3: Validate YAML syntax**

```bash
# Validate with yq (install if needed: brew install yq or apt install yq)
yq e '.' .github/workflows/validate-deploy.yml > /dev/null && echo "YAML valid"

# Alternative using python if yq is unavailable:
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/validate-deploy.yml'))" && echo "YAML valid"
```

Expected: `YAML valid` — no errors.

- [ ] **Step 4: Verify workflow_run trigger name matches ci.yml**

```bash
# Confirm ci.yml name field
grep "^name:" .github/workflows/ci.yml
```

Expected: `name: CI`

This must match the `workflows: ["CI"]` entry in `validate-deploy.yml` exactly (case-sensitive).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/validate-deploy.yml
git commit -m "feat(cicd): add validate-deploy workflow with claude auto-fix"
```

---

## Chunk 3: Update Existing Skills

**Files:**

- Modify: `.claude/skills/project-guardian/SKILL.md`
- Modify: `.claude/skills/project-cicd/SKILL.md`

### Task 3: Add Section 10 to `project-guardian`

- [ ] **Step 1: Read current end of `project-guardian/SKILL.md`**

```bash
tail -20 .claude/skills/project-guardian/SKILL.md
```

Confirm the file ends at Section 9 ("Mandatory Pre-Completion Validation") and the Changelog.

- [ ] **Step 2: Add Section 10 before `## Violation Response`**

In `.claude/skills/project-guardian/SKILL.md`, find the `## Violation Response` section
(it comes after Section 9, before `## Changelog`) and insert this block immediately before it:

```markdown
### 10. Post-PR Validation (Required)

After creating a PR to `development`, validate the deploy:

- **Automatic:** `validate-deploy.yml` triggers after `ci.yml` completes and posts a result
  comment on the PR
- **Manual (when needed):** invoke `/project-deploy-validator` in Claude Code

Only consider implementation **COMPLETE** when all three are confirmed:

- [ ] CI (`ci.yml`) passed on GitHub Actions
- [ ] Vercel deploy confirmed (preview URL available on PR comment)
- [ ] Supabase migrations applied without errors

```

> The blank line after the last checklist item (before the closing fence) is required — it
> prevents the next section heading from running into the list with no separator.

- [ ] **Step 3: Update the Changelog in `project-guardian/SKILL.md`**

Add this row to the changelog table:

```markdown
| 2026-03-14 | 1.2 | Add section 10: post-PR validation via validate-deploy.yml and project-deploy-validator skill |
```

- [ ] **Step 4: Verify the section was added correctly**

```bash
grep -n "Post-PR Validation" .claude/skills/project-guardian/SKILL.md
```

Expected: one match showing the section heading with its line number.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/project-guardian/SKILL.md
git commit -m "feat(cicd): add post-PR validation requirement to project-guardian skill"
```

---

### Task 4: Update `project-cicd` skill table

- [ ] **Step 1: Read the Current Stack in CI table**

```bash
grep -A 15 "## Current Stack in CI" .claude/skills/project-cicd/SKILL.md
```

Identify the last row of the table to know where to insert the new row.

- [ ] **Step 2: Add the new row to the "Current Stack in CI" table**

In `.claude/skills/project-cicd/SKILL.md`, find the last row of the "Current Stack in CI"
table (currently ends with the `supabase/setup-cli` row) and add this row after it:

```markdown
| validate-deploy.yml | — | Post-CI (ci.yml trigger) | Validates CI + Vercel deploy + Supabase migrations after ci.yml completes on `development`; auto-fix via claude-code-action (max 1 retry per failure type) |
```

- [ ] **Step 3: Update the Changelog in `project-cicd/SKILL.md`**

Add this row to the changelog table:

```markdown
| 2026-03-14 | 1.2 | Add validate-deploy.yml to stack table; triggers off ci.yml, auto-fixes via claude-code-action |
```

- [ ] **Step 4: Verify**

```bash
grep -n "validate-deploy" .claude/skills/project-cicd/SKILL.md
```

Expected: two matches (table row + changelog row).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/project-cicd/SKILL.md
git commit -m "docs(cicd): add validate-deploy.yml to project-cicd skill stack table"
```

---

## Chunk 4: Smoke Test

**Purpose:** Verify the end-to-end wiring before merging.

### Task 5: End-to-end smoke test

- [ ] **Step 1: Verify all files exist**

```bash
ls -la \
  .claude/skills/project-deploy-validator/SKILL.md \
  .github/workflows/validate-deploy.yml

grep -c "Post-PR Validation" .claude/skills/project-guardian/SKILL.md
grep -c "validate-deploy" .claude/skills/project-cicd/SKILL.md
```

Expected:

- Both files listed with sizes > 0
- `1` (section heading match in guardian)
- `2` (table row + changelog in cicd)

- [ ] **Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/validate-deploy.yml')); print('YAML OK')"
```

Expected: `YAML OK`

- [ ] **Step 3: Verify workflow trigger name is correct**

```bash
python3 - <<'EOF'
import yaml

ci = yaml.safe_load(open('.github/workflows/ci.yml'))
validate = yaml.safe_load(open('.github/workflows/validate-deploy.yml'))

ci_name = ci['name']
trigger_names = validate['on']['workflow_run']['workflows']

if ci_name in trigger_names:
    print(f"✅ Trigger matches: '{ci_name}' in {trigger_names}")
else:
    print(f"❌ MISMATCH: ci.yml name is '{ci_name}' but trigger has {trigger_names}")
EOF
```

Expected: `✅ Trigger matches: 'CI' in ['CI']`

- [ ] **Step 4: Verify secrets referenced in workflow exist in repo**

```bash
gh secret list --json name --jq '.[].name' | sort
```

Confirm the output includes all four required secrets:

- `CLAUDE_CODE_OAUTH_TOKEN`
- `VERCEL_TOKEN`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

If any are missing: add them before merging (see Task 2, Step 1).

- [ ] **Step 5: Push branch and open a test PR to trigger the workflow**

```bash
git push origin HEAD
gh pr create --base development --title "test: validate-deploy workflow smoke test" \
  --body "Testing the new validate-deploy.yml workflow. Will close after confirming it triggers."
```

Wait for the `CI` workflow to complete on this PR, then check:

```bash
# List workflow runs for validate-deploy.yml
gh run list --workflow "Validate Deploy" --limit 5
```

Expected: a run for `Validate Deploy` appears after `CI` completes.

- [ ] **Step 6: Check the run result**

```bash
gh run view --workflow "Validate Deploy" --branch <your-branch>
```

Expected: the run completes and a comment appears on the PR from Claude with either ✅ or 🔧.

---

## Summary

| File | Action |
| --- | --- |
| `.claude/skills/project-deploy-validator/SKILL.md` | Create — new skill |
| `.github/workflows/validate-deploy.yml` | Create — new workflow |
| `.claude/skills/project-guardian/SKILL.md` | Modify — add Section 10 |
| `.claude/skills/project-cicd/SKILL.md` | Modify — add table row + changelog |

**GitHub secrets required before the workflow will work:**

| Secret | How to obtain |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens → New token |
| `SUPABASE_PROJECT_REF` | Supabase Dashboard → Project Settings → General → Reference ID |
