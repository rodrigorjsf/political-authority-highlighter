# RF-019: Modular Decoupling Refactor

## Problem Statement

The codebase has accumulated structural friction that makes it harder for both humans and AI agents to navigate, extend, and test. The pipeline orchestrator is a 90-line switch statement with zero tests. Cursor pagination logic is duplicated 7 times across API services. Pipeline source logic (adapter + transformer) is scattered across 3 directories by technical concern rather than grouped by domain. These patterns compound every time a new data source or entity is added, making the codebase progressively harder to maintain.

## Evidence

- **Orchestrator untestable**: `orchestrator.ts` has zero unit tests because adapters are tightly coupled to axios and the publisher closes over its DB client — no injection points exist
- **7x cursor duplication**: Identical `encodeCursor()`/`decodeCursor()` pattern copy-pasted across `politician.service.ts`, `bill.service.ts`, `vote.service.ts`, `expense.service.ts`, `proposal.service.ts`, `committee.service.ts`, `source.service.ts`
- **Source comprehension cost**: Understanding the Camara pipeline requires reading files in `adapters/camara.ts`, `transformers/camara.ts`, `publisher/index.ts`, and `orchestrator.ts` — 4 files across 3 directories
- **Adapter test gap**: All 6 adapters (camara, senado, transparencia, tse, tcu, cgu) have zero tests — HTTP interactions, pagination logic, XML/CSV parsing, and error paths are all untested
- **Slugify duplicated 3x**: Same slug generation logic in camara, senado, and tse transformers
- **AI navigability**: When an AI agent is asked to "add a new government data source," it must touch 5+ files across 4 directories with no single reference module to follow

## Proposed Solution

A phased internal restructuring that deepens shallow modules, eliminates duplication, and reorganizes the pipeline by domain rather than technical concern. All refactoring is purely internal — HTTP API contracts, database schema, and external behavior remain unchanged. Each phase adds missing tests as part of the work, treating testability as a first-class deliverable rather than a separate effort.

## Key Hypothesis

We believe that reorganizing the codebase into deeper, domain-oriented modules will make it significantly easier for AI agents and developers to navigate, extend, and correctly modify the code.
We'll know we're right when all 5 refactoring candidates are resolved without any regression in existing tests, API contracts, or database behavior.

## What We're NOT Building

- **New features** — This is pure internal restructuring, no user-visible changes
- **Database schema changes** — Public and internal schemas remain untouched
- **API contract changes** — All HTTP endpoints keep the same request/response shapes
- **Infrastructure changes** — No deployment, CI/CD, or hosting modifications
- **New abstractions for the web app** — Frontend architecture is already well-structured

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Zero behavior regression | 0 failing tests post-refactor | `pnpm test` + `pnpm build` + `vercel build --yes` |
| Cursor duplication eliminated | 1 shared codec, 0 per-service copies | Code search for `encodeCursor` |
| Pipeline source isolation | 6 self-contained source modules | Directory structure inspection |
| Orchestrator testability | >80% branch coverage on orchestrator | Vitest coverage report |
| Adapter test coverage | >70% coverage on all 6 adapters | Vitest coverage report |
| Scoring pipeline coverage | >80% coverage on scoring module | Vitest coverage report |

## Open Questions

- [ ] Should the cursor codec live in `packages/shared` (available to all packages) or `apps/api/src/lib/` (API-only)?
- [ ] Should adapter HTTP mocking use `msw` (service worker) or `nock` (Node.js interceptor)?
- [ ] Should the source registry pattern use a static map or a plugin-style registration?

---

## Users & Context

**Primary User**

- **Who**: The solo developer and AI coding agents (Claude Code, Cursor, etc.) working on this monorepo
- **Current behavior**: When adding a new data source, must create files in 3+ directories, copy cursor/adapter/transformer patterns from existing sources, and manually wire into the orchestrator switch
- **Trigger**: Any feature that touches pipeline ingestion or API entity listing
- **Success state**: A new data source can be added by creating one directory with 3 files and registering it in one place

