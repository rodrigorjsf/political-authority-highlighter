import { describe, it, expect, vi } from 'vitest'
import { createSourceService } from './source.service.js'
import type { SourceRepository, SourceStatusRow } from '../repositories/source.repository.js'

function buildSourceRow(overrides: Partial<SourceStatusRow> = {}): SourceStatusRow {
  return {
    id: 'test-uuid',
    source: 'camara',
    lastSyncAt: null,
    recordCount: 0,
    status: 'pending',
    createdAt: new Date('2026-03-11T00:00:00Z'),
    updatedAt: new Date('2026-03-11T00:00:00Z'),
    ...overrides,
  }
}

function buildRepository(rows: SourceStatusRow[] = []): SourceRepository {
  return { selectAll: vi.fn().mockResolvedValue(rows) }
}

describe('createSourceService', () => {
  describe('findAll', () => {
    it('returns empty data array when no rows', async () => {
      const service = createSourceService(buildRepository([]))
      const result = await service.findAll()
      expect(result).toEqual({ data: [] })
    })

    it('maps rows to DTOs with ISO date strings', async () => {
      const syncAt = new Date('2026-03-10T02:00:00.000Z')
      const service = createSourceService(
        buildRepository([
          buildSourceRow({ source: 'camara', lastSyncAt: syncAt, status: 'synced', recordCount: 594 }),
        ]),
      )
      const result = await service.findAll()
      expect(result.data[0]).toMatchObject({
        source: 'camara',
        lastSyncAt: '2026-03-10T02:00:00.000Z',
        recordCount: 594,
        status: 'synced',
      })
    })

    it('maps null lastSyncAt to null in DTO', async () => {
      const service = createSourceService(buildRepository([buildSourceRow({ lastSyncAt: null })]))
      const result = await service.findAll()
      expect(result.data[0]?.lastSyncAt).toBeNull()
    })

    it('maps updatedAt to ISO string', async () => {
      const updatedAt = new Date('2026-03-11T10:30:00.000Z')
      const service = createSourceService(buildRepository([buildSourceRow({ updatedAt })]))
      const result = await service.findAll()
      expect(result.data[0]?.updatedAt).toBe('2026-03-11T10:30:00.000Z')
    })

    it('returns all rows from repository', async () => {
      const rows = [
        buildSourceRow({ source: 'camara' }),
        buildSourceRow({ source: 'senado' }),
        buildSourceRow({ source: 'tcu' }),
      ]
      const service = createSourceService(buildRepository(rows))
      const result = await service.findAll()
      expect(result.data).toHaveLength(3)
    })
  })
})
