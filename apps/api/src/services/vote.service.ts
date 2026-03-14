import { z } from 'zod'
import type { VoteRepository, VoteRow } from '../repositories/vote.repository.js'
import type { VoteDto, VoteListResponseDto } from '../schemas/vote.schema.js'

const VoteCursorSchema = z.object({
  sessionDate: z.string(),
  voteId: z.string().uuid(),
})

type VoteCursor = z.infer<typeof VoteCursorSchema>

function encodeCursor(cursor: VoteCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

function decodeCursor(encoded: string): VoteCursor {
  try {
    const raw: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'))
    return VoteCursorSchema.parse(raw)
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
  slug: string
  limit: number
  cursor?: string | undefined
}

/** Service for vote queries: cursor encoding, participation rate, and response shaping. */
export function createVoteService(repository: VoteRepository): {
  findByPoliticianSlug: (input: FindVotesInput) => Promise<VoteListResponseDto>
} {
  return {
    async findByPoliticianSlug({
      slug,
      limit,
      cursor,
    }: FindVotesInput): Promise<VoteListResponseDto> {
      const decodedCursor = cursor !== undefined ? decodeCursor(cursor) : undefined

      // Run participation rate and paginated query in parallel
      const [rateResult, rows] = await Promise.all([
        repository.selectParticipationRate(slug),
        repository.selectByPoliticianSlug(slug, {
          limit,
          cursor: decodedCursor,
        }),
      ])

      const participationRate =
        rateResult.total > 0 ? rateResult.present / rateResult.total : 0

      const hasMore = rows.length > limit
      const data = hasMore ? rows.slice(0, limit) : rows

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
