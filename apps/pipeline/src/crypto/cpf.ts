import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

const encryptionKey = Buffer.from(env.CPF_ENCRYPTION_KEY, 'hex') // 32 bytes

/**
 * Encrypts a CPF value using AES-256-GCM.
 * Storage format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext, base64-encoded.
 * IV is randomly generated per encryption — never reused.
 *
 * DR-005: CPF never exposed. Encrypted at rest, hashed for lookups.
 */
export function encryptCPF(cpf: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(cpf, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * Decrypts a CPF value from AES-256-GCM encrypted base64.
 * Only used for admin debugging — never in API layer.
 */
export function decryptCPF(encrypted: string): string {
  const buffer = Buffer.from(encrypted, 'base64')
  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext).toString('utf-8') + decipher.final('utf-8')
}

/**
 * Creates a SHA-256 hash of the normalized CPF (digits only, zero-padded to 11).
 * Used for cross-source matching without decryption.
 */
export function hashCPF(cpf: string): string {
  const normalized = cpf.replace(/\D/g, '').padStart(11, '0')
  return createHash('sha256').update(normalized).digest('hex')
}
