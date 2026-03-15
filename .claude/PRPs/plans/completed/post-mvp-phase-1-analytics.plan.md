# Feature: Analytics LGPD-Compliant (Plausible) — Phase 1

## Summary

Instrument the entire platform with Plausible Analytics using `next-plausible@3.12.5` via the proxy approach (script served from same-origin), eliminating ad-blocker interference without violating the existing CSP. A shared typed `useAnalytics()` hook instruments 3 Client Components (SearchBar, RoleFilter, StateFilter) with custom events. `PlausibleProvider` wraps the root layout as a Server Component. All analytics are disabled in CI and non-production environments automatically via `next-plausible`'s built-in `NODE_ENV` + `NEXT_PUBLIC_VERCEL_ENV` detection.

## User Story

As a product owner
I want to see real usage data in the Plausible dashboard
So that I can measure the PRD KPIs (≥ 3 pages/session, < 60% bounce rate) and prioritize future features with evidence

## Problem Statement

`apps/web/src/app/layout.tsx` has zero analytics instrumentation. No page views, no event tracking, no data on which filters users apply, which politicians get searched, or which profile tabs are visited. KPI measurement for the PRD is impossible.

## Solution Statement

Wrap `next.config.ts` with `withPlausibleProxy()` (adds Next.js rewrites serving the Plausible script from same-origin `/js/script.js`). Add `PlausibleProvider` to `layout.tsx` (Server Component — zero client bundle cost). Create a typed `useAnalytics()` wrapper hook with a `PahEvents` interface for strict TypeScript enforcement. Add the hook to 3 existing Client Components to fire custom events on meaningful user interactions. Profile tab clicks are auto-tracked as page views (different URLs = automatic Plausible page view events, no custom hook needed).

## Metadata

| Field            | Value                                               |
| ---------------- | --------------------------------------------------- |
| Type             | NEW_CAPABILITY                                      |
| Complexity       | LOW                                                 |
| Systems Affected | `apps/web`                                          |
| Dependencies     | `next-plausible@3.12.5`, Plausible Cloud account    |
| Estimated Tasks  | 8                                                   |

---

## UX Design

