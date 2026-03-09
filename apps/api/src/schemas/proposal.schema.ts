import { Type, type Static } from '@sinclair/typebox'
import { PoliticianParamsSchema, type PoliticianParams } from './politician.schema.js'

// Re-export params schema — proposals use the same :slug param
export { PoliticianParamsSchema, type PoliticianParams }

export const ProposalListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
  cursor: Type.Optional(
    Type.String({ description: 'Opaque base64url cursor from previous response' }),
  ),
})
export type ProposalListQuery = Static<typeof ProposalListQuerySchema>

export const ProposalSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.String(),
  source: Type.String(),
  proposalType: Type.String(),
  proposalNumber: Type.String(),
  proposalYear: Type.Integer(),
  summary: Type.String(),
  status: Type.String(),
  submissionDate: Type.String({ format: 'date' }),
  sourceUrl: Type.Union([Type.String(), Type.Null()]),
})
export type ProposalDto = Static<typeof ProposalSchema>

export const ProposalListResponseSchema = Type.Object({
  data: Type.Array(ProposalSchema),
  cursor: Type.Union([Type.String(), Type.Null()]),
})
export type ProposalListResponseDto = Static<typeof ProposalListResponseSchema>
