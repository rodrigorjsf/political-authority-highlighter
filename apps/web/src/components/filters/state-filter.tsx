'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { useAnalytics } from '../../lib/analytics-events'

const STATE_OPTIONS = [
  { value: '', label: 'Todos os estados' },
  { value: 'AC', label: 'AC' },
  { value: 'AL', label: 'AL' },
  { value: 'AM', label: 'AM' },
  { value: 'AP', label: 'AP' },
  { value: 'BA', label: 'BA' },
  { value: 'CE', label: 'CE' },
  { value: 'DF', label: 'DF' },
  { value: 'ES', label: 'ES' },
  { value: 'GO', label: 'GO' },
  { value: 'MA', label: 'MA' },
  { value: 'MG', label: 'MG' },
  { value: 'MS', label: 'MS' },
  { value: 'MT', label: 'MT' },
  { value: 'PA', label: 'PA' },
  { value: 'PB', label: 'PB' },
  { value: 'PE', label: 'PE' },
  { value: 'PI', label: 'PI' },
  { value: 'PR', label: 'PR' },
  { value: 'RJ', label: 'RJ' },
  { value: 'RN', label: 'RN' },
  { value: 'RO', label: 'RO' },
  { value: 'RR', label: 'RR' },
  { value: 'RS', label: 'RS' },
  { value: 'SC', label: 'SC' },
  { value: 'SE', label: 'SE' },
  { value: 'SP', label: 'SP' },
  { value: 'TO', label: 'TO' },
] as const

export function StateFilter(): React.JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const track = useAnalytics()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      const { value } = e.target
      const params = new URLSearchParams(searchParams.toString())
      if (value !== '') {
        params.set('state', value)
        track('filtro_aplicado', { props: { filtro: 'estado', valor: value } })
      } else {
        params.delete('state')
      }
      params.delete('cursor') // always reset pagination on filter change
      const qs = params.toString()
      router.push(qs !== '' ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams, track],
  )

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="state-filter" className="text-sm font-medium text-foreground">
        Estado:
      </label>
      <select
        id="state-filter"
        value={searchParams.get('state') ?? ''}
        onChange={handleChange}
        aria-label="Filtrar por estado"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {STATE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
