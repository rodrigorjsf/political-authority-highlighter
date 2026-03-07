import type { BillRepository, BillRow } from '../repositories/bill.repository.js'
import type { BillDto, BillListResponseDto } from '../schemas/bill.schema.js'

interface BillCursor {
  submissionDate: string
  billId: string
}

function encodeCursor(cursor: BillCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

function decodeCursor(encoded: string): BillCursor {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as BillCursor
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
  limit: number
  cursor?: string | undefined
}

/** Service for bill queries: cursor encoding and response shaping. */
export function createBillService(repository: BillRepository): {
  findByPoliticianSlug: (slug: string, input: FindBillsInput) => Promise<BillListResponseDto>
} {
  return {
    async findByPoliticianSlug(
      slug: string,
      input: FindBillsInput,
    ): Promise<BillListResponseDto> {
      const decodedCursor = input.cursor !== undefined ? decodeCursor(input.cursor) : undefined

      const rows = await repository.selectByPoliticianSlug(slug, {
        limit: input.limit,
        cursor: decodedCursor,
      })

      const hasMore = rows.length > input.limit
      const data = hasMore ? rows.slice(0, input.limit) : rows

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
