import { Type, type Static } from '@sinclair/typebox'

export const SubscribeParamsSchema = Type.Object({
  slug: Type.String({ minLength: 1, maxLength: 255 }),
})
export type SubscribeParams = Static<typeof SubscribeParamsSchema>

export const SubscribeBodySchema = Type.Object({
  email: Type.String({ format: 'email', maxLength: 254 }),
})
export type SubscribeBody = Static<typeof SubscribeBodySchema>

export const SubscribeResponseSchema = Type.Object({
  message: Type.String(),
})

export const TokenQuerySchema = Type.Object({
  token: Type.String({ minLength: 64, maxLength: 64 }),
})
export type TokenQuery = Static<typeof TokenQuerySchema>

export const TokenResponseSchema = Type.Object({
  message: Type.String(),
})