### Before State

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                              BEFORE STATE                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║   ┌───────────────┐         ┌───────────────┐         ┌───────────────┐   ║
║   │  User visits  │ ──────► │ types search  │ ──────► │ page renders  │   ║
║   │  /politicos   │         │  "Lula da S." │         │ with results  │   ║
║   └───────────────┘         └───────────────┘         └───────────────┘   ║
║                                                              │             ║
║                                                              ▼             ║
║                                                    ┌───────────────┐       ║
║                                                    │ VOID — no data│       ║
║                                                    │ captured      │       ║
║                                                    └───────────────┘       ║
║                                                                           ║
║   USER_FLOW: Visit → interact → leave → nothing recorded                  ║
║   PAIN_POINT: KPI measurement impossible; can't tell what works           ║
║   DATA_FLOW: Browser → Server → Response (no instrumentation layer)       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### After State

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                               AFTER STATE                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║   ┌───────────────┐         ┌───────────────┐         ┌───────────────┐   ║
║   │  User visits  │ ──────► │ types search  │ ──────► │ page renders  │   ║
║   │  /politicos   │         │  "Lula da S." │         │ with results  │   ║
║   └───────────────┘         └───────────────┘         └───────────────┘   ║
║         │                          │                         │             ║
║         ▼                          ▼                         │             ║
║   [page_view auto]         [busca_realizada]                 │             ║
║    via Plausible            {query: "lula..."}               │             ║
║                                    │                         │             ║
║                                    ▼                         ▼             ║
║                          ┌─────────────────────────────────────────┐       ║
║                          │  Plausible Dashboard (privacy-first)     │       ║
║                          │  • Pages/session: 2.1 (need ≥ 3)        │       ║
║                          │  • Bounce rate: 67% (need < 60%)         │       ║
║                          │  • Top search queries, popular filters    │       ║
║                          └─────────────────────────────────────────┘       ║
║                                                                           ║
║   USER_FLOW: Visit → interact → Plausible captures anonymously            ║
║   VALUE_ADD: Real KPI data; prioritize features with evidence             ║
║   DATA_FLOW: Browser → /js/script.js (proxy) → Plausible Cloud           ║
║   LGPD: Zero cookies, zero personal data, zero consent banner             ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location                              | Before            | After                              | User Impact    |
| ------------------------------------- | ----------------- | ---------------------------------- | -------------- |
| All pages                             | No tracking       | Automatic page_view on navigation  | Transparent    |
| `SearchBar` — after 300ms debounce    | No event          | `busca_realizada {query}`          | Transparent    |
| `RoleFilter` — on select change       | No event          | `filtro_aplicado {filtro, valor}`  | Transparent    |
| `StateFilter` — on select change      | No event          | `filtro_aplicado {filtro, valor}`  | Transparent    |
| Profile tabs (Link clicks)            | No tracking       | Auto page_view (different URL)     | Transparent    |
| CI / `next dev` / Vercel preview      | N/A               | Script not loaded (auto-disabled)  | No impact      |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File                                                          | Lines    | Why Read This                                              |
| -------- | ------------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| P0       | `apps/web/src/app/layout.tsx`                                 | all (30) | Pattern to WRAP — add PlausibleProvider inside body tag    |
| P0       | `apps/web/next.config.ts`                                     | all (46) | Pattern to WRAP — add withPlausibleProxy(), update CSP     |
| P0       | `apps/web/src/components/filters/search-bar.tsx`              | all (47) | Pattern to EXTEND — add usePlausible in debounce effect    |
| P0       | `apps/web/src/components/filters/role-filter.tsx`             | all (52) | Pattern to EXTEND — add usePlausible in handleChange       |
| P1       | `apps/web/src/components/filters/state-filter.tsx`            | all (77) | Pattern to EXTEND — same as role-filter                    |
| P1       | `apps/web/src/lib/api-client.ts`                              | 1-20     | Existing lib pattern to MIRROR for analytics-events.ts     |
| P2       | `.env.example`                                                | all      | Pattern for adding new env vars                            |

**External Documentation:**

