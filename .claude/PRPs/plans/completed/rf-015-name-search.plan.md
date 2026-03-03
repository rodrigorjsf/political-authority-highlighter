# Plan: RF-015 — Name Search (Busca por Nome)

## Summary

Implements full-text search for the `/politicos` listing via a PostgreSQL `tsvector` generated column on `politicians.search_vector`, populated with `unaccent(name)` so that "Jose" matches "José". Adds a debounced `SearchBar` Client Component that updates the URL with `?search=…` after 300ms of inactivity. The backend (all 5 layers) and the shared type already declare `search` — only TypeBox validation, service interface, and repository WHERE clause are missing. This is a **full-stack task** (unlike Phases 2+3 which were frontend-only).

---

## User Story

As a citizen visiting `/politicos`,
I want to type a politician's name into a search box,
So that I can quickly find and click through to my representative's integrity profile.

---

## Problem Statement

With 594 politicians spread across paginated pages, a user who already knows a name (e.g. "Lula", "Bolsonaro") must paginate or filter by state before finding the right card. There is no way to search by name at all.

---

## Solution Statement

1. Add a PostgreSQL `GENERATED ALWAYS AS STORED` tsvector column driven by `unaccent(name)` — zero application-layer sync required.
2. Add a GIN index for O(log n) FTS performance (< 200ms p95 on 594 rows).
3. Wire `search` through the API's TypeBox schema → route → service → repository using the same extension pattern as `role` and `state`.
4. Add a `SearchBar` Client Component with 300ms debounce, min 2 chars, wrapping the URL search params pattern from `RoleFilter` / `StateFilter`.

---

## Metadata

| Field | Value |
|-------|-------|
| Type | NEW_CAPABILITY |
| Complexity | MEDIUM |
| Systems Affected | packages/db, apps/api, apps/web |
| Dependencies | Drizzle ORM 0.36, PostgreSQL `unaccent` extension (pre-installed) |
| Estimated Tasks | 9 |

---

## UX Design

### Before State

```
╔══════════════════════════════════════════════════════════════╗
║  /politicos                                                  ║
╠══════════════════════════════════════════════════════════════╣
║  [Cargo: Todos os cargos ▼]  [Estado: Todos os estados ▼]   ║
║                                                              ║
║  Grid: 20 cards (all politicians, paginated)                 ║
║  [← Início]  [Próxima →]                                     ║
║                                                              ║
║  PAIN: User must paginate to find "João Silva" among 594     ║
╚══════════════════════════════════════════════════════════════╝
```

### After State

