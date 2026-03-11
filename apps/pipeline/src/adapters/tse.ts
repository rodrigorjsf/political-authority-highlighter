import axios from 'axios'
import { parse } from 'csv-parse'
import { Readable } from 'node:stream'
import { logger } from '../config/logger.js'
import type { TSECandidate } from '../types.js'

/**
 * Fetches and parses TSE (Tribunal Superior Eleitoral) candidate data from bulk CSV.
 * TSE uses semicolons as delimiters and ISO-8859-1 (Latin-1) encoding.
 * CPF columns have leading zeros — cast=false ensures they stay as strings.
 */
export async function fetchTSECandidates(year: number): Promise<TSECandidate[]> {
  const csvUrl = `https://dadosabertos.tse.jus.br/dataset/candidatos-${year}/resource/download`
  logger.info({ year, url: csvUrl }, 'Downloading TSE candidate CSV')

  const { data } = await axios.get<Buffer>(csvUrl, {
    responseType: 'arraybuffer',
    timeout: 120_000, // Large files: 2min timeout
  })

  // TSE uses ISO-8859-1 encoding
  const decoded = new TextDecoder('iso-8859-1').decode(data)

  return new Promise<TSECandidate[]>((resolve, reject) => {
    const rows: TSECandidate[] = []
    const stream = Readable.from(decoded)

    stream
      .pipe(
        parse({
          columns: true,
          delimiter: ';',
          skip_empty_lines: true,
          trim: true,
          cast: false, // Never cast: CPF has leading zeros
          relax_column_count: true,
        }),
      )
      .on('data', (row: TSECandidate) => rows.push(row))
      .on('end', () => {
        logger.info({ count: rows.length }, 'Parsed TSE CSV')
        resolve(rows)
      })
      .on('error', reject)
  })
}
