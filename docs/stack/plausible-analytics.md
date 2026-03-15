# Plausible Analytics — next-plausible Integration Guide

> Researched: 2026-03-15
> Package version: next-plausible@3.12.5
> Sources: GitHub source (4lejandrito/next-plausible), Plausible data policy docs, npm registry

---

## 1. Package Version and Peer Dependencies

**Current version:** `3.12.5` (npm `latest` tag)

**Peer dependencies (from `package.json`):**

```json
{
  "next": "^11.1.0 || ^12.0.0 || ^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0",
  "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0",
  "react-dom": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
}
```

Next.js 15 and React 19 are **explicitly supported**. Next.js 15 support was added in v3.12.4 (Nov 2024, issue #134). No breaking changes were introduced for Next.js 15.

---

## 2. PlausibleProvider — Server or Client Component?

`PlausibleProvider` is a **Server Component** (no `'use client'` directive). It renders two `<Script>` elements from `next/script` server-side. The children are passed through unchanged.

The `usePlausible()` hook, however, is a **Client Component hook** — it calls `useCallback` and accesses `window.plausible`. Any component using `usePlausible()` must be a Client Component (`'use client'`).

### App Router layout integration

Place `PlausibleProvider` in `apps/web/src/app/layout.tsx`. Since it is a Server Component, no wrapper is needed:

```tsx
// apps/web/src/app/layout.tsx
import PlausibleProvider from 'next-plausible'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <PlausibleProvider domain="seudominio.com.br">
          {children}
        </PlausibleProvider>
      </body>
    </html>
  )
}
```

---

## 3. PlausibleProvider Props (full TypeScript signature)

Sourced from `lib/PlausibleProvider.tsx`:

| Prop                 | Type                                                                                        | Default                | Description                                              |
|----------------------|---------------------------------------------------------------------------------------------|------------------------|----------------------------------------------------------|
| `domain`             | `string`                                                                                    | required               | The site domain to monitor                               |
| `customDomain`       | `string`                                                                                    | `https://plausible.io` | For self-hosted instances                                |
| `children`           | `ReactNode \| ReactNode[]`                                                                  | —                      | Page content                                             |
| `manualPageviews`    | `boolean`                                                                                   | —                      | Disables automatic pageview events                       |
| `pageviewProps`      | `boolean \| { [key: string]: string }`                                                      | —                      | Custom props for pageviews (auto-prefixed with `event-`) |
| `revenue`            | `boolean`                                                                                   | —                      | Enable ecommerce revenue tracking                        |
| `hash`               | `boolean`                                                                                   | —                      | Hash-based routing support                               |
| `trackLocalhost`     | `boolean`                                                                                   | —                      | Track on localhost                                       |
| `trackOutboundLinks` | `boolean`                                                                                   | —                      | Track outbound link clicks                               |
| `trackFileDownloads` | `boolean`                                                                                   | —                      | Track file download events                               |
| `taggedEvents`       | `boolean`                                                                                   | —                      | Custom events via HTML data attributes                   |
| `exclude`            | `string`                                                                                    | —                      | Pages to exclude from tracking                           |
| `selfHosted`         | `boolean`                                                                                   | —                      | Set `true` for self-hosted Plausible                     |
| `enabled`            | `boolean`                                                                                   | see below              | Explicit control over script rendering                   |
| `integrity`          | `string`                                                                                    | —                      | SRI hash value for the script                            |
| `scriptProps`        | `React.DetailedHTMLProps<React.ScriptHTMLAttributes<HTMLScriptElement>, HTMLScriptElement>` | —                      | Override any `<script>` element attribute                |

---

## 4. `enabled` Prop — Exact Logic

From the source (not documentation — read directly from `lib/PlausibleProvider.tsx`):

```ts
const {
  enabled = process.env.NODE_ENV === 'production' &&
    (!process.env.NEXT_PUBLIC_VERCEL_ENV ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'),
} = props
```

**Behavior:**

- If `enabled` is not passed: script renders ONLY when `NODE_ENV === 'production'` AND either `NEXT_PUBLIC_VERCEL_ENV` is not set OR it equals `'production'`.
- This means Vercel **preview deployments** (`NEXT_PUBLIC_VERCEL_ENV === 'preview'`) will NOT load the script by default — which is the desired behavior.
- CI environments where `NODE_ENV !== 'production'` will never load the script.
- To force-disable: pass `enabled={false}` explicitly.
- To force-enable in development (e.g., testing tracking locally): pass `enabled={true}` with `trackLocalhost`.

### CI/test disabling

No extra configuration needed. The default `enabled` logic already prevents script injection when `NODE_ENV !== 'production'`. In Vitest/Jest, `NODE_ENV` is `'test'`, so the script is never injected.

---

## 5. `usePlausible()` Hook — TypeScript API

Sourced from `lib/usePlausible.ts`:

```ts
// From lib/usePlausible.ts
type Props = Record<string, unknown> | never
type EventOptions<P extends Props> = {
  props: P
  revenue?: { currency: string; amount: number }
  u?: string          // custom URL override
  callback?: VoidFunction
}
type Events = { [K: string]: Props }
```

### Untyped usage (fire-and-forget)

```tsx
'use client'
import { usePlausible } from 'next-plausible'

export function SearchButton() {
  const plausible = usePlausible()

  return (
    <button onClick={() => plausible('Search')}>
      Buscar
    </button>
  )
}
```

### Typed events (recommended for strict TypeScript)

```tsx
'use client'
import { usePlausible } from 'next-plausible'

// Define your event map — use `never` for events with no props
interface PahEvents {
  Search: { query: string; resultCount: number }
  FilterApplied: { filterType: 'role' | 'state'; value: string }
  ProfileViewed: { slug: string; role: string }
  ScoreExpanded: never   // no props
}

export function SearchBar() {
  const plausible = usePlausible<PahEvents>()

  const handleSearch = (query: string, resultCount: number) => {
    plausible('Search', { props: { query, resultCount } })
  }

  const handleScoreExpand = () => {
    plausible('ScoreExpanded')  // TypeScript enforces no props argument
  }
}
```

**Key gotcha:** Events typed as `never` must be called with no second argument. Events with props require the `{ props: { ... } }` wrapper — NOT a flat object.

**Key gotcha:** `usePlausible()` without a type parameter is typed as `any` (untyped). Pass `<PahEvents>` to enforce the event map at compile time.

---

## 6. Proxy Configuration — `withPlausibleProxy`

### How it works (from source)

`withPlausibleProxy` adds Next.js rewrites that proxy:

- `GET /js/script.js` → `https://plausible.io/js/script.js`
- `POST /proxy/api/event` → `https://plausible.io/api/event`

It also sets environment variables (prefixed `next_plausible_`) that `PlausibleProvider` reads at render time to inject the correct `data-api` and `src` attributes automatically.

### `next.config.ts` setup

```ts
// apps/web/next.config.ts
import { withPlausibleProxy } from 'next-plausible'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ... your existing config
}

export default withPlausibleProxy()(nextConfig)
```

**No changes to `PlausibleProvider` are needed** — the proxy options are passed via env vars at build time.

### Optional proxy customization

```ts
export default withPlausibleProxy({
  subdirectory: 'stats',         // /stats/js/script.js instead of /js/script.js
  scriptName: 'plausible',       // custom filename
  customDomain: 'https://analytics.mysite.com',  // self-hosted
})(nextConfig)
```

### Generated rewrites (default, no options)

The proxy generates rewrites for every combination of script modifiers (outbound-links, file-downloads, etc.) plus the API event endpoint. With default options:

- Script: `source: /js/script.js` → `destination: https://plausible.io/js/script.js`
- API: `source: /proxy/api/event` → `destination: https://plausible.io/api/event`

**Important limitation:** Proxy requires `next start` (Node.js server). It does NOT work with `output: 'export'` (static export). Vercel deployments work fine.

### Compatibility with existing rewrites

`withPlausibleProxy` merges into `afterFiles` if your config already has rewrites. No conflict.

---

## 7. SRI Hash (`integrity` prop)

Plausible does **not** publish an official SRI hash for its hosted script (`https://plausible.io/js/script.js`). The script is updated regularly and the hash would become stale.

`next-plausible` exposes the `integrity` prop that maps directly to the `<script integrity="...">` attribute. If you set it, the library also automatically adds `crossOrigin="anonymous"` (required for SRI to work):

```tsx
// From PlausibleProvider source:
integrity={props.integrity}
crossOrigin={props.integrity ? 'anonymous' : undefined}
```

**When using `withPlausibleProxy`:** The script is served from your own domain (`/js/script.js`). In that case, SRI is **not needed** from a security standpoint because the resource origin is your own server. The proxy approach is the recommended alternative to SRI for hosted Plausible.

**If you need SRI for a self-hosted instance:** Compute the hash yourself:

```bash
curl -s https://your-plausible.example.com/js/plausible.js | openssl dgst -sha384 -binary | openssl base64 -A | xargs -I{} echo "sha384-{}"
```

Then pass it as `integrity="sha384-..."`.

**RNF-SEC-016 assessment:** Since this project will use `withPlausibleProxy`, SRI on the external Plausible script is not applicable. The risk is mitigated by the proxy itself (your server fetches from Plausible, your visitor fetches from you).

---

## 8. LGPD Compliance

From Plausible's official data policy (`https://plausible.io/data-policy`):

**What Plausible collects (aggregated, anonymous):**

- Page URLs (excluding most query parameters)
- HTTP referrer
- Browser and OS (derived from User-Agent string, not stored raw)
- Device type (desktop/mobile/tablet)
- Country/region/city (IP-derived, IP never stored)

**No cookies:** "We don't use cookies, we don't generate any persistent identifiers and we don't collect or store any personal or identifiable data."

**Unique visitor counting without cookies:** A daily-changing hash of IP + User-Agent + rotating salt. The raw IP is discarded immediately. The salt is deleted every 24 hours.

**LGPD / GDPR compliance:** Because no personal data is collected and no cookies are set, no cookie consent banner is required. Plausible explicitly states this applies to GDPR, CCPA, and PECR. Brazilian LGPD aligns with GDPR principles: no personal data = no consent requirement for analytics.

---

## 9. CSP Directives

### Without proxy (direct Plausible)

```
script-src 'self' https://plausible.io;
connect-src 'self' https://plausible.io;
```

### With `withPlausibleProxy` (recommended)

When the proxy is active, all requests go through your own domain:

```
script-src 'self';
connect-src 'self';
```

No external CSP exceptions needed. This is the strongest possible CSP configuration.

### Nonce + CSP open issue

There is an **unresolved open issue (#110)** in next-plausible: when using a nonce-based CSP (e.g., `script-src 'nonce-xxx'`), the `<link rel="preload">` that Next.js generates for the Plausible script does NOT receive the nonce attribute. This causes the preload to be CSP-blocked in strict nonce-only policies.

**Workaround (if using nonce-based CSP):** Add a hash-based allowance OR use a `unsafe-hashes` exception for the preload, OR disable script preloading for that specific script via `scriptProps={{ strategy: 'lazyOnload' }}`.

This does not affect hash-based CSP (`'sha256-...'`) or domain-allowlist CSP.

---

## 10. Known Issues and Gotchas

### Next.js 15 / React 19

- No known compatibility issues. Explicitly supported since v3.12.4.
- `PlausibleProvider` is a Server Component and does not use any deprecated React 18→19 APIs.

### Turbopack

- No Turbopack-specific issues found in the issue tracker.
- `withPlausibleProxy` modifies `rewrites` in `next.config.ts`, which is processed by both webpack and Turbopack builds identically.
- The `NEXT_PLAUSIBLE_DEBUG=true` env var can be set to log generated rewrites for troubleshooting.

### Vercel preview deployments

By default, `NEXT_PUBLIC_VERCEL_ENV === 'preview'` causes the script to be disabled automatically. This is intentional — preview deployments do not pollute analytics. No special configuration needed.

### `next build` without running API

`PlausibleProvider` is a Server Component and does not call your API at build time. No `.catch(() => [])` fallback needed for analytics.

### TypeScript strict mode

`usePlausible` is typed with `any` as a default. Always pass the event type parameter `usePlausible<YourEvents>()` to get compile-time enforcement. Without it, any event name and any props shape will pass type checking.

### `props` is optional (since v3.12.1)

PR #127 made `props` optional in `EventOptions`. Events with no props can now be called as `plausible('EventName')` instead of `plausible('EventName', { props: {} })`. Typed events with `never` enforce this automatically.

---

## 11. Complete Integration Example (App Router, TypeScript Strict)

### Installation

```bash
pnpm add next-plausible
```

### `apps/web/next.config.ts`

```ts
import { withPlausibleProxy } from 'next-plausible'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // existing config
}

export default withPlausibleProxy()(nextConfig)
```

### `apps/web/src/app/layout.tsx`

```tsx
import PlausibleProvider from 'next-plausible'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <PlausibleProvider
          domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? ''}
          trackOutboundLinks
        >
          {children}
        </PlausibleProvider>
      </body>
    </html>
  )
}
```

### `apps/web/src/lib/analytics.ts` (typed events)

```ts
// Centralize all tracked events here — one place to audit what is tracked
export interface PahAnalyticsEvents {
  // Search & discovery
  PoliticianSearched: { query: string; resultCount: number }
  RoleFilterApplied: { role: 'deputado' | 'senador' }
  StateFilterApplied: { state: string }
  // Profile
  ProfileViewed: { slug: string; role: string; state: string }
  ScoreComponentExpanded: { component: 'transparency' | 'legislative' | 'financial' | 'anticorruption' }
  // Navigation
  MethodologyPageViewed: never
  ExternalSourceClicked: { source: string }
}
```

### `apps/web/src/hooks/useAnalytics.ts` (Client Component hook)

```ts
'use client'
import { usePlausible } from 'next-plausible'
import type { PahAnalyticsEvents } from '@/lib/analytics'

export function useAnalytics() {
  return usePlausible<PahAnalyticsEvents>()
}
```

### Usage in a Client Component

```tsx
'use client'
import { useAnalytics } from '@/hooks/useAnalytics'

export function SearchBar() {
  const track = useAnalytics()

  const handleSearch = (query: string, resultCount: number) => {
    track('PoliticianSearched', { props: { query, resultCount } })
  }
}
```

### `.env.example` addition

```bash
# Plausible Analytics domain (matches the domain registered in Plausible dashboard)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=politicalauthority.com.br
```

---

## Sources

- GitHub repo: <https://github.com/4lejandrito/next-plausible>
- Source: `lib/PlausibleProvider.tsx`, `lib/usePlausible.ts`, `lib/withPlausibleProxy.ts`, `lib/common.ts`
- npm: <https://www.npmjs.com/package/next-plausible> (v3.12.5)
- Plausible data policy: <https://plausible.io/data-policy>
- Open nonce issue: <https://github.com/4lejandrito/next-plausible/issues/110>
- Next.js 15 support PR: <https://github.com/4lejandrito/next-plausible/issues/134>
