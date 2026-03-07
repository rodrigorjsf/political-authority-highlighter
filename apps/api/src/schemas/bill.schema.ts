import { Type, type Static } from '@sinclair/typebox'
import { PoliticianParamsSchema, type PoliticianParams } from './politician.schema.js'

// Re-export params schema — bills use the same :slug param
export { PoliticianParamsSchema, type PoliticianParams }

export const BillListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
  cursor: Type.Optional(
    Type.String({ description: 'Opaque base64url cursor from previous response' }),
  ),
})
export type BillListQuery = Static<typeof BillListQuerySchema>

export const BillSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.String(),
  source: Type.String(),
  title: Type.String(),
  billType: Type.String(),
  billNumber: Type.String(),
  billYear: Type.Integer(),
  status: Type.String(),
  submissionDate: Type.String({ format: 'date' }),
  sourceUrl: Type.Union([Type.String(), Type.Null()]),
})
export type BillDto = Static<typeof BillSchema>

export const BillListResponseSchema = Type.Object({
  data: Type.Array(BillSchema),
  cursor: Type.Union([Type.String(), Type.Null()]),
})
export type BillListResponseDto = Static<typeof BillListResponseSchema>
