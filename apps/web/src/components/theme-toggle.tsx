'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'pah-theme'

export function ThemeToggle(): React.JSX.Element {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    const current = document.documentElement.getAttribute('data-theme')
    const value = stored ?? current ?? 'light'
    setTheme(value === 'dark' ? 'dark' : 'light')
  }, [])

  const toggle = (): void => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden="true" />
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {theme === 'light' ? (
        <Moon size={16} aria-hidden="true" />
      ) : (
        <Sun size={16} aria-hidden="true" />
      )}
    </button>
  )
}
