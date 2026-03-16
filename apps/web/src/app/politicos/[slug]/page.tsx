import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ApiError, fetchPoliticianBySlug, fetchPoliticians } from '../../../lib/api-client'
import { ScoreBreakdown } from '../../../components/politician/score-breakdown'
import { ExclusionNotice } from '../../../components/politician/exclusion-notice'
import { PoliticianJsonLd } from '../../../components/seo/json-ld'
import { SubscribeForm } from '../../../components/politician/subscribe-form'

export const revalidate = 3600

const PROFILE_TABS = [
  { label: 'Projetos de Lei', href: 'projetos' },
  { label: 'Votações', href: 'votacoes' },
  { label: 'Despesas', href: 'despesas' },
  { label: 'Propostas', href: 'propostas' },
  { label: 'Atividades', href: 'atividades' },
] as const

/** Pre-generate the top 100 politician pages at build time. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const result = await fetchPoliticians({ limit: 100 })
    return result.data.map((p) => ({ slug: p.slug }))
  } catch {
    // API not available during build — ISR handles pages on-demand
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  try {
    const politician = await fetchPoliticianBySlug(slug)
    const title = `${politician.name} (${politician.party}-${politician.state})`
    const description = `Perfil de integridade de ${politician.name}: pontuação ${politician.overallScore}/100. Projetos, votações e despesas de fontes oficiais.`

    return {
      title,
      description,
      alternates: {
        canonical: `https://autoridade-politica.com.br/politicos/${slug}`,
      },
      openGraph: {
        type: 'profile',
        title: `${politician.name} (${politician.party}-${politician.state}) — Autoridade Política`,
        description,
        url: `https://autoridade-politica.com.br/politicos/${slug}`,
        images:
          politician.photoUrl !== null
            ? [
                {
                  url: politician.photoUrl,
                  alt: `Foto oficial de ${politician.name}`,
                },
              ]
            : [],
        locale: 'pt_BR',
        siteName: 'Autoridade Política',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${politician.name} (${politician.party}-${politician.state}) — Autoridade Política`,
        description,
        images: politician.photoUrl !== null ? [politician.photoUrl] : [],
      },
    }
  } catch {
    return { title: 'Político não encontrado' }
  }
}

function roleLabel(role: string): string {
  return role === 'senador' ? 'Senador(a)' : 'Deputado(a) Federal'
}

export default async function PoliticianProfilePage({
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

  return (
    <>
      <PoliticianJsonLd politician={politician} />
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 focus:outline-none">
      {/* Profile header */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row">
        {/* Photo or initials fallback */}
        <div className="flex-shrink-0">
          {politician.photoUrl !== null ? (
            <Image
              src={politician.photoUrl}
              alt={`${politician.name}, ${politician.party}-${politician.state}`}
              width={128}
              height={128}
              className="rounded-full object-cover"
              priority
            />
          ) : (
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground"
              aria-label={`Foto não disponível — ${politician.name}`}
            >
              {politician.name
                .split(' ')
                .slice(0, 2)
                .map((n) => n.at(0) ?? '')
                .join('')
                .toUpperCase()}
            </div>
          )}
        </div>

        {/* Identity */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{politician.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {roleLabel(politician.role)} · {politician.party}-{politician.state}
          </p>
          {politician.tenureStartDate !== null && (
            <p className="text-sm text-muted-foreground">
              Mandato desde {new Date(politician.tenureStartDate).getFullYear()}
            </p>
          )}
          {politician.bioSummary !== null && (
            <p className="mt-3 text-sm leading-relaxed">{politician.bioSummary}</p>
          )}
        </div>

        {/* Overall score */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-border p-4">
          <span className="text-xs text-muted-foreground">Pontuação de Integridade</span>
          <span
            className="mt-1 text-4xl font-bold tabular-nums"
            aria-label={`Pontuação de integridade: ${politician.overallScore} de 100`}
          >
            {politician.overallScore}
            <span className="text-xl font-normal text-muted-foreground">/100</span>
          </span>
        </div>
      </div>

      {/* Exclusion notice (DR-001: boolean only, no details) */}
      {politician.exclusionFlag && (
        <div className="mb-6">
          <ExclusionNotice />
        </div>
      )}

      {/* Score breakdown */}
      <div className="mb-8">
        <ScoreBreakdown politician={politician} showMethodologyLink />
      </div>

      {/* Section tab navigation (placeholders — filled by RF-008/009/010/011/012) */}
      <nav aria-label="Seções do perfil" className="mb-6">
        <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" role="list">
          {PROFILE_TABS.map((tab) => (
            <li key={tab.href}>
              <Link
                href={`/politicos/${slug}/${tab.href}`}
                className="block rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted sm:inline"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Methodology version */}
      <p className="text-xs text-muted-foreground">
        Metodologia: {politician.methodologyVersion} ·{' '}
        <a href="/metodologia" className="text-primary underline">
          Saiba mais
        </a>
      </p>

      {/* Score alert subscription (RF-POST-002) */}
      <SubscribeForm slug={politician.slug} />
    </main>
    </>
  )
}
