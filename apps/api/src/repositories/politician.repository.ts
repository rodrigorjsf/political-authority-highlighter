import { eq, and, desc, lt, or, sql } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { politicians, integrityScores } from '@pah/db/public-schema'

export interface ListFilters {
  limit: number
  cursor?: { overallScore: number; politicianId: string } | undefined
  role?: string | undefined
  state?: string | undefined
  search?: string | undefined
}

export interface PoliticianWithScore {
  id: string
  slug: string
  name: string
  party: string
  state: string
  role: string
  photoUrl: string | null
  tenureStartDate: string | null
  overallScore: number
}

/**
 * Repository for public_data.politicians queries.
 * All Drizzle access is isolated here — never inline queries in services or routes.
 */
export function createPoliticianRepository(db: PublicDb): {
  selectWithFilters: (filters: ListFilters) => Promise<PoliticianWithScore[]>
} {
  return {
    /**
     * Paginated listing of active politicians, sorted by overall_score DESC.
     * Uses composite cursor (overallScore, politicianId) for stable keyset pagination.
     * Fetches limit+1 rows to determine if a next page exists.
     */
    async selectWithFilters(filters: ListFilters): Promise<PoliticianWithScore[]> {
      const conditions = [eq(politicians.active, true)]

      if (filters.role !== undefined) {
        conditions.push(eq(politicians.role, filters.role))
      }
      if (filters.state !== undefined) {
        conditions.push(eq(politicians.state, filters.state))
      }
      if (filters.search !== undefined) {
        conditions.push(
          sql`${politicians.searchVector} @@ plainto_tsquery('simple', unaccent(${filters.search}))`,
        )
      }
      if (filters.cursor !== undefined) {
        const { overallScore, politicianId } = filters.cursor
        // Composite cursor: (score < cursorScore) OR (score = cursorScore AND id < cursorId)
        // This is the correct decomposition of (score, id) < (cursorScore, cursorId) DESC
        const cursorCondition = or(
          lt(integrityScores.overallScore, overallScore),
          and(
            eq(integrityScores.overallScore, overallScore),
            lt(politicians.id, politicianId),
          ),
        )
        // or() returns SQL<unknown> | undefined; with 2 args it's always defined but TypeScript
        // doesn't know that — guard prevents undefined from entering the conditions array
        if (cursorCondition !== undefined) {
          conditions.push(cursorCondition)
        }
      }

      const rows = await db
        .select({
          id: politicians.id,
          slug: politicians.slug,
          name: politicians.name,
          party: politicians.party,
          state: politicians.state,
          role: politicians.role,
          photoUrl: politicians.photoUrl,
          tenureStartDate: politicians.tenureStartDate,
          overallScore: integrityScores.overallScore,
        })
        .from(politicians)
        .innerJoin(integrityScores, eq(politicians.id, integrityScores.politicianId))
        .where(and(...conditions))
        .orderBy(desc(integrityScores.overallScore), desc(politicians.id))
        .limit(filters.limit + 1) // +1 to detect hasMore

      return rows.map((row) => ({
        ...row,
        photoUrl: row.photoUrl ?? null,
        tenureStartDate: row.tenureStartDate ?? null,
        overallScore: Number(row.overallScore),
      }))
    },
  }
}

export type PoliticianRepository = ReturnType<typeof createPoliticianRepository>
