import type { SenadorData, PoliticianUpsert } from '../types.js'
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

/** Transforms a Senado API senator into a unified PoliticianUpsert. */
export function transformSenador(raw: SenadorData): PoliticianUpsert {
  return {
    externalId: `senado-${raw.CodigoParlamentar}`,
    source: DataSource.SENADO,
    name: raw.NomeParlamentar,
    slug: slugify(raw.NomeParlamentar, raw.UfParlamentar),
    state: raw.UfParlamentar,
    party: raw.SiglaPartidoParlamentar,
    role: Role.SENADOR,
    photoUrl: raw.UrlFotoParlamentar || null,
    tenureStartDate: null, // Populated from detailed senator endpoint if available
  }
}
