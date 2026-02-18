/**
 * AOFAS Hindfoot Scoring Logic
 * American Orthopaedic Foot & Ankle Society Ankle-Hindfoot Score
 * 
 * This scoring implementation can be shared between frontend and backend.
 * Each question has specific point values that sum to a maximum of 100 points.
 */

import type { FormData } from '../../types'
import type { ScoringData, SubscaleScore } from '@/types/backend/scoring'
import type { ScaleInfo } from '@/utils/scaleInfo'

/**
 * Point value mapping for each AOFAS Hindfoot question
 */
const QUESTION_VALUES = {
  q1: [40, 30, 20, 0],      // Pain
  q2: [10, 7, 4, 0],        // Activity limitation
  q3: [10, 7, 4, 0],        // Support requirement
  q4: [5, 4, 2, 0],         // Maximum walking distance
  q5: [5, 3, 0],            // Walking surfaces
  q6: [8, 4, 0],            // Gait abnormality
  q7: [8, 4, 0],            // Sagittal motion
  q8: [6, 3, 0],            // Hindfoot motion
  q9: [8, 0],               // Stability
  q10: [10, 5, 0]           // Alignment
} as const

/**
 * Calculate AOFAS Hindfoot score from form data
 * 
 * @param data Form data structure
 * @returns Scoring data with subscale and total
 */
export function calculateScore(data: FormData): ScoringData {
  const hindfootSection = data.hindfoot || {}
  const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10']

  const validAnswers: number[] = []
  let rawScore = 0

  for (const key of questionKeys) {
    const value = hindfootSection[key]
    if (typeof value === 'number' && !Number.isNaN(value)) {
      validAnswers.push(value)
      rawScore += value
    }
  }

  const answeredQuestions = validAnswers.length
  const totalQuestions = questionKeys.length
  const completionPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
  const isComplete = answeredQuestions === totalQuestions

  const maxScore = 100
  const normalizedScore = maxScore > 0 ? Math.round((rawScore / maxScore) * 100 * 100) / 100 : 0

  const hindfootScore: SubscaleScore = {
    name: 'AOFAS Hindfoot Score',
    description: 'American Orthopaedic Foot & Ankle Society Ankle-Hindfoot Score',
    rawScore: rawScore,
    normalizedScore: normalizedScore,
    maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage,
    isComplete
  }

  const totalScore: SubscaleScore = {
    name: 'AOFAS Hindfoot Total',
    description: 'American Orthopaedic Foot & Ankle Society Ankle-Hindfoot Score',
    rawScore: rawScore,
    normalizedScore: normalizedScore,
    maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage,
    isComplete
  }

  return {
    rawFormData: { hindfoot: hindfootSection },
    subscales: {
      hindfoot: hindfootScore
    },
    totalScore: totalScore
  }
}

/**
 * Validate AOFAS Hindfoot form data
 */
export function validateFormData(data: FormData): boolean {
  const hindfootSection = data.hindfoot || {}
  const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10']

  for (const key of questionKeys) {
    const value = hindfootSection[key]
    if (value === null || value === undefined) continue
    if (typeof value !== 'number') return false
    const validValues = QUESTION_VALUES[key as keyof typeof QUESTION_VALUES]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!validValues.includes(value as any)) return false
  }

  return true
}

/**
 * Get initial/empty AOFAS Hindfoot form data
 */
export function getInitialData(): FormData {
  return {
    hindfoot: {
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      q5: null,
      q6: null,
      q7: null,
      q8: null,
      q9: null,
      q10: null
    }
  }
}

/**
 * Generate mock AOFAS Hindfoot data for testing
 */
export function generateMockData(): FormData {
  return {
    hindfoot: {
      q1: 30,   // Mild pain - 30 points
      q2: 7,    // No limitation of daily - 7 points
      q3: 10,   // No support - 10 points
      q4: 4,    // 4-6 blocks - 4 points
      q5: 5,    // No difficulty - 5 points
      q6: 8,    // Normal gait - 8 points
      q7: 8,    // Normal motion - 8 points
      q8: 6,    // Normal hindfoot motion - 6 points
      q9: 8,    // Stable - 8 points
      q10: 10   // Good alignment - 10 points
      // Total: 96 points
    }
  }
}

/**
 * Get scale information for AOFAS Hindfoot scores
 */
export function getScaleInfo(score: SubscaleScore): ScaleInfo {
  const rawScore = score.rawScore ?? 0
  const normalizedValue = rawScore

  return {
    min: 0,
    max: 100,
    normalizedValue,
    polarity: 'higher-is-better',
    goodLabel: 'Excellent',
    badLabel: 'Poor'
  }
}
