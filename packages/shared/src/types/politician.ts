import type { Role } from '../enums.js'

/**
 * Summary representation of a politician as displayed on the listing page (RF-001).
 * Contains only public schema fields — no internal data, no CPF, no exclusion details.
 */
export interface PoliticianCard {
  id: string
  slug: string
  name: string
  party: string
  state: string
  role: Role
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
  role?: Role
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

/**
 * Full profile of a politician as displayed on the profile overview page (RF-007).
 * Includes score breakdown and bio fields not present in PoliticianCard.
 * DR-001: exclusionFlag is a boolean only — no source, date, or record details.
 * DR-002: No qualitative labels derived from score values.
 */
export interface PoliticianProfile {
  id: string
  slug: string
  name: string
  party: string
  state: string
  role: Role
  photoUrl: string | null
  bioSummary: string | null
  tenureStartDate: string | null
  overallScore: number
  transparencyScore: number
  legislativeScore: number
  financialScore: number
  anticorruptionScore: number
  exclusionFlag: boolean
  methodologyVersion: string
}

