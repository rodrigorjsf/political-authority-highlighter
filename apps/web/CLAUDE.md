# Frontend Development Guide -- Political Authority Highlighter

# Stack: Next.js 15 (App Router) | React 19 | Tailwind CSS 4 | shadcn/ui

# Last Updated: 2026-03-07 | PRD Version: 1.1

## Core Principles

> Primary: Clean Code (Martin), The Pragmatic Programmer (Hunt/Thomas), SOLID Principles
> Secondary: 12-Factor App (environment config)

1. **Server Components by Default (Clean Architecture -- minimize client boundary)**: Every component is a React Server Component unless it needs browser interactivity (state, event handlers, browser APIs). This eliminates client-side JavaScript for data display pages, achieving LCP under 2 seconds. Mark a component as `'use client'` only when strictly necessary.

2. **URL as State (Pragmatic Programmer -- single source of truth)**: Filters, search queries, pagination cursors, and sorting are stored in URL search params. No client-side state management library (no Redux, Zustand, Jotai). The URL is the single source of truth for the application state. This makes every view shareable and bookmarkable.

3. **Political Neutrality in UI (Domain Rule DR-002)**: No party colors. No ranking labels like "best" or "worst." A neutral palette of grays, blues, and whites. Factual data presentation only. Scores displayed as numbers (72/100) without qualitative interpretation. This is not a design preference -- it is a product requirement.

4. **Accessibility First (WCAG 2.1 AA)**: Semantic HTML elements over div soup. All interactive elements keyboard navigable. Color contrast ratio minimum 4.5:1. aria-labels on icon-only buttons. Screen reader testing on key flows. Accessibility is not optional.

5. **Mobile-First Responsive Design**: Tailwind breakpoints start at 320px minimum viewport. Design for mobile first, enhance for desktop. Touch targets minimum 44x44px. No horizontal scrolling on any screen size.

