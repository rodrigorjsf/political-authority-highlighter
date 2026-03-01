import type { ListPoliticiansResponse, PoliticianFilters, ProblemDetail } from './api-types'

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ProblemDetail,
  ) {
    super(body.title)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { next?: { revalidate?: number; tags?: string[] } },
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json()) as ProblemDetail
    throw new ApiError(response.status, body)
  }

  return response.json() as Promise<T>
}

/**
 * Fetches the politician listing from the API with ISR caching.
 * revalidate: 300 = Next.js fetch cache (5 min)
 * tags: ['politicians'] = allows on-demand revalidation via pipeline webhook
 */
export async function fetchPoliticians(
  filters: PoliticianFilters = {},
): Promise<ListPoliticiansResponse> {
  const params = new URLSearchParams()
  if (filters.state !== undefined) params.set('state', filters.state)
  if (filters.role !== undefined) params.set('role', filters.role)
  if (filters.search !== undefined) params.set('search', filters.search)
  if (filters.cursor !== undefined) params.set('cursor', filters.cursor)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))

  return apiFetch<ListPoliticiansResponse>(`/politicians?${params.toString()}`, {
    next: { revalidate: 300, tags: ['politicians'] },
  })
}
