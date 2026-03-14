import { z } from 'zod'
import type { ProposalRepository, ProposalRow } from '../repositories/proposal.repository.js'
import type { ProposalDto, ProposalListResponseDto } from '../schemas/proposal.schema.js'

const ProposalCursorSchema = z.object({
  submissionDate: z.string(),
  proposalId: z.string().uuid(),
})

type ProposalCursor = z.infer<typeof ProposalCursorSchema>

function encodeCursor(cursor: ProposalCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

function decodeCursor(encoded: string): ProposalCursor {
  try {
    const raw: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'))
    return ProposalCursorSchema.parse(raw)
  } catch {
    throw new Error('Invalid cursor')
  }
}

function toProposalDto(row: ProposalRow): ProposalDto {
  return {
    id: row.id,
    externalId: row.externalId,
    source: row.source,
    proposalType: row.proposalType,
    proposalNumber: row.proposalNumber,
    proposalYear: row.proposalYear,
    summary: row.summary,
    status: row.status,
    submissionDate: row.submissionDate,
    sourceUrl: row.sourceUrl,
  }
}

export interface FindProposalsInput {
  slug: string
  limit: number
  cursor?: string | undefined
}

/** Service for proposal queries: cursor encoding and response shaping. */
export function createProposalService(repository: ProposalRepository): {
  findByPoliticianSlug: (input: FindProposalsInput) => Promise<ProposalListResponseDto>
} {
  return {
    async findByPoliticianSlug({
      slug,
      limit,
      cursor,
    }: FindProposalsInput): Promise<ProposalListResponseDto> {
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
          ? encodeCursor({ submissionDate: lastRow.submissionDate, proposalId: lastRow.id })
          : null

      return { data: data.map(toProposalDto), cursor: nextCursor }
    },
  }
}

export type ProposalService = ReturnType<typeof createProposalService>
