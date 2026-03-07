import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreBreakdown } from './score-breakdown'

const mockPolitician = {
  overallScore: 72,
  transparencyScore: 20,
  legislativeScore: 18,
  financialScore: 22,
  anticorruptionScore: 12,
}

describe('ScoreBreakdown', () => {
  it('renders all 4 score component labels', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    expect(screen.getByText('Transparência')).toBeInTheDocument()
    expect(screen.getByText('Atividade Legislativa')).toBeInTheDocument()
    expect(screen.getByText('Regularidade Financeira')).toBeInTheDocument()
    expect(screen.getByText('Anti-Corrupção')).toBeInTheDocument()
  })

  it('renders score values as fractions of maxValue', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    expect(screen.getByText('20/25')).toBeInTheDocument()
    expect(screen.getByText('18/25')).toBeInTheDocument()
    expect(screen.getByText('22/25')).toBeInTheDocument()
    expect(screen.getByText('12/25')).toBeInTheDocument()
  })

  it('renders progress bars with correct aria-valuenow attributes', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(4)
    expect(bars[0]).toHaveAttribute('aria-valuenow', '20')
    expect(bars[1]).toHaveAttribute('aria-valuenow', '18')
    expect(bars[2]).toHaveAttribute('aria-valuenow', '22')
    expect(bars[3]).toHaveAttribute('aria-valuenow', '12')
  })

  it('does not render qualitative score labels (DR-002)', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    expect(screen.queryByText(/excelente|bom|ruim|ótimo|fraco/i)).not.toBeInTheDocument()
  })

  it('renders methodology link when showMethodologyLink is true', () => {
    render(<ScoreBreakdown politician={mockPolitician} showMethodologyLink />)
    expect(screen.getByRole('link', { name: /nossa metodologia/i })).toHaveAttribute(
      'href',
      '/metodologia',
    )
  })

  it('does not render methodology link by default', () => {
    render(<ScoreBreakdown politician={mockPolitician} />)
    expect(screen.queryByRole('link', { name: /nossa metodologia/i })).not.toBeInTheDocument()
  })
})
