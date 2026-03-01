import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useSearchParams, useRouter } from 'next/navigation'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { RoleFilter } from './role-filter'

// helpers to satisfy strict types from next/navigation mocks
const mockSearchParams = (init?: string): ReadonlyURLSearchParams =>
  new URLSearchParams(init) as unknown as ReadonlyURLSearchParams

const mockRouter = (push: ReturnType<typeof vi.fn>): AppRouterInstance =>
  ({ push, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) as AppRouterInstance

describe('RoleFilter', () => {
  it('renders select with all 3 options', () => {
    render(<RoleFilter />)
    expect(screen.getByRole('combobox', { name: /filtrar por cargo/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Todos os cargos' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Deputado Federal' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Senador' })).toBeInTheDocument()
  })

  it('defaults to empty (Todos os cargos) when no role in URL', () => {
    render(<RoleFilter />)
    const select = screen.getByRole('combobox', { name: /filtrar por cargo/i })
    expect((select as HTMLSelectElement).value).toBe('')
  })

  it('shows Senador as selected when role=senador in URL', () => {
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('role=senador'))
    render(<RoleFilter />)
    const select = screen.getByRole('combobox', { name: /filtrar por cargo/i })
    expect((select as HTMLSelectElement).value).toBe('senador')
  })

  it('calls router.push with role param and clears cursor on change', () => {
    const pushMock = vi.fn()
    vi.mocked(useRouter).mockReturnValueOnce(mockRouter(pushMock))
    // Simulate existing cursor in URL so we can verify it's cleared
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('cursor=abc123'))

    render(<RoleFilter />)
    fireEvent.change(screen.getByRole('combobox', { name: /filtrar por cargo/i }), {
      target: { value: 'deputado' },
    })

    expect(pushMock).toHaveBeenCalledWith('/politicos?role=deputado')
  })

  it('removes role param from URL when Todos os cargos is selected', () => {
    const pushMock = vi.fn()
    vi.mocked(useRouter).mockReturnValueOnce(mockRouter(pushMock))
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('role=senador'))

    render(<RoleFilter />)
    fireEvent.change(screen.getByRole('combobox', { name: /filtrar por cargo/i }), {
      target: { value: '' },
    })

    expect(pushMock).toHaveBeenCalledWith('/politicos')
  })
})
