import type { TSECandidate, PoliticianUpsert } from '../types.js'
import { DataSource } from '../types.js'
import { Role } from '@pah/shared'

/** Generates a URL-friendly slug from name and state. */
function slugify(name: string, state: string): string {
  return `${name}-${state}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Transforms a TSE candidate CSV row into a unified PoliticianUpsert.
 * Only used for enrichment (tenure dates, election history) — primary
 * politician records come from Camara/Senado.
 */
export function transformTSECandidate(raw: TSECandidate): PoliticianUpsert {
  const role = raw.DS_CARGO.toLowerCase().includes('senador') ? Role.SENADOR : Role.DEPUTADO
  return {
    externalId: `tse-${raw.SQ_CANDIDATO}`,
    source: DataSource.TSE,
    name: raw.NM_CANDIDATO,
    slug: slugify(raw.NM_CANDIDATO, raw.SG_UF),
    state: raw.SG_UF,
    party: raw.SG_PARTIDO,
    role,
    photoUrl: null,
    tenureStartDate: null,
  }
}
