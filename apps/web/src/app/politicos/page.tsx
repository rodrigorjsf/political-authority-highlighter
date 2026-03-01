// ISR: revalidate every 1 hour (same cadence as API cache s-maxage)
export const revalidate = 3600

import { fetchPoliticians } from '../../lib/api-client'
import { PoliticianCard } from '../../components/politician/politician-card'
import type { Metadata } from 'next'
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

  // exactOptionalPropertyTypes: don't spread undefined cursor into the filters object
  const result = await fetchPoliticians(cursor !== undefined ? { cursor } : {})

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Políticos</h1>

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

      {/* Cursor pagination */}
      <nav className="mt-8 flex justify-center gap-4" aria-label="Paginação">
        {cursor !== undefined && (
          <Link
            href="/politicos"
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            ← Início
          </Link>
        )}
        {result.cursor !== null && (
          <Link
            href={`/politicos?cursor=${result.cursor}`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Próxima →
          </Link>
        )}
      </nav>
    </main>
  )
}
