/**
 * Type-only definitions for shared enum-like types.
 * These are pure TypeScript types (no runtime values) — safe to import from any submodule
 * without triggering Next.js webpack resolution issues.
 *
 * Runtime constant objects (Role, LegislativeSource) are exported from packages/shared/src/index.ts.
 */

/** Political role of a Brazilian federal legislator. */
export type Role = 'deputado' | 'senador'

/**
 * Legislative chamber sources (Camara and Senado).
 * These are the only two sources that appear in public-facing data (bills, votes, etc.).
 * Pipeline-internal sources (TSE, TCU, CGU, Transparencia) are in apps/pipeline/src/types.ts.
 */
export type LegislativeSource = 'camara' | 'senado'
