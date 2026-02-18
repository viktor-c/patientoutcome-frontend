/**
 * AOFAS Midfoot Scoring Logic
 * American Orthopaedic Foot & Ankle Society Midfoot Score
 */

import type { FormData } from '../../types'
import type { ScoringData, SubscaleScore } from '@/types/backend/scoring'
import type { ScaleInfo } from '@/utils/scaleInfo'

const QUESTION_VALUES = {
  q1: [40, 30, 20, 0],      // Pain
  q2: [10, 7, 4, 0],        // Activity limitation
  q3: [10, 5, 0],           // Footwear
  q4: [5, 4, 2, 0],         // Maximum walking distance
  q5: [5, 3, 0],            // Walking surfaces
  q6: [8, 4, 0],            // Gait abnormality
  q7: [6, 3, 0],            // Midfoot motion
  q8: [6, 0],               // Stability
  q9: [5, 0],               // Callus
  q10: [10, 5, 0]           // Alignment
} as const

export function calculateScore(data: FormData): ScoringData {
  const midfootSection = data.midfoot || {}
  const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10']

  const validAnswers: number[] = []
  let rawScore = 0

  for (const key of questionKeys) {
    const value = midfootSection[key]
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

  const midfootScore: SubscaleScore = {
    name: 'AOFAS Midfoot Score',
    description: 'American Orthopaedic Foot & Ankle Society Midfoot Score',
    rawScore: rawScore,
    normalizedScore: normalizedScore,
    maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage,
    isComplete
  }

  const totalScore: SubscaleScore = {
    name: 'AOFAS Midfoot Total',
    description: 'American Orthopaedic Foot & Ankle Society Midfoot Score',
    rawScore: rawScore,
    normalizedScore: normalizedScore,
    maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage,
    isComplete
  }

  return {
    rawFormData: { midfoot: midfootSection },
    subscales: {
      midfoot: midfootScore
    },
    totalScore: totalScore
  }
}

export function validateFormData(data: FormData): boolean {
  const midfootSection = data.midfoot || {}
  const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10']

  for (const key of questionKeys) {
    const value = midfootSection[key]
    if (value === null || value === undefined) continue
    if (typeof value !== 'number') return false
    const validValues = QUESTION_VALUES[key as keyof typeof QUESTION_VALUES]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!validValues.includes(value as any)) return false
  }

  return true
}

export function getInitialData(): FormData {
  return {
    midfoot: {
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

export function generateMockData(): FormData {
  return {
    midfoot: {
      q1: 30,   // Mild pain
      q2: 7,    // No limitation of daily
      q3: 10,   // Fashionable shoes
      q4: 5,    // More than 6 blocks
      q5: 5,    // No difficulty
      q6: 8,    // Normal gait
      q7: 6,    // Normal motion
      q8: 6,    // Stable
      q9: 5,    // No callus
      q10: 10   // Good alignment
    }
  }
}

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