6. **Frontend Design PRD Compliance (Non-Negotiable)**: Every component, page, or visual style change in `apps/web/` must comply with `docs/assets/frontend_design_prd.md`. This document is the authoritative source for design tokens, color palette (semantic roles with light/dark variants), typography (`Inter`/`Plus Jakarta Sans` for UI text; `JetBrains Mono` for scores and financial numbers), Bento Grid layout, component specifications (gauge charts, data tables, buttons), motion rules, and accessibility requirements. Before implementing any new page or component, consult the inspiration images in `docs/assets/inspirations/` and [Sloth UI](https://www.slothui.com/) for visual reference. **Run the `web-frontend-design` skill checklist before every UI PR.**

---

## Architecture Boundaries

### What the Frontend IS responsible for

- Rendering politician profiles, scores, rankings, and parliamentary activity
- SEO: metadata, Open Graph tags, JSON-LD structured data
- Search and filter UI with URL-based state
- Calling the backend API via typed fetch wrapper
- ISR (Incremental Static Regeneration) for politician pages
- Accessibility compliance (WCAG 2.1 AA)
- Performance optimization (Core Web Vitals)

### What the Frontend is NOT responsible for

- Data fetching from government sources (that is the pipeline)
- Score calculation or business logic (pre-computed by pipeline)
- Database access (the frontend calls the REST API)
- User authentication (no auth in MVP)
- Data mutation (all data is read-only from the API)

### Dependencies

- **Depends on**: Backend API (`/api/v1/*`), `packages/shared` (types, constants, utilities)
- **Must NOT depend on**: `packages/db`, `apps/api`, `apps/pipeline`

---

## File and Directory Conventions

```
apps/web/
+-- src/
|   +-- app/                                # Next.js App Router pages
|   |   +-- layout.tsx                      # Root layout (metadata, fonts, analytics)
|   |   +-- page.tsx                        # Home page (hero + top politicians)
|   |   +-- not-found.tsx                   # Custom 404 page
|   |   +-- error.tsx                       # Global error boundary
|   |   +-- loading.tsx                     # Root loading skeleton
|   |   +-- politicos/
|   |   |   +-- page.tsx                    # Politician listing with filters
|   |   |   +-- loading.tsx                 # Listing skeleton
|   |   |   +-- [slug]/
|   |   |       +-- page.tsx               # Politician profile (ISR)
|   |   |       +-- loading.tsx            # Profile skeleton
|   |   |       +-- projetos/page.tsx      # Bills tab
|   |   |       +-- votacoes/page.tsx      # Votes tab
|   |   |       +-- despesas/page.tsx      # Expenses tab
|   |   |       +-- patrimonio/page.tsx    # Assets tab
|   |   |       +-- historico/page.tsx     # Candidacy history tab
|   |   +-- ranking/page.tsx               # Score ranking page
|   |   +-- metodologia/page.tsx           # Scoring methodology (static)
|   |   +-- fontes/page.tsx                # Data sources status
|   |   +-- sobre/page.tsx                 # About the project
|   |   +-- api/
|   |       +-- revalidate/route.ts        # ISR revalidation webhook
|   +-- components/
|   |   +-- ui/                            # shadcn/ui primitives (Button, Card, Badge, etc.)
|   |   +-- layout/
|   |   |   +-- header.tsx                 # Site header with navigation
|   |   |   +-- footer.tsx                 # Site footer with links
|   |   |   +-- nav-link.tsx               # Active-state navigation link
|   |   |   +-- mobile-menu.tsx            # Responsive mobile menu ('use client')
|   |   +-- politician/
|   |   |   +-- politician-card.tsx        # Card for listing pages (Server Component)
|   |   |   +-- politician-profile.tsx     # Full profile header
|   |   |   +-- score-breakdown.tsx        # 4-component score visualization
|   |   |   +-- score-badge.tsx            # Compact score display (72/100)
|   |   |   +-- exclusion-notice.tsx       # Silent exclusion message
|   |   |   +-- party-badge.tsx            # Party name (no party colors!)
|   |   |   +-- state-badge.tsx            # State abbreviation badge
|   |   +-- filters/
|   |   |   +-- search-bar.tsx             # Full-text search input ('use client')
|   |   |   +-- state-filter.tsx           # State dropdown filter ('use client')
|   |   |   +-- party-filter.tsx           # Party dropdown filter ('use client')
|   |   |   +-- role-filter.tsx            # Role toggle (deputado/senador) ('use client')
|   |   |   +-- sort-select.tsx            # Sort order selector ('use client')
|   |   |   +-- active-filters.tsx         # Display and clear active filters
|   |   +-- data/
|   |   |   +-- bill-list.tsx              # Paginated bill table
|   |   |   +-- vote-list.tsx              # Paginated vote table
|   |   |   +-- expense-chart.tsx          # Expense visualization ('use client')
|   |   |   +-- expense-table.tsx          # Expense detail table
|   |   |   +-- asset-timeline.tsx         # Asset declaration history
|   |   |   +-- candidacy-timeline.tsx     # Electoral history timeline
|   |   |   +-- source-status-card.tsx     # Data freshness indicator
|   |   +-- seo/
|   |       +-- json-ld.tsx                # Structured data component
|   |       +-- og-image.tsx               # Dynamic OG image (edge runtime)
|   +-- lib/
|   |   +-- api-client.ts                  # Typed fetch wrapper for backend API
|   |   +-- api-types.ts                   # Response types mirroring API schemas
|   |   +-- seo.ts                         # Metadata generation helpers
|   |   +-- utils.ts                       # UI utilities (formatCurrency, formatDate)
|   |   +-- constants.ts                   # UI constants (breakpoints, page sizes)
|   +-- styles/
|       +-- globals.css                    # Tailwind directives and custom properties
+-- public/
|   +-- og/                                # Static OpenGraph fallback images
|   +-- icons/                             # Favicon, PWA icons
+-- e2e/
|   +-- politician-search.spec.ts          # Search and filter flow
|   +-- politician-profile.spec.ts         # Profile page rendering
|   +-- ranking.spec.ts                    # Ranking page
|   +-- accessibility.spec.ts              # aXe-core automated checks
+-- next.config.ts
+-- tailwind.config.ts
+-- package.json
+-- vitest.config.ts
```

### File Naming Conventions

| File Type        | Pattern                                          | Example                     |
| ---------------- | ------------------------------------------------ | --------------------------- |
| Page             | `page.tsx` (Next.js convention)                  | `app/politicos/page.tsx`    |
| Layout           | `layout.tsx`                                     | `app/layout.tsx`            |
| Loading          | `loading.tsx`                                    | `app/politicos/loading.tsx` |
| Error            | `error.tsx`                                      | `app/error.tsx`             |
| Server Component | `kebab-case.tsx` (no prefix)                     | `politician-card.tsx`       |
| Client Component | `kebab-case.tsx` (with `'use client'` directive) | `search-bar.tsx`            |
| Utility module   | `kebab-case.ts`                                  | `api-client.ts`             |
| Test             | `*.test.tsx` (co-located) or `e2e/*.spec.ts`     | `score-breakdown.test.tsx`  |
| CSS module       | Not used -- Tailwind only                        | --                          |

---

## Naming Conventions

### Components

```typescript
// PascalCase for component names, descriptive of their content
export function PoliticianCard({ politician }: PoliticianCardProps) { ... }
export function ScoreBreakdown({ score }: ScoreBreakdownProps) { ... }
export function ExclusionNotice() { ... }

// Props interface: ComponentName + Props
interface PoliticianCardProps {
  politician: PoliticianSummary
}

interface ScoreBreakdownProps {
  score: IntegrityScore
  showMethodologyLink?: boolean
}

// Enums for constant values (RF-002, RF-013)
export enum PoliticalRole {
  DEPUTADO = 'deputado',
  SENADOR = 'senador',
}

export enum DataSource {
  CAMARA = 'camara',
  SENADO = 'senado',
  TRANSPARENCIA = 'transparencia',
  TSE = 'tse',
  TCU = 'tcu',
  CGU = 'cgu',
}
```

### Pages (App Router)

```typescript
// Default export, async for server data fetching
export default async function PoliticianProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const politician = await fetchPolitician(slug)
  // ...
}

// Metadata generation
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const politician = await fetchPolitician(slug)
  return {
    title: `${politician.name} -- Political Authority Highlighter`,
    description: `Integrity profile and score for ${politician.name} (${politician.party}-${politician.state})`,
  }
}
```

### API Client Functions

```typescript
// Verb + resource, matching API endpoints
async function fetchPoliticians(filters: PoliticianFilters): Promise<PoliticianListResponse>
async function fetchPoliticianBySlug(slug: string): Promise<PoliticianResponse>
async function fetchPoliticianBills(slug: string, cursor?: string): Promise<BillListResponse>
async function fetchScoreRanking(limit?: number): Promise<RankingResponse>
async function fetchSourcesStatus(): Promise<SourceStatusResponse[]>
```

---

## Code Standards

### Formatting Rules (CLAUDE.md)

- No semicolons (enforced)
- Single quotes (enforced)
- No unnecessary curly braces (enforced)
- 2-space indentation
- Import order: external → internal → types

### Server Components vs Client Components

**Rule**: Start with Server Components. Only add `'use client'` when the component needs:

- `useState`, `useReducer`, `useEffect`, `useRef`
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `document`, `localStorage`)
- Third-party client-only libraries (chart libraries)

