import type { PipelineDb } from '@pah/db/clients'
import { createPublisher } from './publisher/index.js'
import * as adapters from './adapters/index.js'
import { transformCamaraDeputy } from './transformers/camara.js'
import { transformSenador } from './transformers/senado.js'
import { DataSource } from './types.js'
import { logger } from './config/logger.js'

/**
 * Runs the full pipeline for a given source:
 * 1. Fetch raw data from government API
 * 2. Transform to unified domain types
 * 3. Upsert to public schema via idempotent publisher
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
          await publisher.upsertPolitician(p)
        }
        recordsProcessed = transformed.length
        break
      }
      case DataSource.SENADO: {
        const senadores = await adapters.fetchSenadores()
        const transformed = senadores.map(transformSenador)
        for (const p of transformed) {
          await publisher.upsertPolitician(p)
        }
        recordsProcessed = transformed.length
        break
      }
      case DataSource.TRANSPARENCIA: {
        // Expenses require politician IDs — handled by full orchestration in index.ts
        logger.info('Transparencia source requires politician IDs — skipping standalone run')
        break
      }
      case DataSource.TSE: {
        const candidates = await adapters.fetchTSECandidates(new Date().getFullYear())
        recordsProcessed = candidates.length
        logger.info({ count: candidates.length }, 'TSE candidates fetched for matching')
        break
      }
      case DataSource.TCU: {
        // TCU requires CPF hashes — handled by exclusion detection orchestration
        logger.info('TCU source requires CPF hashes — skipping standalone run')
        break
      }
      case DataSource.CGU: {
        const exclusions = await adapters.fetchCGUExclusions()
        recordsProcessed = exclusions.length
        logger.info({ count: exclusions.length }, 'CGU exclusions fetched for matching')
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
