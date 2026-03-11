import { describe, it, expect } from 'vitest'
import {
  calculateIntegrityScore,
  computeTransparencyScore,
  computeLegislativeScore,
  computeFinancialScore,
  computeAnticorruptionScore,
} from './engine.js'

describe('calculateIntegrityScore', () => {
  it('returns sum of all components when within 0-100', () => {
    const result = calculateIntegrityScore({
      transparencyScore: 20,
      legislativeScore: 15,
      financialScore: 18,
      anticorruptionScore: 25,
    })
    expect(result).toBe(78)
  })

  it('returns 100 when all components are maxed', () => {
    const result = calculateIntegrityScore({
      transparencyScore: 25,
      legislativeScore: 25,
      financialScore: 25,
      anticorruptionScore: 25,
    })
    expect(result).toBe(100)
  })

  it('returns 0 when all components are zero', () => {
    const result = calculateIntegrityScore({
      transparencyScore: 0,
      legislativeScore: 0,
      financialScore: 0,
      anticorruptionScore: 0,
    })
    expect(result).toBe(0)
  })

  it('caps at 100 if components somehow exceed bounds', () => {
    const result = calculateIntegrityScore({
      transparencyScore: 30,
      legislativeScore: 30,
      financialScore: 30,
      anticorruptionScore: 30,
    })
    expect(result).toBe(100)
  })
})

describe('computeTransparencyScore', () => {
  it('returns 0 for 0 sources', () => {
    expect(computeTransparencyScore(0)).toBe(0)
  })

  it('returns 25 for 6 sources (max)', () => {
    expect(computeTransparencyScore(6)).toBe(25)
  })

  it('returns proportional score for partial sources', () => {
    expect(computeTransparencyScore(3)).toBe(13)
  })

  it('caps at 25 even with more than 6 sources', () => {
    expect(computeTransparencyScore(10)).toBe(25)
  })
})

describe('computeLegislativeScore', () => {
  it('returns 0 for no bills and no votes', () => {
    expect(computeLegislativeScore(0, 0)).toBe(0)
  })

  it('returns 25 for 100+ combined items', () => {
    expect(computeLegislativeScore(50, 50)).toBe(25)
  })

  it('returns proportional score for partial activity', () => {
    expect(computeLegislativeScore(10, 10)).toBe(5)
  })

  it('caps at 25', () => {
    expect(computeLegislativeScore(200, 200)).toBe(25)
  })
})

describe('computeFinancialScore', () => {
  it('returns 0 for no expenses', () => {
    expect(computeFinancialScore(0)).toBe(0)
  })

  it('returns 25 for 1000+ expenses', () => {
    expect(computeFinancialScore(1000)).toBe(25)
  })

  it('returns proportional score', () => {
    expect(computeFinancialScore(500)).toBe(13)
  })
})

describe('computeAnticorruptionScore', () => {
  it('returns 25 when no exclusion (clean record)', () => {
    expect(computeAnticorruptionScore(false)).toBe(25)
  })

  it('returns 0 when exclusion flag is true', () => {
    expect(computeAnticorruptionScore(true)).toBe(0)
  })
})
