import { eq, lt } from 'drizzle-orm'
import type { PublicDb } from '@pah/db/clients'
import { pendingSubscriptions, alertSubscriptions, politicians } from '@pah/db/public-schema'

export function createSubscriptionRepository(db: PublicDb): {
  findPoliticianBySlug: (slug: string) => Promise<{ id: string; name: string } | undefined>
  insertPendingSubscription: (params: { politicianId: string; email: string; confirmTokenHash: string; expiresAt: Date }) => Promise<void>
  findPendingByTokenHash: (tokenHash: string) => Promise<{ id: string; politicianId: string; email: string; expiresAt: Date } | undefined>
  confirmSubscription: (params: { pendingId: string; politicianId: string; emailEncrypted: string; emailHash: string; unsubscribeToken: string; confirmedAt: Date }) => Promise<void>
  deleteByUnsubscribeToken: (token: string) => Promise<boolean>
  deleteExpiredPending: () => Promise<void>
} {
  return {
    /** Finds a politician by slug — used to validate slug before accepting subscription. */
    async findPoliticianBySlug(slug: string): Promise<{ id: string; name: string } | undefined> {
      const rows = await db
        .select({ id: politicians.id, name: politicians.name })
        .from(politicians)
        .where(eq(politicians.slug, slug))
      return rows.at(0)
    },

    /**
     * Inserts a pending subscription.
     * The `onConflictDoNothing()` only applies to `confirmTokenHash` collisions
     * (which are practically impossible since a new random token is generated each time).
     * Multiple pending subscriptions for the same email will be successfully inserted
     * with different tokens. This behavior is correct for security: duplicate requests
     * do not reveal whether a subscription already exists.
     */
    async insertPendingSubscription(params: {
      politicianId: string
      email: string
      confirmTokenHash: string
      expiresAt: Date
    }): Promise<void> {
      await db.insert(pendingSubscriptions).values(params).onConflictDoNothing()
    },

    /** Finds a pending subscription by its confirmation token hash. */
    async findPendingByTokenHash(
      tokenHash: string,
    ): Promise<{ id: string; politicianId: string; email: string; expiresAt: Date } | undefined> {
      const rows = await db
        .select({
          id: pendingSubscriptions.id,
          politicianId: pendingSubscriptions.politicianId,
          email: pendingSubscriptions.email,
          expiresAt: pendingSubscriptions.expiresAt,
        })
        .from(pendingSubscriptions)
        .where(eq(pendingSubscriptions.confirmTokenHash, tokenHash))
      return rows.at(0)
    },

    /**
     * Atomically moves a pending subscription to active:
     * inserts into alert_subscriptions (encrypted email) and deletes from pending_subscriptions.
     * Uses onConflictDoNothing for idempotency — re-confirming is safe.
     */
    async confirmSubscription(params: {
      pendingId: string
      politicianId: string
      emailEncrypted: string
      emailHash: string
      unsubscribeToken: string
      confirmedAt: Date
    }): Promise<void> {
      await db.transaction(async (tx) => {
        await tx
          .insert(alertSubscriptions)
          .values({
            politicianId: params.politicianId,
            emailEncrypted: params.emailEncrypted,
            emailHash: params.emailHash,
            unsubscribeToken: params.unsubscribeToken,
            confirmedAt: params.confirmedAt,
          })
          .onConflictDoNothing()

        await tx
          .delete(pendingSubscriptions)
          .where(eq(pendingSubscriptions.id, params.pendingId))
      })
    },

    /**
     * Deletes an active subscription by unsubscribe token.
     * Returns true if a row was deleted, false if token was not found (already unsubscribed).
     */
    async deleteByUnsubscribeToken(token: string): Promise<boolean> {
      const result = await db
        .delete(alertSubscriptions)
        .where(eq(alertSubscriptions.unsubscribeToken, token))
        .returning({ id: alertSubscriptions.id })
      return result.length > 0
    },

    /** Cleans up expired pending subscriptions (called periodically by pipeline). */
    async deleteExpiredPending(): Promise<void> {
      await db.delete(pendingSubscriptions).where(lt(pendingSubscriptions.expiresAt, new Date()))
    },
  }
}

export type SubscriptionRepository = ReturnType<typeof createSubscriptionRepository>
