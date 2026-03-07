/** A legislative bill authored or co-authored by a politician (RF-008). */
export interface Bill {
  id: string
  externalId: string
  source: 'camara' | 'senado'
  title: string
  billType: string // 'PL', 'PEC', 'PDL', 'PLV', etc.
  billNumber: string
  billYear: number
  status: string
  submissionDate: string // ISO date 'YYYY-MM-DD'
  sourceUrl: string | null
}

export interface BillFilters {
  cursor?: string
  limit?: number
}

export interface BillListResponse {
  data: Bill[]
  cursor: string | null
}
