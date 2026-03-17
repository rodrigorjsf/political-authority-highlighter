// ISR: revalidate every 1 hour (same cadence as politician listing)
export const revalidate = 3600

import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchPoliticians } from '../lib/api-client'
import { PoliticianCard } from '../components/politician/politician-card'

export const metadata: Metadata = {
  title: 'Autoridade Política — Transparência Política no Brasil',
  description:
    'Explore dados públicos de integridade de deputados federais e senadores brasileiros.',
  alternates: { canonical: 'https://autoridade-politica.com.br' },
  openGraph: {
    title: 'Autoridade Política — Transparência Política no Brasil',
    description: 'Explore dados públicos de integridade de deputados e senadores.',
    url: 'https://autoridade-politica.com.br',
  },
}

export default async function HomePage(): Promise<React.JSX.Element> {
  // API sorts by overallScore DESC — limit:3 returns the top 3 politicians
  const result = await fetchPoliticians({ limit: 3 }).catch(() => ({ data: [], cursor: null }))

  return (
    <main id="main-content" tabIndex={-1} className="motion-safe:animate-page-in focus:outline-none">
      {/* Hero */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground sm:text-5xl">
          Transparência política no Brasil
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
          Dados públicos de integridade de deputados federais e senadores, cruzados de 6 fontes
          oficiais do governo.
        </p>
        <Link
          href="/politicos"
          className="inline-flex items-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Ver todos os políticos →
        </Link>
      </section>

      {/* Featured politicians — bento grid */}
      {result.data.length > 0 && (
        <section
          className="container mx-auto px-4 pb-16"
          aria-labelledby="featured-heading"
        >
          <h2
            id="featured-heading"
            className="mb-6 text-xl font-semibold text-foreground"
          >
            Políticos em destaque
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((politician) => (
              <PoliticianCard
                key={politician.id}
                politician={politician}
                isAboveFold={true}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
