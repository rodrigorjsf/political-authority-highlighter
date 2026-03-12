# Feature: SEO + Responsive Polish (RF-017 + RF-016)

## Summary

Enhance the Next.js 15 web app with full OpenGraph and Twitter card metadata on politician profiles, JSON-LD structured data for Google rich results, a dynamic `sitemap.xml` covering all 594 politician profiles, a `robots.txt`, and a mobile-responsive fix for the profile tab navigation (stack vertically on 320px screens). All changes are confined to `apps/web/` — no API or database changes required.

## User Story

As a Brazilian voter
I want to find politician profiles via Google and share them on WhatsApp/social media with rich previews
So that I can discover and share political transparency data without having to navigate the platform directly

## Problem Statement

The platform's 594+ politician profile pages are invisible to search engines (no `sitemap.xml`, no structured data) and produce blank social share previews (no `og:image`, no `og:description`, no Twitter cards). On mobile (320px), the 5 profile section tabs wrap unpredictably instead of stacking vertically.

## Solution Statement

1. **RF-017 SEO**: Add `metadataBase` + title template to root layout; enhance `generateMetadata()` in the profile page with full OpenGraph/Twitter; add description + canonical to all 5 sub-tab pages; create `PoliticianJsonLd` Server Component; create `sitemap.ts` and `robots.ts` App Router file conventions.
2. **RF-016 Responsive**: Fix profile tab nav to `flex-col sm:flex-row` for vertical stacking on mobile; verify all tables have `overflow-x-auto`; verify 44px tap targets on pagination and breadcrumb links.

## Metadata

| Field            | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Type             | ENHANCEMENT                                                          |
| Complexity       | MEDIUM                                                               |
| Systems Affected | apps/web                                                             |
| Dependencies     | next@^15.0.0, react@^19.0.0 — no new npm packages                   |
| Estimated Tasks  | 9                                                                    |

---

## UX Design

### Before State

```
[Google Search "João Silva deputado"]
     │
     ▼  No result from autoridade-politica.com.br (no sitemap, no structured data)

/politicos/[slug]  generateMetadata() returns:
  ✓ title
  ✓ description
  ✓ alternates.canonical
  ✗ openGraph (missing — WhatsApp/Twitter previews show generic blank card)
  ✗ twitter (missing)
  ✗ JSON-LD (missing — no Google rich result eligibility)

Sub-tab pages (projetos, votacoes, despesas, propostas, atividades):
  ✓ title
  ✗ description (missing)
  ✗ alternates.canonical (missing)

/sitemap.xml → 404 (crawlers cannot discover profiles systematically)
/robots.txt → 404 (no crawl hints)

Tab nav on 320px mobile:
  [Proj][Vot][Des]
  [Prop][Ativ]       ← unpredictable wrapping, variable row heights
```

### After State

