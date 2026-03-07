import type { VoteRepository, VoteRow } from '../repositories/vote.repository.js'
import type { VoteDto, VoteListResponseDto } from '../schemas/vote.schema.js'

interface VoteCursor {
  sessionDate: string
  voteId: string
}

function encodeCursor(cursor: VoteCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

function decodeCursor(encoded: string): VoteCursor {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as VoteCursor
  } catch {
    throw new Error('Invalid cursor')
  }
}

function toVoteDto(row: VoteRow): VoteDto {
  return {
    id: row.id,
    externalId: row.externalId,
    source: row.source,
    sessionDate: row.sessionDate,
    matterDescription: row.matterDescription,
    voteCast: row.voteCast,
    sessionResult: row.sessionResult,
    sourceUrl: row.sourceUrl,
  }
}

export interface FindVotesInput {
  limit: number
  cursor?: string | undefined
}

/** Service for vote queries: cursor encoding, participation rate, and response shaping. */
export function createVoteService(repository: VoteRepository): {
  findByPoliticianSlug: (slug: string, input: FindVotesInput) => Promise<VoteListResponseDto>
} {
  return {
    async findByPoliticianSlug(
      slug: string,
      input: FindVotesInput,
    ): Promise<VoteListResponseDto> {
      const decodedCursor = input.cursor !== undefined ? decodeCursor(input.cursor) : undefined

      // Run participation rate and paginated query in parallel
      const [rateResult, rows] = await Promise.all([
        repository.selectParticipationRate(slug),
        repository.selectByPoliticianSlug(slug, {
          limit: input.limit,
          cursor: decodedCursor,
        }),
      ])

      const participationRate =
        rateResult.total > 0 ? rateResult.present / rateResult.total : 0

      const hasMore = rows.length > input.limit
      const data = hasMore ? rows.slice(0, input.limit) : rows

      const lastRow = data.at(-1)
      const nextCursor =
        hasMore && lastRow !== undefined
          ? encodeCursor({ sessionDate: lastRow.sessionDate, voteId: lastRow.id })
          : null

      return { data: data.map(toVoteDto), cursor: nextCursor, participationRate }
    },
  }
}

export type VoteService = ReturnType<typeof createVoteService>
