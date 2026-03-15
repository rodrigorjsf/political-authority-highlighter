import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PoliticianJsonLd } from './json-ld'
import type { PoliticianProfile } from '../../lib/api-types'
import { Role } from '@pah/shared'

const mockPolitician: PoliticianProfile = {
  id: '1',
  slug: 'joao-silva-sp',
  name: 'João Silva',
  party: 'PT',
  state: 'SP',
  role: Role.DEPUTADO,
  photoUrl: 'https://www.camara.leg.br/internet/deputado/bandep/12345.jpg',
  bioSummary: null,
  tenureStartDate: '2023-01-01',
  overallScore: 72,
  transparencyScore: 20,
  legislativeScore: 18,
  financialScore: 22,
  anticorruptionScore: 12,
  exclusionFlag: false,
  methodologyVersion: 'v1.0',
}

describe('PoliticianJsonLd', () => {
  it('renders a script tag with type application/ld+json', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
  })

  it('includes correct @type Person and politician name', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}') as Record<string, unknown>
    expect(jsonLd['@type']).toBe('Person')
    expect(jsonLd.name).toBe('João Silva')
  })

  it('includes correct jobTitle for deputado', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}') as Record<string, unknown>
    expect(jsonLd.jobTitle).toBe('Deputado Federal')
  })

  it('includes correct jobTitle for senador', () => {
    const senator = { ...mockPolitician, role: Role.SENADOR }
    const { container } = render(<PoliticianJsonLd politician={senator} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}') as Record<string, unknown>
    expect(jsonLd.jobTitle).toBe('Senador da República')
  })

  it('includes politician photoUrl as image', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}') as Record<string, unknown>
    expect(jsonLd.image).toBe(mockPolitician.photoUrl)
  })

  it('includes profile URL with correct slug', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}') as Record<string, unknown>
    expect(jsonLd.url).toBe('https://autoridade-politica.com.br/politicos/joao-silva-sp')
  })

  it('escapes < characters to prevent XSS', () => {
    const malicious = {
      ...mockPolitician,
      name: 'Test</script><script>alert(1)',
    }
    const { container } = render(<PoliticianJsonLd politician={malicious} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script?.innerHTML).not.toContain('</script>')
    expect(script?.innerHTML).toContain('\\u003c')
  })

  it('does not include party colors or qualitative labels (DR-002)', () => {
    const { container } = render(<PoliticianJsonLd politician={mockPolitician} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const raw = script?.innerHTML ?? ''
    expect(raw).not.toMatch(/excelente|ótimo|bom|ruim|corrupt|clean/i)
  })
})