| Source                                                                                  | Section              | Why Needed                                                          |
| --------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| [next-plausible v3.12.5 README](https://github.com/4lejandrito/next-plausible#readme)  | Proxy setup          | `withPlausibleProxy()` exact API, PlausibleProvider props           |
| [next-plausible usePlausible()](https://github.com/4lejandrito/next-plausible#readme)  | Custom events        | TypeScript generic `usePlausible<Events>()` API                     |
| [Plausible Data Policy](https://plausible.io/data-policy)                              | What is collected    | Confirm LGPD compliance (no cookies, no personal data)              |

---

## Patterns to Mirror

**LAYOUT_PROVIDER_PATTERN:**

```tsx
// SOURCE: apps/web/src/app/layout.tsx:20-30
// CURRENT PATTERN (no providers):
export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  )
}

// AFTER PATTERN (PlausibleProvider wraps children — stays Server Component):
import PlausibleProvider from 'next-plausible'

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <PlausibleProvider
        domain={process.env['NEXT_PUBLIC_PLAUSIBLE_DOMAIN'] ?? 'autoridade-politica.com.br'}
        enabled={process.env['NEXT_PUBLIC_PLAUSIBLE_ENABLED'] === 'true'}
        trackOutboundLinks
      >
        <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
      </PlausibleProvider>
    </html>
  )
}
```

**NEXT_CONFIG_WRAP_PATTERN:**

```typescript
// SOURCE: apps/web/next.config.ts:1-46
// CURRENT PATTERN:
const config: NextConfig = { ... }
export default config

// AFTER PATTERN (withPlausibleProxy wraps config object):
import { withPlausibleProxy } from 'next-plausible'
const config: NextConfig = { ... }
export default withPlausibleProxy()(config)
// withPlausibleProxy adds /js/script.js and /proxy/api/event rewrites in afterFiles.
// Does NOT interfere with existing headers() function.
// GOTCHA: PlausibleProvider must be rendered at least once for env vars to be read.
```

**CLIENT_HOOK_PATTERN (search-bar):**

```tsx
// SOURCE: apps/web/src/components/filters/search-bar.tsx:15-28
// CURRENT debounce effect:
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
}, [value, router, pathname])

// AFTER PATTERN (track inside debounce, after router.push):
const track = useAnalytics()

useEffect(() => {
  const timeout = setTimeout(() => {
    const params = new URLSearchParams(searchParamsRef.current.toString())
    if (value.length >= 2) {
      params.set('search', value)
      track('busca_realizada', { props: { query: value } })
    } else {
      params.delete('search')
    }
    params.delete('cursor')
    const qs = params.toString()
    router.push(qs !== '' ? `${pathname}?${qs}` : pathname)
  }, 300)
  return () => clearTimeout(timeout)
}, [value, router, pathname, track])
// GOTCHA: add `track` to the deps array — useAnalytics() returns a stable useCallback ref
```

**CLIENT_HOOK_PATTERN (filters):**

```tsx
// SOURCE: apps/web/src/components/filters/role-filter.tsx:17-30
// CURRENT handleChange:
const handleChange = useCallback(
  (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value !== '') {
      params.set('role', e.target.value)
    } else {
      params.delete('role')
    }
    params.delete('cursor')
    const qs = params.toString()
    router.push(qs !== '' ? `${pathname}?${qs}` : pathname)
  },
  [router, pathname, searchParams],
)

// AFTER PATTERN (track only on non-empty selection):
const track = useAnalytics()

const handleChange = useCallback(
  (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const { value } = e.target
    const params = new URLSearchParams(searchParams.toString())
    if (value !== '') {
      params.set('role', value)
      track('filtro_aplicado', { props: { filtro: 'cargo', valor: value } })
    } else {
      params.delete('role')
    }
    params.delete('cursor')
    const qs = params.toString()
    router.push(qs !== '' ? `${pathname}?${qs}` : pathname)
  },
  [router, pathname, searchParams, track],
)
// GOTCHA: add `track` to useCallback deps — same stable ref pattern
```

**ANALYTICS_HOOK_PATTERN (new file):**

```typescript
// NEW FILE: apps/web/src/lib/analytics-events.ts
// Mirrors pattern of apps/web/src/lib/api-client.ts (utility module in lib/)
import { usePlausible } from 'next-plausible'

// All custom events the platform tracks — add new events here
export interface PahEvents {
  busca_realizada: { query: string }
  filtro_aplicado: { filtro: 'cargo' | 'estado'; valor: string }
}

// Pre-typed wrapper — components import this instead of usePlausible directly
export function useAnalytics(): ReturnType<typeof usePlausible<PahEvents>> {
  return usePlausible<PahEvents>()
}
// GOTCHA: This is a Client hook — only import in 'use client' components
// GOTCHA: Return type must be explicit to satisfy noImplicitReturns rule
```

---

## Files to Change

| File                                              | Action | Justification                                              |
| ------------------------------------------------- | ------ | ---------------------------------------------------------- |
| `apps/web/package.json`                           | UPDATE | Add `next-plausible` to dependencies                       |
| `apps/web/src/lib/analytics-events.ts`            | CREATE | Typed `PahEvents` interface + `useAnalytics()` hook        |
| `apps/web/next.config.ts`                         | UPDATE | Wrap with `withPlausibleProxy()`, update CSP comment       |
| `apps/web/src/app/layout.tsx`                     | UPDATE | Add `PlausibleProvider` wrapping body                      |
| `.env.example`                                    | UPDATE | Add `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` and `NEXT_PUBLIC_PLAUSIBLE_ENABLED` |
| `apps/web/src/components/filters/search-bar.tsx`  | UPDATE | Add `useAnalytics()` + `busca_realizada` event             |
| `apps/web/src/components/filters/role-filter.tsx` | UPDATE | Add `useAnalytics()` + `filtro_aplicado` event             |
| `apps/web/src/components/filters/state-filter.tsx`| UPDATE | Add `useAnalytics()` + `filtro_aplicado` event             |

---

## NOT Building (Scope Limits)

- **Server-side analytics** — Plausible tracks client-side page views only; no server log analytics
- **E2E test for analytics events** — Plausible is disabled in test environments (`enabled=false`); testing the script injection itself is out of scope
- **Custom dashboard** — Plausible Cloud dashboard is the analytics UI; no in-app analytics display
- **Pagination events** — `paginacao_realizada` not in PRD scope; pagination links are Server Component `<Link>` elements with no client handler to attach to
- **outbound links custom naming** — `trackOutboundLinks` uses Plausible's built-in outbound link detection; no manual event needed

---

## Step-by-Step Tasks

### Task 1: INSTALL `next-plausible` in `apps/web`

- **ACTION**: ADD package dependency
- **IMPLEMENT**: Run `pnpm --filter @pah/web add next-plausible`
- **VALIDATES**: `apps/web/package.json` shows `"next-plausible": "^3.12.5"` (or current latest)
- **GOTCHA**: Must use `--filter @pah/web` to install in the correct workspace package, not root
- **VALIDATE**: `cat apps/web/package.json | grep next-plausible`

### Task 2: CREATE `apps/web/src/lib/analytics-events.ts`

- **ACTION**: CREATE new utility module
- **IMPLEMENT**: Define `PahEvents` interface and `useAnalytics()` wrapper hook
- **MIRROR**: `apps/web/src/lib/api-client.ts` — same `src/lib/` directory, same `kebab-case.ts` naming
- **EXACT CONTENT**:

```typescript
import { usePlausible } from 'next-plausible'

export interface PahEvents {
  busca_realizada: { query: string }
  filtro_aplicado: { filtro: 'cargo' | 'estado'; valor: string }
}

export function useAnalytics(): ReturnType<typeof usePlausible<PahEvents>> {
  return usePlausible<PahEvents>()
}
```

- **GOTCHA**: No `'use client'` directive needed in this file — the hook enforces client context at the call site
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — must compile cleanly

### Task 3: UPDATE `apps/web/next.config.ts`

- **ACTION**: WRAP config with `withPlausibleProxy()` and add import
- **MIRROR**: `apps/web/next.config.ts:1-46` — preserve all existing config (transpilePackages, images, headers)
- **CHANGES**:
  1. Add import at top: `import { withPlausibleProxy } from 'next-plausible'`
  2. Change final export from `export default config` to `export default withPlausibleProxy()(config)`
  3. Update CSP comment: the proxy means Plausible traffic routes through `'self'` — no external domain needed in CSP
- **GOTCHA**: `withPlausibleProxy()` is called as a factory (double invocation): `withPlausibleProxy()(config)` — the first `()` accepts proxy options (defaults are fine), the second `(config)` wraps your config
- **GOTCHA**: The existing `async headers()` function is NOT affected — `withPlausibleProxy` only modifies `rewrites`
- **GOTCHA**: CSP is currently in `Content-Security-Policy-Report-Only` (not enforced). The proxy approach means Plausible script/events use `'self'` origin — no CSP update required, but add a comment explaining this
- **VALIDATE**: `pnpm --filter @pah/web build` — must pass (Next.js reads rewrites at build time)

### Task 4: UPDATE `apps/web/src/app/layout.tsx`

- **ACTION**: ADD `PlausibleProvider` wrapping `<body>`
- **MIRROR**: `apps/web/src/app/layout.tsx:20-30`
- **EXACT CHANGES**:
  1. Add import: `import PlausibleProvider from 'next-plausible'`
  2. Wrap `<body>` with `<PlausibleProvider>` — provider goes INSIDE `<html>`, OUTSIDE `<body>`

```tsx
import type { Metadata } from 'next'
import PlausibleProvider from 'next-plausible'
import '../styles/globals.css'

// ... metadata export unchanged ...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <PlausibleProvider
        domain={process.env['NEXT_PUBLIC_PLAUSIBLE_DOMAIN'] ?? 'autoridade-politica.com.br'}
        enabled={process.env['NEXT_PUBLIC_PLAUSIBLE_ENABLED'] === 'true'}
        trackOutboundLinks
      >
        <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
      </PlausibleProvider>
    </html>
  )
}
```

- **GOTCHA**: `PlausibleProvider` is a Server Component in `next-plausible@3.12.5` — no `'use client'` needed in layout; this is correct App Router usage
- **GOTCHA**: `process.env['NEXT_PUBLIC_PLAUSIBLE_ENABLED'] === 'true'` means the script only loads when the env var is explicitly set to the string `'true'`. In CI (unset) → `false`. In production Vercel → `true`
- **GOTCHA**: `trackOutboundLinks` prop enables automatic tracking of clicks on external links — zero code required
- **VALIDATE**: `pnpm --filter @pah/web typecheck` — must compile

### Task 5: UPDATE `.env.example`

- **ACTION**: ADD two new environment variables in the Frontend section
- **MIRROR**: `.env.example:21-23` — existing `NEXT_PUBLIC_*` vars at the bottom of the Frontend block
- **ADD** after `NEXT_PUBLIC_BASE_URL`:

```bash
# Analytics (Plausible)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=autoridade-politica.com.br
# Set to 'true' only in production (Vercel). Leave unset in CI and development.
NEXT_PUBLIC_PLAUSIBLE_ENABLED=false
```

- **VALIDATE**: Visual inspection — new vars visible in file with correct placeholder values

### Task 6: UPDATE `apps/web/src/components/filters/search-bar.tsx`

- **ACTION**: ADD `useAnalytics()` hook call and fire `busca_realizada` event
- **MIRROR**: `apps/web/src/components/filters/search-bar.tsx:1-47`
- **CHANGES**:
  1. Add import: `import { useAnalytics } from '../../lib/analytics-events'`
  2. Add `const track = useAnalytics()` inside the component body (after existing hooks)
  3. Inside the `useEffect` debounce callback, add `track('busca_realizada', { props: { query: value } })` immediately after `params.set('search', value)` (line 19), inside the `if (value.length >= 2)` branch
  4. Add `track` to the `useEffect` dependency array

- **GOTCHA**: Event fires ONLY inside the `if (value.length >= 2)` branch — do not track empty/short queries
- **GOTCHA**: `track` must be in `useEffect` deps — `useAnalytics()` returns a stable `useCallback` ref, adding it does NOT cause extra effect runs
- **VALIDATE**: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web lint`

### Task 7: UPDATE `apps/web/src/components/filters/role-filter.tsx`

- **ACTION**: ADD `useAnalytics()` hook call and fire `filtro_aplicado` event
- **MIRROR**: `apps/web/src/components/filters/role-filter.tsx:12-52`
- **CHANGES**:
  1. Add import: `import { useAnalytics } from '../../lib/analytics-events'`
  2. Add `const track = useAnalytics()` inside the component body (after `const searchParams = useSearchParams()`)
  3. Inside `handleChange`, inside the `if (e.target.value !== '')` branch, add `track('filtro_aplicado', { props: { filtro: 'cargo', valor: e.target.value } })`
  4. Destructure `value` from `e.target` for cleaner access: `const { value } = e.target`
  5. Add `track` to the `useCallback` dependency array

- **GOTCHA**: Track only non-empty selections — clearing a filter (selecting "Todos os cargos") is not a `filtro_aplicado` event
- **GOTCHA**: `valor: e.target.value` is typed as `string` at the tracking call — `PahEvents['filtro_aplicado']['valor']` is `string`, which matches
- **VALIDATE**: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web lint`

### Task 8: UPDATE `apps/web/src/components/filters/state-filter.tsx`

- **ACTION**: ADD `useAnalytics()` hook call and fire `filtro_aplicado` event (same pattern as Task 7)
- **MIRROR**: `apps/web/src/components/filters/state-filter.tsx:42-54` — same `handleChange` pattern as RoleFilter
- **CHANGES**:
  1. Add import: `import { useAnalytics } from '../../lib/analytics-events'`
  2. Add `const track = useAnalytics()` inside the component body
  3. Inside `handleChange`, inside the `if (value !== '')` branch (note: StateFilter uses `value` local var, not `e.target.value` directly — read the actual source), add `track('filtro_aplicado', { props: { filtro: 'estado', valor: value } })`
  4. Add `track` to the `useCallback` dependency array

- **GOTCHA**: Read the actual `handleChange` in `state-filter.tsx` before editing — the destructuring pattern may differ slightly from RoleFilter
- **VALIDATE**: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web lint && pnpm --filter @pah/web build`

---

## Testing Strategy

### Unit Tests to Write

No new unit tests are required for this phase. The reasons:

1. `useAnalytics()` is a thin wrapper with no logic — testing it would be testing `next-plausible` itself
2. The custom events are fire-and-forget analytics calls — business correctness is verified by the Plausible dashboard, not unit tests
3. Plausible is disabled when `enabled=false` (which it is in all test environments) — mocking it in unit tests provides no value

**For future reference**, if unit tests for the analytics hook are needed:

```typescript
// Pattern: mock usePlausible at the module level
vi.mock('next-plausible', () => ({
  usePlausible: vi.fn().mockReturnValue(vi.fn()),
}))
```

### Edge Cases Checklist

- [ ] Plausible disabled in CI (`NODE_ENV=test`) → no network calls, no errors
- [ ] Plausible disabled in `next dev` (`NODE_ENV=development`, `NEXT_PUBLIC_PLAUSIBLE_ENABLED` unset) → script not injected
- [ ] Plausible disabled on Vercel preview deployments (`NEXT_PUBLIC_VERCEL_ENV=preview`) → script not injected
- [ ] `busca_realizada` not fired for queries shorter than 2 chars → `value.length >= 2` guard
- [ ] `filtro_aplicado` not fired when filter is cleared (selecting "All") → `value !== ''` guard
- [ ] Profile tab clicks → auto page_view via Plausible (different URLs), no custom event needed
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` not set → fallback `'autoridade-politica.com.br'` used

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm --filter @pah/web lint && pnpm --filter @pah/web typecheck
```

**EXPECT**: Exit 0, zero errors, zero warnings

### Level 2: UNIT_TESTS

```bash
pnpm --filter @pah/web test
```

**EXPECT**: All existing tests pass (no new tests for this phase)

### Level 3: FULL_SUITE (MANDATORY)

```bash
pnpm build && vercel build --yes
```

**EXPECT**: Both commands succeed. `next build` confirms Next.js rewrites work. `vercel build` simulates production Vercel environment.

### Level 4: MANUAL_VALIDATION

1. Set `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true` in `.env.local`
2. Run `pnpm --filter @pah/web dev`
3. Open DevTools → Network tab → filter by `script.js` and `event`
4. Visit `/politicos` — verify `GET /js/script.js` request appears (proxied from Plausible)
5. Type `"lula"` in search bar — verify `POST /proxy/api/event` with `name: "busca_realizada"` fires after 300ms
6. Select a state in StateFilter — verify `POST /proxy/api/event` with `name: "filtro_aplicado"` fires
7. Open DevTools → Application → Cookies — verify **zero** cookies set by Plausible script
8. Reset `.env.local` (remove or set `NEXT_PUBLIC_PLAUSIBLE_ENABLED=false`)

---

## Acceptance Criteria

- [ ] Page views visible in Plausible dashboard within 24h of production deployment
- [ ] `busca_realizada` custom event appears in Plausible Goals after a search is performed
- [ ] `filtro_aplicado` custom event appears in Plausible Goals after a filter is applied
- [ ] DevTools → Cookies: zero cookies set by any Plausible script
- [ ] Level 1–3 validation commands pass with exit 0
- [ ] No regressions in existing unit tests (`pnpm --filter @pah/web test`)
- [ ] `vercel build --yes` passes (mandatory pre-PR gate)
- [ ] Script NOT loaded in CI (unit test run, `NODE_ENV=test`)
- [ ] Script NOT loaded in `next dev` (unless `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true` explicitly set)

---

## Completion Checklist

- [ ] Task 1: `next-plausible` installed in `apps/web`
- [ ] Task 2: `analytics-events.ts` created with `PahEvents` and `useAnalytics()`
- [ ] Task 3: `next.config.ts` wrapped with `withPlausibleProxy()`
- [ ] Task 4: `layout.tsx` updated with `PlausibleProvider`
- [ ] Task 5: `.env.example` updated with Plausible env vars
- [ ] Task 6: `search-bar.tsx` fires `busca_realizada`
- [ ] Task 7: `role-filter.tsx` fires `filtro_aplicado`
- [ ] Task 8: `state-filter.tsx` fires `filtro_aplicado`
- [ ] Level 1: `pnpm lint && pnpm typecheck` passes
- [ ] Level 2: `pnpm test` passes (no regressions)
- [ ] Level 3: `pnpm build && vercel build --yes` passes

---

## Risks and Mitigations

| Risk                                                     | Likelihood | Impact | Mitigation                                                                              |
| -------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------- |
| Ad-blockers prevent Plausible script loading             | HIGH       | MEDIUM | `withPlausibleProxy()` serves script from same-origin — bypasses most ad-blockers       |
| `withPlausibleProxy` TypeScript type mismatch            | LOW        | LOW    | Package ships its own types; `next-plausible` peer dep is Next.js ≥ 14                  |
| `track` function in `useEffect` deps causes extra runs   | LOW        | LOW    | `usePlausible()` returns a stable `useCallback` ref — adding it to deps is safe         |
| Plausible script blocked by existing CSP                 | NONE       | NONE   | Proxy serves from `'self'` — already covered by `script-src 'self'` in current CSP     |
| RNF-SEC-016 (external script SRI) violation              | NONE       | NONE   | Proxy serves script from same-origin — not an external script; SRI not required          |
| `NEXT_PUBLIC_PLAUSIBLE_ENABLED` misconfigured in prod    | LOW        | MEDIUM | Fallback: analytics simply not tracked; no error thrown; set to `true` in Vercel env UI |

---

## Notes

**Why `enabled={process.env['NEXT_PUBLIC_PLAUSIBLE_ENABLED'] === 'true'}` instead of default?**

`next-plausible@3.12.5` default `enabled` logic: `NODE_ENV === 'production' && (!NEXT_PUBLIC_VERCEL_ENV || NEXT_PUBLIC_VERCEL_ENV === 'production')`. This default correctly disables in CI and preview deployments. However, the PRD explicitly requests an env var flag for clarity and control. Using an explicit env var also makes it easy to verify the configuration in the Vercel dashboard without reading source code.

**Why not add `NEXT_PUBLIC_PLAUSIBLE_ENABLED` to Vercel Secrets automatically?**

The Vercel project env var `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true` must be set manually in the Vercel dashboard (or via Vercel CLI) after this PR is merged. This is intentional — analytics should only activate when the Plausible Cloud account and domain are configured.

**Profile tabs tracking:**

The 5 profile tabs (`/politicos/[slug]/projetos`, `/votacoes`, `/despesas`, `/propostas`, `/atividades`) are Next.js `<Link>` elements navigating to distinct URLs. Plausible automatically fires a `pageview` event on each navigation. No custom event is required — Plausible will show per-tab traffic in its Pages report.

**PRD open question resolution (Phase 1):**

The open question "Plausible Cloud (€9/mês) vs. self-hosted" should be confirmed before creating a Plausible account. This plan assumes Plausible Cloud. Self-hosted would require updating `withPlausibleProxy({ customDomain: 'your-plausible-instance.com' })` — a one-line change.
