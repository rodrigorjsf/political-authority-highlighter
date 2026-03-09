import { eq, and, lt, or, desc } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { proposals, politicians } from '@pah/db/public-schema'

export interface ProposalRow {
  id: string
  externalId: string
  source: string
  proposalType: string
  proposalNumber: string
  proposalYear: number
  summary: string
  status: string
  submissionDate: string // Drizzle returns date as string 'YYYY-MM-DD'
  sourceUrl: string | null
}

export interface ProposalListFilters {
  limit: number
  cursor?: { submissionDate: string; proposalId: string } | undefined
}

/**
 * Repository for public_data.proposals queries.
 * Cursor pagination on (submission_date DESC, id DESC) matching the keyset pattern.
 */
export function createProposalRepository(db: PublicDb): {
  selectByPoliticianSlug: (slug: string, filters: ProposalListFilters) => Promise<ProposalRow[]>
} {
  return {
    async selectByPoliticianSlug(slug: string, filters: ProposalListFilters): Promise<ProposalRow[]> {
      const conditions = [eq(politicians.active, true)]

      if (filters.cursor !== undefined) {
        const { submissionDate, proposalId } = filters.cursor
        const cursorCondition = or(
          lt(proposals.submissionDate, submissionDate),
          and(eq(proposals.submissionDate, submissionDate), lt(proposals.id, proposalId)),
        )
        // or() returns SQL<unknown> | undefined — guard before pushing
        if (cursorCondition !== undefined) {
          conditions.push(cursorCondition)
        }
      }

      const rows = await db
        .select({
          id: proposals.id,
          externalId: proposals.externalId,
          source: proposals.source,
          proposalType: proposals.proposalType,
          proposalNumber: proposals.proposalNumber,
          proposalYear: proposals.proposalYear,
          summary: proposals.summary,
          status: proposals.status,
          submissionDate: proposals.submissionDate,
          sourceUrl: proposals.sourceUrl,
        })
        .from(proposals)
        .innerJoin(politicians, eq(proposals.politicianId, politicians.id))
        .where(and(eq(politicians.slug, slug), ...conditions))
        .orderBy(desc(proposals.submissionDate), desc(proposals.id))
        .limit(filters.limit + 1)

      return rows.map((row) => ({
        ...row,
        sourceUrl: row.sourceUrl ?? null,
        proposalYear: Number(row.proposalYear),
      }))
    },
  }
}

export type ProposalRepository = ReturnType<typeof createProposalRepository>
