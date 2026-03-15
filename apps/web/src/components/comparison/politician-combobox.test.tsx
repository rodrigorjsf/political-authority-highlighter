import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import { PoliticianCombobox } from './politician-combobox'

const mockSearchParams = (init?: string): ReadonlyURLSearchParams =>
  new URLSearchParams(init) as unknown as ReadonlyURLSearchParams

const mockRouter = (push: ReturnType<typeof vi.fn>): AppRouterInstance =>
  ({
    push,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }) as AppRouterInstance

describe('PoliticianCombobox', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(usePathname).mockReturnValue('/comparar')
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams())
    vi.mocked(useRouter).mockReturnValue(mockRouter(vi.fn()))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders label and input with placeholder', () => {
    render(<PoliticianCombobox paramName="a" label="Político A" />)
    expect(screen.getByLabelText('Político A: buscar por nome')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar por nome...')).toBeInTheDocument()
  })

  it('pre-fills input with initialName when provided', () => {
    render(<PoliticianCombobox paramName="a" label="Político A" initialName="João Silva" />)
    expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument()
  })

  it('shows clear button when input has value', () => {
    render(<PoliticianCombobox paramName="a" label="Político A" initialName="João Silva" />)
    expect(screen.getByRole('button', { name: /limpar seleção/i })).toBeInTheDocument()
  })

  it('does not show clear button when input is empty', () => {
    render(<PoliticianCombobox paramName="a" label="Político A" />)
    expect(screen.queryByRole('button', { name: /limpar seleção/i })).not.toBeInTheDocument()
  })
})
