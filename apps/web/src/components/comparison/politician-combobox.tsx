'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { fetchPoliticians } from '../../lib/api-client'
import type { PoliticianCard } from '../../lib/api-types'

interface PoliticianComboboxProps {
  paramName: 'a' | 'b'
  label: string
  initialName?: string | undefined
}

export function PoliticianCombobox({
  paramName,
  label,
  initialName,
}: PoliticianComboboxProps): React.JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialName ?? '')
  const [suggestions, setSuggestions] = useState<PoliticianCard[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }
    const timeout = setTimeout(() => {
      fetchPoliticians({ search: query, limit: 5 })
        .then((result) => {
          setSuggestions(result.data)
          setIsOpen(true)
        })
        .catch(() => setSuggestions([]))
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  function handleSelect(politician: PoliticianCard): void {
    const params = new URLSearchParams(searchParamsRef.current.toString())
    params.set(paramName, politician.slug)
    router.push(`${pathname}?${params.toString()}`)
    setQuery(politician.name)
    setIsOpen(false)
  }

  function handleClear(): void {
    const params = new URLSearchParams(searchParamsRef.current.toString())
    params.delete(paramName)
    const qs = params.toString()
    router.push(qs !== '' ? `${pathname}?${qs}` : pathname)
    setQuery('')
    setSuggestions([])
  }

  return (
    <div className="relative">
      <label
        htmlFor={`combobox-${paramName}`}
        className="mb-1 block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={`combobox-${paramName}`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Buscar por nome..."
          aria-label={`${label}: buscar por nome`}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`suggestions-${paramName}`}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {query !== '' && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={`Limpar seleção de ${label}`}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          >
            ✕
          </button>
        )}
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul
          id={`suggestions-${paramName}`}
          role="listbox"
          aria-label={`Sugestões para ${label}`}
          className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg"
        >
          {suggestions.map((p) => (
            <li
              key={p.id}
              role="option"
              aria-selected={false}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-muted focus:bg-muted"
              onMouseDown={() => handleSelect(p)}
            >
              <span className="font-medium">{p.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {p.party}-{p.state}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
