import { Type, type Static } from '@sinclair/typebox'

export const SourceStatusSchema = Type.Object({
  source: Type.String(),
  lastSyncAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  recordCount: Type.Integer({ minimum: 0 }),
  status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('syncing'),
    Type.Literal('synced'),
    Type.Literal('failed'),
  ]),
  updatedAt: Type.String({ format: 'date-time' }),
})
export type SourceStatusDto = Static<typeof SourceStatusSchema>

export const SourceListResponseSchema = Type.Object({
  data: Type.Array(SourceStatusSchema),
})
export type SourceListResponseDto = Static<typeof SourceListResponseSchema>
