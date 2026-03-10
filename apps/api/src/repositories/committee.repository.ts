import { eq, and, desc } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { committees, politicians } from '@pah/db/public-schema'

export interface CommitteeRow {
  id: string
  externalId: string
  source: string
  committeeName: string
  role: string
  startDate: string // Drizzle returns date as string 'YYYY-MM-DD'
  endDate: string | null
}

/**
 * Repository for public.committees queries.
 * No pagination — committee memberships are small (< 20 per politician).
 */
export function createCommitteeRepository(db: PublicDb): {
  selectByPoliticianSlug: (slug: string) => Promise<CommitteeRow[]>
} {
  return {
    async selectByPoliticianSlug(slug: string): Promise<CommitteeRow[]> {
      const rows = await db
        .select({
          id: committees.id,
          externalId: committees.externalId,
          source: committees.source,
          committeeName: committees.committeeName,
          role: committees.role,
          startDate: committees.startDate,
          endDate: committees.endDate,
        })
        .from(committees)
        .innerJoin(politicians, eq(committees.politicianId, politicians.id))
        .where(and(eq(politicians.slug, slug), eq(politicians.active, true)))
        .orderBy(desc(committees.startDate))

      return rows.map((row) => ({ ...row, endDate: row.endDate ?? null }))
    },
  }
}

export type CommitteeRepository = ReturnType<typeof createCommitteeRepository>
