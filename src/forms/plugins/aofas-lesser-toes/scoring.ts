/**
 * AOFAS Lesser Toes Scoring Logic
 * American Orthopaedic Foot & Ankle Society Lesser Toes (MTP-IP) Score
 */

import type { FormData } from '../../types'
import type { ScoringData, SubscaleScore } from '@/types/backend/scoring'
import type { ScaleInfo } from '@/utils/scaleInfo'

const QUESTION_VALUES = {
  q1: [40, 30, 20, 0],      // Pain
  q2: [10, 7, 4, 0],        // Activity limitation
  q3: [10, 5, 0],           // Footwear
  q4: [14, 7, 0],           // MTP motion
  q5: [6, 0],               // IP motion
  q6: [5, 0],               // MTP stability
  q7: [5, 0],               // Callus
  q8: [10, 5, 0]            // Alignment
} as const

export function calculateScore(data: FormData): ScoringData {
  const lesserToesSection = data.lesserToes || {}
  const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']

  const validAnswers: number[] = []
  let rawScore = 0

  for (const key of questionKeys) {
    const value = lesserToesSection[key]
    if (typeof value === 'number' && !Number.isNaN(value)) {
      validAnswers.push(value)
      rawScore += value
    }
  }

  const answeredQuestions = validAnswers.length
  const totalQuestions = questionKeys.length
  const completionPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
  const isComplete = answeredQuestions === totalQuestions

  const maxPossible = Object.values(QUESTION_VALUES)
    .map(values => Math.max(...values))
    .reduce((sum, value) => sum + value, 0)
  const maxScore = 100
  const normalizedScore = maxPossible > 0 ? Math.round((rawScore / maxPossible) * maxScore * 100) / 100 : 0

  const lesserToesScore: SubscaleScore = {
    name: 'AOFAS Lesser Toes Score',
    description: 'American Orthopaedic Foot & Ankle Society Lesser Toes (MTP-IP) Score',
    rawScore: normalizedScore,
    normalizedScore: normalizedScore,
    maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage,
    isComplete
  }

  const totalScore: SubscaleScore = {
    name: 'AOFAS Lesser Toes Total',
    description: 'American Orthopaedic Foot & Ankle Society Lesser Toes (MTP-IP) Score',
    rawScore: normalizedScore,
    normalizedScore: normalizedScore,
    maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage,
    isComplete
  }

  return {
    rawFormData: { lesserToes: lesserToesSection },
    subscales: {
      lesserToes: lesserToesScore
    },
    totalScore: totalScore
  }
}

export function validateFormData(data: FormData): boolean {
  const lesserToesSection = data.lesserToes || {}
  const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']

  for (const key of questionKeys) {
    const value = lesserToesSection[key]
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
    lesserToes: {
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      q5: null,
      q6: null,
      q7: null,
      q8: null
    }
  }
}

export function generateMockData(): FormData {
  return {
    lesserToes: {
      q1: 30,   // Mild pain
      q2: 7,    // No limitation of daily
      q3: 10,   // Fashionable shoes
      q4: 14,   // No restriction
      q5: 6,    // No restriction
      q6: 5,    // Stable
      q7: 5,    // No callus
      q8: 10    // Good alignment
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
