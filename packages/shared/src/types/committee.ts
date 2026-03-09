/** Committee membership for a politician (RF-011). */
export interface Committee {
  id: string
  externalId: string
  source: 'camara' | 'senado'
  committeeName: string
  role: string // 'Titular', 'Suplente', 'Presidente', etc.
  startDate: string // ISO date 'YYYY-MM-DD'
  endDate: string | null // null = current active membership
}

export interface CommitteeListResponse {
  data: Committee[]
}