**Job to Be Done**
When extending the pipeline or API with new sources/entities, I want self-contained, well-tested modules with clear boundaries, so I can confidently modify one area without unexpected side effects elsewhere.

**Non-Users**
End users of the platform — this refactoring is invisible to them. No frontend changes, no API changes.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Shared cursor pagination codec | Eliminates 7x duplication, single point of change |
| Must | Pipeline source vertical slicing | Self-contained source modules, AI-navigable |
| Must | Pipeline orchestrator registry | Testable dispatch, data-driven source processing |
| Must | Missing test coverage for adapters and orchestrator | Untested code is untrustworthy code |
| Should | Scoring pipeline consolidation | Deepens 3-file concept into cohesive module |
| Should | API service layer evaluation | Identify and merge truly shallow service+repo pairs |
| Could | Shared slugify utility extraction | Minor DRY win, already partially addressed |
| Won't | API framework migration | Fastify 5 is working well, no reason to change |
| Won't | ORM migration | Drizzle is well-integrated, no friction |

### MVP Scope

All 5 refactoring candidates, phased for safety. Each phase is independently shippable and verifiable.

### Critical Path

```
Phase 1 (cursor codec)
    ↓
Phase 2 (source slicing) → Phase 3 (orchestrator registry)
                                ↓
                          Phase 4 (scoring consolidation)
                                ↓
                          Phase 5 (API service deepening)
```

---

## Technical Approach

**Feasibility**: HIGH

All refactors are internal restructuring. No external system changes. No database migrations. No API contract modifications.

**Architecture Notes**

- Cursor codec: Generic factory `createCursorCodec<T>(schema: ZodType<T>)` returning `{ encode, decode }` — parameterized by entity-specific Zod schema
- Source slicing: Move from `adapters/{source}.ts` + `transformers/{source}.ts` → `sources/{source}/{adapter,transformer,types}.ts`
- Orchestrator: Replace switch statement with `Record<DataSource, SourceHandler>` registry pattern
- Scoring: Merge `scoring/engine.ts` + `services/scoring.service.ts` into `scoring/index.ts` with injected DB dependency
- API services: Evaluate each of 8 service+repository pairs — merge only the truly shallow ones

**Dependency Categories (per REFERENCE.md)**

| Candidate | Category | Testing Strategy |
|-----------|----------|------------------|
| Cursor codec | In-process | Direct unit tests (pure functions) |
| Source slicing | True external (gov APIs) | HTTP mocking (msw/nock) for adapters |
| Orchestrator registry | Mixed (external + local-sub) | Mock source handlers + PGLite for publisher |
| Scoring pipeline | Local-substitutable | Mock DB or PGLite for score computation |
| API service deepening | Local-substitutable | Mock repositories (existing pattern) |

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Import path breakage across monorepo | Medium | Run `pnpm typecheck` + `pnpm build` after every file move |
| Test regression during restructuring | Low | Existing tests run on every phase; no test deletion without replacement |
| Circular dependency from module merging | Low | ESLint `import/no-cycle` rule enforced |
| pg-boss worker registration breaking | Low | Integration test verifying queue creation after orchestrator refactor |

---

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases that can run concurrently (e.g., "with 3" or "-")
  DEPENDS: phases that must complete first (e.g., "1, 2" or "-")
  PRP: link to generated plan file once created
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Shared Cursor Codec | Extract cursor encode/decode/validate into shared utility; replace 7 service implementations | pending | - | - | - |
| 2 | Pipeline Source Vertical Slicing | Reorganize adapters+transformers by domain; extract shared slugify | pending | - | - | - |
| 3 | Pipeline Orchestrator Registry | Replace switch with data-driven source registry; add orchestrator tests | pending | - | 2 | - |
| 4 | Scoring Pipeline Consolidation | Merge scoring engine + service into cohesive module with injected deps | pending | - | 3 | - |
| 5 | API Service Layer Deepening | Evaluate and merge shallow service+repository pairs; add boundary tests | pending | - | 1 | - |

