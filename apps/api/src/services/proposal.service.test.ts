import { describe, it, expect, vi } from 'vitest'
import { createProposalService } from './proposal.service.js'
import { LegislativeSource } from '@pah/shared'
import type { ProposalRepository, ProposalRow } from '../repositories/proposal.repository.js'

function buildRow(overrides: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    externalId: 'PL-123-2024',
    source: LegislativeSource.CAMARA,
    proposalType: 'PL',
    proposalNumber: '123',
    proposalYear: 2024,
    summary: 'Dispõe sobre a criação de programa social',
    status: 'Em análise',
    submissionDate: '2024-03-01',
    sourceUrl: null,
    ...overrides,
  }
}

function buildRepository(rows: ProposalRow[] = []): ProposalRepository {
  return {
    selectByPoliticianSlug: vi.fn().mockResolvedValue(rows),
  }
}

describe('createProposalService', () => {
  describe('findByPoliticianSlug', () => {
    it('returns empty data and null cursor when repository returns no rows', async () => {
      const service = createProposalService(buildRepository([]))
      const result = await service.findByPoliticianSlug({ slug: 'joao-silva-sp', limit: 20 })
      expect(result.data).toHaveLength(0)
      expect(result.cursor).toBeNull()
    })

    it('returns rows mapped to ProposalDto', async () => {
      const row = buildRow()
      const service = createProposalService(buildRepository([row]))
      const result = await service.findByPoliticianSlug({ slug: 'joao-silva-sp', limit: 20 })
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
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
      })
    })

    it('returns null cursor when rows <= limit', async () => {
      const rows = [buildRow(), buildRow({ id: 'other-id', externalId: 'PL-124-2024' })]
      const service = createProposalService(buildRepository(rows))
      const result = await service.findByPoliticianSlug({ slug: 'joao-silva-sp', limit: 20 })
      expect(result.cursor).toBeNull()
    })

    it('returns non-null cursor and slices data when repository returns limit+1 rows', async () => {
      const rows = [
        buildRow({ id: 'id-1', externalId: 'e1', submissionDate: '2024-03-03' }),
        buildRow({ id: 'id-2', externalId: 'e2', submissionDate: '2024-03-02' }),
        buildRow({ id: 'id-3', externalId: 'e3', submissionDate: '2024-03-01' }),
      ]
      const service = createProposalService(buildRepository(rows))
      const result = await service.findByPoliticianSlug({ slug: 'joao-silva-sp', limit: 2 })
      expect(result.data).toHaveLength(2)
      expect(result.cursor).not.toBeNull()
    })

    it('cursor encodes the last item submissionDate and proposalId', async () => {
      const rows = [
        buildRow({ id: 'id-1', externalId: 'e1', submissionDate: '2024-03-03' }),
        buildRow({ id: 'id-2', externalId: 'e2', submissionDate: '2024-03-02' }),
      ]
      const service = createProposalService(buildRepository(rows))
      const result = await service.findByPoliticianSlug({ slug: 'joao-silva-sp', limit: 1 })
      expect(result.cursor).not.toBeNull()
      const decoded: unknown = JSON.parse(
        Buffer.from(result.cursor!, 'base64url').toString('utf-8'),
      )
      expect(decoded).toEqual({ submissionDate: '2024-03-03', proposalId: 'id-1' })
    })
  })
})
