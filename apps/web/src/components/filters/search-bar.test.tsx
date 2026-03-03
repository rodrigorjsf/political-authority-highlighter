import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { SearchBar } from './search-bar'

// helpers to satisfy strict types from next/navigation mocks
const mockSearchParams = (init?: string): ReadonlyURLSearchParams =>
  new URLSearchParams(init) as unknown as ReadonlyURLSearchParams

const mockRouter = (push: ReturnType<typeof vi.fn>): AppRouterInstance =>
  ({ push, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) as AppRouterInstance

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders input with placeholder "Buscar por nome..."', () => {
    render(<SearchBar />)
    expect(screen.getByPlaceholderText('Buscar por nome...')).toBeInTheDocument()
  })

  it('defaults to empty value when no search in URL', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Buscar por nome...')
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('shows "joao" as value when search=joao in URL', () => {
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('search=joao'))
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Buscar por nome...')
    expect((input as HTMLInputElement).value).toBe('joao')
  })

  it('calls router.push with search param after 300ms debounce, clears cursor', () => {
    const pushMock = vi.fn()
    // Two mockReturnValueOnce calls: first render + re-render after setValue('joao')
    vi.mocked(useRouter).mockReturnValueOnce(mockRouter(pushMock))
    vi.mocked(useRouter).mockReturnValueOnce(mockRouter(pushMock))
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('cursor=abc123'))
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('cursor=abc123'))

    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Buscar por nome...')

    fireEvent.change(input, { target: { value: 'joao' } })

    // Should not push before debounce fires
    expect(pushMock).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(pushMock).toHaveBeenCalledWith('/politicos?search=joao')
  })

  it('removes search param from URL when input is cleared to less than 2 chars', () => {
    const pushMock = vi.fn()
    // Two mockReturnValueOnce calls: first render + re-render after setValue('j')
    vi.mocked(useRouter).mockReturnValueOnce(mockRouter(pushMock))
    vi.mocked(useRouter).mockReturnValueOnce(mockRouter(pushMock))
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('search=joao'))
    vi.mocked(useSearchParams).mockReturnValueOnce(mockSearchParams('search=joao'))

    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Buscar por nome...')

    fireEvent.change(input, { target: { value: 'j' } })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(pushMock).toHaveBeenCalledWith('/politicos')
  })
})
