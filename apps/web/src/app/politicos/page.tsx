// ISR: revalidate every 1 hour (same cadence as API cache s-maxage)
export const revalidate = 3600

import { Suspense } from 'react'
import { fetchPoliticians } from '../../lib/api-client'
import { PoliticianCard } from '../../components/politician/politician-card'
import { RoleFilter } from '../../components/filters/role-filter'
import type { Metadata } from 'next'
import type { PoliticianFilters } from '@pah/shared'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Políticos — Autoridade Política',
  description:
    'Lista de deputados federais e senadores brasileiros ordenados por pontuação de integridade.',
  alternates: { canonical: 'https://autoridade-politica.com.br/politicos' },
}

interface Props {
  // searchParams is a Promise in Next.js 15 — MUST be awaited
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PoliticosPage({ searchParams }: Props): Promise<React.JSX.Element> {
  const params = await searchParams
  const cursor = typeof params['cursor'] === 'string' ? params['cursor'] : undefined
  const role = typeof params['role'] === 'string' ? params['role'] : undefined

  // exactOptionalPropertyTypes: build filters object conditionally (no undefined spreads)
  const filters: PoliticianFilters = {}
  if (cursor !== undefined) filters.cursor = cursor
  if (role !== undefined) filters.role = role as 'deputado' | 'senador'

  const result = await fetchPoliticians(filters)

  // Build base params for pagination links (preserves role, excludes cursor)
  const baseParams = new URLSearchParams()
  if (role !== undefined) baseParams.set('role', role)

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Políticos</h1>

      {/* Filter bar */}
      <div className="mb-6 flex items-center gap-4">
        <Suspense fallback={<div className="h-10 w-48 animate-pulse rounded-md bg-muted" />}>
          <RoleFilter />
        </Suspense>
      </div>

      {/* Politician grid — 1 col mobile, 2 tablet, 3 desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.map((politician, index) => (
          <PoliticianCard
            key={politician.id}
            politician={politician}
            isAboveFold={index < 6} // First 6 cards are above the fold on desktop
          />
        ))}
      </div>

      {result.data.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">Nenhum político encontrado.</p>
      )}

      {/* Cursor pagination — preserves active role filter */}
      <nav className="mt-8 flex justify-center gap-4" aria-label="Paginação">
        {cursor !== undefined && (
          <Link
            href={baseParams.toString() !== '' ? `/politicos?${baseParams.toString()}` : '/politicos'}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            ← Início
          </Link>
        )}
        {result.cursor !== null && (
          <Link
            href={`/politicos?${new URLSearchParams({ ...Object.fromEntries(baseParams), cursor: result.cursor }).toString()}`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Próxima →
          </Link>
        )}
      </nav>
    </main>
  )
}
