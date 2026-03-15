import { Type, type Static } from '@sinclair/typebox'
import { Role } from '@pah/shared'

/**
 * Query parameters for GET /api/v1/politicians.
 * Phase 1: cursor + limit only. role, state, search added in Phases 2-4.
 */
export const PoliticianListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
  cursor: Type.Optional(
    Type.String({ description: 'Opaque base64url cursor from previous response' }),
  ),
  // Phase 2: role
  role: Type.Optional(Type.Union([Type.Literal(Role.DEPUTADO), Type.Literal(Role.SENADOR)])),
  // Phase 3: state
  state: Type.Optional(Type.String({ minLength: 2, maxLength: 2 })),
  // Phase 4: search (RF-015)
  search: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
})

export type PoliticianListQuery = Static<typeof PoliticianListQuerySchema>

/**
 * Single politician card in list response.
 * DR-001: exclusion_flag is NOT in this schema — only shown on profile page (RF-007).
 * DR-002: No qualitative labels, only raw data.
 */
export const PoliticianCardSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  slug: Type.String(),
  name: Type.String(),
  party: Type.String(),
  state: Type.String(),
  role: Type.String(),
  photoUrl: Type.Union([Type.String(), Type.Null()]),
  tenureStartDate: Type.Union([Type.String(), Type.Null()]),
  overallScore: Type.Integer({ minimum: 0, maximum: 100 }),
})

export type PoliticianCardDto = Static<typeof PoliticianCardSchema>

export const PoliticianListResponseSchema = Type.Object({
  data: Type.Array(PoliticianCardSchema),
  cursor: Type.Union([Type.String(), Type.Null()]),
})

// RF-007: GET /politicians/:slug
export const PoliticianParamsSchema = Type.Object({
  slug: Type.String({ minLength: 1, maxLength: 200 }),
})

export type PoliticianParams = Static<typeof PoliticianParamsSchema>

/**
 * Profile response schema.
 * DR-001: exclusionFlag is boolean only. No source/record details.
 * DR-002: No qualitative score labels in the schema.
 */
export const PoliticianProfileSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  slug: Type.String(),
  name: Type.String(),
  party: Type.String(),
  state: Type.String(),
  role: Type.String(),
  photoUrl: Type.Union([Type.String(), Type.Null()]),
  bioSummary: Type.Union([Type.String(), Type.Null()]),
  tenureStartDate: Type.Union([Type.String(), Type.Null()]),
  overallScore: Type.Integer({ minimum: 0, maximum: 100 }),
  transparencyScore: Type.Integer({ minimum: 0, maximum: 25 }),
  legislativeScore: Type.Integer({ minimum: 0, maximum: 25 }),
  financialScore: Type.Integer({ minimum: 0, maximum: 25 }),
  anticorruptionScore: Type.Integer({ minimum: 0, maximum: 25 }),
  exclusionFlag: Type.Boolean(),
  methodologyVersion: Type.String(),
})

export type PoliticianProfileDto = Static<typeof PoliticianProfileSchema>
