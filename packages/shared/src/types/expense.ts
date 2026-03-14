import { LegislativeSource } from '../enums.js'

/**
 * Parliamentary expense (CEAP/CEAPS) from Camara or Senado.
 * Represents a single reimbursement claim with category, supplier, amount, and documentation link.
 */
export interface Expense {
  id: string
  externalId: string
  source: LegislativeSource
  year: number
  month: number
  category: string
  supplierName: string
  amount: number
  documentNumber: string | null
  sourceUrl: string | null
}

/**
 * Query filter options for fetching politician expenses.
 * Supports cursor-based pagination and limit configuration.
 */
export interface ExpenseFilters {
  cursor?: string
  limit?: number
}

/**
 * API response containing paginated expenses with yearly aggregation.
 * Yearly totals allow UI to display "Total 2023: R$ X,XXX.XX" style summaries.
 */
export interface ExpenseListResponse {
  data: Expense[]
  cursor: string | null
  yearlyTotals: Array<{ year: number; total: number }>
}
