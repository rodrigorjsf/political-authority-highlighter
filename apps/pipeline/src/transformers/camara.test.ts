import { describe, it, expect } from 'vitest'
import { transformCamaraDeputy, transformCamaraBill } from './camara.js'
import type { CamaraDeputy, CamaraBill } from '../types.js'

function buildCamaraDeputy(overrides: Partial<CamaraDeputy> = {}): CamaraDeputy {
  return {
    id: 123456,
    uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/123456',
    nome: 'João Silva',
    siglaPartido: 'PL',
    uriPartido: 'https://dadosabertos.camara.leg.br/api/v2/partidos/PL',
    siglaUf: 'SP',
    idLegislatura: 57,
    urlFoto: 'https://www.camara.leg.br/internet/deputado/bandep/123456.jpg',
    email: 'joao.silva@camara.leg.br',
    ...overrides,
  }
}

function buildCamaraBill(overrides: Partial<CamaraBill> = {}): CamaraBill {
  return {
    id: 789012,
    uri: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/789012',
    siglaTipo: 'PL',
    codTipo: 139,
    numero: 1200,
    ano: 2024,
    ementa: 'Dispõe sobre mudanças climáticas',
    ...overrides,
  }
}

describe('transformCamaraDeputy', () => {
  it('transforms a Camara deputy to PoliticianUpsert', () => {
    const raw = buildCamaraDeputy()
    const result = transformCamaraDeputy(raw)

    expect(result.externalId).toBe('camara-123456')
    expect(result.source).toBe('camara')
    expect(result.name).toBe('João Silva')
    expect(result.party).toBe('PL')
    expect(result.state).toBe('SP')
    expect(result.role).toBe('deputado')
    expect(result.photoUrl).toBe('https://www.camara.leg.br/internet/deputado/bandep/123456.jpg')
  })

  it('generates URL-friendly slug from name and state', () => {
    const raw = buildCamaraDeputy({ nome: 'José André', siglaUf: 'RJ' })
    const result = transformCamaraDeputy(raw)

    expect(result.slug).toBe('jose-andre-rj')
  })

  it('handles special characters in names (diacritics)', () => {
    const raw = buildCamaraDeputy({ nome: 'María Conceição' })
    const result = transformCamaraDeputy(raw)

    expect(result.slug).toMatch(/^maria-conceicao-sp$/)
  })

  it('sets photoUrl to null when empty string', () => {
    const raw = buildCamaraDeputy({ urlFoto: '' })
    const result = transformCamaraDeputy(raw)

    expect(result.photoUrl).toBeNull()
  })
})

describe('transformCamaraBill', () => {
  it('transforms a Camara bill to BillUpsert', () => {
    const raw = buildCamaraBill()
    const result = transformCamaraBill(raw, 'politician-uuid-123')

    expect(result.externalId).toBe('camara-bill-789012')
    expect(result.source).toBe('camara')
    expect(result.politicianId).toBe('politician-uuid-123')
    expect(result.title).toBe('Dispõe sobre mudanças climáticas')
    expect(result.billType).toBe('PL')
    expect(result.billNumber).toBe('1200')
    expect(result.billYear).toBe(2024)
    expect(result.sourceUrl).toContain('789012')
  })
})
