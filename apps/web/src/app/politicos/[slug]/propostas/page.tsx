export const revalidate = 3600

import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  fetchPoliticianBySlug,
  fetchPoliticianProposals,
  ApiError,
} from '../../../../lib/api-client'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const politician = await fetchPoliticianBySlug(slug)
    return {
      title: `Propostas — ${politician.name} (${politician.party}-${politician.state})`,
      description: `Propostas legislativas de ${politician.name} (${politician.party}-${politician.state}). Requerimentos, indicações e outros atos parlamentares.`,
      alternates: {
        canonical: `https://autoridade-politica.com.br/politicos/${slug}/propostas`,
      },
    }
  } catch {
    return { title: 'Propostas' }
  }
}

export default async function ProposalsPage({
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

  const proposalFilters = cursor !== undefined ? { cursor } : {}
  const result = await fetchPoliticianProposals(slug, proposalFilters)

  return (
    <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 focus:outline-none">
      {/* Breadcrumb */}
      <Link
        href={`/politicos/${slug}`}
        className="mb-4 inline-flex items-center py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← {politician.name}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">Propostas</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {politician.party}-{politician.state}
      </p>

      {result.data.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nenhuma proposta encontrada.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label={`Propostas de ${politician.name}`}>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="pb-3 pr-4">Tipo</th>
                <th scope="col" className="pb-3 pr-4">Número</th>
                <th scope="col" className="pb-3 pr-4">Resumo</th>
                <th scope="col" className="pb-3 pr-4">Situação</th>
                <th scope="col" className="pb-3 pr-4">Data</th>
                <th scope="col" className="pb-3">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((proposal) => (
                <tr key={proposal.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-mono whitespace-nowrap">
                    {proposal.proposalType}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {proposal.proposalNumber}/{proposal.proposalYear}
                  </td>
                  <td className="py-3 pr-4 max-w-xs truncate" title={proposal.summary}>
                    {proposal.summary}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {proposal.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                    {proposal.submissionDate}
                  </td>
                  <td className="py-3">
                    {proposal.sourceUrl !== null ? (
                      <a
                        href={proposal.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Ver
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
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
            href={`/politicos/${slug}/propostas`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          >
            ← Início
          </Link>
        )}
        {result.cursor !== null && (
          <Link
            href={`/politicos/${slug}/propostas?cursor=${result.cursor}`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Próxima →
          </Link>
        )}
      </nav>
    </main>
  )
}
