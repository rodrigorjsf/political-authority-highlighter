export const revalidate = 3600

import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  fetchPoliticianBySlug,
  fetchPoliticianCommittees,
  ApiError,
} from '../../../../lib/api-client'

function formatDateBR(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  return `${month}/${year}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const politician = await fetchPoliticianBySlug(slug)
    return {
      title: `Atividades — ${politician.name} (${politician.party}-${politician.state}) — Autoridade Política`,
    }
  } catch {
    return { title: 'Atividades — Autoridade Política' }
  }
}

export default async function CommitteesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<React.JSX.Element> {
  const { slug } = await params

  let politician
  try {
    politician = await fetchPoliticianBySlug(slug)
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  const result = await fetchPoliticianCommittees(slug)

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link
        href={`/politicos/${slug}`}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← {politician.name}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">Atividades em Comissões</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {politician.party}-{politician.state}
      </p>

      {result.data.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nenhuma participação em comissões encontrada.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4">Comissão</th>
                <th className="pb-3 pr-4">Cargo</th>
                <th className="pb-3 pr-4">Desde</th>
                <th className="pb-3">Até</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((committee) => (
                <tr key={committee.id} className="border-b border-border">
                  <td className="py-3 pr-4">{committee.committeeName}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {committee.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                    {formatDateBR(committee.startDate)}
                  </td>
                  <td className="py-3 text-muted-foreground whitespace-nowrap">
                    {committee.endDate !== null ? formatDateBR(committee.endDate) : 'atual'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
