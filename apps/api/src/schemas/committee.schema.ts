import { Type, type Static } from '@sinclair/typebox'
import { PoliticianParamsSchema, type PoliticianParams } from './politician.schema.js'

// Re-export params schema — committees use the same :slug param
export { PoliticianParamsSchema, type PoliticianParams }

export const CommitteeSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.String(),
  source: Type.String(),
  committeeName: Type.String(),
  role: Type.String(),
  startDate: Type.String({ format: 'date' }),
  endDate: Type.Union([Type.String({ format: 'date' }), Type.Null()]),
})
export type CommitteeDto = Static<typeof CommitteeSchema>

export const CommitteeListResponseSchema = Type.Object({
  data: Type.Array(CommitteeSchema),
})
export type CommitteeListResponseDto = Static<typeof CommitteeListResponseSchema>
