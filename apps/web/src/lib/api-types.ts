import type {
  PoliticianCard,
  ListPoliticiansResponse,
  PoliticianFilters,
  PoliticianProfile,
  Bill,
  BillFilters,
  BillListResponse,
} from '@pah/shared'

// Re-export from shared to avoid importing shared types directly in components
export type {
  PoliticianCard,
  ListPoliticiansResponse,
  PoliticianFilters,
  PoliticianProfile,
  Bill,
  BillFilters,
  BillListResponse,
}

export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail: string
  instance: string
}
