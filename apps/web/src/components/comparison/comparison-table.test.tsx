import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ComparisonTable } from './comparison-table'
import type { PoliticianProfile } from '../../lib/api-types'
import type { Role } from '@pah/shared'

const mockPoliticianA: PoliticianProfile = {
  id: '1',
  slug: 'joao-silva-sp',
  name: 'João Silva',
  party: 'PL',
  state: 'SP',
  role: 'deputado' as Role,
  photoUrl: null,
  bioSummary: null,
  tenureStartDate: null,
  overallScore: 72,
  transparencyScore: 20,
  legislativeScore: 18,
  financialScore: 22,
  anticorruptionScore: 12,
  exclusionFlag: false,
  methodologyVersion: '1.0',
}

const mockPoliticianB: PoliticianProfile = {
  id: '2',
  slug: 'maria-santos-rj',
  name: 'Maria Santos',
  party: 'PT',
  state: 'RJ',
  role: 'senador' as Role,
  photoUrl: null,
  bioSummary: null,
  tenureStartDate: null,
  overallScore: 61,
  transparencyScore: 18,
  legislativeScore: 15,
  financialScore: 20,
  anticorruptionScore: 8,
  exclusionFlag: false,
  methodologyVersion: '1.0',
}

describe('ComparisonTable', () => {
  it('renders both politician names as links to their profiles', () => {
    render(<ComparisonTable politicianA={mockPoliticianA} politicianB={mockPoliticianB} />)
    expect(screen.getByRole('link', { name: /joão silva/i })).toHaveAttribute(
      'href',
      '/politicos/joao-silva-sp',
    )
    expect(screen.getByRole('link', { name: /maria santos/i })).toHaveAttribute(
      'href',
      '/politicos/maria-santos-rj',
    )
  })

  it('renders overall scores as fractions (DR-002: factual display)', () => {
    render(<ComparisonTable politicianA={mockPoliticianA} politicianB={mockPoliticianB} />)
    expect(screen.getAllByText('72/100')).toHaveLength(1)
    expect(screen.getAllByText('61/100')).toHaveLength(1)
  })

  it('renders all 5 score component rows', () => {
    render(<ComparisonTable politicianA={mockPoliticianA} politicianB={mockPoliticianB} />)
    expect(screen.getByText('Pontuação Geral')).toBeInTheDocument()
    expect(screen.getByText('Transparência')).toBeInTheDocument()
    expect(screen.getByText('Atividade Legislativa')).toBeInTheDocument()
    expect(screen.getByText('Regularidade Financeira')).toBeInTheDocument()
    expect(screen.getByText('Anti-Corrupção')).toBeInTheDocument()
  })

  it('does not display qualitative labels (DR-002)', () => {
    render(<ComparisonTable politicianA={mockPoliticianA} politicianB={mockPoliticianB} />)
    expect(
      screen.queryByText(/melhor|pior|vencedor|mais|menos|excelente/i),
    ).not.toBeInTheDocument()
  })

  it('does not render ExclusionNotice when neither politician has exclusionFlag', () => {
    render(<ComparisonTable politicianA={mockPoliticianA} politicianB={mockPoliticianB} />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('renders ExclusionNotice when politicianA has exclusionFlag', () => {
    const politicianWithExclusion = { ...mockPoliticianA, exclusionFlag: true }
    render(
      <ComparisonTable politicianA={politicianWithExclusion} politicianB={mockPoliticianB} />,
    )
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})
