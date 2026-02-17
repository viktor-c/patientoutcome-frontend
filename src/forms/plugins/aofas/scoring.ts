/**
 * AOFAS Scoring Logic
 * American Orthopaedic Foot & Ankle Society Score
 * 
 * This scoring implementation can be shared between frontend and backend.
 * Each question has specific point values that sum to a maximum of 100 points.
 */

import type { FormData } from '../../types'
import type { ScoringData, SubscaleScore } from '@/types/backend/scoring'
import type { ScaleInfo } from '@/utils/scaleInfo'

/**
 * Point value mapping for each AOFAS question
 * Each question has different enum values representing specific point scores
 */
const QUESTION_VALUES = {
  q1: [40, 30, 20, 0],      // Pain: None, Mild, Moderate, Severe
  q2: [10, 7, 4, 0],        // Activity limitation
  q3: [10, 5, 0],           // Footwear
  q4: [10, 5, 0],           // Great toe mobility (MTP joint)
  q5: [5, 0],               // Movement restriction
  q6: [5, 0],               // Joint stability
  q7: [5, 0],               // Callus
  q8: [15, 8, 0]            // Malalignment
} as const

/**
 * Calculate AOFAS score from form data
 * 
 * AOFAS has a single subscale "AOFAS Forefoot Score" with 8 questions
 * Total score ranges from 0-100 points
 * 
 * @param data Form data structure
 * @returns Scoring data with subscale and total
 */
export function calculateScore(data: FormData): ScoringData {
  // Extract forefoot section from form data
  const forefootSection = data.forefoot || {}

  // Define all question keys
  const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']

  // Extract valid answers and calculate raw score
  const validAnswers: number[] = []
  let rawScore = 0

  for (const key of questionKeys) {
    const value = forefootSection[key]

    // Check if value is a valid number
    if (typeof value === 'number' && !Number.isNaN(value)) {
      validAnswers.push(value)
      rawScore += value  // In AOFAS, the enum values ARE the points
    }
  }

  const answeredQuestions = validAnswers.length
  const totalQuestions = questionKeys.length
  const completionPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
  const isComplete = answeredQuestions === totalQuestions

  // Maximum possible score is always 100 for AOFAS
  const maxScore = 100

  // Calculate normalized score (percentage of maximum)
  const normalizedScore = maxScore > 0 ? Math.round((rawScore / maxScore) * 100 * 100) / 100 : 0

  // Create subscale score
  const forefootScore: SubscaleScore = {
    name: 'AOFAS Forefoot Score',
    description: 'American Orthopaedic Foot & Ankle Society Forefoot Score',
    rawScore: rawScore,  // Always return number, 0 if no answers
    normalizedScore: normalizedScore,  // Always return number, 0 if no answers
    maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage,
    isComplete
  }

  // For AOFAS, the total score is the same as the subscale score
  const totalScore: SubscaleScore = {
    name: 'AOFAS Total',
    description: 'American Orthopaedic Foot & Ankle Society Score',
    rawScore: rawScore,  // Always return number, 0 if no answers
    normalizedScore: normalizedScore,  // Always return number, 0 if no answers
    maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage,
    isComplete
  }

  return {
    rawFormData: { forefoot: forefootSection },
    subscales: {
      forefoot: forefootScore
    },
    totalScore: totalScore
  }
}

/**
 * Validate AOFAS form data
 * All answers must be valid enum values from the schema
 */
export function validateFormData(data: FormData): boolean {
  const forefootSection = data.forefoot || {}

  const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']

  for (const key of questionKeys) {
    const value = forefootSection[key]

    // Null/undefined is valid (unanswered)
    if (value === null || value === undefined) continue

    // Must be a number
    if (typeof value !== 'number') return false

    // Must be one of the valid enum values for this question
    const validValues = QUESTION_VALUES[key as keyof typeof QUESTION_VALUES]
    if (!validValues.includes(value as any)) return false
  }

  return true
}

/**
 * Get initial/empty AOFAS form data
 */
export function getInitialData(): FormData {
  return {
    forefoot: {
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

/**
 * Generate mock AOFAS data for testing
 */
export function generateMockData(): FormData {
  return {
    forefoot: {
      q1: 30,   // Mild pain - 30 points
      q2: 7,    // No limitation of daily activities, recreational limited - 7 points
      q3: 5,    // Comfort shoes - 5 points
      q4: 10,   // Normal range of motion - 10 points
      q5: 5,    // No restriction - 5 points
      q6: 5,    // Stable - 5 points
      q7: 5,    // No callus - 5 points
      q8: 8     // Moderate malalignment - 8 points
      // Total: 75 points
    }
  }
}

/**
 * Get scale information for AOFAS scores
 * AOFAS: 0-100 scale, higher is better
 */
export function getScaleInfo(score: SubscaleScore, _subscaleKey?: string): ScaleInfo {
  const rawScore = score.rawScore ?? 0
  
  // AOFAS uses raw score directly (0-100)
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