```typescript
// GOOD: Server Component (default) -- fetches data on the server
export default async function PoliticianProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const politician = await fetchPoliticianBySlug(slug)

  if (!politician) notFound()

  return (
    <main>
      <PoliticianProfile politician={politician} />
      <ScoreBreakdown score={politician.score} />
    </main>
  )
}

// GOOD: Client Component only because it needs interactivity
'use client'

import { useSearchParams, useRouter } from 'next/navigation'

export function SearchBar() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('search') ?? '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (query) params.set('search', query)
    else params.delete('search')
    router.push(`/politicos?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} role="search">
      <label htmlFor="search-input" className="sr-only">
        Search politicians
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name..."
        className="..."
      />
    </form>
  )
}

// BAD: Using useEffect to fetch data that could be fetched on the server
'use client'
export function PoliticianList() {
  const [politicians, setPoliticians] = useState([])
  useEffect(() => {
    fetch('/api/v1/politicians').then(r => r.json()).then(setPoliticians)
  }, [])
  // This is wrong! Use a Server Component with async data fetching.
}
```

### ISR (Incremental Static Regeneration)

```typescript
// app/politicos/[slug]/page.tsx
// Politician profiles use ISR with on-demand revalidation

export const revalidate = 3600 // Revalidate at most every 1 hour

