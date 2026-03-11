import { describe, it, expect } from 'vitest'
import { transformSenador } from './senado.js'
import type { SenadorData } from '../types.js'

function buildSenadorData(overrides: Partial<SenadorData> = {}): SenadorData {
  return {
    CodigoParlamentar: '5678',
    NomeParlamentar: 'Maria Santos',
    NomeCompletoParlamentar: 'Maria Santos da Silva',
    SiglaPartidoParlamentar: 'PT',
    UfParlamentar: 'RJ',
    UrlFotoParlamentar: 'https://www.senado.leg.br/senadores/img/fotos/5678.jpg',
    EmailParlamentar: 'maria.santos@senado.leg.br',
    ...overrides,
  }
}

describe('transformSenador', () => {
  it('transforms a Senado senator to PoliticianUpsert', () => {
    const raw = buildSenadorData()
    const result = transformSenador(raw)

    expect(result.externalId).toBe('senado-5678')
    expect(result.source).toBe('senado')
    expect(result.name).toBe('Maria Santos')
    expect(result.party).toBe('PT')
    expect(result.state).toBe('RJ')
    expect(result.role).toBe('senador')
  })

  it('generates slug with state suffix', () => {
    const raw = buildSenadorData()
    const result = transformSenador(raw)

    expect(result.slug).toBe('maria-santos-rj')
  })

  it('handles missing photo URL', () => {
    const raw = buildSenadorData({ UrlFotoParlamentar: '' })
    const result = transformSenador(raw)

    expect(result.photoUrl).toBeNull()
  })
})
