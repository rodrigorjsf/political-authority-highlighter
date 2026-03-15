// Dynamic rendering: content uniquely determined by ?a and ?b URL params
export const revalidate = 0

import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ApiError, fetchPoliticianBySlug } from '../../lib/api-client'
import { ComparisonTable } from '../../components/comparison/comparison-table'
import { PoliticianCombobox } from '../../components/comparison/politician-combobox'
import { ShareButton } from '../../components/comparison/share-button'
import type { PoliticianProfile } from '../../lib/api-types'

/** Returns politician or null for 404; re-throws all other errors */
async function fetchPoliticianOrNull(slug: string): Promise<PoliticianProfile | null> {
  try {
    return await fetchPoliticianBySlug(slug)
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const slugA = typeof params['a'] === 'string' ? params['a'] : undefined
  const slugB = typeof params['b'] === 'string' ? params['b'] : undefined

  if (slugA === undefined || slugB === undefined) {
    return {
      title: 'Comparar Políticos',
      description: 'Compare dois políticos brasileiros lado a lado.',
    }
  }

  try {
    const [a, b] = await Promise.all([fetchPoliticianOrNull(slugA), fetchPoliticianOrNull(slugB)])
    if (a === null || b === null) return { title: 'Comparar Políticos' }

    const title = `Compare ${a.name} vs ${b.name}`
    const description = `Comparação de integridade: ${a.name} (${a.overallScore}/100) e ${b.name} (${b.overallScore}/100).`

    return {
      title,
      description,
      alternates: {
        canonical: `https://autoridade-politica.com.br/comparar?a=${slugA}&b=${slugB}`,
      },
      openGraph: {
        type: 'website',
        title: `${title} — Autoridade Política`,
        description,
        url: `https://autoridade-politica.com.br/comparar?a=${slugA}&b=${slugB}`,
        locale: 'pt_BR',
        siteName: 'Autoridade Política',
      },
      twitter: {
        card: 'summary',
        title: `${title} — Autoridade Política`,
        description,
      },
    }
  } catch {
    return { title: 'Comparar Políticos' }
  }
}

export default async function ComparePage({ searchParams }: Props): Promise<React.JSX.Element> {
  const params = await searchParams
  const slugA = typeof params['a'] === 'string' ? params['a'] : undefined
  const slugB = typeof params['b'] === 'string' ? params['b'] : undefined

  const bothSelected = slugA !== undefined && slugB !== undefined

  const [politicianA, politicianB] = bothSelected
    ? await Promise.all([fetchPoliticianOrNull(slugA), fetchPoliticianOrNull(slugB)])
    : [null, null]

  const hasError = bothSelected && (politicianA === null || politicianB === null)

  return (
    <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 focus:outline-none">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Comparar Políticos</h1>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Suspense
          fallback={<div className="h-20 rounded-md bg-muted motion-safe:animate-pulse" />}
        >
          <PoliticianCombobox
            paramName="a"
            label="Político A"
            {...(politicianA !== null ? { initialName: politicianA.name } : {})}
          />
        </Suspense>
        <Suspense
          fallback={<div className="h-20 rounded-md bg-muted motion-safe:animate-pulse" />}
        >
          <PoliticianCombobox
            paramName="b"
            label="Político B"
            {...(politicianB !== null ? { initialName: politicianB.name } : {})}
          />
        </Suspense>
      </div>

      {!bothSelected && (
        <p className="py-12 text-center text-muted-foreground">
          Selecione dois políticos acima para comparar.
        </p>
      )}

      {hasError && (
        <div className="rounded-md border border-border bg-muted p-6 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Um ou mais políticos não foram encontrados.
          </p>
          <Link
            href="/politicos"
            className="text-primary underline focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Ver todos os políticos
          </Link>
        </div>
      )}

      {politicianA !== null && politicianB !== null && (
        <>
          <ComparisonTable politicianA={politicianA} politicianB={politicianB} />
          <div className="mt-6 flex justify-end">
            <ShareButton />
          </div>
        </>
      )}
    </main>
  )
}
