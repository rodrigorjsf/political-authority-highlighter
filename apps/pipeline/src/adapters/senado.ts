import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { logger } from '../config/logger.js'
import type { SenadorData } from '../types.js'

const BASE_URL = 'https://legis.senado.leg.br/dadosabertos'

const senadoClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
})

/**
 * XML parser configured for Senado API responses.
 * Security: processEntities=false prevents XXE attacks on untrusted XML.
 * isArray callback normalizes Senado's inconsistent single/array responses.
 */
const xmlParser = new XMLParser({
  processEntities: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
  trimValues: true,
  isArray: (_name, _jpath, _isLeaf, isAttr) => !isAttr,
})

/**
 * Fetches all current senators from Senado API.
 * Tries JSON first; falls back to XML parsing if JSON endpoint fails.
 */
export async function fetchSenadores(): Promise<SenadorData[]> {
  try {
    const { data: body } = await senadoClient.get('/senador/lista/atual', {
      headers: { Accept: 'application/json' },
    })

    const parlamentares = body?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar
    if (Array.isArray(parlamentares)) {
      return parlamentares.map(
        (p: Record<string, unknown>) => p.IdentificacaoParlamentar as SenadorData,
      )
    }

    logger.warn('Senado JSON response missing expected structure, falling back to XML')
    return fetchSenadoresXml()
  } catch {
    logger.warn('Senado JSON endpoint failed, falling back to XML')
    return fetchSenadoresXml()
  }
}

/** Fallback: parse Senado XML response. */
async function fetchSenadoresXml(): Promise<SenadorData[]> {
  const { data: xmlData } = await senadoClient.get('/senador/lista/atual', {
    headers: { Accept: 'application/xml' },
    responseType: 'text',
  })

  const parsed = xmlParser.parse(xmlData)
  const parlamentares =
    parsed?.ListaParlamentarEmExercicio?.[0]?.Parlamentares?.[0]?.Parlamentar ?? []

  return parlamentares.map(
    (p: Record<string, unknown[]>) =>
      (p.IdentificacaoParlamentar as SenadorData[])[0] as SenadorData,
  )
}
