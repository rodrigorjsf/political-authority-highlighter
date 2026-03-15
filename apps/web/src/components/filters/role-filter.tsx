'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { useAnalytics } from '../../lib/analytics-events'

const ROLE_OPTIONS = [
  { value: '', label: 'Todos os cargos' },
  { value: 'deputado', label: 'Deputado Federal' },
  { value: 'senador', label: 'Senador' },
] as const

export function RoleFilter(): React.JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const track = useAnalytics()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      const { value } = e.target
      const params = new URLSearchParams(searchParams.toString())
      if (value !== '') {
        params.set('role', value)
        track('filtro_aplicado', { props: { filtro: 'cargo', valor: value } })
      } else {
        params.delete('role')
      }
      params.delete('cursor') // always reset pagination on filter change
      const qs = params.toString()
      router.push(qs !== '' ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams, track],
  )

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="role-filter" className="text-sm font-medium text-foreground">
        Cargo:
      </label>
      <select
        id="role-filter"
        value={searchParams.get('role') ?? ''}
        onChange={handleChange}
        aria-label="Filtrar por cargo"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
