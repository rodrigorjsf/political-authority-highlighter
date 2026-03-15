/** Named constants for the political role of a Brazilian federal legislator. */
export const Role = {
  DEPUTADO: 'deputado',
  SENADOR: 'senador',
} as const
/** Union type for the political role field. */
export type Role = (typeof Role)[keyof typeof Role]

/** Named constants for legislative chamber sources. */
export const LegislativeSource = {
  CAMARA: 'camara',
  SENADO: 'senado',
} as const
/** Union type for the legislative source field. */
export type LegislativeSource = (typeof LegislativeSource)[keyof typeof LegislativeSource]

/**
 * ISR revalidation intervals (seconds) for Next.js fetch caching.
 * Named constants for readability and single-source-of-truth.
 */
export const REVALIDATE = {
  /** 5 minutes — fast-changing data (bills, votes, expenses, proposals, committees, politicians listing) */
  FIVE_MINUTES: 300,
  /** 1 hour — medium-change data (politician profile overview, sources) */
  ONE_HOUR: 3600,
  /** 24 hours — slow-change data (score methodology) */
  ONE_DAY: 86_400,
  /** 7 days — near-static data (methodology page) */
  ONE_WEEK: 604_800,
} as const
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
export type { DataSourceStatus, SourceListResponse } from './types/source.js'

/**
 * Formats a number as Brazilian Real currency (BRL).
 * Output example: R$ 1.234,56
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}
