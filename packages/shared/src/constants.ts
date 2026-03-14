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
