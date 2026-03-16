import { describe, it, expect, vi, beforeAll } from 'vitest'

// Stub env before importing modules that depend on it
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('DATABASE_URL_WRITER', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('TRANSPARENCIA_API_KEY', 'test-key')
vi.stubEnv('CPF_ENCRYPTION_KEY', 'a'.repeat(64))
vi.stubEnv('EMAIL_ENCRYPTION_KEY', 'a'.repeat(64))
vi.stubEnv('RESEND_API_KEY', 'test-key')
vi.stubEnv('ALERTS_FROM_EMAIL', 'test@test.com')

let matchPoliticiansByCPF: typeof import('./cpf.js').matchPoliticiansByCPF

beforeAll(async () => {
  const mod = await import('./cpf.js')
  matchPoliticiansByCPF = mod.matchPoliticiansByCPF
})

describe('matchPoliticiansByCPF', () => {
  it('returns empty array when no cross-source matches exist', () => {
    const result = matchPoliticiansByCPF([
      { source: 'camara', cpfToId: new Map([['12345678901', 'camara-1']]) },
      { source: 'senado', cpfToId: new Map([['99999999999', 'senado-1']]) },
    ])

    expect(result).toHaveLength(0)
  })

  it('finds matches when same CPF exists in multiple sources', () => {
    const result = matchPoliticiansByCPF([
      { source: 'camara', cpfToId: new Map([['12345678901', 'camara-1']]) },
      { source: 'senado', cpfToId: new Map([['12345678901', 'senado-1']]) },
    ])

    expect(result).toHaveLength(1)
    expect(result[0]!.sources.size).toBe(2)
    expect(result[0]!.sources.get('camara')).toBe('camara-1')
    expect(result[0]!.sources.get('senado')).toBe('senado-1')
  })

  it('handles matches across 3+ sources', () => {
    const result = matchPoliticiansByCPF([
      { source: 'camara', cpfToId: new Map([['12345678901', 'camara-1']]) },
      { source: 'senado', cpfToId: new Map([['12345678901', 'senado-1']]) },
      { source: 'tse', cpfToId: new Map([['12345678901', 'tse-1']]) },
    ])

    expect(result).toHaveLength(1)
    expect(result[0]!.sources.size).toBe(3)
  })

  it('does not include single-source entries in results', () => {
    const result = matchPoliticiansByCPF([
      {
        source: 'camara',
        cpfToId: new Map([
          ['12345678901', 'camara-1'],
          ['11111111111', 'camara-2'],
        ]),
      },
      { source: 'senado', cpfToId: new Map([['12345678901', 'senado-1']]) },
    ])

    // Only the matching CPF, not the camara-only one
    expect(result).toHaveLength(1)
    expect(result[0]!.sources.has('camara')).toBe(true)
    expect(result[0]!.sources.has('senado')).toBe(true)
  })
})
