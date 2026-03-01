/**
 * Summary representation of a politician as displayed on the listing page (RF-001).
 * Contains only public_data fields — no internal data, no CPF, no exclusion details.
 */
export interface PoliticianCard {
  id: string
  slug: string
  name: string
  party: string
  state: string
  role: 'deputado' | 'senador'
  photoUrl: string | null
  tenureStartDate: string | null // ISO date string; null if not available
  overallScore: number // 0-100 integer
}

/**
 * Filters for the politician listing API (RF-001, RF-002, RF-003, RF-015).
 * All fields are optional to support progressive filter addition.
 */
export interface PoliticianFilters {
  cursor?: string
  limit?: number
  role?: 'deputado' | 'senador'
  state?: string
  search?: string
}

/**
 * Paginated response for the politician listing endpoint.
 * cursor is null when no more pages exist.
 */
export interface ListPoliticiansResponse {
  data: PoliticianCard[]
  cursor: string | null
}
