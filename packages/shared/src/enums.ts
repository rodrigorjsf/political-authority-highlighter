/** Political role of a Brazilian federal legislator. */
export enum Role {
  DEPUTADO = 'deputado',
  SENADOR = 'senador',
}

/**
 * Legislative chamber sources (Camara and Senado).
 * These are the only two sources that appear in public-facing data (bills, votes, etc.).
 * Pipeline-internal sources (TSE, TCU, CGU, Transparencia) are in apps/pipeline/src/types.ts.
 */
export enum LegislativeSource {
  CAMARA = 'camara',
  SENADO = 'senado',
}
