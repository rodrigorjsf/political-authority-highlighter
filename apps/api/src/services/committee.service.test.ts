import { describe, it, expect, vi } from 'vitest'
import { createCommitteeService } from './committee.service.js'
import type { CommitteeRepository, CommitteeRow } from '../repositories/committee.repository.js'

function buildRow(overrides: Partial<CommitteeRow> = {}): CommitteeRow {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    externalId: 'COM-123',
    source: 'camara',
    committeeName: 'Comissão de Constituição e Justiça',
    role: 'Titular',
    startDate: '2024-02-01',
    endDate: null,
    ...overrides,
  }
}

function buildRepository(rows: CommitteeRow[] = []): CommitteeRepository {
  return {
    selectByPoliticianSlug: vi.fn().mockResolvedValue(rows),
  }
}

describe('createCommitteeService', () => {
  describe('findByPoliticianSlug', () => {
    it('returns empty data when repository returns no rows', async () => {
      const service = createCommitteeService(buildRepository([]))
      const result = await service.findByPoliticianSlug('joao-silva-sp')
      expect(result.data).toHaveLength(0)
    })

    it('maps rows to CommitteeDto correctly', async () => {
      const row = buildRow()
      const service = createCommitteeService(buildRepository([row]))
      const result = await service.findByPoliticianSlug('joao-silva-sp')
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
        id: row.id,
        externalId: row.externalId,
        source: row.source,
        committeeName: row.committeeName,
        role: row.role,
        startDate: row.startDate,
        endDate: row.endDate,
      })
    })

    it('preserves endDate null for active memberships', async () => {
      const row = buildRow({ endDate: null })
      const service = createCommitteeService(buildRepository([row]))
      const result = await service.findByPoliticianSlug('joao-silva-sp')
      expect(result.data[0]!.endDate).toBeNull()
    })

    it('preserves endDate string for completed memberships', async () => {
      const row = buildRow({ endDate: '2024-12-31' })
      const service = createCommitteeService(buildRepository([row]))
      const result = await service.findByPoliticianSlug('joao-silva-sp')
      expect(result.data[0]!.endDate).toBe('2024-12-31')
    })

    it('returns all rows without pagination', async () => {
      const rows = [
        buildRow({ id: 'id-1', externalId: 'c1' }),
        buildRow({ id: 'id-2', externalId: 'c2' }),
        buildRow({ id: 'id-3', externalId: 'c3' }),
      ]
      const service = createCommitteeService(buildRepository(rows))
      const result = await service.findByPoliticianSlug('joao-silva-sp')
      expect(result.data).toHaveLength(3)
    })
  })
})
