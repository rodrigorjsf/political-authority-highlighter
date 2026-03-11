import { sql } from 'drizzle-orm'
import {
  politicians,
  integrityScores,
  bills,
  votes,
  expenses,
  proposals,
  committees,
} from '@pah/db/public-schema'
import type { PipelineDb } from '@pah/db/clients'
import type { PoliticianUpsert, BillUpsert, VoteUpsert, ExpenseUpsert } from '../types.js'
import { logger } from '../config/logger.js'

/** Publisher factory — creates idempotent upsert functions for all public schema tables. */
export function createPublisher(db: PipelineDb) {
  return {
    /** Upserts a single politician by external_id. */
    async upsertPolitician(data: PoliticianUpsert): Promise<void> {
      await db
        .insert(politicians)
        .values(data)
        .onConflictDoUpdate({
          target: politicians.externalId,
          set: {
            name: data.name,
            slug: data.slug,
            state: data.state,
            party: data.party,
            role: data.role,
            photoUrl: data.photoUrl,
            tenureStartDate: data.tenureStartDate,
            updatedAt: sql`now()`,
          },
        })
      logger.debug({ externalId: data.externalId }, 'Upserted politician')
    },

    /** Upserts bills in chunks to avoid parameter limit. */
    async upsertBills(data: BillUpsert[]): Promise<void> {
      if (data.length === 0) return
      const chunks = chunk(data, 200)
      for (const batch of chunks) {
        await db
          .insert(bills)
          .values(batch)
          .onConflictDoUpdate({
            target: [bills.source, bills.externalId],
            set: {
              title: sql`excluded.title`,
              status: sql`excluded.status`,
              updatedAt: sql`now()`,
            },
          })
      }
      logger.debug({ count: data.length }, 'Upserted bills')
    },

    /** Upserts votes in chunks. */
    async upsertVotes(data: VoteUpsert[]): Promise<void> {
      if (data.length === 0) return
      const chunks = chunk(data, 200)
      for (const batch of chunks) {
        await db
          .insert(votes)
          .values(batch)
          .onConflictDoUpdate({
            target: [votes.source, votes.externalId],
            set: {
              voteCast: sql`excluded.vote_cast`,
              sessionResult: sql`excluded.session_result`,
              updatedAt: sql`now()`,
            },
          })
      }
      logger.debug({ count: data.length }, 'Upserted votes')
    },

    /** Upserts expenses in chunks. */
    async upsertExpenses(data: ExpenseUpsert[]): Promise<void> {
      if (data.length === 0) return
      const chunks = chunk(data, 200)
      for (const batch of chunks) {
        await db
          .insert(expenses)
          .values(batch)
          .onConflictDoUpdate({
            target: [expenses.source, expenses.externalId],
            set: {
              amount: sql`excluded.amount`,
              updatedAt: sql`now()`,
            },
          })
      }
      logger.debug({ count: data.length }, 'Upserted expenses')
    },

    /** Upserts an integrity score for a politician. */
    async upsertIntegrityScore(data: {
      politicianId: string
      overallScore: number
      transparencyScore: number
      legislativeScore: number
      financialScore: number
      anticorruptionScore: number
      exclusionFlag: boolean
      methodologyVersion: string
    }): Promise<void> {
      await db
        .insert(integrityScores)
        .values(data)
        .onConflictDoUpdate({
          target: integrityScores.politicianId,
          set: {
            overallScore: data.overallScore,
            transparencyScore: data.transparencyScore,
            legislativeScore: data.legislativeScore,
            financialScore: data.financialScore,
            anticorruptionScore: data.anticorruptionScore,
            exclusionFlag: data.exclusionFlag,
            methodologyVersion: data.methodologyVersion,
            calculatedAt: sql`now()`,
          },
        })
      logger.debug({ politicianId: data.politicianId }, 'Upserted integrity score')
    },

    /** Updates the exclusion_flag on a politician row. */
    async updateExclusionFlag(politicianId: string, exclusionFlag: boolean): Promise<void> {
      await db
        .update(politicians)
        .set({ exclusionFlag, updatedAt: sql`now()` })
        .where(sql`${politicians.id} = ${politicianId}`)
      logger.debug({ politicianId, exclusionFlag }, 'Updated exclusion flag')
    },
  }
}

export type Publisher = ReturnType<typeof createPublisher>

/** Splits an array into chunks of given size. */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
