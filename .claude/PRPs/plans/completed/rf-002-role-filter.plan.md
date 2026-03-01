# Feature: RF-002 — Role Filter (Deputado / Senador)

## Summary

Add a role filter dropdown to the `/politicos` listing page, allowing users to narrow the 594-politician grid to the 513 deputados or 81 senadores. The **entire backend is already implemented** from Phase 1 — all work is frontend-only: update the Server Component page to pass `role` from `searchParams` to `fetchPoliticians()`, create a `RoleFilter` Client Component (with mandatory `<Suspense>` for ISR pages), and update pagination links to preserve the filter param.

## User Story

As a Brazilian voter
I want to filter the politician listing by legislative role (deputado/senador)
So that I can focus exclusively on the representatives relevant to my electoral context without scrolling through hundreds of irrelevant results

## Problem Statement

The /politicos page lists all 594 active politicians regardless of legislative house. A voter researching their state's senators must scroll through up to 513 deputado cards before reaching relevant senators. Filtering by role reduces the visible set to 81 cards for senators or up to 513 for deputados, making the listing actionable for house-specific research.

## Solution Statement

The API already accepts and processes the `role` query param at every layer (TypeBox schema, route, service, Drizzle WHERE clause). The frontend needs: (1) the Server Component page to read `role` from `searchParams` and pass it to `fetchPoliticians()`; (2) a `RoleFilter` Client Component using `useSearchParams` + `useRouter.push()`, wrapped in `<Suspense>` (required by Next.js 15 for ISR pages); and (3) pagination links updated to preserve `?role=X` across page turns.

## Metadata

| Field | Value |
|-------|-------|
| Type | ENHANCEMENT |
| Complexity | LOW |
| Systems Affected | apps/web only (backend complete) |
| Dependencies | Next.js ^15.0.0 (15.5.12), React ^19.0.0 |
| Estimated Tasks | 5 |

---

## UX Design

### Before State

