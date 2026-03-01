import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useSearchParams, useRouter } from 'next/navigation'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { StateFilter } from './state-filter'

// helpers to satisfy strict types from next/navigation mocks
const mockSearchParams = (init?: string): ReadonlyURLSearchParams =>
  new URLSearchParams(init) as unknown as ReadonlyURLSearchParams

const mockRouter = (push: ReturnType<typeof vi.fn>): AppRouterInstance =>
  ({ push, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) as AppRouterInstance

describe('StateFilter', () => {
  it('renders select with 28 options (Todos + 27 UFs)', () => {
    render(<StateFilter />)
    expect(screen.getByRole('combobox', { name: /filtrar por estado/i })).toBeInTheDocument()
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(28)
    expect(screen.getByRole('option', { name: 'Todos os estados' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'SP' })).toBeInTheDocument()
  })

  it('defaults to empty (Todos os estados) when no state in URL', () => {
    render(<StateFilter />)
    const select = screen.getByRole('combobox', { name: /filtrar por estado/i })
    expect((select as HTMLSelectElement).value).toBe('')
  })

  it('shows SP as selected when state=SP in URL', () => {
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('state=SP'))
    render(<StateFilter />)
    const select = screen.getByRole('combobox', { name: /filtrar por estado/i })
    expect((select as HTMLSelectElement).value).toBe('SP')
  })

  it('calls router.push with state param and clears cursor on change', () => {
    const pushMock = vi.fn()
    vi.mocked(useRouter).mockReturnValueOnce(mockRouter(pushMock))
    // Simulate existing cursor in URL so we can verify it's cleared
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('cursor=abc123'))

    render(<StateFilter />)
    fireEvent.change(screen.getByRole('combobox', { name: /filtrar por estado/i }), {
      target: { value: 'RJ' },
    })

    expect(pushMock).toHaveBeenCalledWith('/politicos?state=RJ')
  })

  it('removes state param from URL when Todos os estados is selected', () => {
    const pushMock = vi.fn()
    vi.mocked(useRouter).mockReturnValueOnce(mockRouter(pushMock))
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('state=SP'))

    render(<StateFilter />)
    fireEvent.change(screen.getByRole('combobox', { name: /filtrar por estado/i }), {
      target: { value: '' },
    })

    expect(pushMock).toHaveBeenCalledWith('/politicos')
  })
})
