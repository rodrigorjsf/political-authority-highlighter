# @pah/shared

Domain-driven shared library for the Political Authority Highlighter. Contains ubiquitous language types, constants, and pure utility functions used across all modules (API, Web, Pipeline).

## Purpose

This package serves as the **Single Source of Truth** for the project's domain model. It ensures type safety and consistency across the entire monorepo by enforcing a shared vocabulary.

## Core Contents

### Domain Types (`/src/types/`)
- **Politician**: Core profile data (name, party, state, role).
- **IntegrityScore**: Composite score (0-100) with 4-component breakdown.
- **Bill**: Parliamentary authored bills.
- **Vote**: Legislative vote records.
- **Expense**: CEAP/CEAPS parliamentary spending records.
- **DataSource**: Status and metadata for government data sources.

### Utilities (`/src/utils/`)
- **formatCurrency**: Brazilian Real (BRL) formatter (`R$ 1.234,56`).
- **normalization**: Name and string normalization for cross-source matching.

### Constants (`/src/index.ts`)
- **BRAZILIAN_STATES**: ISO 3166-2:BR codes.
- **SCORE_WEIGHTS**: Uniform 0.25 weights for scoring dimensions.

## Dependency Rules

- **Zero External Dependencies**: This package must stay lightweight and contain only pure TypeScript/JavaScript.
- **Inward-Only**: All other packages (`apps/api`, `apps/web`, `packages/db`) depend on `@pah/shared`. This package depends on nothing.
- **No Side Effects**: Functions here must be pure and deterministic.

## Development

```bash
pnpm typecheck    # Run TypeScript type checking
pnpm lint         # Run ESLint
```
