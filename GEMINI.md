# GEMINI.md - Project Context & Instructions

This file serves as the primary instructional context for Gemini CLI interactions within the **Political Authority Highlighter** workspace. It defines the project's purpose, architecture, development standards, and critical domain rules.

## Project Overview

**Political Authority Highlighter** is a Brazilian political transparency platform that cross-references 6+ official government sources (Camara, Senado, Portal da Transparencia, TSE, TCU, CGU) to compute an **Integrity Score (0-100)** for federal legislators.

### Core Mission

- **Neutrality**: Uniform scoring across all parties and roles without editorial bias.
- **Public Data**: Exclusively uses verifiable government sources (LAI).
- **Privacy**: LGPD-compliant handling of sensitive data (encrypted CPFs).
- **Integrity**: Highlights positive serving records rather than focusing on corruption details.

## Technical Architecture

The project is a **Modular Monolith** organized as a TypeScript monorepo using **Turborepo** and **pnpm workspaces**.

### Tech Stack

- **Language**: TypeScript 5.4+ (Strict mode)
- **Frontend**: Next.js 15 (App Router, ISR, Server Components)
- **Backend API**: Fastify 5
- **Database**: PostgreSQL 16 (Managed via Supabase)
- **ORM**: Drizzle ORM (Dual-schema support)
- **Job Queue**: pg-boss 10 (PostgreSQL-backed)
- **Infrastructure**: Vercel (Frontend), Supabase (API/DB), Cloudflare (CDN/DNS)

### Module Structure

- `apps/web`: Next.js frontend application.
- `apps/api`: Fastify REST API (Public-facing).
- `apps/pipeline`: Data ingestion, transformation, and scoring engine.
- `packages/db`: Shared database schemas and clients (Drizzle).
- `packages/shared`: Zero-dependency domain types, constants, and utilities.

## Critical Domain Rules (Non-Negotiable)

- **DR-001: Silent Exclusion**: The public API/frontend must **never** expose why an anticorruption score is 0. Only a boolean `exclusion_flag` crosses the schema boundary.
- **DR-002: Political Neutrality**: No party colors in UI. Neutral palette. Factual language only (no "best/worst" labels).
- **DR-005: CPF Protection**: CPFs must be encrypted (AES-256-GCM) at rest and never exposed in logs, error messages, or API responses.
- **DR-006: Schema Isolation**: The `api_reader` role has **zero access** to the `internal_data` schema. This isolation is enforced at the database level.

## Development Workflows

### Prerequisites

- Node.js 20+, pnpm 9+, Docker.

### Key Commands

- `pnpm install`: Install dependencies.
- `docker compose up -d`: Start local PostgreSQL (port 5433).
- `pnpm dev`: Start all applications in development mode.
- `pnpm build`: Build all packages and apps (OBRIGATÓRIO — catches Next.js and tsc compile errors).
- `pnpm lint`: Run ESLint across the monorepo.
- `pnpm typecheck`: Run type checks (`tsc --noEmit`).
- `pnpm test`: Run unit and integration tests (Vitest).
- `vercel build`: Run the Vercel build phase (OBRIGATÓRIO — final gate, simulates Vercel CI environment).
- `pnpm test:e2e`: Run Playwright E2E tests.
- `pnpm --filter @pah/db migrate`: Run database migrations.

### Coding Standards

- **Strict TypeScript**: `any` is banned; use `unknown` and type guards. Explicit return types for public functions.
- **Style**: No semicolons, single quotes, 2-space indentation.
- **Boundaries**: Respect import boundaries (e.g., API must not import `internal-schema.ts`).
- **Commits**: Conventional Commits format (`type(scope): description`).
- **Testing**: 80%+ coverage target for services and scoring logic.

## AI Interaction Guidelines

When working in this codebase, prioritize:

1. **Type Safety**: Ensure all new code is strictly typed and integrated into the `packages/shared` or `packages/db` structures.
2. **Surgical Changes**: Modify only what is necessary, following the established Modular Monolith patterns.
3. **Security Awareness**: Never inadvertently expose internal schema fields or unencrypted identifiers.
4. **Neutral Tone**: Maintain the project's commitment to political neutrality in all UI and documentation updates.
5. **Mandatory Validation**: Before claiming any task is complete, run `pnpm build` AND `vercel build`. Both must pass. `pnpm typecheck` alone is insufficient — `pnpm build` catches Next.js compilation errors and `vercel build` catches Vercel-specific issues that CI will reject.

---
*Last Updated: 2026-03-14*
