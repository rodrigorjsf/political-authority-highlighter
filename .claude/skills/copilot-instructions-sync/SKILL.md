---
name: copilot-instructions-sync
description: Use when project specifications, domain rules, architecture decisions, stack versions, or CLAUDE.md files change — keeps .github/copilot-instructions.md in sync with the current project state. Also use after PRD updates, skill modifications, or tech stack upgrades to ensure Copilot code review enforces current rules.
---

# Copilot Instructions Sync

## Purpose

Maintains `.github/copilot-instructions.md` as the authoritative enforcement gate for GitHub Copilot code review. Copilot reads this file when reviewing PRs — if it's stale, PRs pass review with outdated rules.

## Critical Constraint

**Copilot code review reads only the first 4,000 characters** of the instructions file. Content beyond 4,000 chars is available to Copilot Chat but NOT to code review. Structure the file so that all non-negotiable rules fit within this limit.

### Priority Order (within 4,000 chars)

1. Domain rules (DR-001 through DR-008) — non-negotiable business invariants
2. Architecture boundaries — import restrictions and schema isolation
3. Security rules — CPF, secrets, data exposure
4. TypeScript strict rules — `any` ban, type assertions, return types

### Lower Priority (after 4,000 chars)

1. Code style — formatting, imports, destructuring
2. Frontend-specific rules — Next.js patterns, accessibility, design tokens
3. Backend-specific rules — Fastify, Drizzle, TypeBox patterns
4. Pipeline-specific rules — adapters, pg-boss, idempotency details
5. Git conventions — commits, branches, pre-merge gates

## Trigger Conditions

**Run this skill when:**

- CLAUDE.md (root or layer-specific) is updated
- Any `docs/prd/*.md` file is modified
- Any `.claude/skills/project-*` skill is modified
- `docs/stack/*.md` documentation changes reveal version or pattern updates
- New domain rules are added or existing ones are revised
- Architecture boundaries change (import rules, schema isolation)
- Tech stack versions are upgraded (Next.js, Fastify, Drizzle, etc.)
- Explicitly requested by the user

**Skip when:**

- Changes are code-only with no documentation or rule impact
- Only test files or fixture data changed

## Sync Procedure

### Step 1: Gather Current State

Read these sources to build a complete picture of current project rules:

| Source | What to Extract |
|--------|----------------|
| `CLAUDE.md` (root) | Domain rules, architecture boundaries, TypeScript config, code style, pre-PR checklist |
| `apps/web/CLAUDE.md` | Frontend rules, security baseline (DR-008), component patterns |
| `apps/api/CLAUDE.md` | Backend rules, Drizzle patterns, API conventions |
| `infrastructure/CLAUDE.md` | Infrastructure constraints, Supabase patterns |
| `.claude/skills/project-domain-rules/SKILL.md` | DR-001 through DR-008 full definitions |
| `.claude/skills/project-architecture/SKILL.md` | Schema isolation, import boundaries, ADR decisions |
| `.claude/skills/project-guardian/SKILL.md` | Orchestration flow, scope gate, code quality rules |
| `docs/prd/PRD.md` | Feature scope, scoring methodology |
| `docs/prd/frontend_design_prd.md` | Design tokens, typography, component specs |
| `docs/stack/*.md` | Current library versions and gotchas |

### Step 2: Validate Current Instructions

Read `.github/copilot-instructions.md` AND all path-specific files in `.github/instructions/`:

| File | Scope | What to Validate |
|------|-------|-----------------|
| `copilot-instructions.md` | All files | Domain rules DR-001–DR-008, architecture boundaries, security, TypeScript |
| `frontend.instructions.md` | `apps/web/**` | Next.js 15 patterns, DR-002 neutrality, accessibility, design tokens, DR-008 |
| `backend.instructions.md` | `apps/api/**` | Schema isolation, repository pattern, TypeBox, cursor pagination, DR-001/DR-005 |
| `pipeline.instructions.md` | `apps/pipeline/**` | CPF handling, idempotent upserts, adapter pattern, scoring rules |
| `database.instructions.md` | `packages/db/**` | Schema separation, Drizzle patterns, migration rules, server-only guard |
| `security.instructions.md` | `**/*.ts,**/*.tsx` | CPF non-exposure, secrets management, import boundaries, input validation |

Check each file for:

- [ ] All referenced domain rules match current `project-domain-rules` skill definitions
- [ ] Architecture boundaries match current CLAUDE.md import table
- [ ] Schema isolation rules match current database structure (`public` + `internal_data`)
- [ ] Tech stack versions match `package.json` and docs
- [ ] Security rules match current security baseline
- [ ] Layer-specific rules match corresponding CLAUDE.md files
- [ ] Pre-merge gates match current CI pipeline
- [ ] No stale references to removed features or deprecated conventions
- [ ] No conflicting instructions between files (additive is OK, contradictory is not)

### Step 3: Measure Character Budget

After any edit, verify ALL files are under 4,000 characters:

```bash
for f in .github/copilot-instructions.md .github/instructions/*.instructions.md; do
  echo "$(wc -c < "$f") chars — $(basename "$f")"
done
```

The main `copilot-instructions.md` may exceed 4K total, but its first 4,000 characters MUST contain all domain rules and architecture boundaries. Path-specific files must each be under 4K.

The first 4,000 characters MUST contain: all domain rules, architecture boundaries, and security rules. If they don't fit, compress wording — never move them below the 4K boundary.

### Step 4: Apply Updates

Edit `.github/copilot-instructions.md` following these writing rules:

- **Imperative, concise sentences** — "Never expose CPF" not "CPF should not be exposed"
- **REJECT language for violations** — "REJECT violations immediately" signals severity to Copilot
- **Tables for structured rules** — architecture boundaries work best as tables
- **No generic advice** — only project-specific rules that Copilot wouldn't know otherwise
- **No code examples** — keep instructions declarative; code patterns live in CLAUDE.md files
- **No redundancy** — each rule stated once, clearly

### Step 5: Output Diff Summary

After updating, report:

```
## Copilot Instructions Sync Report

### Changes Made
- [List each change: what was added/updated/removed and why]

### Character Budget
- Total: X chars
- First 4K coverage: [list which sections fit within 4K limit]

### Validation
- [ ] All 8 domain rules present and accurate
- [ ] Architecture boundaries match CLAUDE.md
- [ ] Stack versions current
- [ ] Security rules complete
- [ ] Pre-merge gates match CI
```

## What NOT to Include in copilot-instructions.md

- Generic TypeScript best practices Copilot already knows
- Code examples or implementation patterns (those belong in CLAUDE.md)
- Library documentation (that belongs in `docs/stack/`)
- Feature requirements or user stories (those belong in PRDs)
- Temporary workarounds or in-progress conventions
- Anything longer than a single concise sentence per rule

## Relation to Other Skills

This skill reads from but does NOT modify:

- `project-guardian` — the master enforcement skill for development
- `project-domain-rules` — authoritative source for DR-001 through DR-008
- `project-architecture` — authoritative source for architecture decisions

The `copilot-instructions.md` file is a **compressed projection** of these skills optimized for Copilot's 4,000-char code review limit.
