import type { CamaraDeputy, CamaraBill, PoliticianUpsert, BillUpsert } from '../types.js'

/** Generates a URL-friendly slug from name and state. */
function slugify(name: string, state: string): string {
  return `${name}-${state}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Transforms a Camara API deputy into a unified PoliticianUpsert. */
export function transformCamaraDeputy(raw: CamaraDeputy): PoliticianUpsert {
  return {
    externalId: `camara-${raw.id}`,
    source: 'camara',
    name: raw.nome,
    slug: slugify(raw.nome, raw.siglaUf),
    state: raw.siglaUf,
    party: raw.siglaPartido,
    role: 'deputado',
    photoUrl: raw.urlFoto || null,
    tenureStartDate: null, // Populated from detailed deputy endpoint if available
  }
}

/** Transforms a Camara API bill into a unified BillUpsert. */
export function transformCamaraBill(raw: CamaraBill, politicianId: string): BillUpsert {
  return {
    politicianId,
    externalId: `camara-bill-${raw.id}`,
    source: 'camara',
    title: raw.ementa,
    billType: raw.siglaTipo,
    billNumber: String(raw.numero),
    billYear: raw.ano,
    status: 'tramitando', // Default; updated from detailed endpoint if available
    submissionDate: `${raw.ano}-01-01`, // Exact date from detailed endpoint
    sourceUrl: `https://www.camara.leg.br/propostas-legislativas/${raw.id}`,
  }
}
