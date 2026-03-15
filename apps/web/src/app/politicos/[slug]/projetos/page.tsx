export const revalidate = 3600

import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchPoliticianBySlug, fetchPoliticianBills, ApiError } from '../../../../lib/api-client'

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
    return { title: 'Projetos de Lei' }
  }
}

export default async function BillsPage({
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

  const billFilters = cursor !== undefined ? { cursor } : {}
  const result = await fetchPoliticianBills(slug, billFilters)

  return (
    <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 focus:outline-none">
      {/* Breadcrumb */}
      <Link
        href={`/politicos/${slug}`}
        className="mb-4 inline-flex items-center py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← {politician.name}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">Projetos de Lei</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {politician.party}-{politician.state}
      </p>

      {result.data.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nenhum projeto de lei encontrado.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label={`Projetos de lei de ${politician.name}`}>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="pb-3 pr-4">Número</th>
                <th scope="col" className="pb-3 pr-4">Título</th>
                <th scope="col" className="pb-3 pr-4">Situação</th>
                <th scope="col" className="pb-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((bill) => (
                <tr key={bill.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-mono whitespace-nowrap">
                    {bill.sourceUrl !== null ? (
                      <a
                        href={bill.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {bill.billType} {bill.billNumber}/{bill.billYear}
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    ) : (
                      <span>
                        {bill.billType} {bill.billNumber}/{bill.billYear}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">{bill.title}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{bill.submissionDate}</td>
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
            href={`/politicos/${slug}/projetos`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          >
            ← Início
          </Link>
        )}
        {result.cursor !== null && (
          <Link
            href={`/politicos/${slug}/projetos?cursor=${result.cursor}`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Próxima →
          </Link>
        )}
      </nav>
    </main>
  )
}
