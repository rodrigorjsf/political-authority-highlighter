# Feature: Comparação de Políticos (RF-POST-001 / Phase 3)

## Summary

Nova rota `/comparar?a={slug1}&b={slug2}` que permite ao cidadão comparar dois políticos lado a lado em uma única página. Server Component principal com `Promise.all` para busca paralela, dois `PoliticianCombobox` Client Components para seleção por nome, `ComparisonTable` com primeira coluna sticky no mobile, botão de compartilhamento via Clipboard API, e `generateMetadata` com OG tags. Reusa `fetchPoliticianBySlug` existente sem nenhum endpoint de API novo.

## User Story

As a cidadão brasileiro
I want to comparar dois políticos lado a lado na rota `/comparar`
So that posso tomar decisões de voto informadas sem abrir múltiplas abas manualmente

## Problem Statement

O cidadão que quer comparar dois políticos precisa abrir duas abas, trocar entre elas, e memorizar os dados — aumentando a fricção cognitiva e reduzindo o tempo de sessão. Isso impede o KPI de ≥ 3 páginas/sessão. A página `/comparar` resolve isso com uma comparação visual única e uma URL compartilhável.

## Solution Statement

Server Component em `/comparar` lê `?a` e `?b` via `searchParams` (Promise no Next.js 15), executa `fetchPoliticianBySlug` em paralelo, renderiza `ComparisonTable` com dados reais. Dois `PoliticianCombobox` Client Components atualizam os URL params com debounce 300ms. `ShareButton` copia a URL via Clipboard API. Zero novo endpoint de API.

## Metadata

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| Type             | NEW_CAPABILITY                                 |
| Complexity       | MEDIUM                                         |
| Systems Affected | apps/web                                       |
| Dependencies     | fetchPoliticianBySlug (existente), next/navigation, Analytics (next-plausible) |
| Estimated Tasks  | 10                                             |

---

## UX Design

### Before State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              BEFORE STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ┌───────────────┐       ┌──────────────┐       ┌──────────────────────┐    ║
║   │  /politicos   │──────►│ Abre Perfil1 │──────►│ Memoriza dados      │    ║
║   │  (listagem)   │       │  (nova aba)  │       │ Troca de aba        │    ║
║   └───────────────┘       └──────────────┘       └──────────────────────┘    ║
║                                   │                         │                 ║
║                                   ▼                         ▼                 ║
║                          ┌──────────────┐       ┌──────────────────────┐     ║
║                          │ Abre Perfil2 │──────►│  Compara manualmente │     ║
║                          │  (outra aba) │       │  sem referência      │     ║
║                          └──────────────┘       └──────────────────────┘     ║
║                                                                               ║
║   USER_FLOW: Listagem → Perfil A (aba 1) → Perfil B (aba 2) → troca de abas ║
║   PAIN_POINT: Sem comparação direta; alta fricção cognitiva                  ║
║   DATA_FLOW: Cada fetch independente; sem visão unificada                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### After State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                               AFTER STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ┌───────────────┐       ┌─────────────────────────────────────────────┐    ║
║   │  /politicos   │──────►│          /comparar                          │    ║
║   │  (listagem)   │       │                                             │    ║
║   └───────────────┘       │  [ComboboxSearch A] [ComboboxSearch B]      │    ║
║                           │         ↓ debounce 300ms                   │    ║
║                           │  fetchPoliticians({search}) → dropdown      │    ║
║                           │         ↓ seleção → URL param update        │    ║
║                           │  ┌──────────────────────────────────────┐  │    ║
║                           │  │    ComparisonTable (Server render)   │  │    ║
║                           │  │  Indicador │ Político A │ Político B │  │    ║
║                           │  │  Score     │  72/100    │  61/100    │  │    ║
║                           │  │  Transp.   │   20/25    │   18/25    │  │    ║
║                           │  │  Legisl.   │   18/25    │   15/25    │  │    ║
║                           │  │  Financ.   │   22/25    │   20/25    │  │    ║
║                           │  │  AntiCorr. │   12/25    │    8/25    │  │    ║
║                           │  └──────────────────────────────────────┘  │    ║
║                           │  [Compartilhar URL] → clipboard + "Copiado!"│   ║
║                           └─────────────────────────────────────────────┘    ║
║                                                                               ║
║   USER_FLOW: /politicos → /comparar → digita nomes → vê tabela → compartilha║
║   VALUE_ADD: Comparação direta sem troca de abas; URL compartilhável         ║
║   DATA_FLOW: URL params → Server Component → 2x fetchPoliticianBySlug        ║
║              (paralelo, cacheado REVALIDATE.ONE_HOUR) → ComparisonTable      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/comparar` | Rota inexistente (404) | Página de comparação com seleção e tabela | Pode comparar 2 políticos em 1 página |
| `?a=slug&b=slug` | N/A | URL compartilhável com OG metadata | Pode enviar link de comparação |
| `PoliticianCombobox` | N/A | Autocomplete com debounce 300ms | Busca por nome em tempo real |
| `ShareButton` | N/A | Copia URL para clipboard | 1 clique para compartilhar |
| `analytics-events.ts` | 2 eventos | 3 eventos (+`comparar_click`) | Rastreamento de comparações |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `apps/web/src/app/politicos/page.tsx` | all | searchParams Promise pattern + revalidate |
| P0 | `apps/web/src/app/politicos/[slug]/page.tsx` | 1-80 | generateMetadata + fetchPoliticianBySlug + error handling |
| P0 | `apps/web/src/lib/api-client.ts` | all | fetchPoliticianBySlug + fetchPoliticians + ApiError |
| P1 | `apps/web/src/components/politician/score-breakdown.tsx` | all | ScoreBreakdown to reuse or mirror |
| P1 | `apps/web/src/components/filters/search-bar.tsx` | all | debounce + useSearchParams + useRouter pattern |
| P1 | `apps/web/src/lib/analytics-events.ts` | all | PahEvents type to extend |
| P2 | `apps/web/src/components/politician/exclusion-notice.tsx` | all | ExclusionNotice para reuso |
| P2 | `apps/web/e2e/accessibility.spec.ts` | all | checkA11y pattern to mirror |
| P2 | `apps/web/src/components/politician/score-breakdown.test.tsx` | all | Test pattern to mirror |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| [Next.js 15 — page.tsx searchParams](https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional) | searchParams reference | Confirms `Promise<{[key]: string|string[]|undefined}>` type |
| [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) | writeText | browser compat + try/catch fallback pattern |

---

## Patterns to Mirror

**SEARCHPARAMS_PROMISE_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/page.tsx:22-39
// COPY THIS PATTERN exactly for comparar/page.tsx:
interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PoliticosPage({ searchParams }: Props): Promise<React.JSX.Element> {
  const params = await searchParams
  const cursor = typeof params['cursor'] === 'string' ? params['cursor'] : undefined
  // exactOptionalPropertyTypes: build conditionally, never pass undefined explicitly
  const filters: PoliticianFilters = {}
  if (cursor !== undefined) filters.cursor = cursor
```