```
[Google Search "João Silva deputado"] → Profile page in results

/politicos/[slug] generateMetadata() returns:
  ✓ title: "João Silva (PT-SP) — Autoridade Política"
  ✓ description: "Perfil de integridade: pontuação 72/100..."
  ✓ alternates.canonical: "https://autoridade-politica.com.br/politicos/joao-silva-sp"
  ✓ openGraph.type = "profile"
  ✓ openGraph.images = [politician.photoUrl]
  ✓ openGraph.siteName, locale = "pt_BR"
  ✓ twitter.card = "summary_large_image"
  ✓ <script type="application/ld+json"> Person schema

Sub-tab pages: title + description + canonical → better CTR

/sitemap.xml → 594 politician URLs + 4 static pages (homepage, /politicos, /metodologia, /fontes)
/robots.txt → Allow all, disallow /api/, Sitemap: link

Tab nav on 320px mobile (flex-col):
  [Projetos de Lei            ]   ← full-width, 44px+ tap target
  [Votações                   ]
  [Despesas                   ]
  [Propostas                  ]
  [Atividades                 ]

Tab nav on sm+ 640px (flex-row flex-wrap):
  [Proj][Vot][Des][Prop][Atv]
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/politicos/[slug]` | No OG meta | Full OG + Twitter card | Social sharing shows politician photo + score |
| `/politicos/[slug]` | No JSON-LD | Person schema | Google rich result eligibility |
| `/politicos/[slug]/[section]` | title only | title + description + canonical | Better search result CTR |
| `/sitemap.xml` | 404 | 594+ URLs, daily changeFrequency | Faster Google indexing of all profiles |
| `/robots.txt` | 404 | Valid robots.txt with sitemap link | Proper crawl guidance |
| Tab nav (320px) | Wraps 3+2 unpredictably | Full-width vertical rows | Touch-friendly, predictable mobile nav |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `apps/web/src/app/layout.tsx` | all | File to UPDATE — current metadata state, body/html structure |
| P0 | `apps/web/src/app/politicos/[slug]/page.tsx` | all | File to UPDATE — existing generateMetadata() + tab nav JSX |
| P0 | `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | 1-22 | Pattern to MIRROR for sub-tab metadata enhancements |
| P1 | `apps/web/src/app/fontes/page.tsx` | 88-100 | `.catch(() => [])` build-time resilience pattern for sitemap |
| P1 | `apps/web/src/lib/api-client.ts` | all | fetchPoliticians() signature, cursor pagination, PoliticianFilters |
| P1 | `apps/web/src/components/politician/exclusion-notice.tsx` | all | Server Component pattern to MIRROR for json-ld.tsx |
| P2 | `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | 1-28 | Exact generateMetadata() structure to update |
| P2 | `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` | 1-22 | Exact generateMetadata() structure to update |
| P2 | `apps/web/src/app/politicos/[slug]/propostas/page.tsx` | 1-26 | Exact generateMetadata() structure to update |
| P2 | `apps/web/src/app/politicos/[slug]/atividades/page.tsx` | 1-31 | Exact generateMetadata() structure to update |
| P2 | `apps/web/src/components/politician/score-breakdown.test.tsx` | all | Test pattern to MIRROR for json-ld.test.tsx |
| P2 | `apps/web/vitest.setup.ts` | all | Mock setup to MIRROR in json-ld.test.tsx |
| P2 | `.env.example` | all | File to UPDATE — add NEXT_PUBLIC_BASE_URL |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| [Next.js generateMetadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) | openGraph, twitter, alternates fields | Full OG/Twitter metadata structure |
| [Next.js sitemap.ts](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) | MetadataRoute.Sitemap type, dynamic export | Correct sitemap route convention |
| [Next.js robots.ts](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) | MetadataRoute.Robots type | Correct robots route convention |
| [Next.js JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld) | XSS safety, dangerouslySetInnerHTML | `.replace(/</g, '\\u003c')` requirement |

---

## Patterns to Mirror

**METADATA_GENERATION_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/[slug]/page.tsx:30-52
// COPY THIS PATTERN (async params, try/catch, graceful fallback):
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
```

**BUILD_TIME_RESILIENCE_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/fontes/page.tsx:88-100
// COPY THIS PATTERN for sitemap — API may be unavailable at build time:
const result = await fetchSources().catch(() => ({ data: [] as DataSourceStatus[] }))
// In sitemap: use .catch(() => []) on each fetchPoliticians() call
```

**SERVER_COMPONENT_PATTERN:**

```typescript
// SOURCE: apps/web/src/components/politician/exclusion-notice.tsx (full file)
// COPY THIS PATTERN for json-ld.tsx — no 'use client', pure JSX output:
export function ExclusionNotice(): React.JSX.Element {
  return (
    <div ...>
      <p ...>...</p>
    </div>
  )
}
```

**CURSOR_PAGINATION_EXACTOPTIONAL_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/[slug]/projetos/page.tsx:43
// CRITICAL: exactOptionalPropertyTypes — never pass { cursor: undefined }
// COPY THIS PATTERN:
const billFilters = cursor !== undefined ? { cursor } : {}
// For sitemap loop:
const filters = cursor !== undefined ? { cursor, limit: 100 } : { limit: 100 }
```

**UNIT_TEST_STRUCTURE:**

```typescript
// SOURCE: apps/web/src/components/politician/score-breakdown.test.tsx (full file)
// COPY THIS PATTERN:
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreBreakdown } from './score-breakdown'

describe('ScoreBreakdown', () => {
  it('renders all 4 score component labels', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    expect(screen.getByText('Transparência')).toBeInTheDocument()
  })
})
```

**TAILWIND_RESPONSIVE_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/[slug]/page.tsx:76
// COPY THIS PATTERN — mobile-first, sm: for larger screens:
<div className="mb-8 flex flex-col gap-6 sm:flex-row">
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `apps/web/src/app/layout.tsx` | UPDATE | Add metadataBase, title template, default openGraph for inheritance |
| `apps/web/src/app/politicos/[slug]/page.tsx` | UPDATE | Add openGraph + twitter to generateMetadata(); add PoliticianJsonLd; fix tab nav mobile |
| `apps/web/src/components/seo/json-ld.tsx` | CREATE | PoliticianJsonLd Server Component — no existing file |
| `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | UPDATE | Add description + canonical to generateMetadata() |
| `apps/web/src/app/politicos/[slug]/votacoes/page.tsx` | UPDATE | Add description + canonical to generateMetadata() |
| `apps/web/src/app/politicos/[slug]/despesas/page.tsx` | UPDATE | Add description + canonical to generateMetadata() |
| `apps/web/src/app/politicos/[slug]/propostas/page.tsx` | UPDATE | Add description + canonical to generateMetadata() |
| `apps/web/src/app/politicos/[slug]/atividades/page.tsx` | UPDATE | Add description + canonical to generateMetadata() |
| `apps/web/src/app/sitemap.ts` | CREATE | Dynamic sitemap route — no existing file |
| `apps/web/src/app/robots.ts` | CREATE | Robots.txt route — no existing file |
| `apps/web/src/components/seo/json-ld.test.tsx` | CREATE | Unit tests for PoliticianJsonLd |
| `.env.example` | UPDATE | Add NEXT_PUBLIC_BASE_URL variable |

