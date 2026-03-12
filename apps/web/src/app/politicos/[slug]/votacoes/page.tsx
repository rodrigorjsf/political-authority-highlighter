export const revalidate = 3600

import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchPoliticianBySlug, fetchPoliticianVotes, ApiError } from '../../../../lib/api-client'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const politician = await fetchPoliticianBySlug(slug)
    return {
      title: `Votações — ${politician.name} (${politician.party}-${politician.state})`,
      description: `Histórico de votações de ${politician.name} (${politician.party}-${politician.state}). Taxa de participação e posições em votações nominais.`,
      alternates: {
        canonical: `https://autoridade-politica.com.br/politicos/${slug}/votacoes`,
      },
    }
  } catch {
    return { title: 'Votações' }
  }
}

export default async function VotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<React.JSX.Element> {
  const { slug } = await params
  const sp = await searchParams
  const cursor = typeof sp['cursor'] === 'string' ? sp['cursor'] : undefined

  let politician
  try {
    politician = await fetchPoliticianBySlug(slug)
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  // exactOptionalPropertyTypes: build filters conditionally
  const voteFilters = cursor !== undefined ? { cursor } : {}
  const result = await fetchPoliticianVotes(slug, voteFilters)

  const participationPct = (result.participationRate * 100).toFixed(1)

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link
        href={`/politicos/${slug}`}
        className="mb-4 inline-flex items-center py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← {politician.name}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">Votações</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {politician.party}-{politician.state}
      </p>

      {/* Participation rate summary */}
      <p className="mb-6 text-sm">
        Participação:{' '}
        <span className="font-medium tabular-nums">{participationPct}%</span>
      </p>

      {result.data.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nenhuma votação encontrada.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4">Data</th>
                <th className="pb-3 pr-4">Matéria</th>
                <th className="pb-3 pr-4">Voto</th>
                <th className="pb-3">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((vote) => (
                <tr key={vote.id} className="border-b border-border">
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                    {vote.sessionDate}
                  </td>
                  <td className="py-3 pr-4">
                    {vote.sourceUrl !== null ? (
                      <a
                        href={vote.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {vote.matterDescription}
                      </a>
                    ) : (
                      vote.matterDescription
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {vote.voteCast}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{vote.sessionResult}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <nav className="mt-8 flex justify-center gap-4" aria-label="Paginação">
        {cursor !== undefined && (
          <Link
            href={`/politicos/${slug}/votacoes`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            ← Início
          </Link>
        )}
        {result.cursor !== null && (
          <Link
            href={`/politicos/${slug}/votacoes?cursor=${result.cursor}`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Próxima →
          </Link>
        )}
      </nav>
    </main>
  )
}
