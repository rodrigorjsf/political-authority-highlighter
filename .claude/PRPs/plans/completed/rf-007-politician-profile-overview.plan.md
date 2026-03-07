# RF-007 — Politician Profile Overview Page

# Plan generated: 2026-03-04

# PRD reference: .claude/PRPs/prds/rf-mvp-remaining-features.prd.md § Phase 2

# Branch: feat/PAH-007-politician-profile-overview

---

## Objective

Implement the politician profile overview page at `/politicos/[slug]` with:

- ISR `revalidate = 3600`
- Photo (with fallback), name, party, state, role, tenure start, bio summary
- Overall integrity score + visual 4-component breakdown
- Placeholder tab navigation (bills, votes, proposals, agenda, expenses)
- New API endpoint `GET /api/v1/politicians/:slug`
- `generateStaticParams` pre-generating top-100 pages at build time
- `generateMetadata` for SEO

No new DB tables — joins existing `public_data.politicians` + `public_data.integrity_scores`.

---

## Acceptance Criteria (RF-007)

- [ ] `/politicos/[slug]` loads with politician name, party, state, role, photo (fallback to initials)
- [ ] Integrity score displayed as `NN/100`
- [ ] 4 sub-scores displayed (transparência 0-25, legislativa 0-25, financeira 0-25, anticorrupção 0-25)
- [ ] Score breakdown uses progress bars — no qualitative labels (DR-002)
- [ ] Tab navigation renders for: projetos, votações, despesas, propostas, atividades (placeholder for now)
- [ ] Unknown slug returns 404
- [ ] `revalidate = 3600` set on page
- [ ] `generateStaticParams` pre-generates top 100 pages
- [ ] `generateMetadata` returns correct title + description per politician
- [ ] `next build` succeeds
- [ ] `pnpm lint && pnpm typecheck && pnpm test` all pass

---

## Architecture Notes

### Data Flow

```
GET /politicos/[slug]
  → page.tsx (async Server Component)
    → fetchPoliticianBySlug(slug)       [api-client.ts]
      → GET /api/v1/politicians/:slug   [Fastify route]
        → politicianService.findBySlug  [service.ts]
          → repository.selectBySlug     [repository.ts]
            → SELECT from politicians JOIN integrity_scores WHERE slug = $1
```

### Domain Rules Enforced

- **DR-001 Silent Exclusion**: `exclusionFlag` boolean passed to component but details never shown; only neutral notice rendered when true
- **DR-002 Political Neutrality**: No qualitative score labels; progress bar uses neutral blue; no party colors
- **DR-005 CPF Never Exposed**: No CPF in profile endpoint; `api_reader` role has no access to internal schema

### Key Patterns

- Factory function DI: `createPoliticianRepository(db)` → `createPoliticianService(repo)` → wired in `app.ts`
- `FastifyPluginAsyncTypebox` — both `/politicians` and `/politicians/:slug` in same plugin
- Path params use `{ Params: T }` generic (different from `{ Querystring: T }`)
- `void reply.header(...)` to satisfy `no-floating-promises`
- `throw new NotFoundError('Politician', slug)` — `errorHandler` maps to RFC 7807 404
- `noUncheckedIndexedAccess`: use `.at(0)` not `[0]`, guard with `!== undefined`
- `eslint-disable @typescript-eslint/require-await` on plugin function (async but no top-level await)

---

## Tasks

### Task 1 — Add `PoliticianProfile` to shared types

**File:** `packages/shared/src/types/politician.ts`

Append after `ListPoliticiansResponse`:

```typescript
/**
 * Full profile of a politician as displayed on the profile overview page (RF-007).
 * Includes score breakdown and bio fields not present in PoliticianCard.
 * DR-001: exclusionFlag is a boolean only — no source, date, or record details.
 * DR-002: No qualitative labels derived from score values.
 */
export interface PoliticianProfile {
  id: string
  slug: string
  name: string
  party: string
  state: string
  role: 'deputado' | 'senador'
  photoUrl: string | null
  bioSummary: string | null
  tenureStartDate: string | null // ISO date string; null if not available
  overallScore: number           // 0-100 integer
  transparencyScore: number      // 0-25 integer
  legislativeScore: number       // 0-25 integer
  financialScore: number         // 0-25 integer
  anticorruptionScore: number    // 0 or 25 (binary per DR-001)
  exclusionFlag: boolean         // true = anticorruption affected; details never exposed
  methodologyVersion: string
}
```

**File:** `packages/shared/src/index.ts`

Add `PoliticianProfile` to the export list.

---

### Task 2 — Add TypeBox schemas for profile endpoint

**File:** `apps/api/src/schemas/politician.schema.ts`

Add after `PoliticianListResponseSchema`:

```typescript
// RF-007: GET /politicians/:slug
export const PoliticianParamsSchema = Type.Object({
  slug: Type.String({ minLength: 1, maxLength: 200 }),
})

export type PoliticianParams = Static<typeof PoliticianParamsSchema>

/**
 * Profile response schema.
 * DR-001: exclusionFlag is boolean only. No source/record details.
 * DR-002: No qualitative score labels in the schema.
 */
export const PoliticianProfileSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  slug: Type.String(),
  name: Type.String(),
  party: Type.String(),
  state: Type.String(),
  role: Type.String(),
  photoUrl: Type.Union([Type.String(), Type.Null()]),
  bioSummary: Type.Union([Type.String(), Type.Null()]),
  tenureStartDate: Type.Union([Type.String(), Type.Null()]),
  overallScore: Type.Integer({ minimum: 0, maximum: 100 }),
  transparencyScore: Type.Integer({ minimum: 0, maximum: 25 }),
  legislativeScore: Type.Integer({ minimum: 0, maximum: 25 }),
  financialScore: Type.Integer({ minimum: 0, maximum: 25 }),
  anticorruptionScore: Type.Integer({ minimum: 0, maximum: 25 }),
  exclusionFlag: Type.Boolean(),
  methodologyVersion: Type.String(),
})

export type PoliticianProfileDto = Static<typeof PoliticianProfileSchema>
```

---

### Task 3 — Add `selectBySlug` to repository

**File:** `apps/api/src/repositories/politician.repository.ts`

Add `PoliticianProfileRow` interface:

```typescript
export interface PoliticianProfileRow {
  id: string
  slug: string
  name: string
  party: string
  state: string
  role: string
  photoUrl: string | null
  bioSummary: string | null
  tenureStartDate: string | null
  overallScore: number
  transparencyScore: number
  legislativeScore: number
  financialScore: number
  anticorruptionScore: number
  exclusionFlag: boolean
  methodologyVersion: string
}
```

Update factory return type to include `selectBySlug`:

```typescript
export function createPoliticianRepository(db: PublicDb): {
  selectWithFilters: (filters: ListFilters) => Promise<PoliticianWithScore[]>
  selectBySlug: (slug: string) => Promise<PoliticianProfileRow | undefined>
}
```

Add `selectBySlug` implementation inside the factory:

```typescript
async selectBySlug(slug: string): Promise<PoliticianProfileRow | undefined> {
  const rows = await db
    .select({
      id: politicians.id,
      slug: politicians.slug,
      name: politicians.name,
      party: politicians.party,
      state: politicians.state,
      role: politicians.role,
      photoUrl: politicians.photoUrl,
      bioSummary: politicians.bioSummary,
      tenureStartDate: politicians.tenureStartDate,
      overallScore: integrityScores.overallScore,
      transparencyScore: integrityScores.transparencyScore,
      legislativeScore: integrityScores.legislativeScore,
      financialScore: integrityScores.financialScore,
      anticorruptionScore: integrityScores.anticorruptionScore,
      exclusionFlag: politicians.exclusionFlag,
      methodologyVersion: integrityScores.methodologyVersion,
    })
    .from(politicians)
    .innerJoin(integrityScores, eq(politicians.id, integrityScores.politicianId))
    .where(and(eq(politicians.slug, slug), eq(politicians.active, true)))
    .limit(1)

  const row = rows.at(0)
  if (row === undefined) return undefined

  return {
    ...row,
    photoUrl: row.photoUrl ?? null,
    bioSummary: row.bioSummary ?? null,
    tenureStartDate: row.tenureStartDate ?? null,
    overallScore: Number(row.overallScore),
    transparencyScore: Number(row.transparencyScore),
    legislativeScore: Number(row.legislativeScore),
    financialScore: Number(row.financialScore),
    anticorruptionScore: Number(row.anticorruptionScore),
  }
},
```

---

### Task 4 — Add `findBySlug` to service

**File:** `apps/api/src/services/politician.service.ts`

Import `PoliticianProfileRow` and `PoliticianProfileDto`.

Add mapper function:

```typescript
function toPoliticianProfileDto(row: PoliticianProfileRow): PoliticianProfileDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    party: row.party,
    state: row.state,
    role: row.role,
    photoUrl: row.photoUrl,
    bioSummary: row.bioSummary,
    tenureStartDate: row.tenureStartDate,
    overallScore: row.overallScore,
    transparencyScore: row.transparencyScore,
    legislativeScore: row.legislativeScore,
    financialScore: row.financialScore,
    anticorruptionScore: row.anticorruptionScore,
    exclusionFlag: row.exclusionFlag,
    methodologyVersion: row.methodologyVersion,
  }
}
```

Update factory to include `findBySlug`:

```typescript
export function createPoliticianService(repository: PoliticianRepository): {
  findByFilters: (input: FindByFiltersInput) => Promise<FindByFiltersResult>
  findBySlug: (slug: string) => Promise<PoliticianProfileDto | undefined>
}
```

Add implementation:

```typescript
async findBySlug(slug: string): Promise<PoliticianProfileDto | undefined> {
  const row = await repository.selectBySlug(slug)
  if (row === undefined) return undefined
  return toPoliticianProfileDto(row)
},
```

---

### Task 5 — Add `GET /politicians/:slug` to route

**File:** `apps/api/src/routes/politicians.route.ts`

Add imports for `PoliticianParamsSchema`, `PoliticianParams`, `PoliticianProfileSchema`.

Add inside the plugin (after the existing listing route):

```typescript
app.get<{ Params: PoliticianParams }>(
  '/politicians/:slug',
  {
    schema: {
      params: PoliticianParamsSchema,
      response: { 200: PoliticianProfileSchema },
    },
  },
  async (request, reply) => {
    const { slug } = request.params
    const result = await deps.politicianService.findBySlug(slug)

    if (result === undefined) {
      throw new NotFoundError('Politician', slug)
    }

    // ISR-friendly cache header: profile data changes once per pipeline run
    void reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400')

    return result
  },
)
```

Import `NotFoundError` from `'../hooks/error-handler.js'`.

---

### Task 6 — Add `PoliticianProfile` to web API types

**File:** `apps/web/src/lib/api-types.ts`

Add after existing imports/exports:

```typescript
export interface PoliticianProfile {
  id: string
  slug: string
  name: string
  party: string
  state: string
  role: 'deputado' | 'senador'
  photoUrl: string | null
  bioSummary: string | null
  tenureStartDate: string | null
  overallScore: number
  transparencyScore: number
  legislativeScore: number
  financialScore: number
  anticorruptionScore: number
  exclusionFlag: boolean
  methodologyVersion: string
}
```

NOTE: This mirrors `PoliticianProfile` from `@pah/shared` — intentionally duplicated in `api-types.ts` as the web layer's contract (following the existing pattern where `PoliticianCard` etc. are re-exported via `api-types.ts`).

