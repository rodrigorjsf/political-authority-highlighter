import { eq, and, lt, or, desc, sum } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { expenses, politicians } from '@pah/db/public-schema'

export interface ExpenseRow {
  id: string
  externalId: string
  source: string
  year: number
  month: number
  category: string
  supplierName: string
  amount: string // Drizzle returns numeric as string — service converts with Number()
  documentNumber: string | null
  sourceUrl: string | null
}

export interface ExpenseListFilters {
  limit: number
  cursor?: { year: number; month: number; expenseId: string } | undefined
}

/**
 * Repository for public.expenses queries.
 * Cursor pagination on (year DESC, month DESC, id DESC) for stable ordering.
 */
export function createExpenseRepository(db: PublicDb): {
  selectByPoliticianSlug: (slug: string, filters: ExpenseListFilters) => Promise<ExpenseRow[]>
  selectYearlyTotals: (slug: string) => Promise<Array<{ year: number; total: string | null }>>
} {
  return {
    async selectByPoliticianSlug(
      slug: string,
      filters: ExpenseListFilters,
    ): Promise<ExpenseRow[]> {
      const conditions = [eq(politicians.active, true)]

      if (filters.cursor !== undefined) {
        const { year, month, expenseId } = filters.cursor
        const cursorCondition = or(
          lt(expenses.year, year),
          and(eq(expenses.year, year), lt(expenses.month, month)),
          and(eq(expenses.year, year), eq(expenses.month, month), lt(expenses.id, expenseId)),
        )
        if (cursorCondition !== undefined) {
          conditions.push(cursorCondition)
        }
      }

      const rows = await db
        .select({
          id: expenses.id,
          externalId: expenses.externalId,
          source: expenses.source,
          year: expenses.year,
          month: expenses.month,
          category: expenses.category,
          supplierName: expenses.supplierName,
          amount: expenses.amount,
          documentNumber: expenses.documentNumber,
          sourceUrl: expenses.sourceUrl,
        })
        .from(expenses)
        .innerJoin(politicians, eq(expenses.politicianId, politicians.id))
        .where(and(eq(politicians.slug, slug), ...conditions))
        .orderBy(desc(expenses.year), desc(expenses.month), desc(expenses.id))
        .limit(filters.limit + 1)

      return rows.map((row) => ({
        ...row,
        documentNumber: row.documentNumber ?? null,
        sourceUrl: row.sourceUrl ?? null,
      }))
    },

    async selectYearlyTotals(
      slug: string,
    ): Promise<Array<{ year: number; total: string | null }>> {
      return db
        .select({ year: expenses.year, total: sum(expenses.amount) })
        .from(expenses)
        .innerJoin(politicians, eq(expenses.politicianId, politicians.id))
        .where(and(eq(politicians.slug, slug), eq(politicians.active, true)))
        .groupBy(expenses.year)
        .orderBy(desc(expenses.year))
    },
  }
}

export type ExpenseRepository = ReturnType<typeof createExpenseRepository>
