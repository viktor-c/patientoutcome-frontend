/**
 * Constant-Murley Shoulder Score – Unit Tests
 *
 * Validates scoring calculation against known reference values from
 * the official German form (http://www.schulterfragebogen.de/Constant-Arzt-Score.pdf).
 *
 * Scoring rules:
 *   Pain:     0–15 pts (direct numeric)
 *   ADL:      work(0–4) + leisure(0–4) + sleep(0–2) + handReach(2|4|6|8|10) = 0–20 pts
 *   ROM:      flexion(0|2|4|6|8|10) + abduction(0|2|4|6|8|10)
 *             + extRot(5 × 0|2 pts) + intRot(0|2|4|6|8|10) = 0–40 pts
 *   Strength: min(25, round(kg / 0.45)) = 0–25 pts
 *   Total:    0–100 pts
 */

import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
} from '../scoring'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Build a complete perfect-score dataset */
function perfectData() {
  return {
    constant: {
      pain: 15,             // max pain score
      adlWork: 4,           // max work
      adlLeisure: 4,        // max leisure
      adlSleep: 2,          // max sleep
      adlHandReach: 10,     // above head
      flexion: 180,         // ≥151° → 10 pts
      abduction: 180,       // ≥151° → 10 pts
      er1: 2, er2: 2, er3: 2, er4: 2, er5: 2,  // all 5 → 10 pts
      internalRotation: 10, // between shoulder blades
      strengthKg: 11.25,    // 11.25 / 0.45 = 25 pts
    },
  }
}