---

### Task 7 — Add `fetchPoliticianBySlug` to API client

**File:** `apps/web/src/lib/api-client.ts`

Add import for `PoliticianProfile` from `'./api-types'`.

Add after `fetchPoliticians`:

```typescript
/**
 * Fetches a single politician profile by slug with ISR caching.
 * revalidate: 3600 = Next.js fetch cache (1 hour)
 * tags: ['politician-{slug}'] = allows on-demand revalidation via pipeline webhook
 */
export async function fetchPoliticianBySlug(slug: string): Promise<PoliticianProfile> {
  return apiFetch<PoliticianProfile>(`/politicians/${encodeURIComponent(slug)}`, {
    next: { revalidate: 3600, tags: [`politician-${slug}`] },
  })
}
```

---

### Task 8 — Create `ScoreBreakdown` component

**File:** `apps/web/src/components/politician/score-breakdown.tsx`

```typescript
import type { PoliticianProfile } from '@/lib/api-types'

interface ScoreBreakdownProps {
  politician: Pick<
    PoliticianProfile,
    'overallScore' | 'transparencyScore' | 'legislativeScore' | 'financialScore' | 'anticorruptionScore'
  >
  showMethodologyLink?: boolean
}

interface ScoreItemProps {
  label: string
  value: number
  maxValue: number
}

function ScoreItem({ label, value, maxValue }: ScoreItemProps): React.JSX.Element {
  const percentage = Math.round((value / maxValue) * 100)
  return (
    <div role="listitem">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium tabular-nums">
          {value}/{maxValue}
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={maxValue}
        aria-label={`${label}: ${value} de ${maxValue}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Displays the 4 integrity score components with neutral progress bars.
 * DR-002: No qualitative labels. Scores displayed numerically only.
 */
export function ScoreBreakdown({
  politician,
  showMethodologyLink = false,
}: ScoreBreakdownProps): React.JSX.Element {
  return (
    <section aria-labelledby="score-breakdown-heading">
      <h2 id="score-breakdown-heading" className="mb-4 text-lg font-semibold">
        Composição da Pontuação
      </h2>
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        role="list"
        aria-label="Componentes da pontuação de integridade"
      >
        <ScoreItem
          label="Transparência"
          value={politician.transparencyScore}
          maxValue={25}
        />
        <ScoreItem
          label="Atividade Legislativa"
          value={politician.legislativeScore}
          maxValue={25}
        />
        <ScoreItem
          label="Regularidade Financeira"
          value={politician.financialScore}
          maxValue={25}
        />
        <ScoreItem
          label="Anti-Corrupção"
          value={politician.anticorruptionScore}
          maxValue={25}
        />
      </div>
      {showMethodologyLink && (
        <p className="mt-4 text-sm text-muted-foreground">
          Saiba mais sobre o cálculo em{' '}
          <a href="/metodologia" className="text-primary underline">
            nossa metodologia
          </a>
          .
        </p>
      )}
    </section>
  )
}
```

---

### Task 9 — Create `ExclusionNotice` component

**File:** `apps/web/src/components/politician/exclusion-notice.tsx`

```typescript
/**
 * Displays a factual notice when exclusionFlag is true.
 * DR-001: No source name, record ID, or date shown. Boolean only.
 */
export function ExclusionNotice(): React.JSX.Element {
  return (
    <div
      className="rounded-md border border-border bg-muted p-4"
      role="note"
      aria-label="Aviso sobre dados de anticorrupção"
    >
      <p className="text-sm text-muted-foreground">
        Informações de bases públicas de anticorrupção influenciaram este componente da pontuação.
        Para detalhes, consulte o{' '}
        <a
          href="https://www.portaltransparencia.gov.br"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Portal da Transparência
        </a>
        .
      </p>
    </div>
  )
}
```

---

### Task 10 — Create profile page

**File:** `apps/web/src/app/politicos/[slug]/page.tsx`

```typescript
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { fetchPoliticianBySlug, fetchPoliticians } from '@/lib/api-client'
import { ScoreBreakdown } from '@/components/politician/score-breakdown'
import { ExclusionNotice } from '@/components/politician/exclusion-notice'