---

## NOT Building (Scope Limits)

- **OG Image API endpoint** — PRD Decisions Log explicitly defers this; use `politician.photoUrl` directly
- **JSON-LD on sub-tab pages** — Only the profile overview is the SEO landing page; sub-tabs are canonicalized to the profile
- **`schema-dts` package** — Adds a dependency for a small JSON object; type inline instead
- **`generateSitemaps()` sharding** — 594 politicians is far below the 50,000 threshold; single sitemap.ts suffices
- **Image sitemap** — Not required for MVP; standard URL sitemap is sufficient
- **Viewport/theme-color metadata** — Out of scope for this phase
- **E2E meta tag tests** — Meta tags are verified by the unit test for JSON-LD and visual inspection; Playwright E2E would require a running dev server in CI (not set up yet)

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

---

### Task 1: UPDATE `apps/web/src/app/layout.tsx` — Add metadataBase + title template

**ACTION**: UPDATE root layout metadata to add `metadataBase`, title template, and default `openGraph`

**READ FIRST**: `apps/web/src/app/layout.tsx` (all 19 lines — already read in plan creation)

**IMPLEMENT**: Replace the static `metadata` export with:

```typescript
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://autoridade-politica.com.br',
  ),
  title: {
    default: 'Autoridade Política — Transparência Política no Brasil',
    template: '%s — Autoridade Política',
  },
  description: 'Dados públicos de integridade de deputados federais e senadores brasileiros.',
  openGraph: {
    siteName: 'Autoridade Política',
    locale: 'pt_BR',
    type: 'website',
  },
}
```

**GOTCHA**: `metadataBase` must be a full URL — the `??` fallback ensures this even without the env var set. Without `metadataBase`, relative paths in `openGraph.images` cause a build warning.

**GOTCHA**: The title template uses `%s` as placeholder — page-level `title: string` values (not objects) automatically use the template. Sub-tab pages already return `title: string` so they will pick up `— Autoridade Política` suffix automatically. BUT the `[slug]/page.tsx` currently sets `title` as a full string — verify it does not double the suffix.

**RESOLUTION**: Since `[slug]/page.tsx` returns `title: \`${politician.name} (${politician.party}-${politician.state}) — Autoridade Política\`` (already includes the suffix), change it to return just `title: \`${politician.name} (${politician.party}-${politician.state})\`` and let the template append ` — Autoridade Política`. Same for sub-tab pages.

**VALIDATE**:

```bash
pnpm --filter @pah/web typecheck
```

Expect: exit 0, no errors

---

### Task 2: CREATE `apps/web/src/components/seo/json-ld.tsx`

**ACTION**: CREATE `PoliticianJsonLd` Server Component

**MIRROR**: `apps/web/src/components/politician/exclusion-notice.tsx` — Server Component, pure JSX, no `'use client'`

**READ FIRST**: `apps/web/src/components/politician/exclusion-notice.tsx` to confirm Server Component structure

**IMPLEMENT**:

```typescript
import type { PoliticianProfile } from '../../lib/api-types'

interface PoliticianJsonLdProps {
  politician: PoliticianProfile
}

export function PoliticianJsonLd({ politician }: PoliticianJsonLdProps): React.JSX.Element {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: politician.name,
    image: politician.photoUrl,
    url: `https://autoridade-politica.com.br/politicos/${politician.slug}`,
    jobTitle: politician.role === 'senador' ? 'Senador da República' : 'Deputado Federal',
    memberOf: {
      '@type': 'Organization',
      name: politician.party,
    },
    affiliation: {
      '@type': 'Organization',
      name: 'Congresso Nacional do Brasil',
      url: 'https://www.congressonacional.leg.br',
    },
    nationality: {
      '@type': 'Country',
      name: 'Brasil',
    },
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  )
}
```

**GOTCHA**: `JSON.stringify(jsonLd).replace(/</g, '\\u003c')` is REQUIRED — raw JSON can contain `</script>` which breaks out of the `<script>` tag (XSS vector even for static data)

**GOTCHA**: `politician.photoUrl` is `string | null` — when null, JSON-LD will include `"image": null`. This is valid schema.org behavior (Google ignores null fields). Do NOT use optional chaining to omit the field (the type system allows null, not undefined).

**GOTCHA**: The URL `https://autoridade-politica.com.br` is hardcoded consistent with existing canonical URL pattern in the codebase (see `[slug]/page.tsx:46`). Phase 11 code quality refactor can extract this to a constant.

