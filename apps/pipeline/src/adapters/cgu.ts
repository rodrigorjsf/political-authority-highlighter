import axios from 'axios'
import { parse } from 'csv-parse'
import { Readable } from 'node:stream'
import { logger } from '../config/logger.js'
import type { CGUExclusion } from '../types.js'

/**
 * Fetches and parses CGU-PAD (Processo Administrativo Disciplinar) exclusion data.
 * CGU publishes bulk CSV files with UTF-8 BOM encoding and comma delimiters.
 *
 * Note: The download URL may change seasonally. Verify against CGU portal before deployment.
 */
export async function fetchCGUExclusions(): Promise<CGUExclusion[]> {
  const csvUrl =
    'https://cdn.portaldatransparencia.gov.br/download-de-dados/servidores-excluidos'
  logger.info({ url: csvUrl }, 'Downloading CGU exclusion CSV')

  const { data } = await axios.get<Buffer>(csvUrl, {
    responseType: 'arraybuffer',
    timeout: 120_000, // Large files: 2min timeout
  })

  const decoded = new TextDecoder('utf-8').decode(data)

  return new Promise<CGUExclusion[]>((resolve, reject) => {
    const rows: CGUExclusion[] = []
    const stream = Readable.from(decoded)

    stream
      .pipe(
        parse({
          columns: true,
          delimiter: ',',
          bom: true, // CGU uses UTF-8 with BOM
          skip_empty_lines: true,
          trim: true,
          cast: false,
          relax_column_count: true,
        }),
      )
      .on('data', (row: CGUExclusion) => rows.push(row))
      .on('end', () => {
        logger.info({ count: rows.length }, 'Parsed CGU exclusion CSV')
        resolve(rows)
      })
      .on('error', reject)
  })
}