export const revalidate = 3600

const PROFILE_TABS = [
  { label: 'Projetos de Lei', href: 'projetos' },
  { label: 'Votações', href: 'votacoes' },
  { label: 'Despesas', href: 'despesas' },
  { label: 'Propostas', href: 'propostas' },
  { label: 'Atividades', href: 'atividades' },
] as const

/** Pre-generate the top 100 politician pages at build time. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const result = await fetchPoliticians({ limit: 100 })
  return result.data.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  try {
    const politician = await fetchPoliticianBySlug(slug)
    const title = `${politician.name} (${politician.party}-${politician.state}) — Autoridade Política`
    const description = `Perfil de integridade de ${politician.name}: pontuação ${politician.overallScore}/100. Projetos, votações e despesas de fontes oficiais.`

    return {
      title,
      description,
      alternates: {
        canonical: `https://autoridade-politica.com.br/politicos/${slug}`,
      },
    }
  } catch {
    return { title: 'Político não encontrado — Autoridade Política' }
  }
}

function roleLabel(role: string): string {
  return role === 'senador' ? 'Senador(a)' : 'Deputado(a) Federal'
}

export default async function PoliticianProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<React.JSX.Element> {
  const { slug } = await params

  let politician
  try {
    politician = await fetchPoliticianBySlug(slug)
  } catch {
    notFound()
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row">
        {/* Photo or initials fallback */}
        <div className="flex-shrink-0">
          {politician.photoUrl !== null ? (
            <Image
              src={politician.photoUrl}
              alt={`${politician.name}, ${politician.party}-${politician.state}`}
              width={128}
              height={128}
              className="rounded-full object-cover"
              priority
            />
          ) : (
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground"
              aria-label={`Foto não disponível — ${politician.name}`}
            >
              {politician.name
                .split(' ')
                .slice(0, 2)
                .map((n) => n.at(0) ?? '')
                .join('')
                .toUpperCase()}
            </div>
          )}
        </div>

        {/* Identity */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{politician.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {roleLabel(politician.role)} · {politician.party}-{politician.state}
          </p>
          {politician.tenureStartDate !== null && (
            <p className="text-sm text-muted-foreground">
              Mandato desde{' '}
              {new Date(politician.tenureStartDate).getFullYear()}
            </p>
          )}
          {politician.bioSummary !== null && (
            <p className="mt-3 text-sm leading-relaxed">{politician.bioSummary}</p>
          )}
        </div>

        {/* Overall score */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-border p-4">
          <span className="text-xs text-muted-foreground">Pontuação de Integridade</span>
          <span
            className="mt-1 text-4xl font-bold tabular-nums"
            aria-label={`Pontuação de integridade: ${politician.overallScore} de 100`}
          >
            {politician.overallScore}
            <span className="text-xl font-normal text-muted-foreground">/100</span>
          </span>
        </div>
      </div>

      {/* Exclusion notice (DR-001: boolean only, no details) */}
      {politician.exclusionFlag && (
        <div className="mb-6">
          <ExclusionNotice />
        </div>
      )}

      {/* Score breakdown */}
      <div className="mb-8">
        <ScoreBreakdown politician={politician} showMethodologyLink />
      </div>

      {/* Section tab navigation (placeholders — filled by RF-008/009/010/011/012) */}
      <nav aria-label="Seções do perfil" className="mb-6">
        <ul className="flex flex-wrap gap-2" role="list">
          {PROFILE_TABS.map((tab) => (
            <li key={tab.href}>
              <Link
                href={`/politicos/${slug}/${tab.href}`}
                className="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Methodology version */}
      <p className="text-xs text-muted-foreground">
        Metodologia: {politician.methodologyVersion} ·{' '}
        <a href="/metodologia" className="text-primary underline">
          Saiba mais
        </a>
      </p>
    </main>
  )
}
```

---

### Task 11 — Create profile loading skeleton

**File:** `apps/web/src/app/politicos/[slug]/loading.tsx`

```typescript
export default function PoliticianProfileLoading(): React.JSX.Element {
  return (
    <main className="container mx-auto px-4 py-8" aria-label="Carregando perfil do político">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row">
        {/* Photo skeleton */}
        <div className="h-32 w-32 flex-shrink-0 animate-pulse rounded-full bg-muted" />

        {/* Identity skeleton */}
        <div className="flex-1 space-y-3">
          <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-16 w-full animate-pulse rounded bg-muted" />
        </div>

        {/* Score skeleton */}
        <div className="flex h-24 w-32 flex-col items-center justify-center rounded-lg border border-border">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-10 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Score breakdown skeleton */}
      <div className="mb-8">
        <div className="mb-4 h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-10 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </main>
  )
}
```

---

### Task 12 — Unit tests (API service)

**File:** `apps/api/src/services/politician.service.test.ts`

Add `findBySlug` tests. File may already exist with `findByFilters` tests — append.

```typescript
describe('findBySlug', () => {
  it('returns mapped PoliticianProfileDto when repository finds a row', async () => {
    const mockRow: PoliticianProfileRow = {
      id: 'uuid-123',
      slug: 'joao-silva-sp',
      name: 'João Silva',
      party: 'PSDB',
      state: 'SP',
      role: 'deputado',
      photoUrl: null,
      bioSummary: null,
      tenureStartDate: null,
      overallScore: 72,
      transparencyScore: 20,
      legislativeScore: 18,
      financialScore: 22,
      anticorruptionScore: 12,
      exclusionFlag: false,
      methodologyVersion: 'v1.0',
    }
    const mockRepository = {
      selectWithFilters: vi.fn(),
      selectBySlug: vi.fn().mockResolvedValue(mockRow),
    }
    const service = createPoliticianService(mockRepository)
    const result = await service.findBySlug('joao-silva-sp')

    expect(result).toEqual({
      id: 'uuid-123',
      slug: 'joao-silva-sp',
      name: 'João Silva',
      party: 'PSDB',
      state: 'SP',
      role: 'deputado',
      photoUrl: null,
      bioSummary: null,
      tenureStartDate: null,
      overallScore: 72,
      transparencyScore: 20,
      legislativeScore: 18,
      financialScore: 22,
      anticorruptionScore: 12,
      exclusionFlag: false,
      methodologyVersion: 'v1.0',
    })
  })

  it('returns undefined when repository finds no row', async () => {
    const mockRepository = {
      selectWithFilters: vi.fn(),
      selectBySlug: vi.fn().mockResolvedValue(undefined),
    }
    const service = createPoliticianService(mockRepository)
    const result = await service.findBySlug('unknown-slug')
    expect(result).toBeUndefined()
  })
})
```

---

### Task 13 — Unit tests (web: ScoreBreakdown component)

**File:** `apps/web/src/components/politician/score-breakdown.test.tsx`

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreBreakdown } from './score-breakdown'

const mockPolitician = {
  overallScore: 72,
  transparencyScore: 20,
  legislativeScore: 18,
  financialScore: 22,
  anticorruptionScore: 12,
}

describe('ScoreBreakdown', () => {
  it('renders all 4 score component labels', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    expect(screen.getByText('Transparência')).toBeInTheDocument()
    expect(screen.getByText('Atividade Legislativa')).toBeInTheDocument()
    expect(screen.getByText('Regularidade Financeira')).toBeInTheDocument()
    expect(screen.getByText('Anti-Corrupção')).toBeInTheDocument()
  })

  it('renders score values as fractions of maxValue', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    expect(screen.getByText('20/25')).toBeInTheDocument()
    expect(screen.getByText('18/25')).toBeInTheDocument()
    expect(screen.getByText('22/25')).toBeInTheDocument()
    expect(screen.getByText('12/25')).toBeInTheDocument()
  })

  it('renders progress bars with correct aria-valuenow attributes', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(4)
    expect(bars[0]).toHaveAttribute('aria-valuenow', '20')
    expect(bars[1]).toHaveAttribute('aria-valuenow', '18')
    expect(bars[2]).toHaveAttribute('aria-valuenow', '22')
    expect(bars[3]).toHaveAttribute('aria-valuenow', '12')
  })

  it('does not render qualitative score labels (DR-002)', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    expect(screen.queryByText(/excelente|bom|ruim|ótimo|fraco/i)).not.toBeInTheDocument()
  })

  it('renders methodology link when showMethodologyLink is true', () => {
    render(<ScoreBreakdown politician={mockPolitician} showMethodologyLink />)
    expect(screen.getByRole('link', { name: /nossa metodologia/i })).toHaveAttribute(
      'href',
      '/metodologia',
    )
  })

  it('does not render methodology link by default', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    expect(screen.queryByRole('link', { name: /nossa metodologia/i })).not.toBeInTheDocument()
  })
})
```

---

## Validation Checklist

Run these commands in order. Each must pass before opening PR.

```bash
# 1. Unit tests (API)
pnpm --filter @pah/api test

# 2. Unit tests (web)
pnpm --filter @pah/web test

# 3. Type check (all packages)
pnpm typecheck

# 4. Lint (all packages)
pnpm lint

# 5. Build (verifies ISR + generateStaticParams + generateMetadata compile)
pnpm --filter @pah/web build
```

---

## Implementation Order

1. Task 1: shared type (`PoliticianProfile`) + export
2. Task 2: API TypeBox schemas
3. Task 3: repository `selectBySlug` + `PoliticianProfileRow`
4. Task 4: service `findBySlug` + mapper
5. Task 5: route `GET /politicians/:slug`
6. Task 6: web `api-types.ts` `PoliticianProfile`
7. Task 7: web `api-client.ts` `fetchPoliticianBySlug`
8. Task 8: `ScoreBreakdown` component
9. Task 9: `ExclusionNotice` component
10. Task 10: profile `page.tsx`
11. Task 11: `loading.tsx`
12. Task 12: API service tests
13. Task 13: ScoreBreakdown tests

---

## Notes / Deviations to Watch For

- `bioSummary` and `exclusionFlag` columns must exist in `public_data.politicians`. Confirm with `\d public_data.politicians` if seed data exists. If column is missing, the query will fail at runtime — but `tsc` will pass since Drizzle infers schema from `public-schema.ts`. Check `packages/db/src/public-schema.ts` before Task 3.
- `generateStaticParams` calls `fetchPoliticians({ limit: 100 })`. During `next build` this will call the API — ensure API is running or mock `fetchPoliticians` at build time. Alternative: if API is not up during build, `generateStaticParams` can return `[]` and let ISR handle all pages on-demand (add a code comment for this).
- The `try/catch` in `generateMetadata` swallows the error intentionally — unknown slugs should not break metadata generation.
- `notFound()` is called inside `try/catch` in the page; `notFound()` throws a Next.js-internal error, which would be caught by the catch block. Move `fetchPoliticianBySlug` outside try/catch and let `ApiError` (status 404) trigger `notFound()` by checking `error instanceof ApiError && error.status === 404`.

  Revised pattern for page:

  ```typescript
  import { ApiError } from '@/lib/api-client' // export class ApiError
  // ...
  const politician = await fetchPoliticianBySlug(slug).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  })
  ```

  This requires exporting `ApiError` from `api-client.ts`.
