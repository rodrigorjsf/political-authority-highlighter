import { Type, type Static } from '@sinclair/typebox'
import { PoliticianParamsSchema, type PoliticianParams } from './politician.schema.js'

// Re-export params schema — expenses use the same :slug param
export { PoliticianParamsSchema, type PoliticianParams }

export const ExpenseListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
  cursor: Type.Optional(
    Type.String({ description: 'Opaque base64url cursor from previous response' }),
  ),
})
export type ExpenseListQuery = Static<typeof ExpenseListQuerySchema>

export const ExpenseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  externalId: Type.String(),
  source: Type.String(),
  year: Type.Integer({ minimum: 2000, maximum: 2100 }),
  month: Type.Integer({ minimum: 1, maximum: 12 }),
  category: Type.String(),
  supplierName: Type.String(),
  amount: Type.Number({ minimum: 0 }),
  documentNumber: Type.Union([Type.String(), Type.Null()]),
  sourceUrl: Type.Union([Type.String(), Type.Null()]),
})
export type ExpenseDto = Static<typeof ExpenseSchema>

export const YearlyTotalSchema = Type.Object({
  year: Type.Integer(),
  total: Type.Number({ minimum: 0 }),
})

export const ExpenseListResponseSchema = Type.Object({
  data: Type.Array(ExpenseSchema),
  cursor: Type.Union([Type.String(), Type.Null()]),
  yearlyTotals: Type.Array(YearlyTotalSchema),
})
export type ExpenseListResponseDto = Static<typeof ExpenseListResponseSchema>
