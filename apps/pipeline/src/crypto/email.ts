import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

const encryptionKey = Buffer.from(env.EMAIL_ENCRYPTION_KEY, 'hex') // 32 bytes
// GOTCHA: key read at module level — tests must vi.stubEnv('EMAIL_ENCRYPTION_KEY', 'a'.repeat(64)) BEFORE dynamic import

/**
 * Encrypts an email address using AES-256-GCM.
 * Storage format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext, base64-encoded.
 * IV is randomly generated per encryption — never reused.
 *
 * RF-POST-002: Email stored encrypted; decrypted in-memory only for sending alerts.
 */
export function encryptEmail(email: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(email, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag() // MUST be called AFTER cipher.final()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * Decrypts an AES-256-GCM encrypted email address.
 * NEVER log the result — only use in-memory for sending alerts.
 */
export function decryptEmail(encrypted: string): string {
  const buffer = Buffer.from(encrypted, 'base64')
  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv)
  decipher.setAuthTag(authTag) // MUST be called BEFORE decipher.update()
  return decipher.update(ciphertext).toString('utf-8') + decipher.final('utf-8')
}

/**
 * Creates a SHA-256 hash of the normalized email (lowercase, trimmed).
 * Used for deduplication and lookups without decryption.
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}
