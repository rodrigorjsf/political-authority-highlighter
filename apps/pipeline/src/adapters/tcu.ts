import axios from 'axios'
import { logger } from '../config/logger.js'
import type { TCUExclusion } from '../types.js'

/**
 * Fetches exclusion records from TCU CADIRREG API.
 * Fails gracefully: missing TCU data does not block the pipeline.
 *
 * Note: TCU API endpoint URL and auth method need validation against
 * production before deployment. Stubbed with best-known URL.
 */
export async function fetchTCUExclusions(cpfHash: string): Promise<TCUExclusion[]> {
  try {
    const { data } = await axios.get<{ registros?: TCUExclusion[] }>(
      'https://api-cadirreg.apps.tcu.gov.br/pesquisa',
      { params: { cpf: cpfHash }, timeout: 10_000 },
    )

    const { registros } = data
    if (Array.isArray(registros)) return registros
    return []
  } catch (error) {
    logger.warn({ cpfHash, error }, 'TCU API call failed — non-blocking')
    return []
  }
}

/**
 * Batch-fetches TCU exclusions for multiple CPF hashes.
 * Returns a Map of cpfHash → exclusion records.
 */
export async function fetchTCUExclusionsBatch(
  cpfHashes: string[],
): Promise<Map<string, TCUExclusion[]>> {
  const results = new Map<string, TCUExclusion[]>()

  for (const hash of cpfHashes) {
    const records = await fetchTCUExclusions(hash)
    if (records.length > 0) {
      results.set(hash, records)
    }
  }

  logger.info({ total: cpfHashes.length, withRecords: results.size }, 'TCU batch complete')
  return results
}
