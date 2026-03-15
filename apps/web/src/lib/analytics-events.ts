import { usePlausible } from 'next-plausible'

export type PahEvents = {
  busca_realizada: { query: string }
  filtro_aplicado: { filtro: 'cargo' | 'estado'; valor: string }
  comparar_click: { politician_a: string; politician_b: string }
}

export function useAnalytics(): ReturnType<typeof usePlausible<PahEvents>> {
  return usePlausible<PahEvents>()
}
