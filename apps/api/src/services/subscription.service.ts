import { randomBytes, createHash } from 'node:crypto'
import { Resend } from 'resend'
import type { SubscriptionRepository } from '../repositories/subscription.repository.js'
import { NotFoundError, TokenNotFoundError } from '../hooks/error-handler.js'
import { encryptEmail, hashEmail } from '../crypto/email.js'
import { env } from '../config/env.js'

const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Subscription service — manages the double opt-in email alert flow (RF-POST-002).
 *
 * Flow: subscribe (pending + confirm email) → confirm (pending → active, encrypted) → unsubscribe (delete)
 *
 * Security model:
 * - Confirmation token: 32-byte hex sent to user; SHA-256 hash stored in DB (prevents replay if DB leaked)
 * - Unsubscribe token: 32-byte hex stored plaintext (low-privilege: worst case is someone unsubscribes a user)
 * - Email: plaintext only in pending table (24h TTL); AES-256-GCM encrypted once confirmed
 */
export function createSubscriptionService(
  repository: SubscriptionRepository,
  resend: Resend,
): {
  subscribe: (slug: string, email: string) => Promise<void>
  confirm: (token: string) => Promise<void>
  unsubscribe: (token: string) => Promise<void>
} {
  return {
    async subscribe(slug: string, email: string): Promise<void> {
      const politician = await repository.findPoliticianBySlug(slug)
      if (politician === undefined) throw new NotFoundError('Politician', slug)

      // Raw token sent to user via email; only SHA-256 hash stored in DB
      const rawToken = randomBytes(32).toString('hex') // 64-char hex
      const tokenHash = createHash('sha256').update(rawToken).digest('hex')
      const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS)

      await repository.insertPendingSubscription({
        politicianId: politician.id,
        email,
        confirmTokenHash: tokenHash,
        expiresAt,
      })

      const confirmUrl = `${env.API_BASE_URL}/api/v1/subscribe/confirm?token=${rawToken}`
      const { error } = await resend.emails.send({
        from: `PAH <${env.ALERTS_FROM_EMAIL}>`,
        to: [email],
        subject: `Confirme sua inscrição: ${politician.name}`,
        html: `<p>Clique <a href="${confirmUrl}">aqui</a> para confirmar sua inscrição de alertas para <strong>${politician.name}</strong>.</p><p>Este link expira em 24 horas.</p>`,
      })

      if (error) {
        throw new Error(`Resend error [${error.name}]: ${error.message}`)
      }
    },

    async confirm(token: string): Promise<void> {
      const tokenHash = createHash('sha256').update(token).digest('hex')
      const pending = await repository.findPendingByTokenHash(tokenHash)

      // Same error for not-found AND expired — prevents enumeration attacks
      if (pending === undefined || pending.expiresAt < new Date()) {
        throw new TokenNotFoundError()
      }

      const emailEncrypted = encryptEmail(pending.email)
      const emailHash = hashEmail(pending.email)
      const unsubscribeToken = randomBytes(32).toString('hex')

      await repository.confirmSubscription({
        pendingId: pending.id,
        politicianId: pending.politicianId,
        emailEncrypted,
        emailHash,
        unsubscribeToken,
        confirmedAt: new Date(),
      })
    },

    async unsubscribe(token: string): Promise<void> {
      // Always returns void — idempotent; prevents confirmation of subscription existence
      await repository.deleteByUnsubscribeToken(token)
    },
  }
}

export type SubscriptionService = ReturnType<typeof createSubscriptionService>
