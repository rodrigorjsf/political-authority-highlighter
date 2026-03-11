import type { CGUExclusion } from '../types.js'
import type { ExclusionRecordUpsert } from './tcu.js'

/** Transforms a CGU-PAD exclusion CSV row into an internal exclusion upsert. */
export function transformCGUExclusion(
  raw: CGUExclusion,
  politicianId: string,
  cpfHash: string,
): ExclusionRecordUpsert {
  return {
    politicianId,
    source: 'cgu',
    cpfHash,
    exclusionType: raw.TIPO_PUNICAO,
    recordDate: raw.DATA_PUBLICACAO ? new Date(raw.DATA_PUBLICACAO) : null,
    recordUrl: null,
  }
}
