import { Resend } from 'resend'
import type PgBoss from 'pg-boss'
import type { PipelineDb } from '@pah/db/clients'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { DataSource } from './types.js'
import { processScoreAlert, type ScoreAlertPayload } from './workers/score-alert.worker.js'

const QUEUES = [
  `pipeline:${DataSource.CAMARA}`,
  `pipeline:${DataSource.SENADO}`,
  `pipeline:${DataSource.TRANSPARENCIA}`,
  `pipeline:${DataSource.TSE}`,
  `pipeline:${DataSource.TCU}`,
  `pipeline:${DataSource.CGU}`,
] as const

/**
 * Creates pg-boss queues with singleton policy (max 1 active job per source)
 * and registers cron schedules for each data source.
 */
export async function startScheduler(boss: PgBoss): Promise<void> {
  // Create queues with singleton policy (v10 API)
  for (const queue of QUEUES) {
    await boss.createQueue(queue, { name: queue, policy: 'singleton' })
  }

  // Schedule cron jobs in São Paulo timezone
  const schedules = [
    { queue: `pipeline:${DataSource.CAMARA}`, cron: env.CRON_SCHEDULE_CAMARA },
    { queue: `pipeline:${DataSource.SENADO}`, cron: env.CRON_SCHEDULE_SENADO },
    { queue: `pipeline:${DataSource.TRANSPARENCIA}`, cron: env.CRON_SCHEDULE_TRANSPARENCIA },
    { queue: `pipeline:${DataSource.TSE}`, cron: env.CRON_SCHEDULE_TSE },
    { queue: `pipeline:${DataSource.TCU}`, cron: env.CRON_SCHEDULE_TCU },
    { queue: `pipeline:${DataSource.CGU}`, cron: env.CRON_SCHEDULE_CGU },
  ] as const

  for (const { queue, cron } of schedules) {
    await boss.schedule(queue, cron, {}, {
      tz: 'America/Sao_Paulo',
      retryLimit: 3,
    })
  }

  logger.info('Pipeline scheduler initialized with 6 sources')
}

/** Registers pg-boss workers for each data source queue. */
export async function registerWorkers(
  boss: PgBoss,
  handlers: Record<string, () => Promise<unknown>>,
): Promise<void> {
  for (const queue of QUEUES) {
    const source = queue.replace('pipeline:', '')
    const handler = handlers[source]
    if (handler !== undefined) {
      await boss.work(queue, { batchSize: 1 }, async () => {
        logger.info({ source }, 'Starting pipeline job')
        await handler()
        logger.info({ source }, 'Pipeline job completed')
      })
    }
  }

  logger.info('Pipeline workers registered')
}

/**
 * Registers the score-alert queue and its worker (RF-POST-002).
 * Must be called after boss.start() and before any runPipeline calls.
 */
export async function registerScoreAlertWorker(
  boss: PgBoss,
  db: PipelineDb,
  resend: Resend,
): Promise<void> {
  // createQueue MUST include name field (pg-boss v10 quirk)
  await boss.createQueue('score-alert', {
    name: 'score-alert',
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
  })

  // Handler receives Job[] ARRAY (pg-boss v10 batch API)
  await boss.work<ScoreAlertPayload>('score-alert', { batchSize: 5 }, async (jobs) => {
    await Promise.allSettled(jobs.map((job) => processScoreAlert(db, resend, job.data)))
  })

  logger.info('Score-alert worker registered')
}
