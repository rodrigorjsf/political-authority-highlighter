'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function SearchBar(): React.JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('search') ?? '')
  // Ref avoids stale closure in debounce effect while keeping searchParams out of deps
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString())
      if (value.length >= 2) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      params.delete('cursor')
      const qs = params.toString()
      router.push(qs !== '' ? `${pathname}?${qs}` : pathname)
    }, 300)
    return () => clearTimeout(timeout)
  }, [value, router, pathname]) // searchParamsRef intentionally omitted (ref, not state)

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="search-bar" className="text-sm font-medium text-foreground">
        Buscar:
      </label>
      <input
        id="search-bar"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por nome..."
        aria-label="Buscar por nome"
        minLength={2}
        className="w-64 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}
