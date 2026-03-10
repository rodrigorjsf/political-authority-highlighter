import { eq, and, lt, or, desc } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { bills, politicians } from '@pah/db/public-schema'

export interface BillRow {
  id: string
  externalId: string
  source: string
  title: string
  billType: string
  billNumber: string
  billYear: number
  status: string
  submissionDate: string // Drizzle returns date as string 'YYYY-MM-DD'
  sourceUrl: string | null
}

export interface BillListFilters {
  limit: number
  cursor?: { submissionDate: string; billId: string } | undefined
}

/**
 * Repository for public.bills queries.
 * Cursor pagination on (submission_date DESC, id DESC) matching the keyset pattern.
 */
export function createBillRepository(db: PublicDb): {
  selectByPoliticianSlug: (slug: string, filters: BillListFilters) => Promise<BillRow[]>
} {
  return {
    async selectByPoliticianSlug(slug: string, filters: BillListFilters): Promise<BillRow[]> {
      const conditions = [eq(politicians.active, true)]

      if (filters.cursor !== undefined) {
        const { submissionDate, billId } = filters.cursor
        const cursorCondition = or(
          lt(bills.submissionDate, submissionDate),
          and(eq(bills.submissionDate, submissionDate), lt(bills.id, billId)),
        )
        // or() returns SQL<unknown> | undefined — guard before pushing
        if (cursorCondition !== undefined) {
          conditions.push(cursorCondition)
        }
      }

      const rows = await db
        .select({
          id: bills.id,
          externalId: bills.externalId,
          source: bills.source,
          title: bills.title,
          billType: bills.billType,
          billNumber: bills.billNumber,
          billYear: bills.billYear,
          status: bills.status,
          submissionDate: bills.submissionDate,
          sourceUrl: bills.sourceUrl,
        })
        .from(bills)
        .innerJoin(politicians, eq(bills.politicianId, politicians.id))
        .where(and(eq(politicians.slug, slug), ...conditions))
        .orderBy(desc(bills.submissionDate), desc(bills.id))
        .limit(filters.limit + 1)

      return rows.map((row) => ({
        ...row,
        sourceUrl: row.sourceUrl ?? null,
        billYear: Number(row.billYear),
      }))
    },
  }
}

export type BillRepository = ReturnType<typeof createBillRepository>
