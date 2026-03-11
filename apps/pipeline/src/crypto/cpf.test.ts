import { describe, it, expect, vi, beforeAll } from 'vitest'

// Set env before importing the module (which reads env at module level)
const TEST_KEY = 'a'.repeat(64) // 32 bytes hex-encoded
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('DATABASE_URL_WRITER', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('TRANSPARENCIA_API_KEY', 'test-key')
vi.stubEnv('CPF_ENCRYPTION_KEY', TEST_KEY)

// Dynamic import after env is set
let encryptCPF: (cpf: string) => string
let decryptCPF: (encrypted: string) => string
let hashCPF: (cpf: string) => string

beforeAll(async () => {
  const mod = await import('./cpf.js')
  encryptCPF = mod.encryptCPF
  decryptCPF = mod.decryptCPF
  hashCPF = mod.hashCPF
})

describe('hashCPF', () => {
  it('produces a consistent SHA-256 hex digest', () => {
    const hash1 = hashCPF('12345678901')
    const hash2 = hashCPF('12345678901')
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA-256 = 64 hex chars
  })

  it('normalizes CPF by removing non-digits', () => {
    const hashFormatted = hashCPF('123.456.789-01')
    const hashDigits = hashCPF('12345678901')
    expect(hashFormatted).toBe(hashDigits)
  })

  it('zero-pads short CPFs to 11 digits', () => {
    const hashShort = hashCPF('1234567890') // 10 digits
    const hashPadded = hashCPF('01234567890') // 11 digits with leading zero
    expect(hashShort).toBe(hashPadded)
  })

  it('produces different hashes for different CPFs', () => {
    const hash1 = hashCPF('12345678901')
    const hash2 = hashCPF('98765432100')
    expect(hash1).not.toBe(hash2)
  })
})

describe('encryptCPF / decryptCPF', () => {
  it('round-trips: encrypt then decrypt returns original CPF', () => {
    const cpf = '12345678901'
    const encrypted = encryptCPF(cpf)
    const decrypted = decryptCPF(encrypted)
    expect(decrypted).toBe(cpf)
  })

  it('produces different ciphertexts for same input (random IV)', () => {
    const cpf = '12345678901'
    const encrypted1 = encryptCPF(cpf)
    const encrypted2 = encryptCPF(cpf)
    expect(encrypted1).not.toBe(encrypted2)
  })

  it('encrypted output is base64-encoded', () => {
    const encrypted = encryptCPF('12345678901')
    expect(() => Buffer.from(encrypted, 'base64')).not.toThrow()
    // Re-encoding should match (valid base64)
    expect(Buffer.from(encrypted, 'base64').toString('base64')).toBe(encrypted)
  })
})
