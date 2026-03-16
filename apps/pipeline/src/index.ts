import PgBoss from 'pg-boss'
import { Resend } from 'resend'
import { createPipelineDb } from '@pah/db/clients'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { startScheduler, registerWorkers, registerScoreAlertWorker } from './scheduler.js'
import { runPipeline } from './orchestrator.js'
import { DataSource } from './types.js'

async function main(): Promise<void> {
  logger.info('Starting pipeline...')

  // Initialize database (direct URL for long-running jobs — not pooler)
  const db = createPipelineDb(env.DATABASE_URL_WRITER)

  // Initialize pg-boss job queue
  const boss = new PgBoss(env.DATABASE_URL)
  await boss.start()
  logger.info('pg-boss started')

  // Initialize Resend client (RF-POST-002)
  const resend = new Resend(env.RESEND_API_KEY)

  // Initialize scheduler and register workers
  await startScheduler(boss)
  await registerWorkers(boss, {
    [DataSource.CAMARA]: () => runPipeline(db, boss, DataSource.CAMARA),
    [DataSource.SENADO]: () => runPipeline(db, boss, DataSource.SENADO),
    [DataSource.TRANSPARENCIA]: () => runPipeline(db, boss, DataSource.TRANSPARENCIA),
    [DataSource.TSE]: () => runPipeline(db, boss, DataSource.TSE),
    [DataSource.TCU]: () => runPipeline(db, boss, DataSource.TCU),
    [DataSource.CGU]: () => runPipeline(db, boss, DataSource.CGU),
  })
  await registerScoreAlertWorker(boss, db, resend)

  logger.info('Pipeline initialized and running')

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down...')
    await boss.stop()
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown())
  process.on('SIGINT', () => void shutdown())
}

main().catch((error) => {
  logger.error(error, 'Pipeline startup error')
  process.exit(1)
})