### Phase Details

**Phase 1: Shared Cursor Codec**

- **Goal**: Eliminate 7x cursor pagination duplication with a single, type-safe, parameterized codec
- **Scope**:
  - Create `apps/api/src/lib/cursor-codec.ts` with generic `createCursorCodec<T>(schema: ZodType<T>)` factory
  - Returns `{ encode(cursor: T): string, decode(encoded: string): T }` using base64url + JSON + Zod
  - Replace cursor functions in all 7 services (politician, bill, vote, expense, proposal, committee, source)
  - Delete per-service cursor encode/decode functions and their dedicated tests
  - Add comprehensive tests for the shared codec (happy path, invalid base64, invalid JSON, schema mismatch)
  - Verify all existing service tests still pass
- **Success signal**: `grep -r "encodeCursor\|decodeCursor" apps/api/src/services/` returns zero results; all tests green

**Phase 2: Pipeline Source Vertical Slicing**

- **Goal**: Reorganize pipeline from technical-concern directories to domain-oriented source modules
- **Scope**:
  - Create `apps/pipeline/src/sources/{camara,senado,transparencia,tse,tcu,cgu}/` directories
  - Move each source's adapter, transformer, and types into its directory:
    - `sources/camara/adapter.ts` (from `adapters/camara.ts`)
    - `sources/camara/transformer.ts` (from `transformers/camara.ts`)
    - `sources/camara/types.ts` (source-specific raw/upsert types)
    - `sources/camara/index.ts` (barrel export)
  - Extract shared `slugify()` into `apps/pipeline/src/utils/slugify.ts`
  - Move existing transformer tests alongside their source modules
  - Add adapter tests with HTTP mocking for each source (at minimum: happy path + error path)
  - Update orchestrator imports to use new paths
  - Delete empty `adapters/` and `transformers/` directories
- **Success signal**: `ls apps/pipeline/src/adapters/ apps/pipeline/src/transformers/` returns "not found"; all 6 sources self-contained in `sources/`; adapter tests exist for all 6 sources

**Phase 3: Pipeline Orchestrator Registry**

- **Goal**: Replace the 90-line switch statement with a data-driven source registry that's testable
- **Scope**:
  - Define `SourceHandler` interface: `{ fetch(): Promise<RawData[]>, transform(raw: RawData): UpsertData, publish(data: UpsertData): Promise<void>, shouldScore: boolean }`
  - Create `SourceRegistry` as `Record<DataSource, SourceHandler>` built from each source's barrel export
  - Refactor `runPipeline()` to: `const handler = registry[source]; const raw = await handler.fetch(); ...`
  - Each source module exports a `createSourceHandler(deps: SourceDeps)` factory
  - `SourceDeps` includes: `publisher`, `scorer`, `logger` — injected at startup
  - Add orchestrator unit tests with mock source handlers (test dispatch, error handling, logging)
  - Add orchestrator integration test for at least one source (camara) with HTTP mock + real DB
- **Success signal**: No switch/case in `orchestrator.ts`; orchestrator has >80% branch coverage; adding source 7 requires only creating a new directory and adding one entry to the registry

**Phase 4: Scoring Pipeline Consolidation**

- **Goal**: Deepen the scoring concept from 3 scattered files into a cohesive module
- **Scope**:
  - Create `apps/pipeline/src/scoring/index.ts` that owns the full lifecycle: fetch context → compute sub-scores → detect delta → upsert result → signal alert need
  - Move `services/scoring.service.ts` logic into `scoring/service.ts` (or merge into `scoring/index.ts`)
  - Keep `scoring/engine.ts` as internal pure-function implementation (not exported)
  - Inject DB dependency via factory: `createScoringModule(db: PipelineDb)`
  - Expose single public method: `scorePolitician(politicianId: string): Promise<ScoreResult>`
  - `ScoreResult` includes `{ needsAlert: boolean, newScore: number, delta: number }`
  - Move score-related publisher methods (`upsertIntegrityScore`) into the scoring module
  - Add boundary tests: mock DB with expected rows → verify score computation + upsert calls
  - Keep existing engine unit tests (they test the pure calculation layer)
