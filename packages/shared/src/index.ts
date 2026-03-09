export type {
  PoliticianCard,
  PoliticianFilters,
  ListPoliticiansResponse,
  PoliticianProfile,
} from './types/politician.js'
export type { Bill, BillFilters, BillListResponse } from './types/bill.js'
export type { Vote, VoteFilters, VoteListResponse } from './types/vote.js'
export type { Expense, ExpenseFilters, ExpenseListResponse } from './types/expense.js'
export type { Proposal, ProposalFilters, ProposalListResponse } from './types/proposal.js'
export type { Committee, CommitteeListResponse } from './types/committee.js'

/**
 * Formats a number as Brazilian Real currency (BRL).
 * Output example: R$ 1.234,56
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}
