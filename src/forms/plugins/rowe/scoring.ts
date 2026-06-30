/**
 * Rowe Shoulder Instability Score Scoring Logic
 *
 * Reference: Rowe CR. The Bankart procedure: a long-term end-result study.
 * J Bone Joint Surg Am. 1978;60:1–16.
 * German version from: http://www.schulterfragebogen.de/Rowe-Arzt-Score.pdf
 *
 * Total: 100 points per shoulder
 * - Stability (0–50 pts): 4-level enum
 * - Motion    (0–20 pts): 4-level enum
 * - Function  (0–30 pts): 4-level enum
 *
 * Interpretation:
 *   90–100 Excellent
 *   75–89  Good
 *   51–74  Fair
 *   ≤50    Poor
 */

import type { FormData } from '../../types'
import type { ScoringData, SubscaleScore } from '@/types/backend/scoring'

function makeSubscale(
  name: string,
  description: string,
  rawScore: number,
  maxScore: number,
  answeredQuestions: number,
  totalQuestions: number
): SubscaleScore {
  const completionPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
  const normalizedScore = maxScore > 0 ? Math.round((rawScore / maxScore) * 100 * 100) / 100 : 0
  return {
    name,
    description,
    rawScore,
    normalizedScore,
    maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage,
    isComplete: answeredQuestions === totalQuestions,
  }
}

/**
 * Calculate Rowe score from form data.
 *
 * Data structure expected under `data.rowe`:
 *   stability : 0 | 10 | 30 | 50
 *   motion    : 0 |  5 | 15 | 20
 *   function  : 0 | 10 | 25 | 30
 */
export function calculateScore(data: FormData): ScoringData {
  const d = (data.rowe ?? {}) as Record<string, number | null | undefined>

  const stability = typeof d.stability === 'number' ? d.stability : null
  const motion = typeof d.motion === 'number' ? d.motion : null
  const func = typeof d.function === 'number' ? d.function : null

  const subscaleStability = makeSubscale(
    'Stability',
    'Shoulder stability (re-dislocation / subluxation / apprehension)',
    stability ?? 0,
    50,
    stability !== null ? 1 : 0,
    1,
  )
  const subscaleMotion = makeSubscale(
    'Motion',
    'Range of motion compared to normal',
    motion ?? 0,
    20,
    motion !== null ? 1 : 0,
    1,
  )
  const subscaleFunction = makeSubscale(
    'Function',
    'Functional capacity for work and sport',
    func ?? 0,
    30,
    func !== null ? 1 : 0,
    1,
  )

  const totalRaw = (stability ?? 0) + (motion ?? 0) + (func ?? 0)
  const answeredQuestions = [stability, motion, func].filter(v => v !== null).length
  const totalQuestions = 3

  const totalScore: SubscaleScore = {
    name: 'Rowe Total',
    description: 'Rowe Shoulder Instability Score',
    rawScore: totalRaw,
    normalizedScore: Math.round((totalRaw / 100) * 100 * 100) / 100,
    maxScore: 100,
    answeredQuestions,
    totalQuestions,
    completionPercentage: Math.round((answeredQuestions / totalQuestions) * 100),
    isComplete: answeredQuestions === totalQuestions,
  }

  return {
    rawFormData: { rowe: d },
    subscales: {
      stability: subscaleStability,
      motion: subscaleMotion,
      function: subscaleFunction,
    },
    totalScore,
  }
}

/**
 * Validate Rowe score form data
 */
export function validateFormData(data: FormData): boolean {
  const d = (data.rowe ?? {}) as Record<string, unknown>

  if (d.stability !== null && d.stability !== undefined) {
    if (![0, 10, 30, 50].includes(d.stability as number)) return false
  }
  if (d.motion !== null && d.motion !== undefined) {
    if (![0, 5, 15, 20].includes(d.motion as number)) return false
  }
  if (d.function !== null && d.function !== undefined) {
    if (![0, 10, 25, 30].includes(d.function as number)) return false
  }
  return true
}

/**
 * Get initial (empty) Rowe score form data
 */
export function getInitialData(): FormData {
  return {
    rowe: {
      stability: null,
      motion: null,
      function: null,
    },
  }
}

/**
 * Generate mock Rowe data for testing
 * Represents a "Good" result: stability=30, motion=15, function=25 → total=70
 */
export function generateMockData(): FormData {
  return {
    rowe: {
      stability: 30,  // Apprehension only
      motion: 15,     // 75% ER, normal elevation and IR
      function: 25,   // Slight restriction, mild discomfort
    },
  }
}
