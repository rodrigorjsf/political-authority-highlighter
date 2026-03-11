/**
 * Score components, each ranging 0-25.
 * DR-002: Equal weights (0.25 each) — no exceptions.
 */
export interface ScoreComponents {
  transparencyScore: number // 0-25
  legislativeScore: number // 0-25
  financialScore: number // 0-25
  anticorruptionScore: number // 0-25 (binary: 25 if clean, 0 if exclusion_flag)
}

/**
 * Calculates the overall integrity score (0-100) from 4 equally-weighted components.
 * DR-002: Each component contributes exactly 25% of the total.
 * This is a pure function with no side effects.
 */
export function calculateIntegrityScore(components: ScoreComponents): number {
  const raw =
    components.transparencyScore +
    components.legislativeScore +
    components.financialScore +
    components.anticorruptionScore
  return Math.min(100, Math.max(0, Math.round(raw)))
}

/**
 * Transparency sub-score: 0-25, proportional to data availability across 6 sources.
 * DR-004: Politicians who provide more data score higher.
 */
export function computeTransparencyScore(sourceCount: number): number {
  return Math.min(25, Math.round((sourceCount / 6) * 25))
}

/**
 * Legislative sub-score: 0-25, proportional to parliamentary activity.
 * Based on combined bills + votes count. 100+ items = maximum score.
 */
export function computeLegislativeScore(billCount: number, voteCount: number): number {
  const total = billCount + voteCount
  return Math.min(25, Math.round((total / 100) * 25))
}

/**
 * Financial sub-score: 0-25, proportional to available expense records.
 * 1000+ expense records = maximum score (indicates full CEAP transparency).
 */
export function computeFinancialScore(expenseCount: number): number {
  return Math.min(25, Math.round((expenseCount / 1000) * 25))
}

/**
 * Anticorruption sub-score: binary 0 or 25.
 * DR-001: 25 if clean (no exclusions), 0 if any exclusion record exists.
 * This is the only data that crosses from internal_data to public schema.
 */
export function computeAnticorruptionScore(exclusionFlag: boolean): number {
  return exclusionFlag ? 0 : 25
}
