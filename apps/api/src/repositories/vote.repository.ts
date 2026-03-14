import { eq, and, lt, or, desc, count, sql } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { votes, politicians } from '@pah/db/public-schema'
import type { LegislativeSource } from '@pah/shared'

export interface VoteRow {
  id: string
  externalId: string
  source: LegislativeSource
  sessionDate: string // Drizzle returns date as string 'YYYY-MM-DD'
  matterDescription: string
  voteCast: string
  sessionResult: string
  sourceUrl: string | null
}

export interface VoteListFilters {
  limit: number
  cursor?: { sessionDate: string; voteId: string } | undefined
}

/**
 * Repository for public.votes queries.
 * Cursor pagination on (session_date DESC, id DESC) matching the keyset pattern.
 */
export function createVoteRepository(db: PublicDb): {
  selectByPoliticianSlug: (slug: string, filters: VoteListFilters) => Promise<VoteRow[]>
  selectParticipationRate: (slug: string) => Promise<{ total: number; present: number }>
} {
  return {
    async selectByPoliticianSlug(slug: string, filters: VoteListFilters): Promise<VoteRow[]> {
      const conditions = [eq(politicians.active, true)]

      if (filters.cursor !== undefined) {
        const { sessionDate, voteId } = filters.cursor
        const cursorCondition = or(
          lt(votes.sessionDate, sessionDate),
          and(eq(votes.sessionDate, sessionDate), lt(votes.id, voteId)),
        )
        // or() returns SQL<unknown> | undefined — guard before pushing
        if (cursorCondition !== undefined) {
          conditions.push(cursorCondition)
        }
      }

      const rows = await db
        .select({
          id: votes.id,
          externalId: votes.externalId,
          source: votes.source,
          sessionDate: votes.sessionDate,
          matterDescription: votes.matterDescription,
          voteCast: votes.voteCast,
          sessionResult: votes.sessionResult,
          sourceUrl: votes.sourceUrl,
        })
        .from(votes)
        .innerJoin(politicians, eq(votes.politicianId, politicians.id))
        .where(and(eq(politicians.slug, slug), ...conditions))
        .orderBy(desc(votes.sessionDate), desc(votes.id))
        .limit(filters.limit + 1)

      return rows.map((row) => ({
        ...row,
        // Drizzle returns varchar as string; DB enforces 'camara'|'senado' — cast is safe here
        source: row.source as LegislativeSource,
        sourceUrl: row.sourceUrl ?? null,
      }))
    },

    async selectParticipationRate(
      slug: string,
    ): Promise<{ total: number; present: number }> {
      const rows = await db
        .select({
          total: count(),
          present: count(sql`CASE WHEN ${votes.voteCast} != 'ausente' THEN 1 END`),
        })
        .from(votes)
        .innerJoin(politicians, eq(votes.politicianId, politicians.id))
        .where(and(eq(politicians.slug, slug), eq(politicians.active, true)))

      const row = rows.at(0)
      // PostgreSQL count() returns bigint — pg driver may return string — use Number()
      return { total: Number(row?.total ?? 0), present: Number(row?.present ?? 0) }
    },
  }
}

export type VoteRepository = ReturnType<typeof createVoteRepository>
