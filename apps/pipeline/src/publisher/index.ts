import { sql } from 'drizzle-orm'
import { politicians, integrityScores, bills, votes, expenses, dataSourceStatus } from '@pah/db/public-schema'
import { exclusionRecords } from '@pah/db/internal-schema'
import type { PipelineDb } from '@pah/db/clients'
import type { PoliticianUpsert, BillUpsert, VoteUpsert, ExpenseUpsert } from '../types.js'
import type { ExclusionRecordUpsert } from '../transformers/tcu.js'
import { logger } from '../config/logger.js'

export interface Publisher {
  upsertPolitician(data: PoliticianUpsert): Promise<{ id: string }>
  upsertBills(data: BillUpsert[]): Promise<void>
  upsertVotes(data: VoteUpsert[]): Promise<void>
  upsertExpenses(data: ExpenseUpsert[]): Promise<void>
  upsertIntegrityScore(data: {
    politicianId: string
    overallScore: number
    transparencyScore: number
    legislativeScore: number
    financialScore: number
    anticorruptionScore: number
    exclusionFlag: boolean
    methodologyVersion: string
  }): Promise<void>
  updateExclusionFlag(politicianId: string, exclusionFlag: boolean): Promise<void>
  upsertExclusionRecord(data: ExclusionRecordUpsert): Promise<void>
  upsertDataSourceStatus(source: string, recordCount: number): Promise<void>
}

/** Publisher factory — creates idempotent upsert functions for all public schema tables. */
export function createPublisher(db: PipelineDb): Publisher {
  return {
    /** Upserts a single politician by external_id. Returns the politician's UUID. */
    async upsertPolitician(data: PoliticianUpsert): Promise<{ id: string }> {
      const [result] = await db
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
        .returning({ id: politicians.id })
      if (result === undefined) throw new Error(`Failed to upsert politician: ${data.externalId}`)
      logger.debug({ externalId: data.externalId }, 'Upserted politician')
      return result
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

    /** Upserts an exclusion record into internal_data.exclusion_records (idempotent). */
    async upsertExclusionRecord(data: ExclusionRecordUpsert): Promise<void> {
      await db
        .insert(exclusionRecords)
        .values({
          politicianId: data.politicianId,
          source: data.source,
          cpfHash: data.cpfHash,
          exclusionType: data.exclusionType,
          recordDate: data.recordDate,
          recordUrl: data.recordUrl,
        })
        .onConflictDoNothing()
      logger.debug({ politicianId: data.politicianId, source: data.source }, 'Upserted exclusion record')
    },

    /** Upserts data source sync status into public.data_source_status. */
    async upsertDataSourceStatus(source: string, recordCount: number): Promise<void> {
      await db
        .insert(dataSourceStatus)
        .values({ source, recordCount, status: 'synced', lastSyncAt: sql`now()` })
        .onConflictDoUpdate({
          target: dataSourceStatus.source,
          set: {
            recordCount,
            status: 'synced',
            lastSyncAt: sql`now()`,
            updatedAt: sql`now()`,
          },
        })
      logger.debug({ source, recordCount }, 'Updated data source status')
    },
  }
}

/** Splits an array into chunks of given size. */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
