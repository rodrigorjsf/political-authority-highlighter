import { Resend } from 'resend'
import { eq } from 'drizzle-orm'
import { alertSubscriptions, politicians } from '@pah/db/public-schema'
import type { PipelineDb } from '@pah/db/clients'
import { decryptEmail } from '../crypto/email.js'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

export interface ScoreAlertPayload {
  politicianId: string
  slug: string
  newScore: number
}

/**
 * Processes a single score-alert job: fetches active subscriptions for the politician,
 * decrypts emails in-memory, and sends alert emails via Resend.
 *
 * NEVER logs plaintext email addresses — only Resend emailId is logged.
 */
export async function processScoreAlert(
  db: PipelineDb,
  resend: Resend,
  data: ScoreAlertPayload,
): Promise<void> {
  const { politicianId, slug, newScore } = data

  // Fetch politician name + subscriptions in parallel
  const [politicianResult, subscriptions] = await Promise.all([
    db.select({ name: politicians.name }).from(politicians).where(eq(politicians.id, politicianId)),
    db
      .select({
        emailEncrypted: alertSubscriptions.emailEncrypted,
        unsubscribeToken: alertSubscriptions.unsubscribeToken,
      })
      .from(alertSubscriptions)
      .where(eq(alertSubscriptions.politicianId, politicianId)),
  ])

  const politician = politicianResult.at(0)
  if (politician === undefined || subscriptions.length === 0) return

  logger.info({ politicianId, count: subscriptions.length }, 'Sending score alerts')

  for (const sub of subscriptions) {
    const email = decryptEmail(sub.emailEncrypted) // decrypted in-memory only
    const unsubscribeUrl = `${env.API_BASE_URL}/api/v1/subscribe/unsubscribe?token=${sub.unsubscribeToken}`

    const { data: sendResult, error } = await resend.emails.send({
      from: `PAH <${env.ALERTS_FROM_EMAIL}>`,
      to: [email],
      subject: `Atualização de pontuação: ${politician.name}`,
      html: `<p>A pontuação de integridade de <strong>${politician.name}</strong> foi atualizada para <strong>${newScore}/100</strong>.</p><p><a href="https://autoridade-politica.com.br/politicos/${slug}">Ver perfil</a></p><p><small><a href="${unsubscribeUrl}">Cancelar inscrição</a></small></p>`,
    })

    if (error) {
      logger.error({ code: error.name, politicianId }, `Alert email failed: ${error.message}`)
    } else {
      logger.info({ emailId: sendResult.id, politicianId }, 'Alert email sent')
    }
  }
}
