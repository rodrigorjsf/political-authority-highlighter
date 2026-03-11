import type { PipelineDb } from '@pah/db/clients'
import { politicianIdentifiers } from '@pah/db/internal-schema'
import { createPublisher } from './publisher/index.js'
import * as adapters from './adapters/index.js'
import { transformCamaraDeputy } from './transformers/camara.js'
import { transformSenador } from './transformers/senado.js'
import { transformTCUExclusion } from './transformers/tcu.js'
import { transformCGUExclusion } from './transformers/cgu.js'
import { scorePolitician } from './services/scoring.service.js'
import { hashCPF } from './crypto/cpf.js'
import { DataSource } from './types.js'
import { logger } from './config/logger.js'

/**
 * Runs the full pipeline for a given source:
 * 1. Fetch raw data from government API
 * 2. Transform to unified domain types
 * 3. Upsert to public schema via idempotent publisher
 * 4. Score politician (CAMARA/SENADO) or detect exclusions (TCU/CGU)
 * 5. Update data source status
 *
 * Each source is independent — one source failure does not block others.
 */
export async function runPipeline(
  db: PipelineDb,
  source: DataSource,
): Promise<{ success: boolean; recordsProcessed: number }> {
  const publisher = createPublisher(db)
  const startTime = Date.now()

  try {
    logger.info({ source }, 'Starting pipeline for source')
    let recordsProcessed = 0

    switch (source) {
      case DataSource.CAMARA: {
        const deputies = await adapters.fetchCamaraDeputies()
        const transformed = deputies.map(transformCamaraDeputy)
        for (const p of transformed) {
          const { id } = await publisher.upsertPolitician(p)
          await scorePolitician(db, id)
        }
        recordsProcessed = transformed.length
        await publisher.upsertDataSourceStatus(source, recordsProcessed)
        break
      }
      case DataSource.SENADO: {
        const senadores = await adapters.fetchSenadores()
        const transformed = senadores.map(transformSenador)
        for (const p of transformed) {
          const { id } = await publisher.upsertPolitician(p)
          await scorePolitician(db, id)
        }
        recordsProcessed = transformed.length
        await publisher.upsertDataSourceStatus(source, recordsProcessed)
        break
      }
      case DataSource.TRANSPARENCIA: {
        // Expenses require politician IDs — handled by full orchestration in index.ts
        logger.info('Transparencia source requires politician IDs — skipping standalone run')
        await publisher.upsertDataSourceStatus(source, 0)
        break
      }
      case DataSource.TSE: {
        const candidates = await adapters.fetchTSECandidates(new Date().getFullYear())
        recordsProcessed = candidates.length
        logger.info({ count: candidates.length }, 'TSE candidates fetched for matching')
        await publisher.upsertDataSourceStatus(source, recordsProcessed)
        break
      }
      case DataSource.TCU: {
        const identifiers = await db
          .select({ cpfHash: politicianIdentifiers.cpfHash, politicianId: politicianIdentifiers.politicianId })
          .from(politicianIdentifiers)
        const cpfHashes = identifiers.map(({ cpfHash }) => cpfHash)
        if (cpfHashes.length > 0) {
          const exclusionMap = await adapters.fetchTCUExclusionsBatch(cpfHashes)
          for (const { cpfHash, politicianId } of identifiers) {
            const records = exclusionMap.get(cpfHash) ?? []
            for (const raw of records) {
              const exclusion = transformTCUExclusion(raw, politicianId, cpfHash)
              await publisher.upsertExclusionRecord(exclusion)
            }
            if (records.length > 0) {
              await publisher.updateExclusionFlag(politicianId, true)
            }
          }
          recordsProcessed = exclusionMap.size
        }
        await publisher.upsertDataSourceStatus(source, recordsProcessed)
        break
      }
      case DataSource.CGU: {
        const exclusions = await adapters.fetchCGUExclusions()
        const identifiers = await db
          .select({ cpfHash: politicianIdentifiers.cpfHash, politicianId: politicianIdentifiers.politicianId })
          .from(politicianIdentifiers)
        const cpfHashToPoliticianId = new Map(identifiers.map(({ cpfHash, politicianId }) => [cpfHash, politicianId]))
        for (const raw of exclusions) {
          const cpfHash = hashCPF(raw.CPF_SERVIDOR)
          const politicianId = cpfHashToPoliticianId.get(cpfHash)
          if (politicianId === undefined) continue
          const exclusion = transformCGUExclusion(raw, politicianId, cpfHash)
          await publisher.upsertExclusionRecord(exclusion)
          await publisher.updateExclusionFlag(politicianId, true)
        }
        recordsProcessed = exclusions.length
        await publisher.upsertDataSourceStatus(source, recordsProcessed)
        break
      }
    }

    const duration = Date.now() - startTime
    logger.info({ source, duration, recordsProcessed }, 'Pipeline completed successfully')
    return { success: true, recordsProcessed }
  } catch (error) {
    logger.error({ source, error }, 'Pipeline failed')
    throw error
  }
}
