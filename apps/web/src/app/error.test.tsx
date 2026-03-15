import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ErrorPage from './error'

describe('ErrorPage', () => {
  it('renders a generic heading, not the error message', () => {
    render(<ErrorPage error={new Error('db connection string leaked')} reset={vi.fn()} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Ocorreu um erro inesperado')
  })

  it('does NOT render error.message in the output', () => {
    render(<ErrorPage error={new Error('db connection string leaked')} reset={vi.fn()} />)
    expect(screen.queryByText(/db connection string leaked/i)).not.toBeInTheDocument()
  })

  it('renders a "Try again" button', () => {
    render(<ErrorPage error={new Error('something broke')} reset={vi.fn()} />)
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  })

  it('calls reset() when the button is clicked', () => {
    const reset = vi.fn()
    render(<ErrorPage error={new Error('')} reset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))
    expect(reset).toHaveBeenCalledOnce()
  })

  it('shows error.digest as a reference when provided', () => {
    const error = Object.assign(new Error(''), { digest: 'abc123' })
    render(<ErrorPage error={error} reset={vi.fn()} />)
    expect(screen.getByText(/abc123/)).toBeInTheDocument()
  })
})
