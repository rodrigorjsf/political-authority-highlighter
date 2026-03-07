import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MetodologiaPage from './page'

describe('MetodologiaPage', () => {
  it('renders main heading', () => {
    render(<MetodologiaPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: /como calculamos/i }),
    ).toBeInTheDocument()
  })

  it('renders 4 score component labels', () => {
    render(<MetodologiaPage />)
    expect(screen.getByText(/transparência \(0–25\)/i)).toBeInTheDocument()
    expect(screen.getByText(/atividade legislativa \(0–25\)/i)).toBeInTheDocument()
    expect(screen.getByText(/regularidade financeira \(0–25\)/i)).toBeInTheDocument()
    expect(screen.getByText(/anti-corrupção \(0 ou 25\)/i)).toBeInTheDocument()
  })

  it('renders 6 data source links with correct URLs', () => {
    render(<MetodologiaPage />)
    const camaraLink = screen.getByRole('link', { name: /câmara dos deputados/i })
    expect(camaraLink).toHaveAttribute('href', 'https://dadosabertos.camara.leg.br')

    const senadoLink = screen.getByRole('link', { name: /senado federal/i })
    expect(senadoLink).toHaveAttribute('href', 'https://legis.senado.leg.br/dadosabertos/')

    // Portal da Transparência appears twice: sources section + anti-corruption section
    const portalLinks = screen.getAllByRole('link', { name: /portal da transparência/i })
    expect(portalLinks.length).toBeGreaterThanOrEqual(1)
    expect(portalLinks[0]).toHaveAttribute('href', 'https://www.portaltransparencia.gov.br')

    expect(screen.getByRole('link', { name: /tse/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tcu/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cgu/i })).toBeInTheDocument()
  })

  it('renders anti-corruption section without specific database or record details (DR-001)', () => {
    render(<MetodologiaPage />)
    // Text appears in both the component description and the dedicated section
    const matches = screen.getAllByText(/bases públicas de anticorrupção/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
    // DR-001: must NOT expose specific database names
    expect(screen.queryByText(/\bceis\b/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\bcepim\b/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\bcnep\b/i)).not.toBeInTheDocument()
  })

  it('renders methodology version', () => {
    render(<MetodologiaPage />)
    expect(screen.getByText(/versão da metodologia/i)).toBeInTheDocument()
    expect(screen.getByText(/v1\.0/)).toBeInTheDocument()
  })
})
