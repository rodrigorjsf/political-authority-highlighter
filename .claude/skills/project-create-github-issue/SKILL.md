---
name: project-create-github-issue
description: Use when a new *.plan.md file is created (especially via prp-core:prp-plan) or when prp-core:prp-implement is executed — reads the plan and creates a GitHub issue for the feature using gh CLI, or validates that one already exists. Skips silently if issue already exists.
---

# Project — Create GitHub Issue from Plan

## Purpose

Every implementation plan (`*.plan.md`) must have a corresponding GitHub issue in the
`rodrigorjsf/political-authority-highlighter` repo. This skill delegates that work to a
background agent that runs in parallel and never blocks the main workflow.

**Automated trigger**: A PostToolUse hook (`plan-issue-reminder.sh`) fires after every
`Write` tool call — if the written file matches `*.plan.md`, it outputs a reminder.
You MUST act on that reminder by following the invocation steps below.

---

## When to Use

**Trigger 1 — After plan creation (hook-assisted):**
When the `plan-issue-reminder` hook outputs a reminder after a `*.plan.md` file is written,
invoke this skill immediately. Do NOT ignore the hook output.

**Trigger 2 — Before/during implementation:**
When `/prp-core:prp-implement` is invoked, fire this skill **in parallel** — do NOT block or delay
the implementation skill. It is fire-and-forget.

---

## How to Invoke

Delegate to a `general-purpose` agent using the `Agent` tool. Always run in the background
so the parent workflow is never blocked. The agent prompt must include the full workflow
from `.claude/agents/github-issue-creator.md`.

```
Agent tool call:
  subagent_type: "general-purpose"
  model: "haiku"
  run_in_background: true
  description: "Create GitHub issue from plan"
  prompt: |
    Create a GitHub issue from this plan file:
    {plan file path}

    Read the plan file, then read .claude/agents/github-issue-creator.md for the
    complete step-by-step workflow:
    1. Read the plan file
    2. Check for an existing issue (gh issue list --search)
    3. Extract plan sections (Summary, User Story, Problem, Solution, Metadata, etc.)
    4. Create required labels (plan, feature/bug/refactor, complexity:*)
    5. Create the issue with gh issue create using the full body template
    6. Report the created issue URL

    Repository: rodrigorjsf/political-authority-highlighter
    Always use --repo flag on every gh command.
```

Replace `{plan file path}` with the actual path, e.g.:
`.claude/PRPs/plans/rf-018-phase7-testing-infrastructure.plan.md`

If the plan path is not known, use the most recently modified `*.plan.md` in `.claude/PRPs/plans/`.

---

## Integration with prp-core:prp-implement

When `/prp-core:prp-implement` is invoked:

1. **Do NOT block** the implementation workflow.
2. Launch the agent in the background (see above).
3. Continue with implementation immediately — the agent runs in parallel.
4. When the agent completes, its result will be shown automatically.
5. A failure in the agent (network, auth) must never interrupt the implementation.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Waiting for the agent before continuing | Always `run_in_background: true` |
| Passing no plan path in the prompt | Always include the plan file path in the agent prompt |
| Running the workflow inline instead of via agent | Always delegate — never execute the gh commands directly |
| Using `subagent_type: "github-issue-creator"` | Use `"general-purpose"` — custom agent names are not valid subagent types |
| Ignoring the hook reminder | The hook fires for a reason — always act on it |
