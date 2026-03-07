import { Type, type Static } from '@sinclair/typebox'
import { PoliticianParamsSchema, type PoliticianParams } from './politician.schema.js'

// Re-export params schema — votes use the same :slug param
export { PoliticianParamsSchema, type PoliticianParams }

export const VoteListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
  cursor: Type.Optional(
    Type.String({ description: 'Opaque base64url cursor from previous response' }),
  ),
})
export type VoteListQuery = Static<typeof VoteListQuerySchema>

export const VoteSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.String(),
  source: Type.String(),
  sessionDate: Type.String({ format: 'date' }),
  matterDescription: Type.String(),
  voteCast: Type.String(),
  sessionResult: Type.String(),
  sourceUrl: Type.Union([Type.String(), Type.Null()]),
})
export type VoteDto = Static<typeof VoteSchema>

export const VoteListResponseSchema = Type.Object({
  data: Type.Array(VoteSchema),
  cursor: Type.Union([Type.String(), Type.Null()]),
  participationRate: Type.Number({ minimum: 0, maximum: 1 }),
})
export type VoteListResponseDto = Static<typeof VoteListResponseSchema>
