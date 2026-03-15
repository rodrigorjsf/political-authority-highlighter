// ISR: revalidate every 1 hour (data freshness updates after each pipeline run)
export const revalidate = 3600

import type { Metadata } from 'next'
import type { DataSourceStatus } from '@pah/shared'
import { fetchSources } from '../../lib/api-client'

export const metadata: Metadata = {
  title: 'Fontes de Dados — Autoridade Política',
  description:
    'Status de sincronização das seis fontes de dados governamentais utilizadas na plataforma. Transparência sobre a atualização dos dados.',
  alternates: { canonical: 'https://autoridade-politica.com.br/fontes' },
}

const SOURCE_LABELS: Record<string, string> = {
  camara: 'Câmara dos Deputados',
  senado: 'Senado Federal',
  transparencia: 'Portal da Transparência',
  tse: 'TSE — Dados Abertos',
  tcu: 'TCU CADIRREG',
  cgu: 'CGU-PAD',
}

const SOURCE_URLS: Record<string, string> = {
  camara: 'https://dadosabertos.camara.leg.br',
  senado: 'https://legis.senado.leg.br/dadosabertos',
  transparencia: 'https://portaldatransparencia.gov.br',
  tse: 'https://dadosabertos.tse.jus.br',
  tcu: 'https://portal.tcu.gov.br',
  cgu: 'https://portaldatransparencia.gov.br/download-de-dados',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  failed: 'Falhou',
}

function formatDate(dateStr: string | null): string {
  if (dateStr === null) return 'Nunca'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SourceRow({ source }: { source: DataSourceStatus }): React.JSX.Element {
  const label = SOURCE_LABELS[source.source] ?? source.source
  const url = SOURCE_URLS[source.source]
  const statusLabel = STATUS_LABELS[source.status] ?? source.status

  return (
    <tr className="border-b border-border">
      <td className="py-3 pr-4 text-sm font-medium text-foreground">
        {url !== undefined ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            {label}
          </a>
        ) : (
          label
        )}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground tabular-nums">
        {formatDate(source.lastSyncAt)}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground tabular-nums">
        {source.recordCount.toLocaleString('pt-BR')}
      </td>
      <td className="py-3 text-sm text-muted-foreground">{statusLabel}</td>
    </tr>
  )
}

/**
 * Data sources page — lists 6 government sources with sync status.
 * RF-014: data freshness transparency. DR-002: factual, no editorial bias.
 * DR-003: all sources are public government data under LAI.
 */
export default async function FontesPage(): Promise<React.JSX.Element> {
  // Graceful fallback: return empty list if API is unavailable at build time.
  // ISR will revalidate and serve real data after deployment.
  const sources = await fetchSources()
    .then((r) => r.data)
    .catch(() => [] as DataSourceStatus[])

  return (
    <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 focus:outline-none">
      <h1 className="mb-4 text-2xl font-bold text-foreground">Fontes de Dados</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        A plataforma utiliza dados públicos de seis fontes governamentais, acessados sob a Lei de
        Acesso à Informação (LAI). Os dados são sincronizados automaticamente conforme a cadência de
        cada fonte.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left" aria-label="Status das fontes de dados">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="pb-3 pr-4 text-sm font-semibold text-foreground">
                Fonte
              </th>
              <th scope="col" className="pb-3 pr-4 text-sm font-semibold text-foreground">
                Última Sincronização
              </th>
              <th scope="col" className="pb-3 pr-4 text-sm font-semibold text-foreground">
                Registros
              </th>
              <th scope="col" className="pb-3 text-sm font-semibold text-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <SourceRow key={source.source} source={source} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Dados atualizados há até 1 hora. Para mais detalhes sobre a metodologia de pontuação,
        consulte a{' '}
        <a href="/metodologia" className="text-primary underline hover:no-underline">
          página de metodologia
        </a>
        .
      </p>
    </main>
  )
}
