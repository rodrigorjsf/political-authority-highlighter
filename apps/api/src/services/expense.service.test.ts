import { describe, it, expect } from 'vitest'
import type { ExpenseRow } from '../repositories/expense.repository.js'
import { createExpenseService } from './expense.service.js'

describe('ExpenseService', () => {
  function buildExpenseRow(overrides: Partial<ExpenseRow> = {}): ExpenseRow {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      externalId: 'CEAP-2023-001',
      source: 'camara',
      year: 2023,
      month: 1,
      category: 'Combustíveis e Lubrificantes',
      supplierName: 'Posto ABC',
      amount: '1234.56',
      documentNumber: 'NF-123',
      sourceUrl: 'https://example.com/doc',
      ...overrides,
    }
  }

  it('returns empty data and no cursor when no expenses', async () => {
    const mockRepository = {
      selectByPoliticianSlug: async () => [] as ExpenseRow[],
      selectYearlyTotals: async () => [],
    }
    const service = createExpenseService(mockRepository)

    const result = await service.findByPoliticianSlug('joao-silva-sp')

    expect(result.data).toHaveLength(0)
    expect(result.cursor).toBeNull()
    expect(result.yearlyTotals).toHaveLength(0)
  })

  it('converts numeric string amounts to numbers', async () => {
    const mockRepository = {
      selectByPoliticianSlug: async () => [buildExpenseRow()],
      selectYearlyTotals: async () => [],
    }
    const service = createExpenseService(mockRepository)

    const result = await service.findByPoliticianSlug('joao-silva-sp')

    expect(result.data[0]?.amount).toBe(1234.56)
    expect(typeof result.data[0]?.amount).toBe('number')
  })

  it('sets cursor when more rows than limit', async () => {
    const rows: ExpenseRow[] = Array.from({ length: 21 }, (_, i) =>
      buildExpenseRow({ id: `id-${i}`, year: 2023, month: 1 }),
    )

    const mockRepository = {
      selectByPoliticianSlug: async () => rows,
      selectYearlyTotals: async () => [],
    }
    const service = createExpenseService(mockRepository)

    const result = await service.findByPoliticianSlug('joao-silva-sp', undefined, 20)

    expect(result.data).toHaveLength(20)
    expect(result.cursor).not.toBeNull()
  })

  it('returns null cursor when rows fit within limit', async () => {
    const rows = [buildExpenseRow(), buildExpenseRow({ id: 'id-2' })]

    const mockRepository = {
      selectByPoliticianSlug: async () => rows,
      selectYearlyTotals: async () => [],
    }
    const service = createExpenseService(mockRepository)

    const result = await service.findByPoliticianSlug('joao-silva-sp', undefined, 20)

    expect(result.data).toHaveLength(2)
    expect(result.cursor).toBeNull()
  })
})
