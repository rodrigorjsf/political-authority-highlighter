import { describe, it, expect, vi, beforeAll } from 'vitest'

// MUST stub env BEFORE dynamic import (module reads env at module level)
const TEST_KEY = 'a'.repeat(64) // 32 bytes hex-encoded
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('DATABASE_URL_WRITER', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('TRANSPARENCIA_API_KEY', 'test-key')
vi.stubEnv('CPF_ENCRYPTION_KEY', TEST_KEY)
vi.stubEnv('EMAIL_ENCRYPTION_KEY', TEST_KEY)
vi.stubEnv('RESEND_API_KEY', 'test-key')
vi.stubEnv('ALERTS_FROM_EMAIL', 'test@test.com')
vi.stubEnv('API_BASE_URL', 'http://localhost:3001')

let encryptEmail: (email: string) => string
let decryptEmail: (encrypted: string) => string
let hashEmail: (email: string) => string

beforeAll(async () => {
  const mod = await import('./email.js')
  encryptEmail = mod.encryptEmail
  decryptEmail = mod.decryptEmail
  hashEmail = mod.hashEmail
})

describe('encryptEmail / decryptEmail', () => {
  it('round-trips: encrypt then decrypt returns original email', () => {
    const email = 'user@example.com'
    expect(decryptEmail(encryptEmail(email))).toBe(email)
  })

  it('produces different ciphertexts for same input (random IV)', () => {
    const email = 'user@example.com'
    expect(encryptEmail(email)).not.toBe(encryptEmail(email))
  })

  it('encrypted output is base64-encoded', () => {
    const encrypted = encryptEmail('user@example.com')
    const buf = Buffer.from(encrypted, 'base64')
    expect(buf.toString('base64')).toBe(encrypted)
  })

  it('handles emails with special characters', () => {
    const email = 'user+tag@example.co.uk'
    expect(decryptEmail(encryptEmail(email))).toBe(email)
  })
})

describe('hashEmail', () => {
  it('normalizes to lowercase before hashing', () => {
    expect(hashEmail('USER@EXAMPLE.COM')).toBe(hashEmail('user@example.com'))
  })

  it('trims whitespace before hashing', () => {
    expect(hashEmail('  user@example.com  ')).toBe(hashEmail('user@example.com'))
  })

  it('produces 64-char hex string (SHA-256)', () => {
    expect(hashEmail('user@example.com')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces different hashes for different emails', () => {
    expect(hashEmail('user1@example.com')).not.toBe(hashEmail('user2@example.com'))
  })

  it('is consistent across calls', () => {
    const hash1 = hashEmail('user@example.com')
    const hash2 = hashEmail('user@example.com')
    expect(hash1).toBe(hash2)
  })
})
