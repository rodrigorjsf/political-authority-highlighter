import type { PoliticianRepository, PoliticianWithScore } from '../repositories/politician.repository.js'
import type { PoliticianCardDto } from '../schemas/politician.schema.js'

interface Cursor {
  overallScore: number
  politicianId: string
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

function decodeCursor(encoded: string): Cursor {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as Cursor
  } catch {
    throw new Error('Invalid cursor')
  }
}

function toPoliticianCardDto(row: PoliticianWithScore): PoliticianCardDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    party: row.party,
    state: row.state,
    role: row.role,
    photoUrl: row.photoUrl,
    tenureStartDate: row.tenureStartDate,
    overallScore: row.overallScore,
  }
}

export interface FindByFiltersInput {
  limit: number
  cursor?: string | undefined
  role?: string | undefined
  state?: string | undefined
}

export interface FindByFiltersResult {
  data: PoliticianCardDto[]
  cursor: string | null
}

/**
 * Finds politicians by filters with cursor-based pagination.
 * Returns limit politicians + a cursor string if more exist.
 */
export function createPoliticianService(repository: PoliticianRepository): {
  findByFilters: (input: FindByFiltersInput) => Promise<FindByFiltersResult>
} {
  return {
    async findByFilters(input: FindByFiltersInput): Promise<FindByFiltersResult> {
      const decodedCursor = input.cursor !== undefined ? decodeCursor(input.cursor) : undefined

      const rows = await repository.selectWithFilters({
        limit: input.limit,
        cursor: decodedCursor,
        role: input.role,
        state: input.state,
      })

      const hasMore = rows.length > input.limit
      const data = hasMore ? rows.slice(0, input.limit) : rows

      const lastRow = data.at(-1) // safe: .at(-1) handles noUncheckedIndexedAccess
      const nextCursor =
        hasMore && lastRow !== undefined
          ? encodeCursor({ overallScore: lastRow.overallScore, politicianId: lastRow.id })
          : null

      return { data: data.map(toPoliticianCardDto), cursor: nextCursor }
    },
  }
}

export type PoliticianService = ReturnType<typeof createPoliticianService>
