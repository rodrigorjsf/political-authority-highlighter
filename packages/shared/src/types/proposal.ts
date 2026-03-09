/** A parliamentary proposal authored or co-authored by a politician (RF-010). */
export interface Proposal {
  id: string
  externalId: string
  source: 'camara' | 'senado'
  proposalType: string // 'PL', 'PEC', 'PLP', 'MP', 'PDL', etc.
  proposalNumber: string
  proposalYear: number
  summary: string
  status: string
  submissionDate: string // ISO date 'YYYY-MM-DD'
  sourceUrl: string | null
}

export interface ProposalFilters {
  cursor?: string
  limit?: number
}

export interface ProposalListResponse {
  data: Proposal[]
  cursor: string | null
}
