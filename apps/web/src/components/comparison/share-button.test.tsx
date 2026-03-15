import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ShareButton } from './share-button'

describe('ShareButton', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  it('renders with label "Compartilhar"', () => {
    render(<ShareButton />)
    expect(screen.getByRole('button', { name: /copiar link/i })).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent('Compartilhar')
  })

  it('shows "Copiado!" after click', async () => {
    render(<ShareButton />)
    // eslint-disable-next-line @typescript-eslint/require-await -- need async act to flush microtasks from clipboard.writeText
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(screen.getByRole('button')).toHaveTextContent('Copiado!')
  })

  it('has aria-live="polite" for screen reader announcement', () => {
    render(<ShareButton />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-live', 'polite')
  })
})