**IMPORTS**: `import type { PoliticianProfile } from '../../lib/api-types'`

**NOTE**: `PoliticianProfile` is in `api-types.ts` which re-exports from `@pah/shared`. The relative import path from `components/seo/` to `lib/` is `../../lib/api-types`.

**VALIDATE**:

```bash
pnpm --filter @pah/web typecheck
```

---

### Task 3: UPDATE `apps/web/src/app/politicos/[slug]/page.tsx` — Full OG metadata + JSON-LD + mobile tab nav

**ACTION**: Three changes in one file:

1. Enhance `generateMetadata()` with openGraph + twitter fields
2. Add `<PoliticianJsonLd />` to JSX
3. Fix tab nav: `flex flex-wrap gap-2` → `flex flex-col sm:flex-row sm:flex-wrap gap-2`

**READ FIRST**: Full file (already read — 169 lines)

**IMPLEMENT `generateMetadata()`** — Replace lines 42-48 (the return statement in the try block) with:

```typescript
    return {
      title: `${politician.name} (${politician.party}-${politician.state})`,
      description,
      alternates: {
        canonical: `https://autoridade-politica.com.br/politicos/${slug}`,
      },
      openGraph: {
        type: 'profile',
        title: `${politician.name} (${politician.party}-${politician.state}) — Autoridade Política`,
        description,
        url: `https://autoridade-politica.com.br/politicos/${slug}`,
        images:
          politician.photoUrl !== null
            ? [
                {
                  url: politician.photoUrl,
                  alt: `Foto oficial de ${politician.name}`,
                },
              ]
            : [],
        locale: 'pt_BR',
        siteName: 'Autoridade Política',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${politician.name} (${politician.party}-${politician.state}) — Autoridade Política`,
        description,
        images: politician.photoUrl !== null ? [politician.photoUrl] : [],
      },
    }
```

**GOTCHA**: `openGraph.images` — when `politician.photoUrl` is null, use `[]` (empty array), NOT `[null]` or `[{ url: null }]` — the `Metadata` type requires `string | OGImage` values in the array, not nullable.

**GOTCHA**: The title string in the `openGraph` object includes the full suffix (not using the template). This is intentional — social platforms read `og:title` directly, not through the Next.js title template.

**IMPLEMENT JSON-LD** — Add import at top (after existing imports):

```typescript
import { PoliticianJsonLd } from '../../../components/seo/json-ld'
```

And add before `</main>` closing tag (or at the very start of the returned JSX, outside `<main>`):

```typescript
      <PoliticianJsonLd politician={politician} />
```

Place it BEFORE the `<main>` element so it appears in the `<body>` as a `<script>` tag (Next.js App Router renders body children; structured data scripts can be anywhere in body).

**IMPLEMENT tab nav fix** — Change line 146:

```typescript
// BEFORE:
<ul className="flex flex-wrap gap-2" role="list">
// AFTER:
<ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" role="list">
```

And update each `<Link>` in the tab nav to be full-width on mobile:

```typescript
// BEFORE:
className="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
// AFTER:
className="block rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted sm:inline"
```

**GOTCHA**: `block` on `<Link>` makes it full-width (fills the `<li>` which fills the `flex-col` container). `sm:inline` reverts to inline on larger screens so tabs sit side by side.

**VALIDATE**:

```bash
pnpm --filter @pah/web typecheck && pnpm --filter @pah/web lint
```

---

### Task 4: UPDATE sub-tab `generateMetadata()` in all 5 pages

**ACTION**: Add `description` and `alternates.canonical` to the try-block return in all 5 sub-tab pages

**FILES** (update each independently, same pattern):

- `apps/web/src/app/politicos/[slug]/projetos/page.tsx`
- `apps/web/src/app/politicos/[slug]/votacoes/page.tsx`
- `apps/web/src/app/politicos/[slug]/despesas/page.tsx`
- `apps/web/src/app/politicos/[slug]/propostas/page.tsx`
- `apps/web/src/app/politicos/[slug]/atividades/page.tsx`

**PATTERN** (same for all — vary section name and URL segment):

```typescript
// projetos example — adapt for each section:
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const politician = await fetchPoliticianBySlug(slug)
    return {
      title: `Projetos de Lei — ${politician.name} (${politician.party}-${politician.state})`,
      description: `Projetos de lei de ${politician.name} (${politician.party}-${politician.state}). Dados oficiais da Câmara e Senado.`,
      alternates: {
        canonical: `https://autoridade-politica.com.br/politicos/${slug}/projetos`,
      },
    }
  } catch {
    return { title: 'Projetos de Lei — Autoridade Política' }
  }
}
```

**SECTION DESCRIPTIONS** (use exactly these):

| File | Title | Description template |
|------|-------|---------------------|
| `projetos/page.tsx` | `Projetos de Lei — ${name} (${party}-${state})` | `Projetos de lei de ${name} (${party}-${state}). Dados oficiais da Câmara e Senado.` |
| `votacoes/page.tsx` | `Votações — ${name} (${party}-${state})` | `Histórico de votações de ${name} (${party}-${state}). Taxa de participação e posições em votações nominais.` |
| `despesas/page.tsx` | `Despesas — ${name} (${party}-${state})` | `Despesas parlamentares de ${name} (${party}-${state}). Dados do Portal da Transparência (CEAP/CEAPS).` |
| `propostas/page.tsx` | `Propostas — ${name} (${party}-${state})` | `Propostas legislativas de ${name} (${party}-${state}). Requerimentos, indicações e outros atos parlamentares.` |
| `atividades/page.tsx` | `Atividades — ${name} (${party}-${state})` | `Participação em comissões de ${name} (${party}-${state}). Comissões permanentes e temporárias.` |

**URL segments** for `canonical`: `/projetos`, `/votacoes`, `/despesas`, `/propostas`, `/atividades`

**GOTCHA**: The title string must NOT include `— Autoridade Política` at the end — the root layout's `title.template` (`'%s — Autoridade Política'`) will append it automatically. Current sub-tab titles include it — remove it.

**VALIDATE** (after all 5 updates):

```bash
pnpm --filter @pah/web typecheck
```

---

### Task 5: CREATE `apps/web/src/app/sitemap.ts`

**ACTION**: CREATE dynamic sitemap route

**READ FIRST**: `apps/web/src/lib/api-client.ts` (to confirm `fetchPoliticians` signature and `ListPoliticiansResponse` shape)

**IMPLEMENT**:

```typescript
import type { MetadataRoute } from 'next'
import { fetchPoliticians } from '../lib/api-client'

