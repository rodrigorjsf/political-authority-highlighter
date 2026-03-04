import { describe, it, expect, vi } from 'vitest'
import { createPoliticianService } from './politician.service.js'
import type {
  PoliticianRepository,
  PoliticianWithScore,
  PoliticianProfileRow,
} from '../repositories/politician.repository.js'

function buildRow(overrides: Partial<PoliticianWithScore> = {}): PoliticianWithScore {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    slug: 'joao-silva-sp',
    name: 'João Silva',
    party: 'PL',
    state: 'SP',
    role: 'deputado',
    photoUrl: null,
    tenureStartDate: '2023-02-01',
    overallScore: 72,
    ...overrides,
  }
}

function buildRepository(
  rows: PoliticianWithScore[] = [],
): PoliticianRepository {
  return {
    selectWithFilters: vi.fn().mockResolvedValue(rows),
    selectBySlug: vi.fn().mockResolvedValue(undefined),
  }
}

describe('createPoliticianService', () => {
  describe('findByFilters', () => {
    it('returns empty data and null cursor when repository returns no rows', async () => {
      const service = createPoliticianService(buildRepository([]))
      const result = await service.findByFilters({ limit: 20 })

      expect(result.data).toHaveLength(0)
      expect(result.cursor).toBeNull()
    })

    it('returns rows mapped to PoliticianCardDto', async () => {
      const row = buildRow()
      const service = createPoliticianService(buildRepository([row]))
      const result = await service.findByFilters({ limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
        id: row.id,
        slug: row.slug,
        name: row.name,
        party: row.party,
        state: row.state,
        role: row.role,
        photoUrl: row.photoUrl,
        tenureStartDate: row.tenureStartDate,
        overallScore: row.overallScore,
      })
    })

    it('returns null cursor when rows <= limit (no more pages)', async () => {
      const rows = [buildRow({ id: '1', slug: 'a' }), buildRow({ id: '2', slug: 'b' })]
      const service = createPoliticianService(buildRepository(rows))
      const result = await service.findByFilters({ limit: 20 })

      expect(result.cursor).toBeNull()
    })

    it('returns non-null cursor when repository returns limit+1 rows', async () => {
      // limit=2, repo returns 3 rows → hasMore=true, cursor points to row 2
      const rows = [
        buildRow({ id: '1', slug: 'a', overallScore: 90 }),
        buildRow({ id: '2', slug: 'b', overallScore: 80 }),
        buildRow({ id: '3', slug: 'c', overallScore: 70 }),
      ]
      const service = createPoliticianService(buildRepository(rows))
      const result = await service.findByFilters({ limit: 2 })

      expect(result.data).toHaveLength(2)
      expect(result.cursor).not.toBeNull()
      expect(typeof result.cursor).toBe('string')
    })

    it('cursor encodes the last item overallScore and id', async () => {
      const rows = [
        buildRow({ id: 'aaa', slug: 'a', overallScore: 95 }),
        buildRow({ id: 'bbb', slug: 'b', overallScore: 80 }),
      ]
      // limit=1 → returns 1 row and cursor pointing to row[0]
      const service = createPoliticianService(buildRepository(rows))
      const result = await service.findByFilters({ limit: 1 })

      expect(result.cursor).not.toBeNull()
      const decoded: unknown = JSON.parse(Buffer.from(result.cursor!, 'base64url').toString('utf-8'))
      expect(decoded).toEqual({ overallScore: 95, politicianId: 'aaa' })
    })

    it('passes decoded cursor to repository when cursor is provided', async () => {
      const cursor = Buffer.from(
        JSON.stringify({ overallScore: 80, politicianId: 'bbb' }),
      ).toString('base64url')
      const repository = buildRepository([])
      const service = createPoliticianService(repository)

      await service.findByFilters({ limit: 20, cursor })

      expect(repository.selectWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { overallScore: 80, politicianId: 'bbb' } }),
      )
    })

    it('throws on invalid cursor string', async () => {
      const service = createPoliticianService(buildRepository([]))
      await expect(service.findByFilters({ limit: 20, cursor: 'not-valid-base64url-json' })).rejects.toThrow(
        'Invalid cursor',
      )
    })
  })

  describe('findBySlug', () => {
    it('returns mapped PoliticianProfileDto when repository finds a row', async () => {
      const mockRow: PoliticianProfileRow = {
        id: 'uuid-123',
        slug: 'joao-silva-sp',
        name: 'João Silva',
        party: 'PSDB',
        state: 'SP',
        role: 'deputado',
        photoUrl: null,
        bioSummary: null,
        tenureStartDate: null,
        overallScore: 72,
        transparencyScore: 20,
        legislativeScore: 18,
        financialScore: 22,
        anticorruptionScore: 12,
        exclusionFlag: false,
        methodologyVersion: 'v1.0',
      }
      const repository: PoliticianRepository = {
        selectWithFilters: vi.fn(),
        selectBySlug: vi.fn().mockResolvedValue(mockRow),
      }
      const service = createPoliticianService(repository)
      const result = await service.findBySlug('joao-silva-sp')

      expect(result).toEqual({
        id: 'uuid-123',
        slug: 'joao-silva-sp',
        name: 'João Silva',
        party: 'PSDB',
        state: 'SP',
        role: 'deputado',
        photoUrl: null,
        bioSummary: null,
        tenureStartDate: null,
        overallScore: 72,
        transparencyScore: 20,
        legislativeScore: 18,
        financialScore: 22,
        anticorruptionScore: 12,
        exclusionFlag: false,
        methodologyVersion: 'v1.0',
      })
    })

    it('returns undefined when repository finds no row', async () => {
      const repository: PoliticianRepository = {
        selectWithFilters: vi.fn(),
        selectBySlug: vi.fn().mockResolvedValue(undefined),
      }
      const service = createPoliticianService(repository)
      const result = await service.findBySlug('unknown-slug')
      expect(result).toBeUndefined()
    })
  })
})
