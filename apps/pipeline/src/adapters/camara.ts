import axios from 'axios'
import { logger } from '../config/logger.js'
import type { CamaraDeputy, CamaraBill, CamaraVote } from '../types.js'

const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'

const camaraClient = axios.create({
  baseURL: BASE_URL,
  headers: { Accept: 'application/json' },
  timeout: 30_000,
})

/**
 * Fetches all active deputies from Camara API with pagination.
 * The API uses link-based pagination: fetches until no `next` link exists.
 */
export async function fetchCamaraDeputies(): Promise<CamaraDeputy[]> {
  const deputies: CamaraDeputy[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    logger.debug({ page }, 'Fetching Camara deputies page')
    const { data: body } = await camaraClient.get('/deputados', {
      params: { ordem: 'ASC', ordenarPor: 'nome', pagina: page, itens: 100 },
    })

    const batch = body.dados as CamaraDeputy[]
    deputies.push(...batch)

    // Camara API returns `links` array with rel 'next' when more pages exist
    const links = body.links as Array<{ rel: string; href: string }>
    hasMore = links.some((link) => link.rel === 'next')
    page++
  }

  logger.info({ count: deputies.length }, 'Fetched all Camara deputies')
  return deputies
}

/**
 * Fetches bills (proposicoes) authored by a specific deputy.
 * Camara API: GET /deputados/{id}/autores
 */
export async function fetchCamaraDeputyBills(deputyId: string): Promise<CamaraBill[]> {
  const allBills: CamaraBill[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const { data: body } = await camaraClient.get(`/deputados/${deputyId}/autores`, {
      params: { pagina: page, itens: 100, ordem: 'DESC', ordenarPor: 'ano' },
    })

    const batch = body.dados as CamaraBill[]
    allBills.push(...batch)

    const links = body.links as Array<{ rel: string; href: string }>
    hasMore = links.some((link) => link.rel === 'next')
    page++
  }

  return allBills
}

/**
 * Fetches voting records for a specific deputy.
 * Note: Camara API provides votes per session, not per deputy directly.
 */
export async function fetchCamaraDeputyVotes(deputyId: string): Promise<CamaraVote[]> {
  const { data: body } = await camaraClient.get(`/deputados/${deputyId}/mesa`, {
    params: { pagina: 1, itens: 100, ordem: 'DESC', ordenarPor: 'dataHoraInicio' },
  })

  return body.dados as CamaraVote[]
}
