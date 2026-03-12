export const revalidate = 3600

import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { formatCurrency } from '@pah/shared'
import {
  fetchPoliticianBySlug,
  fetchPoliticianExpenses,
  ApiError,
} from '../../../../lib/api-client'
import type { Expense } from '../../../../lib/api-types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const politician = await fetchPoliticianBySlug(slug)
    return {
      title: `Despesas — ${politician.name} (${politician.party}-${politician.state})`,
      description: `Despesas parlamentares de ${politician.name} (${politician.party}-${politician.state}). Dados do Portal da Transparência (CEAP/CEAPS).`,
      alternates: {
        canonical: `https://autoridade-politica.com.br/politicos/${slug}/despesas`,
      },
    }
  } catch {
    return { title: 'Despesas' }
  }
}

export default async function ExpensesPage({
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
  const expenseFilters = cursor !== undefined ? { cursor } : {}
  const result = await fetchPoliticianExpenses(slug, expenseFilters)

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link
        href={`/politicos/${slug}`}
        className="mb-4 inline-flex items-center py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← {politician.name}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">Despesas Parlamentares</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {politician.party}-{politician.state}
      </p>

      {/* Yearly totals summary */}
      {result.yearlyTotals.length > 0 && (
        <div className="mb-6 space-y-1">
          {result.yearlyTotals.map((yt: { year: number; total: number }) => (
            <p key={yt.year} className="text-sm">
              Total {yt.year}:{' '}
              <span className="font-medium tabular-nums">{formatCurrency(yt.total)}</span>
            </p>
          ))}
        </div>
      )}

      {result.data.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nenhuma despesa encontrada.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4">Mês/Ano</th>
                <th className="pb-3 pr-4">Categoria</th>
                <th className="pb-3 pr-4">Fornecedor</th>
                <th className="pb-3 pr-4 text-right">Valor</th>
                <th className="pb-3">Documento</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((expense: Expense) => (
                <tr key={expense.id} className="border-b border-border">
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                    {String(expense.month).padStart(2, '0')}/{expense.year}
                  </td>
                  <td className="py-3 pr-4">{expense.category}</td>
                  <td className="py-3 pr-4">{expense.supplierName}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="py-3">
                    {expense.sourceUrl !== null ? (
                      <a
                        href={expense.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {expense.documentNumber ?? 'Ver'}
                      </a>
                    ) : (
                      (expense.documentNumber ?? '—')
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
            href={`/politicos/${slug}/despesas`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            ← Início
          </Link>
        )}
        {result.cursor !== null && (
          <Link
            href={`/politicos/${slug}/despesas?cursor=${result.cursor}`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Próxima →
          </Link>
        )}
      </nav>
    </main>
  )
}