// Pre-generate top 100 politician pages at build time
export async function generateStaticParams() {
  const ranking = await fetchScoreRanking(100)
  return ranking.data.map((p) => ({ slug: p.slug }))
}

export default async function PoliticianProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const politician = await fetchPoliticianBySlug(slug)
  if (!politician) notFound()

  return <PoliticianProfile politician={politician} />
}
```

### ISR Revalidation Webhook

```typescript
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-revalidate-token')
  if (token !== process.env.VERCEL_REVALIDATE_TOKEN) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { tag } = await request.json()
  revalidateTag(tag)
  return NextResponse.json({ revalidated: true })
}
```

### Functions and Methods

- **Maximum 30 lines** per function/component render body.
- **Extract sub-components** when JSX nesting exceeds 3 levels.
- **Co-locate data fetching** in page files (Server Components), not in deeply nested components.
- **No business logic in components** -- use utility functions from `lib/` or `packages/shared/`.
- **Use object destructuring** where possible for cleaner code.

```typescript
// GOOD: Destructured props
export function PoliticianCard({ politician: { name, party, state } }: PoliticianCardProps) {
  return <div>{name} ({party}-{state})</div>
}
```

### ISR (Incremental Static Regeneration)

```typescript
// app/error.tsx -- Global error boundary
'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">An unexpected error occurred</h1>
      <p className="text-muted-foreground">
        We are working to resolve this issue. Please try again later.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        Try again
      </button>
    </main>
  )
}

// app/not-found.tsx -- Custom 404
export default function NotFound() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        The politician or page you are looking for does not exist.
      </p>
      <Link href="/politicos" className="text-primary underline">
        View all politicians
      </Link>
    </main>
  )
}
```

### Comments Policy

- **Do not comment** what a component renders -- JSX is self-documenting.
- **Do comment**: non-obvious accessibility decisions, ISR/caching strategies, political neutrality enforcement rationale.
- **JSDoc required** on exported utility functions in `lib/` and shared component props.

---

## Typed API Client

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ProblemDetail,
  ) {
    super(body.title)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(path: string, options?: RequestInit & { next?: NextFetchRequestConfig }): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json()
    throw new ApiError(response.status, body)
  }

  return response.json() as Promise<T>
}

// Typed endpoint functions
export async function fetchPoliticians(
  filters: PoliticianFilters = {},
): Promise<PoliticianListResponse> {
  const params = new URLSearchParams()
  if (filters.state) params.set('state', filters.state)
  if (filters.party) params.set('party', filters.party)
  if (filters.role) params.set('role', filters.role)
  if (filters.search) params.set('search', filters.search)
  if (filters.cursor) params.set('cursor', filters.cursor)
  if (filters.limit) params.set('limit', String(filters.limit))

  return apiFetch<PoliticianListResponse>(
    `/politicians?${params.toString()}`,
    { next: { revalidate: 300, tags: ['politicians'] } },
  )
}

export async function fetchPoliticianBySlug(
  slug: string,
): Promise<PoliticianResponse> {
  return apiFetch<PoliticianResponse>(
    `/politicians/${encodeURIComponent(slug)}`,
    { next: { revalidate: 3600, tags: [`politician-${slug}`] } },
  )
}
```

---

## UI Conventions