```
╔══════════════════════════════════════════════════════════════════════╗
║  BEFORE: /politicos                                                  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  [/politicos] → Grid 20 cards (513 deputados + 81 senadores mixed)  ║
║                     ↓ [Próxima →] → /politicos?cursor=X             ║
║                                                                      ║
║  USER_FLOW: User arrives → sees 20 mixed-role cards → paginates     ║
║  PAIN_POINT: No way to isolate senators from 594-entry listing       ║
║  DATA_FLOW: page.tsx → fetchPoliticians({}) → GET /politicians       ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### After State

```
╔══════════════════════════════════════════════════════════════════════╗
║  AFTER: /politicos?role=senador                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  [/politicos] → ┌─────────────────────────────┐                     ║
║                 │ Função: [Todos ▼]            │  ← RoleFilter      ║
║                 └─────────────────────────────┘                     ║
║                     ↓ user selects "Senador"                        ║
║                 router.push('/politicos?role=senador')               ║
║                     ↓                                               ║
║  [/politicos?role=senador] → Grid 20 senators only                  ║
║                     ↓ [Próxima →] → ?role=senador&cursor=X          ║
║                                                                      ║
║  USER_FLOW: User selects role → URL updates → grid scoped           ║
║  VALUE_ADD: 81 senators visible instead of 594 mixed results        ║
║  DATA_FLOW: page.tsx (reads role from searchParams)                 ║
║           → fetchPoliticians({ role: 'senador' })                   ║
║           → GET /api/v1/politicians?role=senador                    ║
║           → repository.selectWithFilters({ role: 'senador' })       ║
║           → WHERE role = 'senador' (DB already indexed)             ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/politicos` | No filter UI | `RoleFilter` dropdown at top | Can select Deputado Federal / Senador |
| URL | `/politicos?cursor=X` | `/politicos?role=senador&cursor=X` | Filter reflected in shareable URL |
| Pagination `Próxima →` | `?cursor=X` only | `?role=senador&cursor=X` | Filter preserved across pages |
| Pagination `← Início` | `/politicos` | `/politicos?role=senador` | Returns to first page, keeps filter |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `apps/web/src/app/politicos/page.tsx` | all | Pattern to EXTEND — searchParams extraction, fetchPoliticians call, pagination links |
| P0 | `apps/web/src/components/politician/politician-card.tsx` | all | Mirror component structure and className patterns |
| P1 | `apps/web/src/components/politician/politician-card.test.tsx` | all | Test pattern to FOLLOW — render + screen queries |
| P1 | `apps/web/vitest.setup.ts` | all | Required mocks (next/image, next/link) — add next/navigation mock here |
| P2 | `packages/shared/src/types/politician.ts` | 21-27 | `PoliticianFilters.role` is already typed as `'deputado' \| 'senador'` |
| P2 | `apps/api/src/schemas/politician.schema.ts` | 7-16 | Confirms role enum values: `'deputado'` or `'senador'` only |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| [Next.js 15 — useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) | Suspense requirement | Client Component with useSearchParams MUST be wrapped in `<Suspense>` when page uses ISR (`revalidate`) — otherwise `next build` fails |
| [Next.js 15 — page.js searchParams](https://nextjs.org/docs/app/api-reference/file-conventions/page) | searchParams is a Promise | `searchParams` prop is `Promise<{[key: string]: string \| string[] \| undefined}>` in Next.js 15; must be `await`ed |
| [Next.js 15 — Missing Suspense error](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout) | Build failure | Explains exactly why Suspense is required for static pages with useSearchParams |

---

## Patterns to Mirror

**SEARCHPARAMS EXTRACTION in Server Component:**
```typescript
// SOURCE: apps/web/src/app/politicos/page.tsx:16-26
// COPY THIS PATTERN:
interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PoliticosPage({ searchParams }: Props): Promise<React.JSX.Element> {
  const params = await searchParams
  const cursor = typeof params['cursor'] === 'string' ? params['cursor'] : undefined
  // EXTEND: add role the same way
  const result = await fetchPoliticians(cursor !== undefined ? { cursor } : {})
```

**PAGINATION LINK PATTERN (must preserve role param):**
```typescript
// SOURCE: apps/web/src/app/politicos/page.tsx:55-67
// CURRENT (only preserves cursor):
href={`/politicos?cursor=${result.cursor}`}

// MUST BECOME (also preserve role):
const roleParam = role !== undefined ? `&role=${role}` : ''
href={`/politicos?cursor=${result.cursor}${roleParam}`}
// OR use URLSearchParams:
const nextPageParams = new URLSearchParams()
if (role !== undefined) nextPageParams.set('role', role)
nextPageParams.set('cursor', result.cursor)
href={`/politicos?${nextPageParams.toString()}`}
```

**COMPONENT FILE STRUCTURE:**
```typescript
// SOURCE: apps/web/src/components/politician/politician-card.tsx:1-5
// COPY THIS PATTERN — no 'use client' for Server Components:
import Link from 'next/link'
import Image from 'next/image'
import type { PoliticianCard } from '@pah/shared'
// For CLIENT components, add 'use client' as FIRST LINE (before imports)
```

**RTL TEST PATTERN:**
```typescript
// SOURCE: apps/web/src/components/politician/politician-card.test.tsx:1-16
// COPY THIS PATTERN:
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RoleFilter } from './role-filter'

// For components that use next/navigation hooks, add mock in vitest.setup.ts or inline:
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/politicos',
}))
```

**SUSPENSE WRAPPER PATTERN:**
```typescript
// PATTERN from Next.js 15 docs — required for ISR pages with Client Components using useSearchParams
import { Suspense } from 'react'
import { RoleFilter } from '@/components/filters/role-filter'

// In the page JSX:
<Suspense fallback={<div className="h-10 w-48 animate-pulse rounded bg-muted" />}>
  <RoleFilter />
</Suspense>
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `apps/web/src/app/politicos/page.tsx` | UPDATE | Extract `role` from searchParams; pass to fetchPoliticians; wrap RoleFilter in Suspense; update pagination links to preserve role |
| `apps/web/src/components/filters/role-filter.tsx` | CREATE | Client Component with useSearchParams + useRouter for role selection |
| `apps/web/src/components/filters/role-filter.test.tsx` | CREATE | RTL unit tests for RoleFilter component |
| `apps/web/vitest.setup.ts` | UPDATE | Add `next/navigation` mock so useSearchParams/useRouter work in tests |

**Backend — NO CHANGES REQUIRED.** All layers already implemented:
- `packages/shared/src/types/politician.ts` — `PoliticianFilters.role` typed ✅
- `apps/api/src/schemas/politician.schema.ts` — TypeBox enum validation ✅
- `apps/api/src/routes/politicians.route.ts` — extracts and passes `role` ✅
- `apps/api/src/services/politician.service.ts` — passes `role` to repository ✅
- `apps/api/src/repositories/politician.repository.ts` — `WHERE role = $1` clause ✅
- `apps/web/src/lib/api-client.ts` — `params.set('role', filters.role)` ✅
- `packages/db/src/public-schema.ts` — `role` column + `idx_politicians_role` index ✅

