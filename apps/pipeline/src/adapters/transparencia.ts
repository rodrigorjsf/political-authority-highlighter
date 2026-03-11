import axios from 'axios'
import pLimit from 'p-limit'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import type { TransparenciaExpense } from '../types.js'

const transparenciaClient = axios.create({
  baseURL: 'https://api.portaldatransparencia.gov.br/api-de-dados',
  headers: { 'chave-api-dados': env.TRANSPARENCIA_API_KEY },
  timeout: 30_000,
})

/** Concurrency limiter: 1 concurrent request + 700ms delay = ~85 req/min (under 90 limit). */
const limiter = pLimit(1)

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetches CEAP (parlamentary expense) records for a deputy by their identifier.
 * Rate-limited to 90 req/min as required by Portal da Transparencia.
 */
export async function fetchExpensesByDeputy(
  deputyId: string,
  year: number,
): Promise<TransparenciaExpense[]> {
  return limiter(async () => {
    await delay(700) // 90 req/min = ~667ms between requests; 700ms for safety margin
    const { data } = await transparenciaClient.get('/ceap', {
      params: { codigoParlamentar: deputyId, ano: year, pagina: 1 },
    })
    return data as TransparenciaExpense[]
  })
}

/**
 * Fetches expenses for a list of deputy IDs across a given year.
 * Respects Portal da Transparencia rate limit (90 req/min).
 */
export async function fetchAllExpenses(
  deputyIds: string[],
  year: number,
): Promise<Map<string, TransparenciaExpense[]>> {
  const results = new Map<string, TransparenciaExpense[]>()

  for (const deputyId of deputyIds) {
    try {
      const expenses = await fetchExpensesByDeputy(deputyId, year)
      results.set(deputyId, expenses)
    } catch (error) {
      logger.warn({ deputyId, year, error }, 'Failed to fetch expenses for deputy')
      results.set(deputyId, [])
    }
  }

  logger.info({ deputyCount: deputyIds.length, year }, 'Fetched expenses batch')
  return results
}