```
╔══════════════════════════════════════════════════════════════╗
║  /politicos?search=joao                                      ║
╠══════════════════════════════════════════════════════════════╣
║  [🔍 Buscar por nome...              ]   ← NEW (above bar)  ║
║  [Cargo: Todos os cargos ▼]  [Estado: Todos os estados ▼]   ║
║                                                              ║
║  Grid: cards matching "joao" (incl. "João", "Joãozinho")     ║
║  [← Início] → /politicos?search=joao                        ║
║  [Próxima →] → /politicos?search=joao&cursor=X               ║
║                                                              ║
║  Combined: ?search=joao&role=senador&state=SP                ║
╚══════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/politicos` | No text input | Search box above filter bar | Type name, see matching cards after 300ms |
| `?search=` URL | N/A | `?search=joao` | Shareable, bookmarkable search results |
| Pagination | Loses no filters | Preserves `search` param | Próxima/Início keep search context |
| Combined with role+state | N/A | All three filters compose | `?search=joao&role=senador&state=SP` |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `packages/db/src/public-schema.ts` | all | Schema to EXTEND; see tsvector customType placement |
| P0 | `packages/db/migrations/public/0001_initial.sql` | all | Migration style to MIRROR exactly |
| P0 | `apps/api/src/repositories/politician.repository.ts` | all | WHERE clause pattern to EXTEND |
| P0 | `apps/api/src/services/politician.service.ts` | all | `FindByFiltersInput` interface + service call to EXTEND |
| P0 | `apps/api/src/schemas/politician.schema.ts` | all | TypeBox schema to EXTEND (add `search` line 15 area) |
| P0 | `apps/api/src/routes/politicians.route.ts` | all | Destructuring pattern on line 29 to EXTEND |
| P1 | `apps/web/src/components/filters/role-filter.tsx` | all | URL params pattern to adapt for SearchBar |
| P1 | `apps/web/src/components/filters/state-filter.tsx` | all | Same pattern, most recent example |
| P1 | `apps/web/src/components/filters/role-filter.test.tsx` | all | Test structure to MIRROR (adapt for debounce) |
| P1 | `apps/web/src/app/politicos/page.tsx` | all | Three-change pattern from Phase 3 to EXTEND |
| P2 | `packages/shared/src/types/politician.ts` | 21-27 | `search?: string` ALREADY in PoliticianFilters — no change needed |
| P2 | `apps/web/src/lib/api-client.ts` | 46 | `search` param ALREADY sent — no change needed |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| [Drizzle ORM customType](https://orm.drizzle.team/docs/custom-types) | pg customType | How to declare `tsvector` column type in Drizzle schema |
| [PostgreSQL FTS](https://www.postgresql.org/docs/16/textsearch-controls.html) | `plainto_tsquery` | Query function for multi-word name search |
| [PostgreSQL unaccent](https://www.postgresql.org/docs/16/unaccent.html) | Module setup | Extension that strips diacritics for "Jose" → "José" match |
| [PostgreSQL Generated Columns](https://www.postgresql.org/docs/16/ddl-generated-columns.html) | GENERATED ALWAYS AS STORED | Auto-updating tsvector without triggers |

---

## Patterns to Mirror

**TYPESCRIPT CUSTOM TYPE (for tsvector in Drizzle):**
```typescript
// PATTERN: declare before table definition in public-schema.ts
import { customType } from 'drizzle-orm/pg-core'

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})
```

**ADDING COLUMN TO DRIZZLE TABLE (mirror existing columns in public-schema.ts):**
```typescript
// SOURCE: packages/db/src/public-schema.ts:42-48
// COPY THIS PATTERN for adding to politicians table's second arg:
(table) => [
  index('idx_politicians_slug').on(table.slug),
  index('idx_politicians_state').on(table.state),
  // ADD: GIN index (use index().using('gin'))
  index('idx_politicians_search').on(table.searchVector).using('gin'),
]
```

**REPOSITORY WHERE CLAUSE (mirror role/state pattern in repository.ts:40-45):**
```typescript
// SOURCE: apps/api/src/repositories/politician.repository.ts:40-45
// COPY THIS PATTERN for search:
if (filters.role !== undefined) {
  conditions.push(eq(politicians.role, filters.role))
}
if (filters.state !== undefined) {
  conditions.push(eq(politicians.state, filters.state))
}
// ADD search (different: uses sql template tag):
if (filters.search !== undefined) {
  conditions.push(
    sql`${politicians.searchVector} @@ plainto_tsquery('simple', unaccent(${filters.search}))`
  )
}
```

**SERVICE INTERFACE EXTENSION (mirror FindByFiltersInput in service.ts:35-40):**
```typescript
// SOURCE: apps/api/src/services/politician.service.ts:35-40
// CURRENT:
export interface FindByFiltersInput {
  limit: number
  cursor?: string | undefined
  role?: string | undefined
  state?: string | undefined
}
// ADD: search?: string | undefined
```

**ROUTE DESTRUCTURING (mirror line 29 in politicians.route.ts):**
```typescript
// SOURCE: apps/api/src/routes/politicians.route.ts:29
// CURRENT: const { limit = 20, cursor, role, state } = request.query
// EXTEND:  const { limit = 20, cursor, role, state, search } = request.query
```

**SEARCHBAR DEBOUNCE PATTERN (adapted from role-filter.tsx):**
```typescript
// ADAPT FROM: apps/web/src/components/filters/role-filter.tsx
// KEY DIFFERENCE: SearchBar uses useEffect + useRef for 300ms debounce
// because route.push on every keystroke would be jarring

'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function SearchBar(): React.JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('search') ?? '')
  // Ref avoids stale closure in debounce effect while keeping searchParams out of deps
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString())
      if (value.length >= 2) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      params.delete('cursor')
      const qs = params.toString()
      router.push(qs !== '' ? `${pathname}?${qs}` : pathname)
    }, 300)
    return () => clearTimeout(timeout)
  }, [value, router, pathname]) // searchParamsRef intentionally omitted (ref, not state)
  // ...
}
```

**MIGRATION SQL (mirror 0001_initial.sql style):**
```sql
-- 0002_add_search_vector.sql — RF-015: tsvector FTS column for politician name search

-- unaccent strips diacritics: 'José' → 'Jose', 'João' → 'Joao'
-- Pre-installed in PostgreSQL 16; schema-qualified to avoid search_path issues
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public_data.politicians
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('simple', unaccent(coalesce(name, '')))
    ) STORED;

-- GIN index for sub-100ms full-text search on 594 rows
CREATE INDEX IF NOT EXISTS idx_politicians_search
  ON public_data.politicians USING GIN (search_vector);
```

**TEST FAKE TIMERS (for debounce testing):**
```typescript
// PATTERN to use in search-bar.test.tsx:
import { vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

// Then to advance debounce in a test:
act(() => { vi.advanceTimersByTime(300) })
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `packages/db/src/public-schema.ts` | UPDATE | Add `tsvector` customType + `searchVector` generated column + GIN index |
| `packages/db/migrations/public/0002_add_search_vector.sql` | CREATE | Add column + unaccent extension + GIN index to live DB |
| `apps/api/src/schemas/politician.schema.ts` | UPDATE | Add `search: Type.Optional(Type.String({ minLength: 2, maxLength: 100 }))` after state (line 15) |
| `apps/api/src/services/politician.service.ts` | UPDATE | Add `search?: string \| undefined` to `FindByFiltersInput`; pass to repository |
| `apps/api/src/repositories/politician.repository.ts` | UPDATE | Add `search?: string \| undefined` to `ListFilters`; add tsvector WHERE |
| `apps/web/src/components/filters/search-bar.tsx` | CREATE | Debounced SearchBar Client Component |
| `apps/web/src/components/filters/search-bar.test.tsx` | CREATE | 5 tests with fake timers |
| `apps/web/src/app/politicos/page.tsx` | UPDATE | Extract `search` param, add to filters+baseParams, import+render SearchBar above filter bar |

---

## NOT Building

- **Party filter (RF-???)** — not in MVP scope for this phase
- **tsvector for party/state** — name-only search is sufficient; state filter covers UF browsing
- **Autocomplete/suggestions dropdown** — too complex for MVP; plain input + results is enough
- **Search result count** — requires extra COUNT query; not in PRD
- **Search history** — no localStorage usage in MVP
- **Highlight matching text in cards** — nice-to-have, not in PRD RF-015 scope

---

## Step-by-Step Tasks

### Task 1: UPDATE `packages/db/src/public-schema.ts` — add tsvector column

- **ACTION**: ADD `customType` declaration + `searchVector` field + GIN index to politicians table
- **IMPLEMENT**:
  1. Import `customType, sql` from `'drizzle-orm/pg-core'` (add to existing import on line 1-11)
  2. Declare `const tsvector` with `customType<{ data: string }>` before `publicData` declaration
  3. In `politicians` table columns: add `searchVector: tsvector('search_vector').generatedAlwaysAs(sql\`to_tsvector('simple', unaccent(coalesce(name, '')))\`)`
  4. In `politicians` table indexes (second arg): add `index('idx_politicians_search').on(table.searchVector).using('gin')`
- **GOTCHA**: `generatedAlwaysAs()` is a Drizzle v0.36+ feature for `GENERATED ALWAYS AS STORED` columns. The `sql` tag is needed to reference the raw SQL expression. The column is read-only (never inserted/updated from application code).
- **GOTCHA**: `using('gin')` tells Drizzle to emit `USING GIN` in the CREATE INDEX statement
- **GOTCHA**: `coalesce(name, '')` prevents `to_tsvector` from failing if `name` is somehow NULL
- **VALIDATE**: `pnpm --filter @pah/db typecheck`

### Task 2: CREATE `packages/db/migrations/public/0002_add_search_vector.sql`

- **ACTION**: CREATE migration SQL file with sequential number following `0001_initial.sql`
- **IMPLEMENT**:
  ```sql
  -- 0002_add_search_vector.sql — RF-015: tsvector FTS for politician name search

  CREATE EXTENSION IF NOT EXISTS unaccent;

  ALTER TABLE public_data.politicians
    ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector('simple', unaccent(coalesce(name, '')))
      ) STORED;

  CREATE INDEX IF NOT EXISTS idx_politicians_search
    ON public_data.politicians USING GIN (search_vector);
  ```
- **GOTCHA**: `CREATE EXTENSION IF NOT EXISTS unaccent` — `unaccent` is bundled with PostgreSQL 16 but must be enabled per database. `IF NOT EXISTS` makes it idempotent.
- **GOTCHA**: `GENERATED ALWAYS AS ... STORED` requires PostgreSQL 12+. Our base is 16. ✓
- **GOTCHA**: `ADD COLUMN IF NOT EXISTS` makes the migration re-runnable (idempotent per DR-007)
- **GOTCHA**: Use `'simple'` dictionary (not `'portuguese'`) so proper nouns like politician names are not stemmed. "Silva" stays "Silva", not reduced to a stem.
- **VALIDATE**: `psql -c "SELECT to_tsvector('simple', unaccent('João Silva'))"` → `'joao':1 'silva':2`

### Task 3: UPDATE `apps/api/src/schemas/politician.schema.ts` — add search param

- **ACTION**: ADD `search` query param to `PoliticianListQuerySchema`
- **IMPLEMENT**: After line 15 (`state` param), add:
  ```typescript
  // Phase 4: search (RF-015)
  search: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  ```
- **MIRROR**: `apps/api/src/schemas/politician.schema.ts:13-15` — same pattern as `role` and `state`
- **GOTCHA**: `minLength: 2` matches the PRD requirement ("min 2 chars"). TypeBox validates this on the API; the frontend also enforces it via the debounce logic.
- **GOTCHA**: `maxLength: 100` prevents excessively long search strings from reaching the DB
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

### Task 4: UPDATE `apps/api/src/services/politician.service.ts` — add search

- **ACTION**: Two changes: add `search` to `FindByFiltersInput` interface + pass to repository
- **IMPLEMENT**:
  1. In `FindByFiltersInput` (lines 35-40): add `search?: string | undefined`
  2. In `repository.selectWithFilters({...})` (lines 58-63): add `search: input.search`
- **MIRROR**: `apps/api/src/services/politician.service.ts:38-39` — same pattern as `role` and `state` fields
- **GOTCHA**: `exactOptionalPropertyTypes` — do NOT assign `search: undefined` directly. The `input.search` reference is fine because the interface already declares `search?: string | undefined`.
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

### Task 5: UPDATE `apps/api/src/repositories/politician.repository.ts` — implement tsvector WHERE

- **ACTION**: Two changes: add `search` to `ListFilters` interface + add WHERE clause
- **IMPLEMENT**:
  1. In `ListFilters` interface (lines 5-10): add `search?: string | undefined`
  2. Import `sql` from `'drizzle-orm'` (add to existing import on line 1)
  3. After the `state` condition block (lines 43-45): add:
     ```typescript
     if (filters.search !== undefined) {
       conditions.push(
         sql`${politicians.searchVector} @@ plainto_tsquery('simple', unaccent(${filters.search}))`
       )
     }
     ```
- **MIRROR**: `apps/api/src/repositories/politician.repository.ts:40-45` — same conditional push pattern
- **GOTCHA**: `sql` template tag is safe here — `${filters.search}` is parameterized by Drizzle, not interpolated. No SQL injection risk.
- **GOTCHA**: `plainto_tsquery('simple', unaccent($search))` — use `'simple'` dict (matches Task 2) and apply `unaccent` on the query side too, so "Jose" matches tsvector built from "João".
- **GOTCHA**: `politicians.searchVector` must match the field added to public-schema.ts in Task 1. TypeScript will catch a mismatch.
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

### Task 6: UPDATE `apps/api/src/routes/politicians.route.ts` — extract search

- **ACTION**: Destructure `search` from `request.query` and pass to service
- **IMPLEMENT**:
  1. Line 29: `const { limit = 20, cursor, role, state, search } = request.query`
  2. In `deps.politicianService.findByFilters({...})` call: add `search`
- **MIRROR**: `apps/api/src/routes/politicians.route.ts:29,31-36` — same pattern as `role`, `state`
- **VALIDATE**: `pnpm --filter @pah/api typecheck`

### Task 7: CREATE `apps/web/src/components/filters/search-bar.tsx`

- **ACTION**: CREATE SearchBar Client Component with 300ms debounce
- **IMPLEMENT**: Full component using the debounce pattern described in "Patterns to Mirror"
  - `id="search-bar"`, `aria-label="Buscar por nome"`, `placeholder="Buscar por nome..."`
  - Initializes `value` from `searchParams.get('search') ?? ''`
  - `useRef` for `searchParamsRef` (avoids stale closure without adding `searchParams` to deps)
  - `useEffect` with 300ms `setTimeout`: pushes URL only when `value.length >= 2` (sets param) or when `value.length < 2` (deletes param); always deletes `cursor`
  - Input has `minLength={2}` attribute for HTML5 validation hint (non-blocking)
  - Width: `w-64` to accommodate longer names
  - Matches Tailwind className pattern from role-filter.tsx / state-filter.tsx
- **GOTCHA**: Do NOT include `searchParams` in `useEffect` dependency array — it causes re-renders on every URL change (including from role/state filters), creating an infinite loop. Use `searchParamsRef` instead.
- **GOTCHA**: The `useRef` approach: `searchParamsRef.current = searchParams` must be set synchronously on every render (not in an effect) so the ref is always fresh when the timeout fires.
- **GOTCHA**: `exactOptionalPropertyTypes` — when deleting `search`, call `params.delete('search')`, never `params.set('search', undefined)`.
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

### Task 8: CREATE `apps/web/src/components/filters/search-bar.test.tsx`

- **ACTION**: CREATE 5 unit tests using fake timers for the debounce
- **TESTS**:
  1. `renders input with placeholder "Buscar por nome..."` — render, check `getByPlaceholderText`
  2. `defaults to empty value when no search in URL` — render, check `input.value === ''`
  3. `shows "joao" as value when search=joao in URL` — mock `useSearchParams('search=joao')`, render, check `input.value === 'joao'`
  4. `calls router.push with search param after 300ms debounce, clears cursor` — mock router + searchParams('cursor=abc123'), type "jo", advance time 300ms, expect `push('/politicos?search=jo')` NOT called (< 2 chars); then type "joao" (length 4), advance 300ms, expect push called with `?search=joao`
  5. `removes search param from URL when input is cleared to less than 2 chars` — mock searchParams('search=joao'), type "j", advance 300ms, expect push('/politicos')
- **HELPERS**: Use same `mockSearchParams` and `mockRouter` helpers verbatim from `role-filter.test.tsx:8-13`
- **FAKE TIMERS**: `beforeEach(() => vi.useFakeTimers())` / `afterEach(() => vi.useRealTimers())`
- **ADVANCE TIME**: `act(() => { vi.advanceTimersByTime(300) })` — must be wrapped in `act` since it triggers React state updates
- **GOTCHA**: `fireEvent.change(input, { target: { value: 'joao' } })` sets the input value; the debounce timeout must then be advanced before checking `pushMock`.
- **GOTCHA**: Between firing the change event and advancing timers, nothing should be pushed yet — test that `pushMock` has not been called before advancing.
- **VALIDATE**: `pnpm --filter @pah/web test` — expect 21 tests pass (16 existing + 5 new)

### Task 9: UPDATE `apps/web/src/app/politicos/page.tsx` — wire SearchBar

- **ACTION**: Three targeted changes (mirror Phase 3 RF-003 pattern exactly):

  **Change 1** — Extract `search` from searchParams (after `state` extraction):
  ```typescript
  const search = typeof params['search'] === 'string' ? params['search'] : undefined
  ```

  **Change 2** — Add `search` to filters and `baseParams` (after `state` assignments):
  ```typescript
  if (search !== undefined) filters.search = search
  // ...
  if (search !== undefined) baseParams.set('search', search)
  ```

  **Change 3** — Import + add SearchBar ABOVE the filter bar div:
  ```typescript
  import { SearchBar } from '../../components/filters/search-bar'
  // In JSX, above the "Filter bar" div:
  <div className="mb-4">
    <Suspense fallback={<div className="h-10 w-64 animate-pulse rounded-md bg-muted" />}>
      <SearchBar />
    </Suspense>
  </div>
  ```

- **GOTCHA**: SearchBar goes ABOVE the role+state filter bar (not inside it) — it's the primary search action, visually distinct.
- **GOTCHA**: `baseParams` must include `search`, `role`, AND `state` so all three are preserved in pagination links.
- **GOTCHA**: No type cast needed — `PoliticianFilters.search` is `string` (no union type).
- **VALIDATE**: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web build`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|-----------|-----------|
| `search-bar.test.tsx` | 5 tests (render, default, pre-filled, debounce fires, clears) | Debounce logic, URL params |

### Edge Cases Checklist

- [ ] Empty input (0 chars) — `search` param deleted from URL
- [ ] 1 char — `search` param deleted (below minLength)
- [ ] Exactly 2 chars — `search` param SET
- [ ] Name with diacritics typed as plain ASCII ("joao" matches "João") — tested via DB
- [ ] Search with existing role+state filters — all three preserved in URL
- [ ] Cursor cleared when search changes — pagination reset
- [ ] Debounce: push NOT called before 300ms
- [ ] Debounce: push called exactly once after 300ms (not multiple times)

---

## Validation Commands

### Level 1: Static Analysis

```bash
pnpm --filter @pah/db typecheck          # After Tasks 1-2
pnpm --filter @pah/api typecheck         # After Tasks 3-6
pnpm --filter @pah/web typecheck         # After Tasks 7-9
pnpm typecheck                           # Full workspace
```

**EXPECT**: Exit 0, 0 errors across all packages

### Level 2: Unit Tests

```bash
pnpm --filter @pah/web test
# EXPECT: 21 tests pass (16 existing + 5 new)

pnpm --filter @pah/api test
# EXPECT: 7 tests pass (existing, no new unit tests for backend changes)
```

### Level 3: Full Suite + Build

```bash
pnpm --filter @pah/web build
# EXPECT: next build succeeds (no missing-suspense-with-csr-bailout)

pnpm lint && pnpm typecheck && pnpm test
# EXPECT: all pass, 0 warnings
```

### Level 4: Database Validation (REQUIRED — schema change)

```bash
# Apply migration (requires Docker PostgreSQL running):
psql $DATABASE_URL -f packages/db/migrations/public/0002_add_search_vector.sql

# Verify:
psql $DATABASE_URL -c "SELECT search_vector FROM public_data.politicians LIMIT 1;"
# EXPECT: tsvector value, e.g. 'joao':1 'silva':2

psql $DATABASE_URL -c "\d public_data.politicians" | grep search_vector
# EXPECT: search_vector | tsvector | GENERATED ALWAYS AS STORED

psql $DATABASE_URL -c "\di public_data.*search*"
# EXPECT: idx_politicians_search GIN index listed
```

### Level 5: Manual Validation

```bash
pnpm --filter @pah/web dev   # starts Next.js on :3000
pnpm --filter @pah/api dev   # starts Fastify on :3001
```

1. Visit `http://localhost:3000/politicos`
2. Verify search box appears ABOVE the role/state filter bar
3. Type "joao" (no diacritics) → wait 300ms → URL updates to `?search=joao`
4. Verify cards showing politicians named "João" appear
5. Type "jo" → URL updates to `?search=jo`
6. Clear to empty → URL reverts to `/politicos`
7. Combine: select "Senador" + type "silva" → URL: `?role=senador&search=silva`
8. Click Próxima → URL: `?role=senador&search=silva&cursor=X` (all params preserved)
9. Click ← Início → URL: `?role=senador&search=silva` (cursor removed, filters kept)

---

## Acceptance Criteria

- [ ] Typing "joao" (no accent) finds politicians named "João" — unaccent matching works
- [ ] URL search param `?search=…` is preserved in "Próxima" and "← Início" pagination links
- [ ] `?search=…` composes correctly with `?role=…` and `?state=…`
- [ ] `next build` succeeds (Suspense wrapper present)
- [ ] 21 unit tests pass (16 from Phases 1-3 + 5 new)
- [ ] `pnpm lint` and `pnpm typecheck` pass with 0 errors
- [ ] Political neutrality: search returns results for any politician; no bias (DR-002)
- [ ] API migration applied; GIN index exists in `public_data.politicians`

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Drizzle `generatedAlwaysAs` API differs in v0.36 | MEDIUM | MEDIUM | Fall back to defining `searchVector` as `tsvector('search_vector')` (read-only without generated marker) — migration SQL still creates it as generated |
| `unaccent` extension not installed | LOW | HIGH | `CREATE EXTENSION IF NOT EXISTS unaccent` in migration; pre-installed in PostgreSQL 16 Alpine image |
| Infinite update loop in SearchBar (searchParams in deps) | LOW (with ref pattern) | HIGH | Use `useRef` for searchParamsRef — explicitly excluded from useEffect deps |
| Pagination "← Início" loses search+role+state | LOW | MEDIUM | Build `baseParams` with all three before JSX return |
| 300ms debounce fires while user still typing | N/A | N/A | Timeout cleared on every new render via `return () => clearTimeout(timeout)` |
| Test: fake timers not wrapped in `act()` | MEDIUM | MEDIUM | Always `act(() => { vi.advanceTimersByTime(300) })` to flush React state updates |

---

## Notes

- **Why `'simple'` dictionary?** `'portuguese'` applies stemming (e.g., "Silva" → "silva stem"). For proper names, stemming hurts recall. `'simple'` lowercases and strips accents without stemming — ideal for name matching.
- **Why generated column?** Zero application-layer sync. The DB keeps `search_vector` in sync with `name` automatically. No triggers, no job, no code.
- **Why `plainto_tsquery` not `websearch_to_tsquery`?** `plainto_tsquery` treats all tokens as AND (both "joao" AND "silva" must match), which is correct for name search. `websearch_to_tsquery` would allow OR and negation — too permissive for a name field.
- **SearchBar placement (above filter bar):** Search is the primary interaction and deserves vertical priority over the categorical filters. This matches common search + filter UX patterns.
- **Integration tests:** Not included in this phase. When `test:integration` suite is built for the API, the tsvector search should be covered by seeding a politician named "João Silva" and asserting that querying `?search=joao` returns it.
