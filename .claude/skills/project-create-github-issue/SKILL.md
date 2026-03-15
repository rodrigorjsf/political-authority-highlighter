---
name: project-create-github-issue
description: Use when a new *.plan.md file is created (especially via prp-core:prp-plan) or when prp-core:prp-implement is executed — reads the plan and creates a GitHub issue for the feature using gh CLI, or validates that one already exists. Skips silently if issue already exists.
---

# Project — Create GitHub Issue from Plan

## Purpose

Every implementation plan (`*.plan.md`) must have a corresponding GitHub issue in the
`rodrigorjsf/political-authority-highlighter` repo. This skill delegates that work to the
`github-issue-creator` agent, which runs in parallel and never blocks the main workflow.

---

## When to Use

**Trigger 1 — After plan creation:**
Run this skill immediately after `/prp-core:prp-plan` saves a new `*.plan.md` file.

**Trigger 2 — Before/during implementation:**
When `/prp-core:prp-implement` is invoked, fire this skill **in parallel** — do NOT block or delay
the implementation skill. It is fire-and-forget.

---

## How to Invoke

Delegate to the `github-issue-creator` agent using the `Agent` tool. Always run in the background
so the parent workflow is never blocked.

```
Agent tool call:
  subagent_type: "github-issue-creator"
  model: "haiku"
  run_in_background: true
  description: "Create GitHub issue from plan"
  prompt: |
    Create a GitHub issue from this plan file:
    {plan file path}

    Follow the complete workflow in your instructions:
    1. Locate and read the plan file
    2. Check for an existing issue (skip if found)
    3. Extract plan sections
    4. Create required labels
    5. Create the issue with the full body template
```

Replace `{plan file path}` with the actual path, e.g.:
`.claude/PRPs/plans/post-mvp-phase-2-accessibility.plan.md`

If the plan path is not known, use the most recently modified `*.plan.md` in `.claude/PRPs/plans/`.

---

## Integration with prp-core:prp-implement

When `/prp-core:prp-implement` is invoked:

1. **Do NOT block** the implementation workflow.
2. Launch the `github-issue-creator` agent in the background (see above).
3. Continue with implementation immediately — the agent runs in parallel.
4. When the agent completes, its result will be shown automatically.
5. A failure in the agent (network, auth) must never interrupt the implementation.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Waiting for the agent before continuing | Always `run_in_background: true` |
| Passing no plan path in the prompt | Always include the plan file path in the agent prompt |
| Running the workflow inline instead of via agent | Always delegate — never execute the gh commands directly from here |
