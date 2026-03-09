import type { ProposalRepository, ProposalRow } from '../repositories/proposal.repository.js'
import type { ProposalDto, ProposalListResponseDto } from '../schemas/proposal.schema.js'

interface ProposalCursor {
  submissionDate: string
  proposalId: string
}

function encodeCursor(cursor: ProposalCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

function decodeCursor(encoded: string): ProposalCursor {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as ProposalCursor
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
  limit: number
  cursor?: string | undefined
}

/** Service for proposal queries: cursor encoding and response shaping. */
export function createProposalService(repository: ProposalRepository): {
  findByPoliticianSlug: (slug: string, input: FindProposalsInput) => Promise<ProposalListResponseDto>
} {
  return {
    async findByPoliticianSlug(
      slug: string,
      input: FindProposalsInput,
    ): Promise<ProposalListResponseDto> {
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
          ? encodeCursor({ submissionDate: lastRow.submissionDate, proposalId: lastRow.id })
          : null

      return { data: data.map(toProposalDto), cursor: nextCursor }
    },
  }
}

export type ProposalService = ReturnType<typeof createProposalService>
