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
    {
      label: 'Pontuação Geral',
      a: `${politicianA.overallScore}/100`,
      b: `${politicianB.overallScore}/100`,
    },
    {
      label: 'Transparência',
      a: `${politicianA.transparencyScore}/25`,
      b: `${politicianB.transparencyScore}/25`,
    },
    {
      label: 'Atividade Legislativa',
      a: `${politicianA.legislativeScore}/25`,
      b: `${politicianB.legislativeScore}/25`,
    },
    {
      label: 'Regularidade Financeira',
      a: `${politicianA.financialScore}/25`,
      b: `${politicianB.financialScore}/25`,
    },
    {
      label: 'Anti-Corrupção',
      a: `${politicianA.anticorruptionScore}/25`,
      b: `${politicianB.anticorruptionScore}/25`,
    },
  ] as const

  return (
    <section aria-labelledby="comparison-table-heading">
      <h2 id="comparison-table-heading" className="sr-only">
        Tabela comparativa
      </h2>
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[480px] border-collapse"
          aria-label="Comparação de pontuações"
        >
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 z-10 w-40 bg-card p-4 text-left text-sm font-medium text-muted-foreground"
              >
                Indicador
              </th>
              <th scope="col" className="p-4 text-left text-sm font-medium">
                <Link
                  href={`/politicos/${politicianA.slug}`}
                  className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {politicianA.name}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">
                  {politicianA.party}-{politicianA.state}
                </span>
              </th>
              <th scope="col" className="p-4 text-left text-sm font-medium">
                <Link
                  href={`/politicos/${politicianB.slug}`}
                  className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
                >
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
                <td className="sticky left-0 z-10 bg-card p-4 text-sm font-medium text-muted-foreground">
                  {row.label}
                </td>
                <td className="p-4 text-sm font-semibold tabular-nums text-primary">{row.a}</td>
                <td className="p-4 text-sm font-semibold tabular-nums text-primary">{row.b}</td>
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