- **Success signal**: Scoring is a single importable module with one public method; engine tests still pass; new boundary tests cover fetch→compute→upsert flow

**Phase 5: API Service Layer Deepening**

- **Goal**: Evaluate each service+repository pair; merge the truly shallow ones into deeper modules
- **Scope**:
  - Audit all 8 service+repository pairs for "shallowness" (service interface ≈ implementation complexity)
  - Candidates for merging: services that only do `decode cursor → call repo → map DTO → encode cursor`
  - Keep separation where business logic exists (e.g., `subscription.service.ts` has crypto + Resend)
  - For merged modules: repository becomes internal implementation detail, service is the public interface
  - Move TypeBox schema definitions closer to the modules they validate (co-locate if it improves navigation)
  - Add boundary tests that verify the full query→cursor→DTO pipeline (replacing shallow mock-only tests)
  - Ensure all existing route integration tests still pass
- **Success signal**: Shallow service wrappers eliminated; each remaining module either has real business logic or is a deep query module; no behavior regression

### Parallelism Notes

- **Phases 1 and 2 can run in parallel** — Phase 1 touches API services, Phase 2 touches pipeline internals. No overlap.
- **Phase 3 depends on Phase 2** — Orchestrator refactor needs the source modules to be in their new locations.
- **Phase 4 depends on Phase 3** — Scoring consolidation builds on the orchestrator's dependency injection pattern.
- **Phase 5 depends on Phase 1** — API service deepening builds on the shared cursor codec.
- **Phases 4 and 5 can run in parallel** — Phase 4 is pipeline-only, Phase 5 is API-only.

```
     Phase 1 (API cursor) ──────────────────→ Phase 5 (API services)
          ↕ parallel                               ↕ parallel
     Phase 2 (source slicing) → Phase 3 (orchestrator) → Phase 4 (scoring)
```

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Pipeline organization | By domain (`sources/camara/`) | By concern (`adapters/`, `transformers/`) | AI navigability — understanding one source should require reading one directory |
| Cursor codec location | `apps/api/src/lib/cursor-codec.ts` | `packages/shared/src/utils/` | Cursor encoding is API-specific (base64url for HTTP); shared package should stay dependency-free |
| Source handler pattern | Factory function + interface | Abstract base class | Consistent with existing codebase pattern (factory functions everywhere); more testable |
| Orchestrator dispatch | `Record<DataSource, SourceHandler>` map | Plugin registration, middleware chain | Simplest solution that eliminates the switch; no over-engineering |
| Service deepening scope | Selective merge (shallow only) | Merge all, keep all separate | Some services have real logic (subscription); forced merging would reduce clarity |

---

## Research Summary

**Codebase Context**

- Monorepo with 3 apps (web, api, pipeline) + 2 packages (shared, db)
- Well-enforced import boundaries via ESLint + TypeScript + PostgreSQL RBAC
- 73 pipeline tests, all on pure functions; zero tests on orchestration/adapters
- API has clean route→service→repository layering with dependency injection at startup
- Frontend is well-structured (no refactoring needed)
- All MVP features complete; post-MVP phases 1-4 complete; this is the right time for structural improvements

**Architectural Patterns**

- Factory functions for dependency injection (no DI container)
- RFC 7807 Problem Details for API errors
- Keyset cursor pagination across all list endpoints
- AES-256-GCM encryption for sensitive data (CPF, email)
- ISR on Vercel for frontend caching
- pg-boss for job scheduling (no Redis)

---

*Generated: 2026-03-22*
*Status: DRAFT - needs validation*