> **Design Authority**: The canonical design token set, typography rules, component specs, and
> responsiveness requirements live in `docs/assets/frontend_design_prd.md`. The color palette and
> layout patterns below are a working summary — when there is any conflict, the PRD is authoritative.
> For visual reference, consult `docs/assets/inspirations/` and [Sloth UI](https://www.slothui.com/).

### Tailwind CSS

- Use Tailwind utility classes exclusively. No custom CSS except for Tailwind `@layer` extensions in `globals.css`.
- Use `cn()` helper (from shadcn/ui `lib/utils`) for conditional class merging.
- Use CSS custom properties defined in `globals.css` for the design system color tokens.

### shadcn/ui Components

- Install components via `npx shadcn@latest add <component>`.
- Components live in `src/components/ui/` and are customized there.
- Never import from `@shadcn/ui` directly -- always from local `components/ui/`.

### Color Palette (Political Neutrality)

```css
/* globals.css -- neutral palette, NO party colors */
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --primary: 221 83% 53%;        /* Blue -- neutral, informational */
  --primary-foreground: 210 40% 98%;
  --accent: 210 40% 96%;
  --destructive: 0 84% 60%;      /* Red -- used ONLY for errors, never for politicians */
  --border: 214 32% 91%;
  --ring: 221 83% 53%;
}
```

**Hard rules for color usage:**

- NO red/green for "bad"/"good" politicians. Use the neutral blue scale for score visualization.
- Score visualization uses a single-hue gradient (light blue to dark blue) or a neutral gray scale.
- Party names displayed as text in neutral badges. Never in party-branded colors.
- The `destructive` color is only for form validation errors and system error states.

### Score Visualization

```typescript
// components/politician/score-breakdown.tsx
// Score displayed numerically, never with qualitative labels

export function ScoreBreakdown({ score }: { score: IntegrityScore }) {
  return (
    <div className="grid grid-cols-2 gap-4" role="list" aria-label="Score breakdown">
      <ScoreItem
        label="Transparency"
        value={score.transparency}
        maxValue={25}
      />
      <ScoreItem
        label="Legislative Activity"
        value={score.legislative}
        maxValue={25}
      />
      <ScoreItem
        label="Financial Regularity"
        value={score.financial}
        maxValue={25}
      />
      <ScoreItem
        label="Anti-corruption"
        value={score.anticorruption}
        maxValue={25}
      />
    </div>
  )
}

// GOOD: Factual, numerical display
function ScoreItem({ label, value, maxValue }: { label: string; value: number; maxValue: number }) {
  const percentage = (value / maxValue) * 100
  return (
    <div role="listitem">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div
          className="h-2 flex-1 rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={maxValue}
          aria-label={`${label}: ${value} out of ${maxValue}`}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-medium tabular-nums">{value}/{maxValue}</span>
      </div>
    </div>
  )
}

// BAD: Qualitative, biased labels
function ScoreItem({ value }) {
  const label = value > 20 ? "Excellent" : value > 10 ? "Needs improvement" : "Poor"
  return <span className={value > 20 ? "text-green-600" : "text-red-600"}>{label}</span>
}
```

### Silent Exclusion Display

```typescript
// components/politician/exclusion-notice.tsx
/**
 * Displays a factual notice when a politician's anticorruption score is 0.
 * Per DR-001: shows NO details about which database, which record, or when.
 * Only acknowledges that anti-corruption data affected the score.
 */
export function ExclusionNotice() {
  return (
    <div
      className="rounded-md border border-border bg-muted p-4"
      role="note"
      aria-label="Anti-corruption information notice"
    >
      <p className="text-sm text-muted-foreground">
        Information from public anti-corruption databases affected this component of the score.
        For details, consult the{' '}
        <a
          href="https://www.portaltransparencia.gov.br"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Portal da Transparencia
        </a>.
      </p>
    </div>
  )
}
```

---

## State Management

**Rule**: No client-side state management libraries. The URL is the single source of truth.

### URL Search Params for Filters

```typescript
// app/politicos/page.tsx -- Server Component reads URL params directly
export default async function PoliticianListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const filters: PoliticianFilters = {
    state: typeof params.state === 'string' ? params.state : undefined,
    party: typeof params.party === 'string' ? params.party : undefined,
    role: typeof params.role === 'string' ? params.role : undefined,
    search: typeof params.search === 'string' ? params.search : undefined,
    cursor: typeof params.cursor === 'string' ? params.cursor : undefined,
  }

  const result = await fetchPoliticians(filters)

  return (
    <main>
      <h1>Politicians</h1>
      <FilterBar currentFilters={filters} />
      <PoliticianGrid politicians={result.data} />
      {result.cursor && <LoadMoreButton cursor={result.cursor} />}
    </main>
  )
}
```

### Client-side filter interaction

```typescript
// components/filters/state-filter.tsx
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const BRAZILIAN_STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'] as const

export function StateFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  function handleStateChange(state: string) {
    const params = new URLSearchParams(searchParams)
    if (state) params.set('state', state)
    else params.delete('state')
    params.delete('cursor') // Reset pagination on filter change
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={searchParams.get('state') ?? ''}
      onChange={(e) => handleStateChange(e.target.value)}
      aria-label="Filter by state"
      className="rounded-md border border-border px-3 py-2"
    >
      <option value="">All states</option>
      {BRAZILIAN_STATES.map((state) => (
        <option key={state} value={state}>{state}</option>
      ))}
    </select>
  )
}
```

---

## SEO

### Metadata per Page

```typescript
// app/politicos/[slug]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const politician = await fetchPoliticianBySlug(slug)

  if (!politician) {
    return { title: 'Politician not found' }
  }

  const title = `${politician.name} (${politician.party}-${politician.state}) -- Integrity Profile`
  const description = `Public integrity data for ${politician.name}: score ${politician.score?.overall ?? 'N/A'}/100. Bills, votes, expenses, and assets from official sources.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `https://autoridade-politica.com.br/politicos/${slug}`,
      images: [`/api/og?slug=${slug}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://autoridade-politica.com.br/politicos/${slug}`,
    },
  }
}
```

### JSON-LD Structured Data

```typescript
// components/seo/json-ld.tsx
export function PoliticianJsonLd({ politician }: { politician: PoliticianResponse }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: politician.name,
    jobTitle: politician.role === 'deputado' ? 'Federal Deputy' : 'Senator',
    memberOf: {
      '@type': 'Organization',
      name: politician.party,
    },
    url: `https://autoridade-politica.com.br/politicos/${politician.slug}`,
    image: politician.photoUrl,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
```

---

## Accessibility (WCAG 2.1 AA)

### Requirements

| Criterion           | Implementation                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Color contrast      | Minimum 4.5:1 for body text, 3:1 for large text. Verified with Tailwind defaults                         |
| Keyboard navigation | All interactive elements reachable via Tab. Focus ring visible (`ring-2 ring-primary`)                   |
| Screen readers      | Semantic HTML (`<main>`, `<nav>`, `<article>`, `<section>`, `<h1>`-`<h6>`), `aria-label` on icon buttons |
| Alt text            | All `<img>` tags have descriptive `alt` text. Politician photos: `alt="${name}, ${party}-${state}"`      |
| Form labels         | All `<input>` elements have associated `<label>` (visible or `sr-only`)                                  |
| Focus management    | After filter change, focus moves to results area. After navigation, focus on main content                |
| Motion              | Respect `prefers-reduced-motion` media query. Disable transitions when set                               |
| Language            | `<html lang="pt-BR">` on root layout                                                                     |

### Automated Testing

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('politician listing page has no accessibility violations', async ({ page }) => {
  await page.goto('/politicos')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('politician profile page has no accessibility violations', async ({ page }) => {
  await page.goto('/politicos/joao-silva-sp')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
```

---

## Performance Targets

| Metric      | Target                | Strategy                                                              |
| ----------- | --------------------- | --------------------------------------------------------------------- |
| LCP         | < 2.0s                | Server Components (zero client JS for data), ISR, Cloudflare CDN      |
| FID/INP     | < 100ms               | Minimal client-side JavaScript, no heavy hydration                    |
| CLS         | < 0.1                 | Fixed dimensions on images/cards, skeleton loaders match final layout |
| TTFB        | < 500ms               | Vercel edge, stale-while-revalidate ISR                               |
| Bundle size | < 100KB first load JS | Server Components, dynamic imports for charts                         |

### Performance Rules

1. **No `useEffect` for data that can be fetched on the server.** This is the most common mistake. If data comes from the API and does not depend on browser state, fetch it in a Server Component.

2. **Use `ms` package** for time-related configurations (e.g., `revalidate` times) and environment variables.

3. **Use `next/image`** for all images. Set explicit `width`/`height` to prevent CLS. Use `priority` for above-the-fold images.

4. **Dynamic import** interactive components (charts, maps) with `next/dynamic` and `{ ssr: false }` when they are below the fold.

5. **No barrel exports** (`index.ts` that re-exports everything from a directory). They prevent tree-shaking.

6. **Preload critical API calls** using React `cache()` function to deduplicate fetch calls within a single render.

```typescript
import { cache } from 'react'

// Deduplicated across multiple components in the same render
export const fetchPoliticianBySlug = cache(async (slug: string) => {
  return apiFetch<PoliticianResponse>(`/politicians/${encodeURIComponent(slug)}`)
})
```

---

## Responsive Design

### Breakpoints (Tailwind defaults)

| Name      | Min Width | Use Case                    |
| --------- | --------- | --------------------------- |
| (default) | 320px     | Mobile phones               |
| `sm`      | 640px     | Large phones, small tablets |
| `md`      | 768px     | Tablets                     |
| `lg`      | 1024px    | Laptops                     |
| `xl`      | 1280px    | Desktops                    |

### Layout Patterns

```typescript
// Politician listing: 1 column mobile, 2 on tablet, 3 on desktop
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {politicians.map((p) => <PoliticianCard key={p.id} politician={p} />)}
</div>

// Politician profile: stacked on mobile, side-by-side on desktop
<div className="flex flex-col gap-6 lg:flex-row">
  <div className="lg:w-1/3">
    <PoliticianProfile politician={politician} />
  </div>
  <div className="lg:w-2/3">
    <ScoreBreakdown score={politician.score} />
  </div>
</div>
```

---

## Testing Standards

| Type   | Tool                           | Location                | What to Test                           |
| ------ | ------------------------------ | ----------------------- | -------------------------------------- |
| Unit   | Vitest + React Testing Library | `*.test.tsx` co-located | Component rendering, utility functions |
| E2E    | Playwright                     | `e2e/*.spec.ts`         | Critical user flows, accessibility     |
| Visual | Playwright screenshots         | `e2e/*.spec.ts`         | Responsive layout, CLS verification    |

### Unit Test Example

```typescript
// components/politician/score-badge.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreBadge } from './score-badge'

describe('ScoreBadge', () => {
  it('displays the overall score as a fraction of 100', () => {
    render(<ScoreBadge score={72} />)
    expect(screen.getByText('72/100')).toBeInTheDocument()
  })

  it('has accessible label for screen readers', () => {
    render(<ScoreBadge score={72} />)
    expect(screen.getByLabelText('Integrity score: 72 out of 100')).toBeInTheDocument()
  })

  it('never displays qualitative labels', () => {
    render(<ScoreBadge score={95} />)
    expect(screen.queryByText(/excellent|good|great|best/i)).not.toBeInTheDocument()
  })
})
```

---

## What NEVER to Do

| Anti-Pattern                                                    | Why It Is Prohibited                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Use `useEffect` to fetch data that can be a Server Component    | Slower initial load, no SEO, unnecessary client JS. Fetch in Server Components                     |
| Use party colors (PT red, PSDB blue, etc.) in the UI            | Violates political neutrality (DR-002). Use only the neutral palette                               |
| Display qualitative score labels ("good," "bad," "corrupt")     | Violates political neutrality (DR-002). Display numbers only                                       |
| Import from `packages/db/` in any frontend code                 | Frontend accesses data through the API only. No database dependency                                |
| Use `'use client'` on components that do not need interactivity | Increases bundle size and disables server-side rendering benefits                                  |
| Use `any` type                                                  | Use proper TypeScript types. Parse API responses with type assertions backed by runtime validation |
| Create barrel exports (`index.ts` re-exporting all)             | Prevents tree-shaking, bloats bundles                                                              |
| Use `<img>` instead of `next/image`                             | Misses optimization (WebP, lazy loading, responsive sizes) and causes CLS                          |
| Hardcode API URLs                                               | Use `NEXT_PUBLIC_API_URL` environment variable                                                     |
| Skip `alt` text on images                                       | WCAG 2.1 AA violation. All images must have descriptive alt text                                   |
| Use inline styles instead of Tailwind                           | Breaks consistency and increases bundle size                                                       |
| Add client-side state management libraries (Redux, Zustand)     | URL search params are the state management solution. No additional library needed                  |
| Display exclusion record details (source, date, description)    | Violates silent exclusion (DR-001). Only show the neutral notice text                              |
| Use color to convey meaning without text alternative            | WCAG 2.1 AA violation. Always pair color with text labels                                          |
| Skip `loading.tsx` skeleton for data-fetching pages             | Causes poor UX and CLS. Every page with async data needs a skeleton                                |
| Store auth tokens in localStorage/sessionStorage                | Violates RNF-SEC-015. Use httpOnly Secure SameSite=Strict cookies when auth is implemented         |
| Add external `<script>` tags without SRI                        | Violates RNF-SEC-016. All external scripts must have `integrity` and `crossorigin` attributes      |
| Render unsanitized HTML from API with innerHTML                 | Violates RNF-SEC-013/DR-008. Government text rendered via JSX auto-escaping only                   |
| Import `@pah/db`, `pg`, or `drizzle-orm` in frontend            | Violates RNF-SEC-012/DR-008. Frontend accesses data through the API only                           |
| Use `NEXT_PUBLIC_` prefix for secrets/tokens                    | Violates RNF-SEC-012. Only `NEXT_PUBLIC_API_URL` is permitted                                      |
| Expose server error details in UI                               | Violates RNF-SEC-014. Error boundaries show generic messages; use `digest` for correlation         |
| Implement UI without reading `docs/assets/frontend_design_prd.md` | Design tokens, typography, dark mode variants, component specs, and motion rules are defined there — skip it and you will introduce visual inconsistencies |

---

## Dependency Rules

### Allowed External Packages

| Category      | Allowed Packages                                                         |
| ------------- | ------------------------------------------------------------------------ |
| Framework     | `next`, `react`, `react-dom`                                             |
| Styling       | `tailwindcss`, `tailwind-merge`, `clsx`, `class-variance-authority`      |
| UI Components | `@radix-ui/*` (via shadcn/ui), `lucide-react` (icons)                    |
| Charts        | `recharts` (if needed, dynamically imported)                             |
| Testing       | `vitest`, `@testing-library/react`, `playwright`, `@axe-core/playwright` |
| Utilities     | `packages/shared` (internal)                                             |

### Banned Packages

- No CSS-in-JS libraries (styled-components, emotion). Tailwind only.
- No client state libraries (Redux, Zustand, Jotai, Recoil).
- No form libraries (react-hook-form, formik). No forms in MVP (read-only platform).
- No animation libraries unless `prefers-reduced-motion` is handled.

---

## Security Baseline

### Input Sanitization

- Search queries sanitized before sending to API (trim, limit length to 100 chars).
- URL parameters parsed with explicit type checks.
- No `dangerouslySetInnerHTML` except for JSON-LD `<script>` tags with sanitized data.

### Environment Variables

- Only `NEXT_PUBLIC_*` variables are exposed to the browser bundle.
- `VERCEL_REVALIDATE_TOKEN` is server-only (used in API route handler).
- Never log environment variables.

### Content Security Policy

Configured via `next.config.ts` headers:

```typescript
// next.config.ts -- Security Headers (DR-008, RNF-SEC-011)
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`

const securityHeaders = [
  {
    key: 'Content-Security-Policy-Report-Only',
    value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

### Client Bundle Protection (RNF-SEC-012)

1. **`server-only` guard**: Every file in `packages/db/src/` imports `'server-only'`. If any Client Component transitively imports these modules, `next build` fails.
2. **ESLint restriction**: `apps/web/.eslintrc` forbids importing `@pah/db`, `pg`, `drizzle-orm`, `pg-boss` via `no-restricted-imports` rule.
3. **CI post-build scan**: After `next build`, `.next/static/chunks/` is scanned for forbidden patterns: `drizzle-orm`, `@pah/db`, `DATABASE_URL`, `CPF_ENCRYPTION_KEY`.
4. **Environment variable discipline**: Only `NEXT_PUBLIC_API_URL` may use the `NEXT_PUBLIC_` prefix. All other env vars are server-only.

### Error Sanitization (RNF-SEC-014)

- `error.tsx` boundaries display ONLY generic user-friendly messages
- The `digest` property on Next.js errors is used for server-side correlation
- `api-client.ts` catches `ApiError` and surfaces only the RFC 7807 `title` field to users
- Never render: stack traces, database table names, SQL queries, internal URLs, or raw error messages from the API

---

## Changelog

| Date       | PRD Version | Summary                                                                                                                   |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-28 | 1.0         | Initial frontend development guide                                                                                        |
| 2026-03-07 | 1.1         | Add Frontend Security First principle (DR-008), full CSP header, client bundle protection, error sanitization, SRI policy |
| 2026-03-15 | 1.2         | Add principle 6: Frontend Design PRD compliance (`docs/assets/frontend_design_prd.md`); add UI Conventions design authority note; add anti-pattern for skipping PRD; add Sloth UI as visual reference |
