# @pah/shared

Shared domain library for the Political Authority Highlighter. Contains ubiquitous language types, constants, and pure utility functions.

## Purpose

The **Single Source of Truth** for the project's domain model. It ensures consistency across the monorepo.

## Contents

- **Types** (`/src/types/`) — Politician, IntegrityScore, Bill, Vote, Expense.
- **Utils** (`/src/utils/`) — `formatCurrency` (BRL), string normalization.
- **Constants** (`/src/index.ts`) — BRAZILIAN_STATES, SCORE_WEIGHTS (0.25).

## Dependency Rules

- **Zero External Dependencies** — Lightweight and pure TypeScript only.
- **Inward-Only** — All other packages depend on this; this depends on nothing.
- **No Side Effects** — All functions are pure and deterministic.

## Development

```bash
pnpm typecheck    # Run type checks
pnpm lint         # Run ESLint
```
