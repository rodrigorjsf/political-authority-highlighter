import { describe, it, expect, vi, beforeAll } from 'vitest'

// Stub env vars before any module that reads process.env at module level
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('DATABASE_URL_WRITER', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('TRANSPARENCIA_API_KEY', 'test-key')
vi.stubEnv('CPF_ENCRYPTION_KEY', 'a'.repeat(64)) // 32 bytes hex-encoded

// Mock DB schema imports to avoid pgSchema('public') runtime error in tests
vi.mock('@pah/db/public-schema', () => ({
  politicians: { id: 'politicians.id', externalId: 'politicians.externalId' },
  integrityScores: { politicianId: 'integrityScores.politicianId' },
  bills: { source: 'bills.source', externalId: 'bills.externalId' },
  votes: { source: 'votes.source', externalId: 'votes.externalId' },
  expenses: { source: 'expenses.source', externalId: 'expenses.externalId' },
  dataSourceStatus: { source: 'dataSourceStatus.source' },
}))

vi.mock('@pah/db/internal-schema', () => ({
  exclusionRecords: {},
  politicianIdentifiers: {},
}))

import type { PipelineDb } from '@pah/db/clients'

interface MockDb {
  db: PipelineDb
  insertMock: ReturnType<typeof vi.fn>
}

// Build a mock db with a fluent query builder stub
// emptyReturn: true simulates DB returning no rows (upsert failure scenario)
function buildMockDb(emptyReturn = false): MockDb {
  const returningMock = vi.fn().mockResolvedValue(
    emptyReturn ? [] : [{ id: 'test-uuid-1234' }],
  )
  const onConflictDoUpdateMock = vi.fn().mockReturnValue({ returning: returningMock })
  const onConflictDoNothingMock = vi.fn().mockResolvedValue([])
  const valuesMock = vi.fn().mockReturnValue({
    onConflictDoUpdate: onConflictDoUpdateMock,
    onConflictDoNothing: onConflictDoNothingMock,
  })
  const insertMock = vi.fn().mockReturnValue({ values: valuesMock })

  return { db: { insert: insertMock } as unknown as PipelineDb, insertMock }
}

let createPublisher: (db: PipelineDb) => ReturnType<typeof import('./index.js').createPublisher>

beforeAll(async () => {
  const mod = await import('./index.js')
  createPublisher = mod.createPublisher
})

describe('createPublisher', () => {
  describe('upsertPolitician', () => {
    it('returns the upserted politician id', async () => {
      const { db } = buildMockDb()
      const publisher = createPublisher(db)

      const result = await publisher.upsertPolitician({
        externalId: 'ext-123',
        source: 'camara',
        name: 'Test Politician',
        slug: 'test-politician-sp',
        state: 'SP',
        party: 'PART',
        role: 'deputado',
        photoUrl: null,
        tenureStartDate: null,
      })

      expect(result).toEqual({ id: 'test-uuid-1234' })
    })

    it('throws when db returns no rows', async () => {
      const { db } = buildMockDb(true)
      const publisher = createPublisher(db)

      await expect(
        publisher.upsertPolitician({
          externalId: 'ext-123',
          source: 'camara',
          name: 'Test Politician',
          slug: 'test-politician-sp',
          state: 'SP',
          party: 'PART',
          role: 'deputado',
          photoUrl: null,
          tenureStartDate: null,
        }),
      ).rejects.toThrow('Failed to upsert politician: ext-123')
    })
  })

  describe('upsertExclusionRecord', () => {
    it('calls insert on exclusion_records with onConflictDoNothing', async () => {
      const { db, insertMock } = buildMockDb()
      const publisher = createPublisher(db)

      await publisher.upsertExclusionRecord({
        politicianId: 'politician-uuid',
        source: 'tcu',
        cpfHash: 'abc123hash',
        exclusionType: 'INABILITADO',
        recordDate: new Date('2024-01-15'),
        recordUrl: null,
      })

      expect(insertMock).toHaveBeenCalled()
    })
  })

  describe('upsertDataSourceStatus', () => {
    it('calls insert on data_source_status with synced status', async () => {
      const { db, insertMock } = buildMockDb()
      const publisher = createPublisher(db)

      await publisher.upsertDataSourceStatus('camara', 594)

      expect(insertMock).toHaveBeenCalled()
    })
  })
})