---

## NOT Building (Scope Limits)

- **State filter (RF-003)** — separate phase, can run in parallel in another worktree
- **Search input (RF-015)** — depends on both role + state filters being complete
- **Combined filter display / active filter badges** — nice-to-have, not in this phase
- **Animated transitions / loading spinner** — `loading.tsx` skeleton already handles this
- **Filter count ("81 senadores")** — requires a separate COUNT query; post-Phase 2
- **Mobile bottom sheet / drawer for filters** — future UX enhancement

---

## Step-by-Step Tasks

### Task 1: UPDATE `apps/web/vitest.setup.ts` — add `next/navigation` mock

- **ACTION**: ADD mock for `next/navigation` module so RTL tests can import `RoleFilter`
- **IMPLEMENT**: Mock `useSearchParams`, `useRouter`, `usePathname` with sensible defaults
- **MIRROR**: Existing `next/image` and `next/link` mock pattern in the same file
- **GOTCHA**: `useSearchParams()` returns a `ReadonlyURLSearchParams` — mock must return something with a `.get()` method. Use `new URLSearchParams()` as the mock return value.
- **CODE**:
  ```typescript
  vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/politicos',
  }))
  ```
- **VALIDATE**: `pnpm --filter @pah/web test` — existing 6 tests must still pass

---

### Task 2: CREATE `apps/web/src/components/filters/role-filter.tsx`

- **ACTION**: CREATE Client Component for role selection
- **IMPLEMENT**: `'use client'` directive; `<select>` with 3 options (Todos, Deputado Federal, Senador); `onChange` calls `router.push()` with updated URL; resets cursor when role changes; `useSearchParams()` to read current role value
- **IMPORTS**:
  ```typescript
  'use client'
  import { useSearchParams, useRouter, usePathname } from 'next/navigation'
  ```
- **ROLE OPTIONS**: Use Portuguese labels matching the `PoliticianCard.role` values:
  - `value=""` → "Todos" (Todos os cargos)
  - `value="deputado"` → "Deputado Federal"
  - `value="senador"` → "Senador"
- **URL PRESERVATION PATTERN**: `new URLSearchParams(searchParams.toString())` — then `.set()` / `.delete()` / always `.delete('cursor')`
- **DR-002 COMPLIANCE**: Both options presented at equal visual weight; no party associations; factual labels only
- **ACCESSIBILITY**: `<select>` with `aria-label="Filtrar por função"` and `id` for label association
- **GOTCHA**: This component uses `useSearchParams()` — it MUST be wrapped in `<Suspense>` by the page. Do NOT add `<Suspense>` inside this component.
- **GOTCHA**: `exactOptionalPropertyTypes` — when building the URL, do NOT construct `{ role: undefined }` — use conditional deletion from URLSearchParams instead
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

**Full implementation:**
```typescript
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const ROLE_OPTIONS = [
  { value: '', label: 'Todos os cargos' },
  { value: 'deputado', label: 'Deputado Federal' },
  { value: 'senador', label: 'Senador' },
] as const

export function RoleFilter(): React.JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      const params = new URLSearchParams(searchParams.toString())
      if (e.target.value !== '') {
        params.set('role', e.target.value)
      } else {
        params.delete('role')
      }
      params.delete('cursor') // always reset pagination on filter change
      const qs = params.toString()
      router.push(qs !== '' ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="role-filter" className="text-sm font-medium text-foreground">
        Cargo:
      </label>
      <select
        id="role-filter"
        value={searchParams.get('role') ?? ''}
        onChange={handleChange}
        aria-label="Filtrar por cargo"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
```

---

### Task 3: UPDATE `apps/web/src/app/politicos/page.tsx` — wire role filter

- **ACTION**: Three targeted changes:
  1. Extract `role` from awaited `searchParams`
  2. Pass `role` to `fetchPoliticians()`
  3. Add `<Suspense><RoleFilter /></Suspense>` to JSX
  4. Update pagination links to preserve `role` param
- **IMPLEMENT**:

**Change 1 — Extract role (after the existing cursor extraction):**
```typescript
const params = await searchParams
const cursor = typeof params['cursor'] === 'string' ? params['cursor'] : undefined
const role = typeof params['role'] === 'string' ? params['role'] : undefined
```

