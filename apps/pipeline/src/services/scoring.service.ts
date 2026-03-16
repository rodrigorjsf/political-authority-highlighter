import { eq, sql } from 'drizzle-orm'
import { politicians, bills, votes, expenses, integrityScores } from '@pah/db/public-schema'
import type { PipelineDb } from '@pah/db/clients'
import {
  calculateIntegrityScore,
  computeTransparencyScore,
  computeLegislativeScore,
  computeFinancialScore,
  computeAnticorruptionScore,
} from '../scoring/engine.js'
import { logger } from '../config/logger.js'

const METHODOLOGY_VERSION = '1.0'

/** Score result shape for a single politician. */
export interface ScoreResult {
  transparencyScore: number
  legislativeScore: number
  financialScore: number
  anticorruptionScore: number
  overallScore: number
  /** RF-POST-002: true when overallScore diff ≥ 5 or exclusionFlag changed vs previous run */
  needsAlert: boolean
}

/**
 * Computes and upserts the integrity score for a politician.
 * Queries public schema for bill/vote/expense counts, applies scoring engine,
 * and writes the result back to integrity_scores.
 */
export async function scorePolitician(db: PipelineDb, politicianId: string): Promise<ScoreResult> {
  // Fetch counts efficiently using SQL COUNT
  const [billResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bills)
    .where(eq(bills.politicianId, politicianId))

  const [voteResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(votes)
    .where(eq(votes.politicianId, politicianId))

  const [expenseResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expenses)
    .where(eq(expenses.politicianId, politicianId))

  // Fetch politician exclusion flag
  const [politician] = await db
    .select({ exclusionFlag: politicians.exclusionFlag })
    .from(politicians)
    .where(eq(politicians.id, politicianId))

  if (politician === undefined) {
    throw new Error(`Politician ${politicianId} not found`)
  }

  // RF-POST-002: Fetch previous score for diff detection (before upsert)
  const [prevScore] = await db
    .select({
      overallScore: integrityScores.overallScore,
      exclusionFlag: integrityScores.exclusionFlag,
    })
    .from(integrityScores)
    .where(eq(integrityScores.politicianId, politicianId))

  const billCount = billResult?.count ?? 0
  const voteCount = voteResult?.count ?? 0
  const expenseCount = expenseResult?.count ?? 0

  // Compute each component
  const transparencyScore = computeTransparencyScore(6) // All 6 sources configured
  const legislativeScore = computeLegislativeScore(billCount, voteCount)
  const financialScore = computeFinancialScore(expenseCount)
  const anticorruptionScore = computeAnticorruptionScore(politician.exclusionFlag)

  const overallScore = calculateIntegrityScore({
    transparencyScore,
    legislativeScore,
    financialScore,
    anticorruptionScore,
  })

  // RF-POST-002: Detect meaningful score change (diff ≥ 5 or exclusion flag flipped)
  // prevScore === undefined means first run — never alert on initial scoring
  const needsAlert =
    prevScore !== undefined &&
    (Math.abs(overallScore - prevScore.overallScore) >= 5 ||
      politician.exclusionFlag !== prevScore.exclusionFlag)

  // Upsert integrity score
  await db
    .insert(integrityScores)
    .values({
      politicianId,
      overallScore,
      transparencyScore,
      legislativeScore,
      financialScore,
      anticorruptionScore,
      exclusionFlag: politician.exclusionFlag,
      methodologyVersion: METHODOLOGY_VERSION,
    })
    .onConflictDoUpdate({
      target: integrityScores.politicianId,
      set: {
        overallScore,
        transparencyScore,
        legislativeScore,
        financialScore,
        anticorruptionScore,
        exclusionFlag: politician.exclusionFlag,
        methodologyVersion: METHODOLOGY_VERSION,
        calculatedAt: sql`now()`,
      },
    })

  logger.debug({ politicianId, overallScore, needsAlert }, 'Scored politician')
  return { transparencyScore, legislativeScore, financialScore, anticorruptionScore, overallScore, needsAlert }
}
