import type { TCUExclusion } from '../types.js'

/** Exclusion record shape for internal_data.exclusion_records upsert. */
export interface ExclusionRecordUpsert {
  politicianId: string
  source: string
  cpfHash: string
  exclusionType: string
  recordDate: Date | null
  recordUrl: string | null
}

/** Transforms a TCU exclusion record into an internal exclusion upsert. */
export function transformTCUExclusion(
  raw: TCUExclusion,
  politicianId: string,
  cpfHash: string,
): ExclusionRecordUpsert {
  return {
    politicianId,
    source: 'tcu',
    cpfHash,
    exclusionType: raw.tipoSancao,
    recordDate: raw.dataTransitoJulgado ? new Date(raw.dataTransitoJulgado) : null,
    recordUrl: null,
  }
}