**Change 2 — Pass role to fetchPoliticians:**
```typescript
// BEFORE:
const result = await fetchPoliticians(cursor !== undefined ? { cursor } : {})

// AFTER (exactOptionalPropertyTypes safe — build object conditionally):
const filters: PoliticianFilters = {}
if (cursor !== undefined) filters.cursor = cursor
if (role !== undefined) filters.role = role as 'deputado' | 'senador'
const result = await fetchPoliticians(filters)
```

**Change 3 — Add Suspense + RoleFilter above the grid:**
```typescript
import { Suspense } from 'react'
import { RoleFilter } from '../../components/filters/role-filter'
// ...
// In JSX, before the grid:
<div className="mb-6 flex items-center gap-4">
  <Suspense fallback={<div className="h-10 w-48 animate-pulse rounded-md bg-muted" />}>
    <RoleFilter />
  </Suspense>
</div>
```

**Change 4 — Update pagination links to preserve role:**
```typescript
// BEFORE:
href={`/politicos?cursor=${result.cursor}`}
// AND:
href="/politicos"

// AFTER:
const baseParams = new URLSearchParams()
if (role !== undefined) baseParams.set('role', role)

// Início link (first page, preserve filter):
href={role !== undefined ? `/politicos?role=${role}` : '/politicos'}

// Próxima link (next page, preserve filter):
const nextParams = new URLSearchParams(baseParams)
nextParams.set('cursor', result.cursor)
href={`/politicos?${nextParams.toString()}`}
```

- **IMPORTS TO ADD**:
  ```typescript
  import { Suspense } from 'react'
  import { RoleFilter } from '../../components/filters/role-filter'
  import type { PoliticianFilters } from '@pah/shared'
  ```
- **GOTCHA**: `role as 'deputado' | 'senador'` cast is required because `params['role']` is `string` from searchParams but `PoliticianFilters.role` is `'deputado' | 'senador'`. The API TypeBox validation will reject invalid values server-side, so this cast is safe.
- **VALIDATE**: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web build`

---

### Task 4: CREATE `apps/web/src/components/filters/role-filter.test.tsx`

- **ACTION**: CREATE unit tests for `RoleFilter` component
- **IMPLEMENT**: Test 4 behaviors:
  1. Renders select with 3 options
  2. Shows "Todos os cargos" as default when no role in URL
  3. Shows correct selected option when role is in URL
  4. Calls `router.push` with correct URL on change (including cursor reset)
- **MIRROR**: `apps/web/src/components/politician/politician-card.test.tsx` — describe/it/render/screen pattern
- **GOTCHA**: `next/navigation` mock must use `vi.mock()` — either in the test file or in `vitest.setup.ts` (Task 1). If added to setup, it applies globally. Per-test override with `vi.mocked(useRouter).mockReturnValue(...)` for the push spy.
- **GOTCHA**: `useSearchParams()` is mocked globally to return `new URLSearchParams()`. To test the "role=senador selected" case, override per test:
  ```typescript
  vi.mocked(useSearchParams).mockReturnValueOnce(new URLSearchParams('role=senador'))
  ```
- **TEST STRUCTURE**:
  ```typescript
  import { render, screen, fireEvent } from '@testing-library/react'
  import { describe, it, expect, vi } from 'vitest'
  import { RoleFilter } from './role-filter'

  describe('RoleFilter', () => {
    it('renders select with all 3 options', () => { ... })
    it('defaults to empty (Todos os cargos) when no role in URL', () => { ... })
    it('shows Senador as selected when role=senador in URL', () => { ... })
    it('calls router.push with role param and clears cursor on change', () => { ... })
  })
  ```
- **VALIDATE**: `pnpm --filter @pah/web test` — all 10 tests pass (6 existing + 4 new)

---

### Task 5: Final Validation

- **ACTION**: Run full workspace validation suite
- **COMMANDS**:
  ```bash
  pnpm --filter @pah/web typecheck
  pnpm --filter @pah/web test
  pnpm --filter @pah/web lint
  pnpm --filter @pah/web build
  ```
- **EXPECT**:
  - typecheck: 0 errors
  - test: 10 tests pass
  - lint: 0 errors
  - build: successful (Next.js 15.5.12) — `<Suspense>` prevents missing-suspense-with-csr-bailout error
- **THEN**: Run full workspace: `pnpm typecheck && pnpm test && pnpm build && pnpm lint`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|-----------|-----------|
| `apps/web/src/components/filters/role-filter.test.tsx` | 3 options render; default empty; senador selected; push called with role+no cursor | RoleFilter component behavior |

### Edge Cases Checklist

- [ ] User clears filter (selects "Todos") → `role` deleted from URL, `cursor` deleted
- [ ] Filter + pagination: user on page 2 with role=senador, selects deputado → cursor reset, role=deputado
- [ ] Invalid role value in URL (e.g. `?role=vereador`) → API returns 400, page shows error or falls back (graceful)
- [ ] Role filter + cursor preserved together in "Próxima" link
- [ ] "← Início" link preserves role but removes cursor

---

## Validation Commands

### Level 1: Static Analysis
```bash
pnpm --filter @pah/web typecheck
pnpm --filter @pah/web lint
```
**EXPECT**: 0 errors, 0 warnings

### Level 2: Unit Tests
```bash
pnpm --filter @pah/web test
```
**EXPECT**: 10 tests pass (6 existing PoliticianCard + 4 new RoleFilter)

### Level 3: Full Suite + Build
```bash
pnpm typecheck && pnpm test && pnpm build && pnpm lint
```
**EXPECT**: All pass, `next build` succeeds without `missing-suspense-with-csr-bailout`

### Level 5: Manual Validation
1. Start dev server: `pnpm --filter @pah/web dev`
2. Navigate to `http://localhost:3000/politicos`
3. Verify "Cargo:" dropdown appears above grid
4. Select "Senador" → URL changes to `?role=senador`
5. Select "Deputado Federal" → URL changes to `?role=deputado`, cursor absent
6. Click "Próxima" → URL: `?role=deputado&cursor=X`
7. Click "← Início" → URL: `?role=deputado` (cursor removed, role preserved)
8. Select "Todos os cargos" → URL: `/politicos` (role removed)

