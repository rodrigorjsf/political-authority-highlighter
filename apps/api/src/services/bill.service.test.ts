import { describe, it, expect, vi } from 'vitest'
import { createBillService } from './bill.service.js'
import type { BillRepository, BillRow } from '../repositories/bill.repository.js'

function buildRow(overrides: Partial<BillRow> = {}): BillRow {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    externalId: 'PL-123-2024',
    source: 'camara',
    title: 'Dispõe sobre a criação de comitê parlamentar',
    billType: 'PL',
    billNumber: '123',
    billYear: 2024,
    status: 'Em tramitação',
    submissionDate: '2024-03-01',
    sourceUrl: null,
    ...overrides,
  }
}

function buildRepository(rows: BillRow[] = []): BillRepository {
  return {
    selectByPoliticianSlug: vi.fn().mockResolvedValue(rows),
  }
}

describe('createBillService', () => {
  describe('findByPoliticianSlug', () => {
    it('returns empty data and null cursor when repository returns no rows', async () => {
      const service = createBillService(buildRepository([]))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.data).toHaveLength(0)
      expect(result.cursor).toBeNull()
    })

    it('returns rows mapped to BillDto', async () => {
      const row = buildRow()
      const service = createBillService(buildRepository([row]))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
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
      })
    })

    it('returns null cursor when rows <= limit', async () => {
      const rows = [buildRow(), buildRow({ id: 'other-id', externalId: 'PL-124-2024' })]
      const service = createBillService(buildRepository(rows))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 20 })
      expect(result.cursor).toBeNull()
    })

    it('returns non-null cursor and slices data when repository returns limit+1 rows', async () => {
      const rows = [
        buildRow({ id: 'id-1', externalId: 'e1', submissionDate: '2024-03-03' }),
        buildRow({ id: 'id-2', externalId: 'e2', submissionDate: '2024-03-02' }),
        buildRow({ id: 'id-3', externalId: 'e3', submissionDate: '2024-03-01' }),
      ]
      const service = createBillService(buildRepository(rows))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 2 })
      expect(result.data).toHaveLength(2)
      expect(result.cursor).not.toBeNull()
    })

    it('cursor encodes the last item submissionDate and id', async () => {
      const rows = [
        buildRow({ id: 'id-1', externalId: 'e1', submissionDate: '2024-03-03' }),
        buildRow({ id: 'id-2', externalId: 'e2', submissionDate: '2024-03-02' }),
      ]
      const service = createBillService(buildRepository(rows))
      const result = await service.findByPoliticianSlug('joao-silva-sp', { limit: 1 })
      expect(result.cursor).not.toBeNull()
      const decoded: unknown = JSON.parse(
        Buffer.from(result.cursor!, 'base64url').toString('utf-8'),
      )
      expect(decoded).toEqual({ submissionDate: '2024-03-03', billId: 'id-1' })
    })
  })
})
