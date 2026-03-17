import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { PoliticianCard } from '@pah/shared'
import type { Role } from '@pah/shared'
import { fetchPoliticians } from '../lib/api-client'
import HomePage from './page'

vi.mock('../lib/api-client', () => ({
  fetchPoliticians: vi.fn(),
}))

const mockPolitician: PoliticianCard = {
  id: '1',
  slug: 'joao-silva-sp',
  name: 'João Silva',
  party: 'PL',
  state: 'SP',
  role: 'deputado' as Role,
  photoUrl: null,
  tenureStartDate: null,
  overallScore: 85,
}

describe('HomePage', () => {
  it('renders hero heading', async () => {
    vi.mocked(fetchPoliticians).mockResolvedValueOnce({ data: [], cursor: null })
    render(await HomePage())
    expect(
      screen.getByRole('heading', { level: 1, name: /transparência política no brasil/i }),
    ).toBeInTheDocument()
  })

  it('renders CTA link pointing to /politicos', async () => {
    vi.mocked(fetchPoliticians).mockResolvedValueOnce({ data: [], cursor: null })
    render(await HomePage())
    expect(screen.getByRole('link', { name: /ver todos os políticos/i })).toHaveAttribute(
      'href',
      '/politicos',
    )
  })

  it('renders featured politician cards when data is available', async () => {
    vi.mocked(fetchPoliticians).mockResolvedValueOnce({
      data: [mockPolitician],
      cursor: null,
    })
    render(await HomePage())
    expect(screen.getByText('Políticos em destaque')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  it('renders hero without featured section when fetchPoliticians throws', async () => {
    vi.mocked(fetchPoliticians).mockRejectedValueOnce(new Error('API unavailable'))
    render(await HomePage())
    expect(
      screen.getByRole('heading', { level: 1, name: /transparência política no brasil/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/políticos em destaque/i)).not.toBeInTheDocument()
  })

  it('renders hero without featured section when API returns empty data', async () => {
    vi.mocked(fetchPoliticians).mockResolvedValueOnce({ data: [], cursor: null })
    render(await HomePage())
    expect(screen.queryByText(/políticos em destaque/i)).not.toBeInTheDocument()
  })
})
