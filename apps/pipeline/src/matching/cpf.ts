import { hashCPF } from '../crypto/cpf.js'

/** Represents a cross-source CPF match between two or more data sources. */
export interface CPFMatch {
  cpfHash: string
  sources: Map<string, string> // source → externalId
}

/**
 * Matches politicians across sources by CPF hash.
 * Input maps: cpf (raw digits) → externalId per source.
 * Returns matches where a CPF appears in 2+ sources.
 *
 * DR-005: Raw CPFs are hashed immediately — never stored as plaintext.
 */
export function matchPoliticiansByCPF(
  sourceMaps: Array<{ source: string; cpfToId: Map<string, string> }>,
): CPFMatch[] {
  // Build index: cpfHash → { source → externalId }
  const index = new Map<string, Map<string, string>>()

  for (const { source, cpfToId } of sourceMaps) {
    cpfToId.forEach((externalId, cpf) => {
      const hash = hashCPF(cpf)
      if (!index.has(hash)) {
        index.set(hash, new Map())
      }
      index.get(hash)!.set(source, externalId)
    })
  }

  // Return only multi-source matches
  const matches: CPFMatch[] = []
  index.forEach((sources, cpfHash) => {
    if (sources.size > 1) {
      matches.push({ cpfHash, sources })
    }
  })

  return matches
}
