import { createCipheriv, randomBytes, createHash } from 'node:crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

const encryptionKey = Buffer.from(env.EMAIL_ENCRYPTION_KEY, 'hex') // 32 bytes
// GOTCHA: key read at module level — tests must vi.stubEnv('EMAIL_ENCRYPTION_KEY', 'a'.repeat(64)) BEFORE dynamic import

/**
 * Encrypts an email address using AES-256-GCM.
 * Storage format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext, base64-encoded.
 * IV is randomly generated per encryption — never reused.
 *
 * RF-POST-002: Email encrypted on subscription confirmation.
 * The pipeline uses the same key to decrypt for alert sending.
 */
export function encryptEmail(email: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(email, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag() // MUST be called AFTER cipher.final()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * Creates a SHA-256 hash of the normalized email (lowercase, trimmed).
 * Used for deduplication lookups without decryption.
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}
