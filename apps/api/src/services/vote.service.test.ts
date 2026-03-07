import { describe, it, expect, vi } from 'vitest'
import { createVoteService } from './vote.service.js'
import type { VoteRepository, VoteRow } from '../repositories/vote.repository.js'

function buildRow(overrides: Partial<VoteRow> = {}): VoteRow {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    externalId: 'VT-123-2024',
    source: 'camara',
    sessionDate: '2024-03-01',
    matterDescription: 'PL 1234/2023 — Dispõe sobre a criação de comitê parlamentar',
    voteCast: 'sim',
    sessionResult: 'Aprovado',
    sourceUrl: null,
    ...overrides,
  }
}

function buildRepository(
  rows: VoteRow[] = [],
  rate = { total: 0, present: 0 },
): VoteRepository {
  return {
    selectByPoliticianSlug: vi.fn().mockResolvedValue(rows),
    selectParticipationRate: vi.fn().mockResolvedValue(rate),
  }
}

describe('createVoteService', () => {
  describe('findByPoliticianSlug', () => {
    it('returns empty data, null cursor, and 0 participationRate when no rows', async () => {
      const service = createVoteService(buildRepository([], { total: 0, present: 0 }))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.data).toHaveLength(0)
      expect(result.cursor).toBeNull()
      expect(result.participationRate).toBe(0)
    })

    it('returns rows mapped to VoteDto', async () => {
      const row = buildRow()
      const service = createVoteService(buildRepository([row], { total: 10, present: 8 }))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
        id: row.id,
        externalId: row.externalId,
        source: row.source,
        sessionDate: row.sessionDate,
        matterDescription: row.matterDescription,
        voteCast: row.voteCast,
        sessionResult: row.sessionResult,
        sourceUrl: row.sourceUrl,
      })
    })

    it('returns null cursor when rows <= limit', async () => {
      const rows = [buildRow(), buildRow({ id: 'other-id', externalId: 'VT-124-2024' })]
      const service = createVoteService(buildRepository(rows, { total: 2, present: 2 }))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.cursor).toBeNull()
    })

    it('returns non-null cursor and slices data when repository returns limit+1 rows', async () => {
      const rows = [
        buildRow({ id: 'id-1', externalId: 'e1', sessionDate: '2024-03-03' }),
        buildRow({ id: 'id-2', externalId: 'e2', sessionDate: '2024-03-02' }),
        buildRow({ id: 'id-3', externalId: 'e3', sessionDate: '2024-03-01' }),
      ]
      const service = createVoteService(buildRepository(rows, { total: 3, present: 3 }))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 2 })
      expect(result.data).toHaveLength(2)
      expect(result.cursor).not.toBeNull()
    })

    it('cursor encodes the last item sessionDate and voteId', async () => {
      const rows = [
        buildRow({ id: 'id-1', externalId: 'e1', sessionDate: '2024-03-03' }),
        buildRow({ id: 'id-2', externalId: 'e2', sessionDate: '2024-03-02' }),
      ]
      const service = createVoteService(buildRepository(rows, { total: 2, present: 2 }))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 1 })
      expect(result.cursor).not.toBeNull()
      const decoded: unknown = JSON.parse(
        Buffer.from(result.cursor!, 'base64url').toString('utf-8'),
      )
      expect(decoded).toEqual({ sessionDate: '2024-03-03', voteId: 'id-1' })
    })

    it('participation rate is 0 when total is 0', async () => {
      const service = createVoteService(buildRepository([], { total: 0, present: 0 }))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.participationRate).toBe(0)
    })

    it('participation rate is computed as present/total', async () => {
      const row = buildRow()
      const service = createVoteService(buildRepository([row], { total: 100, present: 87 }))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.participationRate).toBe(0.87)
    })
  })
})
