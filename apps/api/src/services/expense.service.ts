import { Buffer } from 'node:buffer'
import type { ExpenseRepository, ExpenseRow } from '../repositories/expense.repository.js'
import type { ExpenseDto, ExpenseListResponseDto } from '../schemas/expense.schema.js'

/**
 * Cursor for keyset pagination on expenses (year, month, id).
 * Encoded as base64url for transport in URL query strings.
 */
interface ExpenseCursor {
  year: number
  month: number
  expenseId: string
}

export function createExpenseService(expenseRepository: ExpenseRepository) {
  return {
    /**
     * Fetches paginated expenses for a politician with yearly totals aggregation.
     * Uses cursor-based pagination for stable ordering across data changes.
     */
    async findByPoliticianSlug(
      slug: string,
      cursor?: string,
      limit: number = 20,
    ): Promise<ExpenseListResponseDto> {
      const decodedCursor = cursor ? decodeCursor(cursor) : undefined

      // Fetch one extra to determine if there's a next page
      const [rows, yearlyTotals] = await Promise.all([
        expenseRepository.selectByPoliticianSlug(slug, { limit, cursor: decodedCursor }),
        expenseRepository.selectYearlyTotals(slug),
      ])

      // Split results: actual data vs. hasMore indicator
      const hasMore = rows.length > limit
      const data = rows.slice(0, limit).map(toExpenseDto)

      // Encode next cursor from last row
      const nextCursor = hasMore && data.length > 0 ? encodeCursor(rows[limit]!) : null

      return {
        data,
        cursor: nextCursor,
        yearlyTotals: yearlyTotals.map((yt) => ({
          year: yt.year,
          total: Number(yt.total ?? 0),
        })),
      }
    },
  }
}

/**
 * Converts a database row to a DTO with numeric amount conversion.
 * Drizzle returns numeric(12,2) as a string; this normalizes to number.
 */
function toExpenseDto(row: ExpenseRow): ExpenseDto {
  return {
    id: row.id,
    externalId: row.externalId,
    source: row.source,
    year: row.year,
    month: row.month,
    category: row.category,
    supplierName: row.supplierName,
    amount: Number(row.amount),
    documentNumber: row.documentNumber,
    sourceUrl: row.sourceUrl,
  }
}

/**
 * Encodes a cursor to base64url for URL transport.
 */
function encodeCursor(row: ExpenseRow): string {
  const cursor: ExpenseCursor = {
    year: row.year,
    month: row.month,
    expenseId: row.id,
  }
  const json = JSON.stringify(cursor)
  return Buffer.from(json, 'utf8').toString('base64url')
}

/**
 * Decodes a base64url cursor.
 */
function decodeCursor(encoded: string): ExpenseCursor {
  const json = Buffer.from(encoded, 'base64url').toString('utf8')
  return JSON.parse(json) as ExpenseCursor
}

export type ExpenseService = ReturnType<typeof createExpenseService>