**ERROR_HANDLING_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/[slug]/page.tsx:89-95
// For comparison page: use fetchPoliticianOrNull helper (not notFound())
// because partial 404 = show error state, not generic 404 page
try {
  politician = await fetchPoliticianBySlug(slug)
} catch (err: unknown) {
  if (err instanceof ApiError && err.status === 404) notFound()
  throw err
}
// ADAPTATION: wrap in helper that returns null on 404, re-throws otherwise
```

**GENERATE_METADATA_PATTERN:**

```typescript
// SOURCE: apps/web/src/app/politicos/[slug]/page.tsx:31-76
// MIRROR this shape for comparison page (with searchParams not params):
export async function generateMetadata({
  searchParams, // Promise<{a?: string, b?: string}>
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  // try { fetch data } catch { return fallback }
}
```

**DEBOUNCE_CLIENT_PATTERN:**

```typescript
// SOURCE: apps/web/src/components/filters/search-bar.tsx:18-31
// MIRROR for PoliticianCombobox:
const searchParamsRef = useRef(searchParams)
searchParamsRef.current = searchParams  // ref avoids stale closure

useEffect(() => {
  const timeout = setTimeout(() => {
    // do work
  }, 300)
  return () => clearTimeout(timeout)
}, [value, router, pathname, track]) // searchParamsRef intentionally omitted
```

**ANALYTICS_EVENT_PATTERN:**

```typescript
// SOURCE: apps/web/src/lib/analytics-events.ts:1-10
// EXTEND PahEvents type with new event:
export type PahEvents = {
  busca_realizada: { query: string }
  filtro_aplicado: { filtro: 'cargo' | 'estado'; valor: string }
  comparar_click: { politician_a: string; politician_b: string }  // ADD THIS
}
```

**STATIC_ANALYSIS_PATTERN (exactOptionalPropertyTypes):**

```typescript
// SOURCE: MEMORY.md — never pass { cursor: string | undefined }
// Build objects conditionally:
const filters: PoliticianFilters = {}
if (search !== undefined) filters.search = search  // CORRECT
// NOT: { search: search ?? undefined }            // WRONG
```

**TEST_STRUCTURE_PATTERN:**

```typescript
// SOURCE: apps/web/src/components/politician/score-breakdown.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ComponentName } from './component-name'

const mockData = { /* ... */ }

describe('ComponentName', () => {
  it('renders expected content', () => {
    render(<ComponentName data={mockData} />)
    expect(screen.getByText('...')).toBeInTheDocument()
  })
  it('never displays qualitative labels (DR-002)', () => {
    render(<ComponentName data={mockData} />)
    expect(screen.queryByText(/excelente|bom|ruim|ótimo/i)).not.toBeInTheDocument()
  })
})
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `apps/web/src/lib/analytics-events.ts` | UPDATE | Add `comparar_click` event to PahEvents type |
| `apps/web/src/components/comparison/politician-combobox.tsx` | CREATE | Client Component: search + autocomplete + URL param update |
| `apps/web/src/components/comparison/comparison-table.tsx` | CREATE | Server Component: side-by-side score comparison table |
| `apps/web/src/components/comparison/share-button.tsx` | CREATE | Client Component: Clipboard API + "Copiado!" feedback |
| `apps/web/src/app/comparar/loading.tsx` | CREATE | Loading skeleton matching page layout |
| `apps/web/src/app/comparar/page.tsx` | CREATE | Server Component: orchestrates all components |
| `apps/web/e2e/accessibility.spec.ts` | UPDATE | Add `/comparar` (empty state) to axe-core test suite |
| `apps/web/src/components/comparison/comparison-table.test.tsx` | CREATE | Unit tests for ComparisonTable |
| `apps/web/src/components/comparison/share-button.test.tsx` | CREATE | Unit tests for ShareButton |
| `apps/web/src/components/comparison/politician-combobox.test.tsx` | CREATE | Unit tests for PoliticianCombobox |

---

## NOT Building (Scope Limits)

- **Comparação de mais de 2 políticos**: sem validação de demanda, adiciona complexidade de UI — PRD explicitamente fora de escopo
- **Endpoint de API dedicado `/compare`**: dados já existem em `fetchPoliticianBySlug`; YAGNI
- **Persistência de seleção** (localStorage/cookie): URL é o estado canônico; compartilhamento implica URL
- **Imagens de OG dinâmicas** (`/api/og`): fora do escopo desta fase
- **ComboboxSearch com teclado completo** (arrow keys navigation no dropdown): válido para Fase 2 de acessibilidade; fora do escopo desta feature
- **`generateStaticParams`**: combinações de pares são ~354.000 (594²) — não pré-geramos; ISR on-demand cobre
- **Novo design de componentes** (RF-018): este feature usa tokens de design existentes; redesign está em Phase RF-018

---

## Step-by-Step Tasks

Execute em ordem. Cada task é atômica e verificável independentemente.

---

### Task 1: UPDATE `apps/web/src/lib/analytics-events.ts`

- **ACTION**: ADD `comparar_click` event to `PahEvents` type
- **IMPLEMENT**:

  ```typescript
  export type PahEvents = {
    busca_realizada: { query: string }
    filtro_aplicado: { filtro: 'cargo' | 'estado'; valor: string }
    comparar_click: { politician_a: string; politician_b: string }
  }
  ```

- **MIRROR**: `apps/web/src/lib/analytics-events.ts:3-6` — add new event key following the same `{ props: string }` shape
- **GOTCHA**: The union type must be a plain object type; props values must be `string` (Plausible requirement)
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 2: CREATE `apps/web/src/components/comparison/politician-combobox.tsx`

- **ACTION**: CREATE Client Component para busca de político com debounce + dropdown + URL update
- **IMPLEMENT**:

  ```typescript
  'use client'

  import { useState, useEffect, useRef } from 'react'
  import { useRouter, usePathname, useSearchParams } from 'next/navigation'
  import { fetchPoliticians } from '../../lib/api-client'
  import type { PoliticianCard } from '../../lib/api-types'

  interface PoliticianComboboxProps {
    paramName: 'a' | 'b'
    label: string
    initialName?: string | undefined  // exactOptionalPropertyTypes: undefined explicit only if needed
  }

  export function PoliticianCombobox({
    paramName,
    label,
    initialName,
  }: PoliticianComboboxProps): React.JSX.Element {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [query, setQuery] = useState(initialName ?? '')
    const [suggestions, setSuggestions] = useState<PoliticianCard[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const searchParamsRef = useRef(searchParams)
    searchParamsRef.current = searchParams

    useEffect(() => {
      if (query.length < 2) { setSuggestions([]); return }
      const timeout = setTimeout(() => {
        fetchPoliticians({ search: query, limit: 5 })
          .then((result) => { setSuggestions(result.data); setIsOpen(true) })
          .catch(() => setSuggestions([]))
      }, 300)
      return () => clearTimeout(timeout)
    }, [query]) // searchParamsRef intentionally omitted

    function handleSelect(politician: PoliticianCard): void {
      const params = new URLSearchParams(searchParamsRef.current.toString())
      params.set(paramName, politician.slug)
      router.push(`${pathname}?${params.toString()}`)
      setQuery(politician.name)
      setIsOpen(false)
    }

    function handleClear(): void {
      const params = new URLSearchParams(searchParamsRef.current.toString())
      params.delete(paramName)
      router.push(params.toString() !== '' ? `${pathname}?${params.toString()}` : pathname)
      setQuery('')
      setSuggestions([])
    }

    return (
      <div className="relative">
        <label htmlFor={`combobox-${paramName}`} className="mb-1 block text-sm font-medium text-foreground">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`combobox-${paramName}`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            placeholder="Buscar por nome..."
            aria-label={`${label}: buscar por nome`}
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={`suggestions-${paramName}`}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query !== '' && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={`Limpar seleção de ${label}`}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            >
              ✕
            </button>
          )}
        </div>
        {isOpen && suggestions.length > 0 && (
          <ul
            id={`suggestions-${paramName}`}
            role="listbox"
            aria-label={`Sugestões para ${label}`}
            className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg"
          >
            {suggestions.map((p) => (
              <li
                key={p.id}
                role="option"
                aria-selected={false}
                className="cursor-pointer px-4 py-2 text-sm hover:bg-muted focus:bg-muted"
                onMouseDown={() => handleSelect(p)}
              >
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{p.party}-{p.state}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  ```

- **MIRROR**: `apps/web/src/components/filters/search-bar.tsx` — debounce pattern com `searchParamsRef`
- **GOTCHA 1**: `useRef` para `searchParamsRef` evita stale closure sem adicionar `searchParams` às deps do useEffect
- **GOTCHA 2**: `fetchPoliticians` funciona no browser — a opção `next: { revalidate }` é ignorada pelo `window.fetch` nativo
- **GOTCHA 3**: `onBlur` com `setTimeout(..., 150)` evita fechar o dropdown antes de `onMouseDown` processar a seleção
- **GOTCHA 4**: `exactOptionalPropertyTypes` — `initialName?: string | undefined` (não `initialName?: string`)
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 3: CREATE `apps/web/src/components/comparison/comparison-table.tsx`

- **ACTION**: CREATE Server Component que renderiza tabela comparativa side-by-side
- **IMPLEMENT**:

  ```typescript
  import Link from 'next/link'
  import { ExclusionNotice } from '../politician/exclusion-notice'
  import type { PoliticianProfile } from '../../lib/api-types'

  interface ComparisonTableProps {
    politicianA: PoliticianProfile
    politicianB: PoliticianProfile
  }

  export function ComparisonTable({
    politicianA,
    politicianB,
  }: ComparisonTableProps): React.JSX.Element {
    const rows = [
      { label: 'Pontuação Geral', a: `${politicianA.overallScore}/100`, b: `${politicianB.overallScore}/100` },
      { label: 'Transparência', a: `${politicianA.transparencyScore}/25`, b: `${politicianB.transparencyScore}/25` },
      { label: 'Atividade Legislativa', a: `${politicianA.legislativeScore}/25`, b: `${politicianB.legislativeScore}/25` },
      { label: 'Regularidade Financeira', a: `${politicianA.financialScore}/25`, b: `${politicianB.financialScore}/25` },
      { label: 'Anti-Corrupção', a: `${politicianA.anticorruptionScore}/25`, b: `${politicianB.anticorruptionScore}/25` },
    ] as const

    return (
      <section aria-labelledby="comparison-table-heading">
        <h2 id="comparison-table-heading" className="sr-only">
          Tabela comparativa
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse" aria-label="Comparação de pontuações">
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-card p-4 text-left text-sm font-medium text-muted-foreground w-40"
                >
                  Indicador
                </th>
                <th scope="col" className="p-4 text-left text-sm font-medium">
                  <Link href={`/politicos/${politicianA.slug}`} className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring">
                    {politicianA.name}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {politicianA.party}-{politicianA.state}
                  </span>
                </th>
                <th scope="col" className="p-4 text-left text-sm font-medium">
                  <Link href={`/politicos/${politicianB.slug}`} className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring">
                    {politicianB.name}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {politicianB.party}-{politicianB.state}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 bg-card p-4 text-sm text-muted-foreground font-medium">
                    {row.label}
                  </td>
                  <td className="p-4 text-sm tabular-nums font-semibold text-primary">
                    {row.a}
                  </td>
                  <td className="p-4 text-sm tabular-nums font-semibold text-primary">
                    {row.b}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {politicianA.exclusionFlag && (
          <div className="mt-4">
            <p className="mb-1 text-xs text-muted-foreground">{politicianA.name}:</p>
            <ExclusionNotice />
          </div>
        )}
        {politicianB.exclusionFlag && (
          <div className="mt-4">
            <p className="mb-1 text-xs text-muted-foreground">{politicianB.name}:</p>
            <ExclusionNotice />
          </div>
        )}
      </section>
    )
  }
  ```

- **MIRROR**: `apps/web/src/components/politician/score-breakdown.tsx` — ScoreBreakdown structure + ExclusionNotice reuse
- **GOTCHA 1**: `sticky left-0 bg-card` para a primeira coluna — OBRIGATÓRIO ter `bg-card` (não transparente) para a sticky funcionar corretamente sobre o conteúdo que passa por baixo
- **GOTCHA 2**: DR-002 — sem highlighting visual de "melhor/pior" (cores diferentes por score alto/baixo). Ambas as colunas usam a mesma cor `text-primary`
- **GOTCHA 3**: DR-001 — `exclusionFlag` mostra `ExclusionNotice` (sem detalhes de qual database, quando, etc)
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 4: CREATE `apps/web/src/components/comparison/share-button.tsx`

- **ACTION**: CREATE Client Component que copia URL para clipboard com feedback visual "Copiado!"
- **IMPLEMENT**:

  ```typescript
  'use client'

  import { useState } from 'react'

  export function ShareButton(): React.JSX.Element {
    const [isCopied, setIsCopied] = useState(false)

    async function handleShare(): Promise<void> {
      try {
        const url = window.location.href
        if (navigator.clipboard !== undefined) {
          // Secure context (HTTPS / localhost)
          await navigator.clipboard.writeText(url)
        } else {
          // HTTP fallback via execCommand (iOS Safari / staging HTTP)
          const textarea = document.createElement('textarea')
          textarea.value = url
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.focus()
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch {
        // Silent fail — clipboard permission denied; button is progressive enhancement
      }
    }

    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label="Copiar link desta comparação"
        aria-live="polite"
        className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {isCopied ? 'Copiado!' : 'Compartilhar'}
      </button>
    )
  }
  ```

- **GOTCHA 1**: `navigator.clipboard` é `undefined` em HTTP (não HTTPS). Verificar `!== undefined` antes de chamar — o `else` usa `document.execCommand('copy')` como fallback (deprecated mas funcional em todos os browsers)
- **GOTCHA 2**: iOS Safari requer que `writeText()` seja chamado sincronamente dentro do handler de gesto do usuário. O `async/await` pode quebrar em iOS antigo — o fallback `execCommand` é mais seguro para iOS
- **GOTCHA 3**: `aria-live="polite"` anuncia "Copiado!" para screen readers sem interromper o fluxo
- **GOTCHA 4**: Não usar `useEffect` para monitorar clipboard state — apenas reagir ao click
- **GOTCHA 5**: iOS Safari + `overflow-x-auto` no pai + `sticky` pode falhar se algum ancestral tiver `overflow: hidden`. O `overflow-x-auto` deve estar APENAS no wrapper imediato da `<table>`, não em containers externos
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 5: CREATE `apps/web/src/app/comparar/loading.tsx`

- **ACTION**: CREATE skeleton de loading que corresponde ao layout da página
- **IMPLEMENT**:

  ```typescript
  export default function ComparacaoLoading(): React.JSX.Element {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 h-8 w-48 rounded-md bg-muted motion-safe:animate-pulse" />
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-20 rounded-md bg-muted motion-safe:animate-pulse" />
          <div className="h-20 rounded-md bg-muted motion-safe:animate-pulse" />
        </div>
        <div className="h-64 rounded-lg bg-muted motion-safe:animate-pulse" />
      </main>
    )
  }
  ```

- **MIRROR**: `apps/web/src/app/politicos/page.tsx` (Suspense fallback pattern para dimensões dos skeletons)
- **GOTCHA**: `motion-safe:animate-pulse` — respeita `prefers-reduced-motion` (WCAG 2.1 AA)
- **VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 6: CREATE `apps/web/src/app/comparar/page.tsx`

- **ACTION**: CREATE Server Component principal da rota `/comparar`
- **IMPLEMENT**:

  ```typescript
  // Dynamic rendering: content uniquely determined by ?a and ?b URL params
  export const revalidate = 0

  import { Suspense } from 'react'
  import type { Metadata } from 'next'
  import Link from 'next/link'
  import { ApiError, fetchPoliticianBySlug } from '../../lib/api-client'
  import { ComparisonTable } from '../../components/comparison/comparison-table'
  import { PoliticianCombobox } from '../../components/comparison/politician-combobox'
  import { ShareButton } from '../../components/comparison/share-button'
  import type { PoliticianProfile } from '../../lib/api-types'

  /** Returns politician or null for 404; re-throws all other errors */
  async function fetchPoliticianOrNull(slug: string): Promise<PoliticianProfile | null> {
    try {
      return await fetchPoliticianBySlug(slug)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  }

  interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }

  export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const params = await searchParams
    const slugA = typeof params['a'] === 'string' ? params['a'] : undefined
    const slugB = typeof params['b'] === 'string' ? params['b'] : undefined

    if (slugA === undefined || slugB === undefined) {
      return {
        title: 'Comparar Políticos',
        description: 'Compare dois políticos brasileiros lado a lado.',
      }
    }

    try {
      const [a, b] = await Promise.all([fetchPoliticianOrNull(slugA), fetchPoliticianOrNull(slugB)])
      if (a === null || b === null) return { title: 'Comparar Políticos' }

      const title = `Compare ${a.name} vs ${b.name}`
      const description = `Comparação de integridade: ${a.name} (${a.overallScore}/100) e ${b.name} (${b.overallScore}/100).`

      return {
        title,
        description,
        alternates: { canonical: `https://autoridade-politica.com.br/comparar?a=${slugA}&b=${slugB}` },
        openGraph: {
          type: 'website',
          title: `${title} — Autoridade Política`,
          description,
          url: `https://autoridade-politica.com.br/comparar?a=${slugA}&b=${slugB}`,
          locale: 'pt_BR',
          siteName: 'Autoridade Política',
        },
        twitter: {
          card: 'summary',
          title: `${title} — Autoridade Política`,
          description,
        },
      }
    } catch {
      return { title: 'Comparar Políticos' }
    }
  }

  export default async function ComparePage({ searchParams }: Props): Promise<React.JSX.Element> {
    const params = await searchParams
    const slugA = typeof params['a'] === 'string' ? params['a'] : undefined
    const slugB = typeof params['b'] === 'string' ? params['b'] : undefined

    const bothSelected = slugA !== undefined && slugB !== undefined

    // Fetch in parallel only when both slugs are present
    const [politicianA, politicianB] = bothSelected
      ? await Promise.all([fetchPoliticianOrNull(slugA), fetchPoliticianOrNull(slugB)])
      : [null, null]

    const hasError = bothSelected && (politicianA === null || politicianB === null)

    return (
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 focus:outline-none">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Comparar Políticos</h1>

        {/* Politician selectors */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Suspense fallback={<div className="h-20 rounded-md bg-muted motion-safe:animate-pulse" />}>
            <PoliticianCombobox
              paramName="a"
              label="Político A"
              initialName={politicianA?.name}
            />
          </Suspense>
          <Suspense fallback={<div className="h-20 rounded-md bg-muted motion-safe:animate-pulse" />}>
            <PoliticianCombobox
              paramName="b"
              label="Político B"
              initialName={politicianB?.name}
            />
          </Suspense>
        </div>

        {/* Empty state */}
        {!bothSelected && (
          <p className="py-12 text-center text-muted-foreground">
            Selecione dois políticos acima para comparar.
          </p>
        )}

        {/* Error state: invalid slugs */}
        {hasError && (
          <div className="rounded-md border border-border bg-muted p-6 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Um ou mais políticos não foram encontrados.
            </p>
            <Link href="/politicos" className="text-primary underline focus:outline-none focus:ring-2 focus:ring-ring">
              Ver todos os políticos
            </Link>
          </div>
        )}

        {/* Comparison results */}
        {politicianA !== null && politicianB !== null && (
          <>
            <ComparisonTable politicianA={politicianA} politicianB={politicianB} />
            <div className="mt-6 flex justify-end">
              <ShareButton />
            </div>
          </>
        )}
      </main>
    )
  }
  ```

- **MIRROR**: `apps/web/src/app/politicos/page.tsx` (searchParams pattern) + `apps/web/src/app/politicos/[slug]/page.tsx` (error handling)
- **GOTCHA 1**: `export const revalidate = 0` — conteúdo único por combinação de `?a`+`?b`, sem cache de página
- **GOTCHA 2**: `exactOptionalPropertyTypes` — `initialName={politicianA?.name}` passa `string | undefined`. O prop em `PoliticianCombobox` deve ser `initialName?: string | undefined` (não `initialName?: string`) para compatibilidade com `exactOptionalPropertyTypes`. Mas como estamos passando `string | undefined` para um prop `initialName?: string`, TypeScript vai aceitar se o prop é `string | undefined` explicitamente. Se quiser passar conditional, use: `{...(politicianA !== null ? { initialName: politicianA.name } : {})}`
- **GOTCHA 3**: `fetchPoliticianBySlug` em `generateMetadata` duplica o fetch do render, mas Next.js deduplicar automaticamente com React `cache()` — OK aqui, não precisa otimizar manualmente
- **GOTCHA 4**: `PoliticianCombobox` usa `useSearchParams` → deve ser wrapped em `<Suspense>` (Next.js 15 requirement for Client Components using useSearchParams in SSR)
- **VALIDATE**: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web build`

---

### Task 7: UPDATE `apps/web/e2e/accessibility.spec.ts`

- **ACTION**: ADD test for `/comparar` empty state to existing axe-core suite
- **IMPLEMENT**: Add after the existing `'página de fontes de dados'` test:

  ```typescript
  test('página de comparação — estado vazio', async ({ page }, testInfo) => {
    await page.goto('/comparar')
    await checkA11y(page, testInfo)
  })
  ```

- **MIRROR**: `apps/web/e2e/accessibility.spec.ts:26-29` — same `checkA11y` pattern
- **GOTCHA**: O estado vazio (sem `?a` e `?b`) não requer DB populado — funciona em CI
- **VALIDATE**: `pnpm --filter @pah/web test:e2e` (requer servidor local rodando)

---

### Task 8: CREATE `apps/web/src/components/comparison/comparison-table.test.tsx`

- **ACTION**: CREATE unit tests for ComparisonTable component
- **IMPLEMENT**:

  ```typescript
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { ComparisonTable } from './comparison-table'
  import type { PoliticianProfile } from '../../lib/api-types'

  const mockPoliticianA: PoliticianProfile = {
    id: '1', slug: 'joao-silva-sp', name: 'João Silva',
    party: 'PL', state: 'SP', role: 'deputado', photoUrl: null,
    bioSummary: null, tenureStartDate: null, overallScore: 72,
    transparencyScore: 20, legislativeScore: 18, financialScore: 22,
    anticorruptionScore: 12, exclusionFlag: false, methodologyVersion: '1.0',
  }

  const mockPoliticianB: PoliticianProfile = {
    id: '2', slug: 'maria-santos-rj', name: 'Maria Santos',
    party: 'PT', state: 'RJ', role: 'senador', photoUrl: null,
    bioSummary: null, tenureStartDate: null, overallScore: 61,
    transparencyScore: 18, legislativeScore: 15, financialScore: 20,
    anticorruptionScore: 8, exclusionFlag: false, methodologyVersion: '1.0',
  }

  describe('ComparisonTable', () => {
    it('renders both politician names as links to their profiles', () => {
      render(<ComparisonTable politicianA={mockPoliticianA} politicianB={mockPoliticianB} />)
      expect(screen.getByRole('link', { name: /joão silva/i })).toHaveAttribute('href', '/politicos/joao-silva-sp')
      expect(screen.getByRole('link', { name: /maria santos/i })).toHaveAttribute('href', '/politicos/maria-santos-rj')
    })

    it('renders overall scores as fractions (DR-002: factual display)', () => {
      render(<ComparisonTable politicianA={mockPoliticianA} politicianB={mockPoliticianB} />)
      expect(screen.getAllByText('72/100')).toHaveLength(1)
      expect(screen.getAllByText('61/100')).toHaveLength(1)
    })

    it('renders all 5 score component rows', () => {
      render(<ComparisonTable politicianA={mockPoliticianA} politicianB={mockPoliticianB} />)
      expect(screen.getByText('Pontuação Geral')).toBeInTheDocument()
      expect(screen.getByText('Transparência')).toBeInTheDocument()
      expect(screen.getByText('Atividade Legislativa')).toBeInTheDocument()
      expect(screen.getByText('Regularidade Financeira')).toBeInTheDocument()
      expect(screen.getByText('Anti-Corrupção')).toBeInTheDocument()
    })

    it('does not display qualitative labels (DR-002)', () => {
      render(<ComparisonTable politicianA={mockPoliticianA} politicianB={mockPoliticianB} />)
      expect(screen.queryByText(/melhor|pior|vencedor|mais|menos|excelente/i)).not.toBeInTheDocument()
    })

    it('does not render ExclusionNotice when neither politician has exclusionFlag', () => {
      render(<ComparisonTable politicianA={mockPoliticianA} politicianB={mockPoliticianB} />)
      expect(screen.queryByRole('note')).not.toBeInTheDocument()
    })

    it('renders ExclusionNotice when politicianA has exclusionFlag', () => {
      const politicianWithExclusion = { ...mockPoliticianA, exclusionFlag: true }
      render(<ComparisonTable politicianA={politicianWithExclusion} politicianB={mockPoliticianB} />)
      expect(screen.getByRole('note')).toBeInTheDocument()
    })
  })
  ```

- **MIRROR**: `apps/web/src/components/politician/score-breakdown.test.tsx` — same describe/it/expect structure
- **VALIDATE**: `pnpm --filter @pah/web test`

---

### Task 9: CREATE `apps/web/src/components/comparison/share-button.test.tsx`

- **ACTION**: CREATE unit tests for ShareButton component
- **IMPLEMENT**:

  ```typescript
  import { render, screen, fireEvent, act } from '@testing-library/react'
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
  import { ShareButton } from './share-button'

  describe('ShareButton', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('renders with label "Compartilhar"', () => {
      render(<ShareButton />)
      expect(screen.getByRole('button', { name: /compartilhar/i })).toBeInTheDocument()
    })

    it('shows "Copiado!" after click and reverts after 2s', async () => {
      render(<ShareButton />)
      await act(async () => { fireEvent.click(screen.getByRole('button')) })
      expect(screen.getByRole('button')).toHaveTextContent('Copiado!')
      act(() => { vi.advanceTimersByTime(2000) })
      expect(screen.getByRole('button')).toHaveTextContent('Compartilhar')
    })

    it('has aria-live="polite" for screen reader announcement', () => {
      render(<ShareButton />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-live', 'polite')
    })
  })
  ```

- **MIRROR**: `apps/web/src/components/filters/search-bar.test.tsx` — `vi.useFakeTimers()` + `act()` pattern
- **GOTCHA**: `navigator.clipboard` não existe no jsdom por padrão — precisa ser mockado via `Object.defineProperty`
- **VALIDATE**: `pnpm --filter @pah/web test`

---

### Task 10: CREATE `apps/web/src/components/comparison/politician-combobox.test.tsx`

- **ACTION**: CREATE unit tests for PoliticianCombobox component
- **IMPLEMENT**:

  ```typescript
  import { render, screen, fireEvent, act } from '@testing-library/react'
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
  import { PoliticianCombobox } from './politician-combobox'
  import { useRouter, usePathname, useSearchParams } from 'next/navigation'
  import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
  import type { ReadonlyURLSearchParams } from 'next/navigation'

  vi.mock('next/navigation')

  const mockSearchParams = (init?: string): ReadonlyURLSearchParams =>
    new URLSearchParams(init) as unknown as ReadonlyURLSearchParams

  const mockRouter = (push: ReturnType<typeof vi.fn>): AppRouterInstance =>
    ({ push, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) as AppRouterInstance

  describe('PoliticianCombobox', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.mocked(usePathname).mockReturnValue('/comparar')
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams())
      vi.mocked(useRouter).mockReturnValue(mockRouter(vi.fn()))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('renders label and input with placeholder', () => {
      render(<PoliticianCombobox paramName="a" label="Político A" />)
      expect(screen.getByLabelText('Político A: buscar por nome')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Buscar por nome...')).toBeInTheDocument()
    })

    it('pre-fills input with initialName when provided', () => {
      render(<PoliticianCombobox paramName="a" label="Político A" initialName="João Silva" />)
      expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument()
    })

    it('shows clear button when input has value', () => {
      render(<PoliticianCombobox paramName="a" label="Político A" initialName="João Silva" />)
      expect(screen.getByRole('button', { name: /limpar seleção/i })).toBeInTheDocument()
    })
  })
  ```

- **MIRROR**: `apps/web/src/components/filters/search-bar.test.tsx:1-15` — vi.mock('next/navigation') + mockRouter + mockSearchParams helpers
- **VALIDATE**: `pnpm --filter @pah/web test`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|------------|-----------|
| `comparison-table.test.tsx` | politician names as links, score fractions, all 5 rows, no qualitative labels, ExclusionNotice conditional | DR-002 + DR-001 compliance |
| `share-button.test.tsx` | "Compartilhar" label, "Copiado!" feedback, 2s revert, aria-live | Clipboard UX |
| `politician-combobox.test.tsx` | label/input rendering, initialName pre-fill, clear button visibility | Component API |

### Edge Cases Checklist

- [ ] `/comparar` with no params — renders empty state, no API calls
- [ ] `/comparar?a=valid-slug` (only one) — renders empty state (partial selection not shown as table)
- [ ] `/comparar?a=invalid-slug&b=valid-slug` — renders error state with link to `/politicos`
- [ ] `/comparar?a=slug&b=same-slug` — renders table comparing politician with themselves (valid, no special handling needed)
- [ ] Clipboard API unavailable (HTTP, old browser) — `try/catch` silently ignores failure
- [ ] PoliticianCombobox with query < 2 chars — clears suggestions, no API call
- [ ] DR-002: No color differentiation between scores of different politicians
- [ ] DR-001: ExclusionNotice shown without any source details

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm --filter @pah/web lint && pnpm --filter @pah/web typecheck
```

**EXPECT**: Exit 0, zero warnings

### Level 2: UNIT_TESTS

```bash
pnpm --filter @pah/web test
```

**EXPECT**: All tests pass including new comparison tests

### Level 3: FULL_SUITE

```bash
pnpm build && vercel build --yes
```

**EXPECT**: All packages build, vercel build passes

### Level 4: DATABASE_VALIDATION

N/A — no DB changes in this phase

### Level 5: BROWSER_VALIDATION

```bash
# Requer servidor local: supabase start + pnpm --filter @pah/api dev + pnpm --filter @pah/web dev
# Verificar via navegador ou Playwright:
# 1. GET /comparar — empty state visível
# 2. Digitar nome no Combobox A → suggestions aparecem após 300ms
# 3. Selecionar político → URL atualiza ?a=slug
# 4. Repetir para B → URL tem ?a=slug1&b=slug2
# 5. Tabela comparativa carrega com dados reais
# 6. Botão "Compartilhar" → "Copiado!" por 2s
# 7. DevTools: nenhum cookie de rastreamento
# 8. Lighthouse Accessibility: ≥ 95 na rota /comparar
```

### Level 6: MANUAL_VALIDATION

1. Abrir `/comparar` — deve mostrar empty state
2. Buscar "Lula" no ComboboxA — dropdown com resultados em < 300ms
3. Selecionar político — URL atualiza `?a=slug`
4. Buscar segundo político no ComboboxB — selecionar
5. Tabela comparativa renderizada — 5 linhas de score, links para perfis
6. Botão "Compartilhar" — URL copiada, feedback "Copiado!" por 2s
7. Compartilhar URL em outra aba — tabela carrega corretamente
8. `/comparar?a=slug-invalido&b=slug-valido` — error state com link para listagem

---

## Acceptance Criteria

- [ ] `/comparar?a=slug1&b=slug2` carrega tabela comparativa com dados reais em < 2s LCP
- [ ] Empty state quando nenhum parâmetro presente
- [ ] Error state quando slug inválido com link para `/politicos`
- [ ] Botão compartilhar copia URL e mostra "Copiado!" por 2s
- [ ] Nenhum highlighting editorial de "melhor/pior" (DR-002)
- [ ] ExclusionNotice quando `exclusionFlag=true` (DR-001: sem detalhes)
- [ ] OG metadata gerado corretamente para compartilhamento em redes sociais
- [ ] Level 1-2 validation commands passam com exit 0
- [ ] `pnpm build` + `vercel build` passam (Level 3)
- [ ] axe-core: zero violações na rota `/comparar` (empty state testável em CI)
- [ ] `comparar_click` trackado no Plausible ao renderizar tabela

---

## Completion Checklist

- [ ] Task 1 (analytics-events.ts) concluída e validada
- [ ] Task 2 (PoliticianCombobox) concluída e validada
- [ ] Task 3 (ComparisonTable) concluída e validada
- [ ] Task 4 (ShareButton) concluída e validada
- [ ] Task 5 (loading.tsx) concluída e validada
- [ ] Task 6 (comparar/page.tsx) concluída e validada
- [ ] Task 7 (accessibility.spec.ts) concluída e validada
- [ ] Tasks 8-10 (testes) concluídas e validadas
- [ ] Level 1: `pnpm lint && pnpm typecheck` passa
- [ ] Level 2: `pnpm test` passa
- [ ] Level 3: `pnpm build && vercel build` passa
- [ ] Acceptance criteria todos marcados

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `exactOptionalPropertyTypes` falha em `initialName` prop | HIGH | MEDIUM | Declarar prop como `initialName?: string \| undefined` e passar condicionalmente: `{...(politician !== null ? { initialName: politician.name } : {})}` |
| `fetchPoliticians` em Client Component causa CORS em produção | MEDIUM | HIGH | Verificar configuração CORS do Fastify; `NEXT_PUBLIC_API_URL` deve estar em `connect-src` do CSP (já está em `next.config.ts`) |
| `sticky left-0` não funciona sem `overflow-x-auto` no pai correto | MEDIUM | LOW | O `overflow-x-auto` deve estar no elemento imediatamente pai da `<table>`, não em um ancestral mais distante |
| PoliticianCombobox com `useSearchParams` sem `<Suspense>` causa erro de hydration | HIGH | HIGH | **Obrigatório** envolver cada `<PoliticianCombobox>` em `<Suspense>` na page.tsx |
| `generateMetadata` duplica fetch de `fetchPoliticianBySlug` vs render | LOW | LOW | Next.js usa `React.cache()` internamente para deduplicar fetches idênticos na mesma request — sem impacto em performance |
| `comparar_click` evento não dispara corretamente | LOW | LOW | `track('comparar_click', { props: {...} })` — chamar no render do `ComparisonTable` via `useEffect` com `[politicianA.slug, politicianB.slug]` deps |

---

## Notes

**Sobre a análise do PoliticianCombobox em contexto Client:**
`fetchPoliticians` em `apps/web/src/lib/api-client.ts` usa `fetch` com a opção `next: { revalidate }`. No browser, essa opção é ignorada — o `window.fetch` nativo não conhece extensões Next.js. O restante da função funciona normalmente: `API_BASE_URL` é `NEXT_PUBLIC_API_URL` (disponível no client bundle), headers são aplicados, e respostas de erro são tratadas via `ApiError`. **Não criar uma versão client-side separada da função.**

**Sobre `comparar_click` tracking:**
O evento deve ser disparado quando a tabela é exibida (ambos políticos carregados com sucesso). No `ComparisonTable` (Server Component), não podemos usar `usePlausible`. A alternativa é disparar no `ShareButton` ou em um Client Component wrapper. A abordagem mais limpa: criar um `ComparisonTracker` Client Component mínimo que dispara o evento `comparar_click` no `useEffect([politicianASlug, politicianBSlug])` — adicionado na page.tsx junto com o ComparisonTable.

**Sobre a rota ser dynamic vs cached:**
`export const revalidate = 0` está correto para esta página. O conteúdo muda com cada combinação de `?a`+`?b`. Cada `fetchPoliticianBySlug` individual ainda é cacheado no Next.js data cache por `REVALIDATE.ONE_HOUR` — o page-level revalidate e o fetch-level revalidate são independentes.

**Decisão arquitetural — Promise.all vs Promise.allSettled:**
Usamos uma função helper `fetchPoliticianOrNull` que converte 404 em `null` e re-throws outros erros. Isso permite usar `Promise.all` para paralelismo enquanto mantém o tratamento gracioso de slugs inválidos. O `hasError` check na page.tsx renderiza um error state dedicado em vez de `notFound()`.
