import { z } from 'zod'
import type { BillRepository, BillRow } from '../repositories/bill.repository.js'
import type { BillDto, BillListResponseDto } from '../schemas/bill.schema.js'

const BillCursorSchema = z.object({
  submissionDate: z.string(),
  billId: z.string().uuid(),
})

export interface BillCursor {
  submissionDate: string
  billId: string
}

function encodeCursor(cursor: BillCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

function decodeCursor(encoded: string): BillCursor {
  try {
    const raw: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'))
    const parsed = BillCursorSchema.parse(raw)
    
    if (parsed.submissionDate === undefined || parsed.billId === undefined) {
      throw new Error('Invalid cursor data')
    }
    
    return {
      submissionDate: parsed.submissionDate,
      billId: parsed.billId,
    }
  } catch {
    throw new Error('Invalid cursor')
  }
}

function toBillDto(row: BillRow): BillDto {
  return {
    id: row.id,
    externalId: row.externalId,
    source: row.source,
    title: row.title,
    billType: row.billType,
    billNumber: row.billNumber,
    billYear: row.billYear,
    status: row.status,
    submissionDate: row.submissionDate,
    sourceUrl: row.sourceUrl,
  }
}

export interface FindBillsInput {
  slug: string
  limit: number
  cursor?: string | undefined
}

/** Service for bill queries: cursor encoding and response shaping. */
export function createBillService(repository: BillRepository): {
  findByPoliticianSlug: (input: FindBillsInput) => Promise<BillListResponseDto>
} {
  return {
    async findByPoliticianSlug({
      slug,
      limit,
      cursor,
    }: FindBillsInput): Promise<BillListResponseDto> {
      const decodedCursor = cursor !== undefined ? decodeCursor(cursor) : undefined

      const rows = await repository.selectByPoliticianSlug(slug, {
        limit,
        cursor: decodedCursor,
      })

      const hasMore = rows.length > limit
      const data = hasMore ? rows.slice(0, limit) : rows

      const lastRow = data.at(-1)
      const nextCursor =
        hasMore && lastRow !== undefined
          ? encodeCursor({ submissionDate: lastRow.submissionDate, billId: lastRow.id })
          : null

      return { data: data.map(toBillDto), cursor: nextCursor }
    },
  }
}

export type BillService = ReturnType<typeof createBillService>