---

## Acceptance Criteria

- [ ] `RoleFilter` component renders with 3 options: "Todos os cargos", "Deputado Federal", "Senador" (DR-002: neutral labels)
- [ ] Selecting a role updates the URL and re-renders the page with filtered results
- [ ] Cursor is always reset when role changes (prevents stale pagination)
- [ ] Role param is preserved in "Próxima" and "← Início" pagination links
- [ ] `next build` succeeds (no missing-suspense-with-csr-bailout error)
- [ ] All 10 unit tests pass
- [ ] `pnpm lint` and `pnpm typecheck` pass with 0 errors
- [ ] No party colors, qualitative labels, or ranking language (DR-002)

---

## Completion Checklist

- [ ] Task 1 complete: `vitest.setup.ts` updated with `next/navigation` mock
- [ ] Task 2 complete: `role-filter.tsx` created, typechecks
- [ ] Task 3 complete: `page.tsx` updated — role extracted, filter rendered in Suspense, pagination links fixed
- [ ] Task 4 complete: `role-filter.test.tsx` created, 4 tests pass
- [ ] Task 5 complete: Full workspace validation passes

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Missing `<Suspense>` causes `next build` failure | HIGH if forgotten | HIGH (blocks CI) | Mandatory — `next build` in Task 3 validation catches it |
| `exactOptionalPropertyTypes` error with role cast | MEDIUM | LOW | Use `filters.role = role as 'deputado' \| 'senador'` pattern instead of spread |
| `useSearchParams` mock missing in test → hook error | MEDIUM | LOW | Added to `vitest.setup.ts` globally in Task 1 |
| Pagination cursor not reset on filter change | LOW | MEDIUM | Always call `params.delete('cursor')` before `router.push` in RoleFilter |
| Pagination links lose role param | LOW | MEDIUM | Build `nextParams` from `baseParams` (which includes role) in Task 3 |

---

## Notes

**Why not `next/form` for progressive enhancement?** The form approach was considered but rejected: (1) a submit button is needed for the no-JS case, degrading the UX; (2) the `useRouter` approach with `useSearchParams` preserves other params automatically; (3) the current codebase has no `next/form` usage, avoiding a new pattern; (4) Phase 3 (state filter) will use the same `RoleFilter` pattern, making it a stable shared convention.

**Backend is 100% complete.** The API already processes `?role=deputado` or `?role=senador` through the full stack. Any invalid value returns a 400 with RFC 7807 error. The `idx_politicians_role` index makes the WHERE clause efficient.

**Phase 3 (State Filter) can run in parallel** in a separate git worktree. It follows identical patterns: same page changes, same Suspense wrapping, different component (`StateFilter` with 27 UF options + "Todos os estados"). Phase 3 should NOT start until this plan's Task 3 is merged (pagination link updates must be coordinated).
