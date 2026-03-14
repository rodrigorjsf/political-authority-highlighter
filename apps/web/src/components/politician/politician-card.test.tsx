import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PoliticianCard } from './politician-card'
import type { PoliticianCard as PoliticianCardType } from '@pah/shared'
import { Role } from '@pah/shared'

const mockPolitician: PoliticianCardType = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  slug: 'joao-silva-sp',
  name: 'João Silva',
  party: 'PL',
  state: 'SP',
  role: Role.DEPUTADO,
  photoUrl: null,
  tenureStartDate: '2023-02-01',
  overallScore: 72,
}

describe('PoliticianCard', () => {
  it('displays the politician name', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  it('displays party and state badges', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    expect(screen.getByText('PL')).toBeInTheDocument()
    expect(screen.getByText('SP')).toBeInTheDocument()
  })

  it('displays score as X/100 — no qualitative labels (DR-002)', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    expect(screen.getByText('72/100')).toBeInTheDocument()
    expect(screen.queryByText(/excelente|ótimo|bom|ruim/i)).not.toBeInTheDocument()
  })

  it('links to the politician profile page', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/politicos/joao-silva-sp')
  })

  it('shows fallback when photoUrl is null', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'Foto de João Silva, PL-SP')
  })

  it('uses accessible article element', () => {
    render(<PoliticianCard politician={mockPolitician} />)
    expect(screen.getByRole('article')).toBeInTheDocument()
  })
})
