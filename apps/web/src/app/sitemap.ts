import type { MetadataRoute } from 'next'
import { fetchPoliticians } from '../lib/api-client'

export const revalidate = 86400 // 24 hours — regenerate daily after pipeline runs

const BASE_URL = 'https://autoridade-politica.com.br'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Paginate through all politicians (cursor-based) with build-time resilience
  const slugs: string[] = []
  let cursor: string | undefined = undefined

  try {
    do {
      const filters = cursor !== undefined ? { cursor, limit: 100 } : { limit: 100 }
      const result = await fetchPoliticians(filters)
      result.data.forEach((p) => slugs.push(p.slug))
      cursor = result.cursor ?? undefined
    } while (cursor !== undefined)
  } catch {
    // API unavailable at build time — sitemap generated with static routes only
    // ISR will regenerate with all politicians when API is available
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/politicos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/metodologia`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/fontes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ]

  const politicianRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE_URL}/politicos/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...politicianRoutes]
}