const BASE_URL = 'https://autoridade-politica.com.br'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Paginate through all politicians (cursor-based) with build-time resilience
  const slugs: string[] = []
  let cursor: string | undefined = undefined

  try {
    do {
      const filters = cursor !== undefined ? { cursor, limit: 100 } : { limit: 100 }
      const result = await fetchPoliticians(filters)
      result.data.forEach((p) => slugs.push(p.slug))
      cursor = result.cursor ?? undefined
    } while (cursor !== undefined)
  } catch {
    // API unavailable at build time — sitemap generated with static routes only
    // ISR will regenerate with all politicians when API is available
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/politicos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/metodologia`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/fontes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ]

  const politicianRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE_URL}/politicos/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...politicianRoutes]
}
```

**GOTCHA**: `cursor !== undefined ? { cursor, limit: 100 } : { limit: 100 }` — REQUIRED by `exactOptionalPropertyTypes` in tsconfig. Never `{ cursor: undefined }`.

**GOTCHA**: The entire `do...while` loop is wrapped in `try/catch` — if the API is unavailable at `next build` time, sitemap returns only static routes. ISR will regenerate once deployed.

**GOTCHA**: `changeFrequency: 'daily' as const` — without `as const`, TypeScript infers `string` from the array map, failing the `MetadataRoute.Sitemap` type which expects the literal union.

**GOTCHA**: `sitemap.ts` at `/app/sitemap.ts` is served at `/sitemap.xml`. The caching behavior follows ISR — revalidates per the page `revalidate` setting. Default is static (build-time only). To get daily updates, add `export const revalidate = 86400` (24 hours). But since the pipeline runs daily and we want the sitemap to reflect new data, add this export.

**ADD to file**:

```typescript
export const revalidate = 86400 // 24 hours — regenerate daily after pipeline runs
```

**VALIDATE**:

```bash
pnpm --filter @pah/web typecheck
# Then verify route works locally:
# pnpm --filter @pah/web dev → curl http://localhost:3000/sitemap.xml
```

---

### Task 6: CREATE `apps/web/src/app/robots.ts`

**ACTION**: CREATE robots.txt route

**IMPLEMENT**:

```typescript
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: 'https://autoridade-politica.com.br/sitemap.xml',
  }
}
```

**GOTCHA**: `disallow: ['/api/']` prevents crawlers from hitting the revalidate endpoint and ISR webhooks. The API itself (`apps/api`) is on a different domain — this only applies to the Next.js app's `/api/` routes.

**VALIDATE**:

```bash
pnpm --filter @pah/web typecheck
# Verify: curl http://localhost:3000/robots.txt
```

---

### Task 7: UPDATE `.env.example` — Add NEXT_PUBLIC_BASE_URL

**ACTION**: ADD the new env variable to `.env.example`

**READ FIRST**: `.env.example` (already read in plan creation)

**IMPLEMENT**: Add after the `NEXT_PUBLIC_API_URL` line:

```bash
# Frontend public base URL (used for canonical URLs, OG metadata, sitemap)
NEXT_PUBLIC_BASE_URL=https://autoridade-politica.com.br
```

**NOTE**: `NEXT_PUBLIC_BASE_URL` is read at build time in `layout.tsx` via `process.env['NEXT_PUBLIC_BASE_URL']`. In local dev, it's fine for this to fall back to the hardcoded value — the sitemap and canonical URLs will resolve to the production domain regardless, which is correct behavior (canonical URLs should always point to production).

**VALIDATE**: Manual — verify `.env.example` has the entry.

---

### Task 8: MOBILE AUDIT — Verify tap targets and overflow across profile sub-pages

**ACTION**: READ each sub-tab page and verify:

1. Tables have `overflow-x-auto` wrapper (prevents horizontal page scroll on mobile)
2. Pagination `<Link>` elements have `px-4 py-2` (≥44px touch target)
3. Breadcrumb `<Link>` elements have sufficient padding

**READ**: All 5 sub-tab page.tsx files (projetos, votacoes, despesas, propostas, atividades)

**KNOWN state from codebase exploration** (verify against actual files):

- `projetos/page.tsx:66` — `<div className="overflow-x-auto">` ✓
- `despesas/page.tsx` — check for `overflow-x-auto` on expense table
- `votacoes/page.tsx` — check for `overflow-x-auto` on votes table
- All pagination nav uses `px-4 py-2` = ~44px ✓
- Breadcrumb uses `text-sm text-muted-foreground` — verify padding is sufficient

**IF** any table is missing `overflow-x-auto`, wrap the `<table>` element:

```typescript
// BEFORE:
<table className="w-full text-sm">
// AFTER:
<div className="overflow-x-auto">
  <table className="w-full text-sm">
  </table>
</div>
```

**IF** any breadcrumb link has insufficient touch target, add `py-2`:

```typescript
// BEFORE:
className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
// AFTER:
className="mb-4 inline-flex items-center py-2 text-sm text-muted-foreground hover:text-foreground"
```

**VALIDATE**:

```bash
pnpm --filter @pah/web typecheck
```

---

### Task 9: CREATE `apps/web/src/components/seo/json-ld.test.tsx`

**ACTION**: CREATE unit tests for `PoliticianJsonLd`

**READ FIRST**:

- `apps/web/src/components/politician/score-breakdown.test.tsx` (test pattern)
- `apps/web/vitest.setup.ts` (mock setup)
- `apps/web/src/components/seo/json-ld.tsx` (the component being tested)

**IMPLEMENT**:

```typescript
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PoliticianJsonLd } from './json-ld'
import type { PoliticianProfile } from '../../lib/api-types'

const mockPolitician: PoliticianProfile = {
  id: '1',
  slug: 'joao-silva-sp',
  name: 'João Silva',
  party: 'PT',
  state: 'SP',
  role: 'deputado',
  photoUrl: 'https://www.camara.leg.br/internet/deputado/bandep/12345.jpg',
  bioSummary: null,
  tenureStartDate: '2023-01-01',
  overallScore: 72,
  transparencyScore: 20,
  legislativeScore: 18,
  financialScore: 22,
  anticorruptionScore: 12,
  exclusionFlag: false,
  methodologyVersion: 'v1.0',
}

describe('PoliticianJsonLd', () => {
  it('renders a script tag with type application/ld+json', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
  })

  it('includes correct @type Person and politician name', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}')
    expect(jsonLd['@type']).toBe('Person')
    expect(jsonLd.name).toBe('João Silva')
  })

  it('includes correct jobTitle for deputado', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}')
    expect(jsonLd.jobTitle).toBe('Deputado Federal')
  })

  it('includes correct jobTitle for senador', () => {
    const senator = { ...mockPolitician, role: 'senador' as const }
    const { container } = render(<PoliticianJsonLd politician={senator} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}')
    expect(jsonLd.jobTitle).toBe('Senador da República')
  })

  it('includes politician photoUrl as image', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}')
    expect(jsonLd.image).toBe(mockPolitician.photoUrl)
  })

  it('includes profile URL with correct slug', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}')
    expect(jsonLd.url).toBe('https://autoridade-politica.com.br/politicos/joao-silva-sp')
  })

  it('escapes < characters to prevent XSS', () => {
    const malicious = {
      ...mockPolitician,
      name: 'Test</script><script>alert(1)',
    }
    const { container } = render(<PoliticianJsonLd politician={malicious} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script?.innerHTML).not.toContain('</script>')
    expect(script?.innerHTML).toContain('\\u003c')
  })

  it('does not include party colors or qualitative labels (DR-002)', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const raw = script?.innerHTML ?? ''
    expect(raw).not.toMatch(/excelente|ótimo|bom|ruim|corrupt|clean/i)
  })
})
```

**GOTCHA**: `mockPolitician.role` needs `as const` type narrowing if using TypeScript strict inference — use `role: 'deputado' as const` or type the entire object as `PoliticianProfile`.

**VALIDATE**:

```bash
pnpm --filter @pah/web test src/components/seo/json-ld.test.tsx
```

Expect: 7 tests pass

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|------------|-----------|
| `src/components/seo/json-ld.test.tsx` | script tag present, @type Person, jobTitle by role, photoUrl as image, URL with slug, XSS escape, no qualitative labels | PoliticianJsonLd correctness + security |

### Edge Cases Checklist

- [ ] `photoUrl` is null → `openGraph.images: []` (empty array, not `[null]`)
- [ ] Politician name contains `<` → JSON-LD escapes to `\u003c`
- [ ] API unavailable at sitemap build time → returns only static routes (no crash)
- [ ] API unavailable in `generateMetadata()` → returns fallback title (existing behavior preserved)
- [ ] `cursor` is null → pagination loop terminates correctly
- [ ] `limit: 100` on each page fetch → stays within reasonable API bounds

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm --filter @pah/web typecheck
pnpm --filter @pah/web lint
```

**EXPECT**: Exit 0, zero errors, zero warnings

### Level 2: UNIT_TESTS

```bash
pnpm --filter @pah/web test src/components/seo/json-ld.test.tsx
```

**EXPECT**: 7 tests pass (all JSON-LD test cases)

### Level 3: FULL_SUITE

```bash
pnpm --filter @pah/web test
pnpm --filter @pah/web build
```

**EXPECT**: All tests pass; `next build` succeeds (sitemap may return 0 politician URLs if API not running — acceptable)

### Level 4: DATABASE_VALIDATION

Not applicable — no DB changes.

### Level 5: BROWSER_VALIDATION

```bash
# Start dev server
pnpm --filter @pah/web dev

# In another terminal, verify routes:
curl -s http://localhost:3000/robots.txt
# Expect: User-agent: *, Allow: /, Disallow: /api/, Sitemap: ...

curl -s http://localhost:3000/sitemap.xml | head -20
# Expect: <?xml version="1.0"?><urlset ... with <url> entries

# View a politician profile in browser dev tools → Network → inspect <head>
# Verify: og:title, og:description, og:image, twitter:card tags present
# View page source → verify <script type="application/ld+json"> in body
```

### Level 6: MANUAL_VALIDATION

1. Open `/politicos/[any-slug]` in browser → right-click View Page Source
   - Verify `<meta property="og:title">` with politician name
   - Verify `<meta property="og:image">` with photoUrl
   - Verify `<meta name="twitter:card" content="summary_large_image">`
   - Verify `<script type="application/ld+json">` with Person schema
2. Open `/robots.txt` → confirm `Disallow: /api/` and `Sitemap:` line
3. Open `/sitemap.xml` → confirm `<url><loc>https://autoridade-politica.com.br/politicos/...</loc>` entries
4. On mobile viewport (320px) in Chrome DevTools → verify tab nav shows full-width vertical buttons
5. Paste any politician profile URL into [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) → verify rich preview

---

## Acceptance Criteria

- [ ] `/sitemap.xml` returns valid XML with all static routes + politician profile URLs
- [ ] `/robots.txt` returns valid robots.txt with `Allow: /`, `Disallow: /api/`, `Sitemap:` link
- [ ] `/politicos/[slug]` has `og:title`, `og:description`, `og:image`, `twitter:card` in `<head>`
- [ ] `/politicos/[slug]` has `<script type="application/ld+json">` with Person `@type` in body
- [ ] All 5 sub-tab pages have `description` and `canonical` in their metadata
- [ ] Tab navigation stacks vertically (full-width buttons) at 320px, side-by-side at 640px+
- [ ] All profile tables have `overflow-x-auto` wrapper (no horizontal page scroll on mobile)
- [ ] All interactive elements have ≥44px touch target height
- [ ] Level 1-3 validation commands pass with exit 0
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass (all packages)
- [ ] `next build` succeeds without errors (sitemap gracefully handles missing API)
- [ ] JSON-LD `name` field escapes `<` characters to `\u003c`

---

## Completion Checklist

- [ ] Task 1: `layout.tsx` updated with metadataBase + title template + default openGraph
- [ ] Task 2: `components/seo/json-ld.tsx` created — typecheck passes
- [ ] Task 3: `[slug]/page.tsx` updated — OG + Twitter metadata + JSON-LD + tab nav fix
- [ ] Task 4: All 5 sub-tab generateMetadata() enhanced — description + canonical added
- [ ] Task 5: `sitemap.ts` created — typecheck passes, route serves XML
- [ ] Task 6: `robots.ts` created — typecheck passes, route serves robots.txt
- [ ] Task 7: `.env.example` updated with NEXT_PUBLIC_BASE_URL
- [ ] Task 8: Mobile audit complete — overflow-x-auto and tap targets verified/fixed
- [ ] Task 9: `json-ld.test.tsx` created — all 7 tests pass
- [ ] Level 1: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web lint` exits 0
- [ ] Level 2: `pnpm --filter @pah/web test` — all tests pass
- [ ] Level 3: `pnpm --filter @pah/web build` — next build succeeds

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `openGraph.images` with null photoUrl causes TypeScript error | MEDIUM | LOW | Use conditional `politician.photoUrl !== null ? [...] : []` — not optional chaining |
| `sitemap.ts` fails at `next build` if API is not running | HIGH | LOW | Full `try/catch` around the pagination loop returns static-only sitemap — build succeeds |
| `metadataBase` conflicts with existing hardcoded canonical URLs | LOW | LOW | Hardcoded canonicals are absolute URLs — `metadataBase` only applies to relative paths, so no conflict |
| title template double-suffix: existing sub-tab titles include `— Autoridade Política` | MEDIUM | LOW | Remove the suffix from all sub-tab `generateMetadata()` returns — template adds it automatically |
| JSON-LD in `<body>` raises Google Search Console warnings | LOW | LOW | Google accepts JSON-LD anywhere in `<head>` or `<body>`; App Router renders it correctly |
| `exactOptionalPropertyTypes` breaks sitemap cursor filter object | MEDIUM | MEDIUM | Use `cursor !== undefined ? { cursor, limit: 100 } : { limit: 100 }` — documented in MEMORY.md |

---

## Notes

**Title template**: After Task 1 adds `title.template: '%s — Autoridade Política'`, any page that already appends `— Autoridade Política` to its title will end up with a double suffix. Task 4 removes the suffix from sub-tab titles. Task 3 also removes the suffix from the profile page title. The fallback titles in `catch {}` blocks should keep the suffix since they are displayed as-is (the template only applies to `%s` substitution, not to fallback strings — verify this).

**Canonical URL hardcoding**: The domain `autoridade-politica.com.br` is hardcoded in 3 places in this plan (json-ld.tsx, sitemap.ts, and each generateMetadata call). This is consistent with the existing codebase pattern (the domain is already hardcoded in the profile page's canonical URL). Phase 11 (Code Quality Refactor) should extract this to a shared constant or env var.

**`NEXT_PUBLIC_BASE_URL` env var**: Added to `.env.example` and used in `layout.tsx` `metadataBase`. The sitemap and JSON-LD component hardcode the domain rather than reading this env var — this is intentional simplicity. If the domain ever changes, update the constant in both files.

**Sub-tab JSON-LD**: Sub-tab pages (projetos, votacoes, etc.) do NOT get JSON-LD. The profile overview page at `/politicos/[slug]` is the canonical SEO landing page. Sub-tabs have `canonical` pointing to themselves (not to the parent profile), which is correct — each sub-tab is a distinct URL with distinct content.

**Phase 10 note**: Frontend Security Hardening (Phase 10) can run in parallel with Phase 9 — they are completely independent. Phase 10 adds CSP headers to `next.config.ts` while Phase 9 adds metadata files and components.
