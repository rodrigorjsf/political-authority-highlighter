# Next.js 15 — Stack Documentation

> Version used: `next@^15.0.0` (15.5.12)
> Last updated: 2026-03-01
> Source: https://nextjs.org/docs

---

## searchParams in Server Components (Page Props)

In Next.js 15, `searchParams` is a **Promise** — it must be `await`ed.

```typescript
// app/politicos/page.tsx
interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PoliticosPage({ searchParams }: Props): Promise<React.JSX.Element> {
  const params = await searchParams
  const role = typeof params['role'] === 'string' ? params['role'] : undefined
  const cursor = typeof params['cursor'] === 'string' ? params['cursor'] : undefined
  // ...
}
```

**Reference:** https://nextjs.org/docs/app/api-reference/file-conventions/page

**Gotcha:** `params` from `searchParams` is `string | string[] | undefined` per key. Always narrow with `typeof params['key'] === 'string'` before using.

---

## useSearchParams — Suspense Requirement (ISR pages)

When a page uses `revalidate` (ISR) AND has a Client Component that calls `useSearchParams()`, you **must** wrap the Client Component in `<Suspense>`.

Without `<Suspense>`, `next build` fails with:

```
Error: useSearchParams() should be wrapped in a suspense boundary at page "/politicos".
```

**Reference:** https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout

### Pattern:

```typescript
// In the Server Component page:
import { Suspense } from 'react'
import { RoleFilter } from '../../components/filters/role-filter'

// ISR configured:
export const revalidate = 3600

// JSX — wrap Client Component in Suspense:
<Suspense fallback={<div className="h-10 w-48 animate-pulse rounded-md bg-muted" />}>
  <RoleFilter />
</Suspense>
```

**Reference:** https://nextjs.org/docs/app/api-reference/functions/use-search-params

---

## useSearchParams — Client Component Pattern

```typescript
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export function RoleFilter(): React.JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      // Always clone — searchParams is ReadonlyURLSearchParams
      const params = new URLSearchParams(searchParams.toString())
      if (e.target.value !== '') {
        params.set('role', e.target.value)
      } else {
        params.delete('role')
      }
      params.delete('cursor') // reset pagination on filter change
      const qs = params.toString()
      router.push(qs !== '' ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )
  // ...
}
```

**Key rules:**
- `useSearchParams()` returns `ReadonlyURLSearchParams` — use `.toString()` to clone into mutable `URLSearchParams`
- Always delete `cursor` on filter change (prevents stale pagination)
- Use `usePathname()` instead of hardcoding the path

---

## ISR (Incremental Static Regeneration)

```typescript
// Static revalidation
export const revalidate = 3600 // seconds

// On-demand revalidation via tag
export const revalidate = false  // never auto-revalidate; use tags only
```

Cache tags for on-demand revalidation:

```typescript
// In fetch call:
fetch(url, { next: { revalidate: 300, tags: ['politicians'] } })

// In webhook route (POST /api/revalidate):
import { revalidateTag } from 'next/cache'
revalidateTag('politicians')
```

**Reference:** https://nextjs.org/docs/app/building-your-application/caching#revalidating-1

---

## Import Conventions (TypeScript / Bundler)

In Next.js 15 with `moduleResolution: "bundler"`, do **NOT** use `.js` file extensions in imports:

```typescript
// CORRECT:
import { fetchPoliticians } from '../../lib/api-client'
import { PoliticianCard } from '../../components/politician/politician-card'

// WRONG (causes 'Module not found' at build):
import { fetchPoliticians } from '../../lib/api-client.js'
```

---

## Testing Next.js Components with Vitest

### Mocking next/image and next/link

```typescript
// vitest.setup.ts
import React from 'react'
import { vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) =>
    React.createElement('img', { src, alt, style }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))
```

### Mocking next/navigation

```typescript
// vitest.setup.ts — required for any component using useSearchParams/useRouter/usePathname
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/politicos',
}))
```

**Per-test override:**
```typescript
import { useSearchParams, useRouter } from 'next/navigation'

it('shows senador selected when role=senador in URL', () => {
  vi.mocked(useSearchParams).mockReturnValueOnce(new URLSearchParams('role=senador'))
  // ...
})
```

### vitest.config.ts for Next.js / React

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['src/**/*.integration.test.ts'],
  },
})
```

**Required devDependencies:**
- `@vitejs/plugin-react` — JSX transform for Vitest
- `jsdom` — browser environment simulation
- `@testing-library/react` — RTL render utilities
- `@testing-library/jest-dom` — custom matchers (toBeInTheDocument, etc.)

---

## App Router: params is also a Promise

```typescript
// Dynamic segment pages
export default async function PoliticianProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // ...
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  // ...
}
```

**Reference:** https://nextjs.org/docs/app/api-reference/file-conventions/page
