import type {
  ListPoliticiansResponse,
  PoliticianFilters,
  PoliticianProfile,
  ProblemDetail,
  BillFilters,
  BillListResponse,
  VoteFilters,
  VoteListResponse,
  ExpenseFilters,
  ExpenseListResponse,
} from './api-types'

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

export class ApiError extends Error {
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

/**
 * Fetches a single politician profile by slug with ISR caching.
 * revalidate: 3600 = Next.js fetch cache (1 hour)
 * tags: ['politician-{slug}'] = allows on-demand revalidation via pipeline webhook
 */
export async function fetchPoliticianBySlug(slug: string): Promise<PoliticianProfile> {
  return apiFetch<PoliticianProfile>(`/politicians/${encodeURIComponent(slug)}`, {
    next: { revalidate: 3600, tags: [`politician-${slug}`] },
  })
}

/**
 * Fetches paginated bills for a politician with ISR caching.
 * revalidate: 300 = 5 min (bills data changes more frequently than profile overview)
 * tags: ['politician-{slug}-bills'] = allows targeted on-demand revalidation
 */
export async function fetchPoliticianBills(
  slug: string,
  filters: BillFilters = {},
): Promise<BillListResponse> {
  const params = new URLSearchParams()
  if (filters.cursor !== undefined) params.set('cursor', filters.cursor)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  return apiFetch<BillListResponse>(
    `/politicians/${encodeURIComponent(slug)}/bills?${params.toString()}`,
    { next: { revalidate: 300, tags: [`politician-${slug}-bills`] } },
  )
}

/**
 * Fetches paginated votes for a politician with ISR caching.
 * revalidate: 300 = 5 min
 * tags: ['politician-{slug}-votes'] = allows targeted on-demand revalidation
 */
export async function fetchPoliticianVotes(
  slug: string,
  filters: VoteFilters = {},
): Promise<VoteListResponse> {
  const params = new URLSearchParams()
  if (filters.cursor !== undefined) params.set('cursor', filters.cursor)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  return apiFetch<VoteListResponse>(
    `/politicians/${encodeURIComponent(slug)}/votes?${params.toString()}`,
    { next: { revalidate: 300, tags: [`politician-${slug}-votes`] } },
  )
}

/**
 * Fetches paginated expenses for a politician with ISR caching.
 * revalidate: 300 = 5 min
 * tags: ['politician-{slug}-expenses'] = allows targeted on-demand revalidation
 */
export async function fetchPoliticianExpenses(
  slug: string,
  filters: ExpenseFilters = {},
): Promise<ExpenseListResponse> {
  const params = new URLSearchParams()
  if (filters.cursor !== undefined) params.set('cursor', filters.cursor)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  return apiFetch<ExpenseListResponse>(
    `/politicians/${encodeURIComponent(slug)}/expenses?${params.toString()}`,
    { next: { revalidate: 300, tags: [`politician-${slug}-expenses`] } },
  )
}
