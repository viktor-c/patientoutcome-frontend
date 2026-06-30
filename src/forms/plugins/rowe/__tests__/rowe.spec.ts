/**
 * Rowe Shoulder Instability Score – Unit Tests
 *
 * Validates scoring against the official German score form
 * (http://www.schulterfragebogen.de/Rowe-Arzt-Score.pdf).
 *
 * Scoring rules:
 *   Stability : 0 | 10 | 30 | 50 pts
 *   Motion    : 0 |  5 | 15 | 20 pts
 *   Function  : 0 | 10 | 25 | 30 pts
 *   Total     : 0–100 pts
 *
 * Interpretation:
 *   90–100 Excellent
 *   75–89  Good
 *   51–74  Fair
 *   ≤ 50   Poor
 */

import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
} from '../scoring'

// ──────────────────────────────────────────────────────────────────────────────
// Perfect score (100 pts = Excellent)
// ──────────────────────────────────────────────────────────────────────────────
describe('Rowe Score – perfect score', () => {
  it('calculates 100 pts for best possible answers', () => {
    const data = { rowe: { stability: 50, motion: 20, function: 30 } }
    const result = calculateScore(data)

    expect(result.totalScore!.rawScore).toBe(100)
    expect(result.totalScore!.maxScore).toBe(100)
    expect(result.totalScore!.isComplete).toBe(true)
    expect(result.totalScore!.normalizedScore).toBe(100)
    expect(result.subscales!.stability!.rawScore).toBe(50)
    expect(result.subscales!.motion!.rawScore).toBe(20)
    expect(result.subscales!.function!.rawScore).toBe(30)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Worst score (0 pts = Poor)
// ──────────────────────────────────────────────────────────────────────────────
describe('Rowe Score – worst score', () => {
  it('calculates 0 pts for worst possible answers', () => {
    const data = { rowe: { stability: 0, motion: 0, function: 0 } }
    const result = calculateScore(data)

    expect(result.totalScore!.rawScore).toBe(0)
    expect(result.totalScore!.isComplete).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Mock data (expected: stability=30, motion=15, function=25 → total=70 "Fair")
// ──────────────────────────────────────────────────────────────────────────────
describe('Rowe Score – mock data', () => {
  it('calculates correct score from mock data', () => {
    const data = generateMockData()
    const result = calculateScore(data)

    expect(result.subscales!.stability!.rawScore).toBe(30)
    expect(result.subscales!.motion!.rawScore).toBe(15)
    expect(result.subscales!.function!.rawScore).toBe(25)
    expect(result.totalScore!.rawScore).toBe(70)
    expect(result.totalScore!.isComplete).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// All enum combinations for each subscale
// ──────────────────────────────────────────────────────────────────────────────
describe('Rowe Score – stability enum values', () => {
  it.each([50, 30, 10, 0])('accepts stability=%d', (pts) => {
    const data = { rowe: { stability: pts, motion: 20, function: 30 } }
    const result = calculateScore(data)
    expect(result.subscales!.stability!.rawScore).toBe(pts)
    expect(result.totalScore!.rawScore).toBe(pts + 20 + 30)
  })
})

describe('Rowe Score – motion enum values', () => {
  it.each([20, 15, 5, 0])('accepts motion=%d', (pts) => {
    const data = { rowe: { stability: 50, motion: pts, function: 30 } }
    const result = calculateScore(data)
    expect(result.subscales!.motion!.rawScore).toBe(pts)
  })
})

describe('Rowe Score – function enum values', () => {
  it.each([30, 25, 10, 0])('accepts function=%d', (pts) => {
    const data = { rowe: { stability: 50, motion: 20, function: pts } }
    const result = calculateScore(data)
    expect(result.subscales!.function!.rawScore).toBe(pts)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Completeness / partial form
// ──────────────────────────────────────────────────────────────────────────────
describe('Rowe Score – partial form', () => {
  it('marks form incomplete when questions are missing', () => {
    const data = { rowe: { stability: 50, motion: null, function: null } }
    const result = calculateScore(data)
    expect(result.totalScore!.isComplete).toBe(false)
    expect(result.totalScore!.answeredQuestions).toBe(1)
  })

  it('returns correct raw score for partially answered form', () => {
    const data = { rowe: { stability: 30, motion: 15, function: null } }
    const result = calculateScore(data)
    expect(result.totalScore!.rawScore).toBe(45)
    expect(result.totalScore!.answeredQuestions).toBe(2)
    expect(result.totalScore!.isComplete).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────────────
describe('Rowe Score – validation', () => {
  it('accepts valid mock data', () => {
    expect(validateFormData(generateMockData())).toBe(true)
  })

  it('accepts empty initial data (all nulls)', () => {
    expect(validateFormData(getInitialData())).toBe(true)
  })

  it('accepts all valid stability values', () => {
    for (const v of [0, 10, 30, 50]) {
      expect(validateFormData({ rowe: { stability: v, motion: null, function: null } })).toBe(true)
    }
  })

  it('accepts all valid motion values', () => {
    for (const v of [0, 5, 15, 20]) {
      expect(validateFormData({ rowe: { stability: null, motion: v, function: null } })).toBe(true)
    }
  })

  it('accepts all valid function values', () => {
    for (const v of [0, 10, 25, 30]) {
      expect(validateFormData({ rowe: { stability: null, motion: null, function: v } })).toBe(true)
    }
  })

  it('rejects invalid stability value (e.g. 20)', () => {
    expect(validateFormData({ rowe: { stability: 20, motion: null, function: null } })).toBe(false)
  })

  it('rejects invalid motion value (e.g. 10)', () => {
    expect(validateFormData({ rowe: { stability: null, motion: 10, function: null } })).toBe(false)
  })

  it('rejects invalid function value (e.g. 5)', () => {
    expect(validateFormData({ rowe: { stability: null, motion: null, function: 5 } })).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Initial data structure
// ──────────────────────────────────────────────────────────────────────────────
describe('Rowe Score – initial data', () => {
  it('returns correct initial data structure with all nulls', () => {
    const data = getInitialData()
    expect(data.rowe).toBeDefined()
    const r = data.rowe as Record<string, unknown>
    expect(r.stability).toBeNull()
    expect(r.motion).toBeNull()
    expect(r.function).toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Score interpretation boundaries
// ──────────────────────────────────────────────────────────────────────────────
describe('Rowe Score – interpretation boundaries', () => {
  // 50+20+20 = 90 (Excellent)
  it('90 pts → excellent boundary', () => {
    const data = { rowe: { stability: 50, motion: 20, function: 20 } }
    const result = calculateScore(data)
    expect(result.totalScore!.rawScore).toBe(90)
  })

  // 30+20+25 = 75 (Good boundary)
  it('75 pts → good boundary', () => {
    const data = { rowe: { stability: 30, motion: 20, function: 25 } }
    const result = calculateScore(data)
    expect(result.totalScore!.rawScore).toBe(75)
  })

  // 30+15+10 = 55 (Fair)
  it('55 pts → fair range', () => {
    const data = { rowe: { stability: 30, motion: 15, function: 10 } }
    const result = calculateScore(data)
    expect(result.totalScore!.rawScore).toBe(55)
  })

  // 0+0+30 = 30 (Poor)
  it('30 pts → poor range', () => {
    const data = { rowe: { stability: 0, motion: 0, function: 30 } }
    const result = calculateScore(data)
    expect(result.totalScore!.rawScore).toBe(30)
  })
})
