import { LegislativeSource } from '../enums.js'

/** A parliamentary voting record for a politician (RF-009). */
export interface Vote {
  id: string
  externalId: string
  source: LegislativeSource
  sessionDate: string // ISO date 'YYYY-MM-DD'
  matterDescription: string
  voteCast: string // 'sim' | 'não' | 'abstenção' | 'ausente'
  sessionResult: string
  sourceUrl: string | null
}

export interface VoteFilters {
  cursor?: string
  limit?: number
}

export interface VoteListResponse {
  data: Vote[]
  cursor: string | null
  participationRate: number // 0.0 to 1.0 (present sessions / total sessions)
}
