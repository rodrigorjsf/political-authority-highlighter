# GitHub Issue Template — Plan-Driven Feature

Use this template when creating a GitHub issue from a `*.plan.md` file.
Extract each section from the plan and fill in the fields below.

---

## Template

```
## Summary

{Extract from plan's ## Summary section — one paragraph describing what this implements}

---

## User Story

{Extract from plan's ## User Story section verbatim}

---

## Problem Statement

{Extract from plan's ## Problem Statement section}

---

## Solution Statement

{Extract from plan's ## Solution Statement — numbered list of approach}

---

## Metadata

| Field            | Value |
|-----------------|-------|
| Type             | {NEW_CAPABILITY / BUG_FIX / REFACTOR / CHORE} |
| Complexity       | {LOW / MEDIUM / HIGH} |
| Systems Affected | {e.g., apps/web, apps/api, packages/db} |
| Estimated Tasks  | {N} |
| Dependencies     | {libraries or other issues this depends on} |

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
{Extract rows from plan's ## Files to Change table}

---

## NOT Building (Scope Limits)

{Extract bullet list from plan's ## NOT Building section}

---

## Acceptance Criteria

{Extract checklist items from plan's ## Acceptance Criteria section}

---

## Validation Commands

```bash
{Extract from plan's ## Validation Commands — Level 1 (static analysis) + Level 2 (tests) + Level 3 (build)}
```

---

## Plan Reference

📄 Full implementation plan: `.claude/PRPs/plans/{plan-filename}.plan.md`

```

---

## Extraction Rules

When reading a plan file, extract sections as follows:

| Issue Section | Plan Source | Notes |
|--------------|-------------|-------|
| Issue title | First `# ` heading in plan | Strip `Plan: ` prefix if present |
| Summary | `## Summary` | Full paragraph |
| User Story | `## User Story` | As-is |
| Problem Statement | `## Problem Statement` | As-is |
| Solution Statement | `## Solution Statement` | Numbered list |
| Metadata table | `## Metadata` | Full table |
| Files to Change | `## Files to Change` | Table rows only |
| NOT Building | `## NOT Building` | Bullet list |
| Acceptance Criteria | `## Acceptance Criteria` | Checkboxes |
| Validation Commands | `## Validation Commands` | Levels 1–3 blocks only |
| Plan Reference | filename | Path relative to repo root |

## Labels to Apply

Use these labels when creating issues (create them via `gh label create` if they don't exist):

| Label | Condition |
|-------|-----------|
| `feature` | Type = NEW_CAPABILITY |
| `bug` | Type = BUG_FIX |
| `refactor` | Type = REFACTOR |
| `chore` | Type = CHORE |
| `complexity:low` | Complexity = LOW |
| `complexity:medium` | Complexity = MEDIUM |
| `complexity:high` | Complexity = HIGH |
| `plan` | Always — marks issues created from a plan file |