/** Build a complete zero-score dataset */
function worstData() {
  return {
    constant: {
      pain: 0,
      adlWork: 0,
      adlLeisure: 0,
      adlSleep: 0,
      adlHandReach: 2,    // minimum selectable hand-reach value
      flexion: 0,         // 0–30° → 0 pts
      abduction: 0,
      er1: 0, er2: 0, er3: 0, er4: 0, er5: 0,
      internalRotation: 0,
      strengthKg: 0,
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Perfect / maximum score
// ──────────────────────────────────────────────────────────────────────────────
describe('Constant Score – perfect score', () => {
  it('calculates 100 pts for perfect data', () => {
    const result = calculateScore(perfectData())
    expect(result.totalScore!.rawScore).toBe(100)
    expect(result.totalScore!.maxScore).toBe(100)
    expect(result.totalScore!.isComplete).toBe(true)
    expect(result.totalScore!.normalizedScore).toBe(100)
  })

  it('has correct subscale values for perfect data', () => {
    const result = calculateScore(perfectData())
    expect(result.subscales!.pain!.rawScore).toBe(15)
    expect(result.subscales!.adl!.rawScore).toBe(20)
    expect(result.subscales!.rom!.rawScore).toBe(40)
    expect(result.subscales!.strength!.rawScore).toBe(25)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Worst score
// ──────────────────────────────────────────────────────────────────────────────
describe('Constant Score – worst score', () => {
  it('calculates minimum pts for worst data', () => {
    const result = calculateScore(worstData())
    // ADL: 0+0+0+2 = 2 (hand reach minimum = 2 pts)
    expect(result.subscales!.pain!.rawScore).toBe(0)
    expect(result.subscales!.adl!.rawScore).toBe(2)   // handReach=2 is minimum enum
    expect(result.subscales!.rom!.rawScore).toBe(0)
    expect(result.subscales!.strength!.rawScore).toBe(0)
    expect(result.totalScore!.rawScore).toBe(2)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Mock data (representative moderate impairment)
// ──────────────────────────────────────────────────────────────────────────────
describe('Constant Score – mock data', () => {
  /**
   * Expected from generateMockData:
   *   pain=10
   *   adl: work=3+leisure=3+sleep=2+handReach=6 = 14
   *   rom: flexion(100°→6)+abduction(100°→6)+er(2+2+2+0+0=6)+internalRotation=6 → 24
   *   strength: 7.2kg → round(7.2/0.45)=16 pts
   *   total: 10+14+24+16 = 64
   */
  it('calculates correct score for mock data', () => {
    const data = generateMockData()
    const result = calculateScore(data)

    expect(result.subscales!.pain!.rawScore).toBe(10)
    expect(result.subscales!.adl!.rawScore).toBe(14)    // 3+3+2+6
    expect(result.subscales!.rom!.rawScore).toBe(24)    // flexion(6)+abduction(6)+er(2+2+2=6)+ir(6)
    expect(result.subscales!.strength!.rawScore).toBe(16)
    expect(result.totalScore!.rawScore).toBe(64)
    expect(result.totalScore!.isComplete).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Range of motion degree buckets
// ──────────────────────────────────────────────────────────────────────────────
describe('Constant Score – ROM degree buckets', () => {
  const degreeCases: Array<[number, number]> = [
    [0,   0],
    [30,  0],
    [31,  2],
    [60,  2],
    [61,  4],
    [90,  4],
    [91,  6],
    [120, 6],
    [121, 8],
    [150, 8],
    [151, 10],
    [180, 10],
  ]

  it.each(degreeCases)('%d° → %d pts (flexion)', (deg, expected) => {
    const data = {
      constant: {
        pain: null, adlWork: null, adlLeisure: null, adlSleep: null,
        adlHandReach: null, flexion: deg, abduction: null,
        er1: null, er2: null, er3: null, er4: null, er5: null,
        internalRotation: null, strengthKg: null,
      },
    }
    const result = calculateScore(data)
    // flexion contributes to rom subscale rawScore
    expect(result.subscales!.rom!.rawScore).toBe(expected)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Strength kg → points conversion
// ──────────────────────────────────────────────────────────────────────────────
describe('Constant Score – strength conversion', () => {
  const kgCases: Array<[number, number]> = [
    [0,     0],
    [0.45,  1],
    [0.9,   2],
    [4.5,   10],
    [9.0,   20],
    [11.25, 25],
    [15.0,  25],  // capped at 25
  ]

  it.each(kgCases)('%d kg → %d pts', (kg, expected) => {
    const data = {
      constant: {
        pain: null, adlWork: null, adlLeisure: null, adlSleep: null,
        adlHandReach: null, flexion: null, abduction: null,
        er1: null, er2: null, er3: null, er4: null, er5: null,
        internalRotation: null, strengthKg: kg,
      },
    }
    const result = calculateScore(data)
    expect(result.subscales!.strength!.rawScore).toBe(expected)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Partial form
// ──────────────────────────────────────────────────────────────────────────────
describe('Constant Score – partial form', () => {
  it('handles partially answered form correctly', () => {
    const data = {
      constant: {
        pain: 12,
        adlWork: 4,
        adlLeisure: null,
        adlSleep: 2,
        adlHandReach: 8,
        flexion: 90,       // 61–90° → 4 pts
        abduction: null,
        er1: 2, er2: null, er3: null, er4: null, er5: null,
        internalRotation: 4,
        strengthKg: null,
      },
    }
    const result = calculateScore(data)
    // pain=12, adl=4+0+2+8=14, rom=4+0+2+4=10, strength=0
    expect(result.subscales!.pain!.rawScore).toBe(12)
    expect(result.subscales!.adl!.rawScore).toBe(14)
    expect(result.totalScore!.isComplete).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────────────
describe('Constant Score – validation', () => {
  it('accepts valid mock data', () => {
    expect(validateFormData(generateMockData())).toBe(true)
  })

  it('accepts valid perfect data', () => {
    expect(validateFormData(perfectData())).toBe(true)
  })

  it('accepts empty initial data', () => {
    expect(validateFormData(getInitialData())).toBe(true)
  })

  it('rejects pain > 15', () => {
    const data = { constant: { ...getInitialData().constant, pain: 16 } }
    expect(validateFormData(data)).toBe(false)
  })

  it('rejects pain < 0', () => {
    const data = { constant: { ...getInitialData().constant, pain: -1 } }
    expect(validateFormData(data)).toBe(false)
  })

  it('rejects adlWork > 4', () => {
    const data = { constant: { ...getInitialData().constant, adlWork: 5 } }
    expect(validateFormData(data)).toBe(false)
  })

  it('rejects invalid handReach value', () => {
    const data = { constant: { ...getInitialData().constant, adlHandReach: 3 } }
    expect(validateFormData(data)).toBe(false)
  })

  it('rejects invalid external rotation bit (not 0 or 2)', () => {
    const data = { constant: { ...getInitialData().constant, er1: 1 } }
    expect(validateFormData(data)).toBe(false)
  })

  it('rejects invalid internal rotation enum', () => {
    const data = { constant: { ...getInitialData().constant, internalRotation: 3 } }
    expect(validateFormData(data)).toBe(false)
  })

  it('rejects negative strength', () => {
    const data = { constant: { ...getInitialData().constant, strengthKg: -1 } }
    expect(validateFormData(data)).toBe(false)
  })

  it('rejects flexion > 180', () => {
    const data = { constant: { ...getInitialData().constant, flexion: 200 } }
    expect(validateFormData(data)).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Initial data structure
// ──────────────────────────────────────────────────────────────────────────────
describe('Constant Score – initial data', () => {
  it('returns correct initial data structure with all nulls', () => {
    const data = getInitialData()
    expect(data.constant).toBeDefined()
    const c = data.constant as Record<string, unknown>
    expect(c.pain).toBeNull()
    expect(c.adlWork).toBeNull()
    expect(c.adlLeisure).toBeNull()
    expect(c.adlSleep).toBeNull()
    expect(c.adlHandReach).toBeNull()
    expect(c.flexion).toBeNull()
    expect(c.abduction).toBeNull()
    expect(c.er1).toBeNull()
    expect(c.er5).toBeNull()
    expect(c.internalRotation).toBeNull()
    expect(c.strengthKg).toBeNull()
  })
})
