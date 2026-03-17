import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ThemeToggle } from './theme-toggle'

// Provide a standard in-memory localStorage since the jsdom environment
// uses a custom storage that doesn't expose the standard Storage API
const createLocalStorageMock = (): Storage => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key]
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete store[key]
      }
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    },
  }
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders toggle button after hydration', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('defaults to light mode (shows moon icon) when no stored preference', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Ativar modo escuro' })).toBeInTheDocument()
  })

  it('reads stored dark theme from localStorage on mount', () => {
    localStorage.setItem('pah-theme', 'dark')
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Ativar modo claro' })).toBeInTheDocument()
  })

  it('toggles from light to dark on click', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Ativar modo escuro' }))
    expect(screen.getByRole('button', { name: 'Ativar modo claro' })).toBeInTheDocument()
  })

  it('writes new theme to localStorage on toggle', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(localStorage.getItem('pah-theme')).toBe('dark')
  })

  it('sets data-theme attribute on documentElement when toggled', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('toggles from dark back to light on second click', () => {
    localStorage.setItem('pah-theme', 'dark')
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Ativar modo claro' }))
    expect(localStorage.getItem('pah-theme')).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
